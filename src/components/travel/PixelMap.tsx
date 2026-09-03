"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HUB_DEFINITIONS,
  getResidenceChapters,
} from "@/content/travel/catalog";
import type {
  TravelHubId,
  TravelPlace,
} from "@/content/travel/types";
import {
  clampCameraDuration,
  clampCameraToBounds,
  interpolateCamera,
  panByScreenDelta,
  screenToWorld,
  zoomAtScreenPoint,
  zoomAtViewportCenter,
  type Camera,
  type Point,
} from "@/lib/travel/camera";
import {
  COUNTRY_FOCUS_MIN_SCALE,
  COUNTRY_FOCUS_SCALE,
  MAP_COLS,
  MAP_HEIGHT,
  MAP_ROWS,
  MAP_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  cityPoint,
  clamp,
  countryFrame,
  describeAtlasView,
  fitScale,
  lodBandFromScale,
  sparkleDelay,
  type AtlasView,
  type LodBand,
} from "@/lib/travel/geo";
import {
  activateInteraction,
  createInteractionState,
  interactionReducer,
  isCameraMotionPhase,
  type ActivationSource,
  type CameraMotionPhase,
  type InteractionState,
} from "@/lib/travel/interaction";
import {
  resolveLabelCollisions,
  type LabelCandidate,
  type LabelPlacement,
  type ScreenRect,
} from "@/lib/travel/labels";
import {
  buildTravelEntities,
  getHubMembers,
  getHubRoot,
  resolveFocusedHub,
  semanticLevelForLodBand,
  spreadDenseEntities,
  type TravelFilterMode,
  type TravelMapEntity,
} from "@/lib/travel/semantic";
import {
  paintTerrain,
  type TerrainPalette,
} from "@/lib/travel/terrainPaint";
import {
  createTerrainRippleEngine,
  type TerrainRippleEngine,
} from "@/lib/travel/terrainRipple";
import styles from "./travel.module.css";

export type TravelMapView = AtlasView & {
  hubId: TravelHubId | null;
};

type PixelMapProps = {
  places: TravelPlace[];
  selectedId: string | null;
  currentHomeId: string;
  mode: TravelFilterMode;
  highlightCountry: string | null;
  focusCountry: string | null;
  focusTick: number;
  reducedMotion: boolean;
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onView: (view: TravelMapView) => void;
};

type CameraAnimation = {
  from: Camera;
  to: Camera;
  start: number;
  duration: number;
  phase: CameraMotionPhase;
};

type DragMeta = {
  pointerId: number;
  startCamera: Camera;
  lastPoint: Point;
  lastTime: number;
  velocity: Point;
  captured: boolean;
};

type PinchMeta = {
  pointerIds: [number, number];
  startDistance: number;
  startScale: number;
  worldAnchor: Point;
};

const MAP_BOUNDS = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
} as const;
const LABEL_SETTLE_MS = 180;
const WHEEL_SETTLE_MS = 120;
const COAST_STOP_SPEED = 0.08;

function wheelShouldZoom(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return true;
  if (
    Math.abs(event.deltaX) >= 1 &&
    Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 0.28
  ) {
    return false;
  }
  return Math.abs(event.deltaY) > 0;
}

function canAffordIdleRipples() {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 2) return false;
  return true;
}

function pointDistance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function midpoint(left: Point, right: Point): Point {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

function resolvedThemeColor(name: string) {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!color) throw new Error(`Missing travel terrain color token ${name}.`);
  return color;
}

function terrainPalette(): TerrainPalette {
  const blue = resolvedThemeColor("--color-blue");
  const cyan = resolvedThemeColor("--color-cyan");
  const bg = resolvedThemeColor("--color-bg");
  return {
    water: {
      deep: `color-mix(in srgb, ${blue} 62%, ${bg})`,
      mid: blue,
      shallow: cyan,
      coast: cyan,
      inland: cyan,
      glint: resolvedThemeColor("--color-text"),
    },
    land: {
      shadow: resolvedThemeColor("--color-accent-secondary"),
      low: resolvedThemeColor("--color-accent-secondary"),
      mid: resolvedThemeColor("--color-green"),
      high: resolvedThemeColor("--color-accent"),
      coast: resolvedThemeColor("--color-accent-secondary"),
      vegetation: resolvedThemeColor("--color-green"),
      forest: resolvedThemeColor("--color-accent-secondary"),
      dry: resolvedThemeColor("--color-orange"),
      dryDetail: resolvedThemeColor("--color-yellow"),
      snow: resolvedThemeColor("--color-text"),
    },
  };
}

function markerClass(
  entity: TravelMapEntity,
  currentHomeId: string,
) {
  if (entity.members.some((place) => place.id === currentHomeId)) {
    return styles.pinCurrent;
  }
  if (entity.place.relationship === "lived") return styles.pinLived;
  if (entity.kind === "hub" || entity.place.category === "hub") {
    return styles.pinHub;
  }
  if (entity.presentationTier === "minor") return styles.pinMinor;
  return styles.pinVisited;
}

function entityA11yLabel(entity: TravelMapEntity) {
  if (entity.kind === "hub") {
    return `${entity.place.name} travel hub, ${entity.count} places${
      entity.livedCount
        ? `, including ${entity.livedCount} home ${
            entity.livedCount === 1 ? "chapter" : "chapters"
          }`
        : ""
    }. Activate to explore.`;
  }

  const relationship =
    entity.place.relationship === "current_home"
      ? "current home"
      : entity.place.relationship === "lived"
        ? "past home"
        : "visited place";
  const hub =
    entity.place.category === "hub" ? " and travel hub" : "";
  return `${entity.place.displayTitle ?? entity.place.name}, ${relationship}${hub}.`;
}

function labelClass(placement: LabelPlacement) {
  if (placement === "above") return styles.pinLabelAbove;
  if (placement === "right") return styles.pinLabelRight;
  if (placement === "left") return styles.pinLabelLeft;
  return "";
}

export default function PixelMap({
  places,
  selectedId,
  currentHomeId,
  mode,
  highlightCountry,
  focusCountry,
  focusTick,
  reducedMotion,
  theme,
  onSelect,
  onView,
}: PixelMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const viewRef = useRef({ width: 0, height: 0 });
  const bandRef = useRef<LodBand>("world");
  const viewKeyRef = useRef("");
  const busyRef = useRef(false);
  const cameraRef = useRef<Camera>({
    x: ((-55 + 180) / 360) * MAP_WIDTH,
    y: ((90 - 32) / 180) * MAP_HEIGHT,
    scale: 0.88,
  });
  const animationRef = useRef<CameraAnimation | null>(null);
  const coastRef = useRef<Point>({ x: 0, y: 0 });
  const dragRef = useRef<DragMeta | null>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<PinchMeta | null>(null);
  const interactionRef = useRef<InteractionState>(createInteractionState());
  const rippleRef = useRef<TerrainRippleEngine | null>(null);
  const lastRippleRef = useRef({ x: 0, y: 0, time: 0 });
  const idleRipplesRef = useRef(true);
  const previousCameraRef = useRef<Camera | null>(null);
  const previousModeRef = useRef<TravelFilterMode>(mode);
  const focusedHubRef = useRef<TravelHubId | null>(null);
  const placesRef = useRef(places);
  const selectedRef = useRef(selectedId);
  const focusCountryRef = useRef(focusCountry);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const onViewRef = useRef(onView);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [layoutScale, setLayoutScale] = useState(cameraRef.current.scale);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedHubId, setFocusedHubId] = useState<TravelHubId | null>(null);

  placesRef.current = places;
  selectedRef.current = selectedId;
  focusCountryRef.current = focusCountry;
  reducedRef.current = reducedMotion;
  onSelectRef.current = onSelect;
  onViewRef.current = onView;

  const setBusy = useCallback((busy: boolean) => {
    if (busyRef.current === busy) return;
    busyRef.current = busy;
    viewportRef.current?.setAttribute("data-busy", busy ? "1" : "0");
  }, []);

  const syncInteraction = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.setAttribute("data-interaction", interactionRef.current.phase);
    viewport.setAttribute(
      "data-grab",
      interactionRef.current.phase === "dragging" ? "1" : "0",
    );
  }, []);

  const setHoverTarget = useCallback(
    (id: string | null) => {
      if (
        id &&
        (interactionRef.current.pointer ||
          isCameraMotionPhase(interactionRef.current.phase))
      ) {
        return;
      }
      interactionRef.current = interactionReducer(interactionRef.current, {
        type: "HOVER",
        id,
      });
      setHoveredId(id);
      syncInteraction();
    },
    [syncInteraction],
  );

  useEffect(() => {
    idleRipplesRef.current = canAffordIdleRipples();
  }, []);

  const clampCamera = useCallback((camera: Camera) => {
    return clampCameraToBounds(camera, viewRef.current, MAP_BOUNDS);
  }, []);

  const publishView = useCallback(() => {
    const { width, height } = viewRef.current;
    if (width < 8 || height < 8) return;
    const camera = cameraRef.current;
    const base = describeAtlasView(
      camera,
      width,
      height,
      placesRef.current,
      selectedRef.current,
      focusCountryRef.current,
    );

    let hubId: TravelHubId | null = null;
    if (base.band === "city") {
      const explicitHub = focusedHubRef.current;
      if (explicitHub) {
        const root = getHubRoot(placesRef.current, explicitHub);
        const rootPoint = root ? cityPoint(root) : null;
        const rootDistance = rootPoint
          ? Math.hypot(
              (rootPoint.x - camera.x) * camera.scale,
              (rootPoint.y - camera.y) * camera.scale,
            )
          : Number.POSITIVE_INFINITY;
        if (rootDistance < Math.min(width, height) * 0.55) {
          hubId = explicitHub;
        } else {
          focusedHubRef.current = null;
          setFocusedHubId(null);
        }
      }
      if (!hubId) {
        hubId =
          resolveFocusedHub(placesRef.current, {
            selectedId: selectedRef.current,
            cameraNearestPlaceId: base.cityId,
            cameraPoint: camera,
            maxDistance: 56,
          })?.id ?? null;
      }
    }

    if (hubId !== focusedHubRef.current) {
      focusedHubRef.current = hubId;
      setFocusedHubId(hubId);
    }

    const next: TravelMapView = { ...base, hubId };
    const key = [
      next.title,
      next.kicker,
      next.countryCode ?? "",
      next.cityId ?? "",
      next.hubId ?? "",
      next.visibleCountryCodes.join(","),
    ].join("|");
    if (key === viewKeyRef.current) return;
    viewKeyRef.current = key;
    onViewRef.current(next);
  }, []);

  const applyCamera = useCallback(
    (publish = false) => {
      const node = worldRef.current;
      const { width, height } = viewRef.current;
      if (!node || width < 8) return;
      const camera = cameraRef.current;
      node.style.transform = `translate3d(${
        width / 2 - camera.x * camera.scale
      }px, ${height / 2 - camera.y * camera.scale}px, 0) scale(${
        camera.scale
      })`;
      node.style.setProperty("--map-scale", String(camera.scale));
      viewportRef.current?.setAttribute(
        "data-camera",
        `${camera.x.toFixed(4)},${camera.y.toFixed(4)},${camera.scale.toFixed(4)}`,
      );
      const band = lodBandFromScale(camera.scale);
      viewportRef.current?.setAttribute("data-band", band);
      if (band !== bandRef.current) {
        bandRef.current = band;
        setLayoutScale(camera.scale);
      }
      if (publish) publishView();
    },
    [publishView],
  );

  const bumpLayout = useCallback(() => {
    setLayoutScale(cameraRef.current.scale);
    setLayoutVersion((version) => version + 1);
  }, []);

  const finishMotion = useCallback(() => {
    if (isCameraMotionPhase(interactionRef.current.phase)) {
      interactionRef.current = interactionReducer(interactionRef.current, {
        type: "CAMERA_MOTION_END",
      });
    }
    syncInteraction();
    setBusy(false);
    bumpLayout();
    applyCamera(true);
  }, [applyCamera, bumpLayout, setBusy, syncInteraction]);

  const scheduleSettle = useCallback(() => {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(
      finishMotion,
      LABEL_SETTLE_MS,
    );
  }, [finishMotion]);

  const markMotion = useCallback(
    (phase: CameraMotionPhase) => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (!interactionRef.current.pointer) {
        interactionRef.current = interactionReducer(interactionRef.current, {
          type: "CAMERA_MOTION_START",
          motion: phase,
        });
      }
      syncInteraction();
      setBusy(true);
    },
    [setBusy, syncInteraction],
  );

  const tickRef = useRef<(now: number) => boolean>(() => false);
  tickRef.current = (now) => {
    let keep = false;
    const animation = animationRef.current;
    if (animation && interactionRef.current.phase !== "dragging") {
      const progress = Math.min(1, (now - animation.start) / animation.duration);
      cameraRef.current = clampCamera(
        interpolateCamera(animation.from, animation.to, progress),
      );
      if (progress >= 1) {
        animationRef.current = null;
        scheduleSettle();
      } else {
        keep = true;
      }
    } else if (
      !dragRef.current &&
      !pinchRef.current &&
      Math.hypot(coastRef.current.x, coastRef.current.y) > COAST_STOP_SPEED
    ) {
      coastRef.current.x *= 0.84;
      coastRef.current.y *= 0.84;
      cameraRef.current = clampCamera(
        panByScreenDelta(cameraRef.current, coastRef.current),
      );
      keep = true;
      if (
        Math.hypot(coastRef.current.x, coastRef.current.y) <=
        COAST_STOP_SPEED
      ) {
        coastRef.current = { x: 0, y: 0 };
        scheduleSettle();
      }
    }

    if (dragRef.current || pinchRef.current) keep = true;
    applyCamera(false);

    const rippleFrame = rippleRef.current?.render(now);
    if (rippleFrame) {
      viewportRef.current?.setAttribute(
        "data-ripples",
        String(rippleFrame.activeCount),
      );
      if (rippleFrame.needsAnimationFrame) keep = true;
    }
    return keep;
  };

  const startLoop = useCallback(() => {
    if (loopRef.current) return;
    const step = (now: number) => {
      loopRef.current = 0;
      if (tickRef.current(now)) {
        loopRef.current = requestAnimationFrame(step);
      }
    };
    loopRef.current = requestAnimationFrame(step);
  }, []);

  const cancelCameraMotion = useCallback(() => {
    animationRef.current = null;
    coastRef.current = { x: 0, y: 0 };
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (wheelTimerRef.current) {
      window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    if (isCameraMotionPhase(interactionRef.current.phase)) {
      interactionRef.current = interactionReducer(interactionRef.current, {
        type: "CAMERA_MOTION_END",
      });
      syncInteraction();
    }
  }, [syncInteraction]);

  const startCameraAnimation = useCallback(
    (
      target: Camera,
      duration = 480,
      phase: CameraMotionPhase = "camera-animating",
    ) => {
      cancelCameraMotion();
      const to = clampCamera({
        ...target,
        scale: clamp(target.scale, MIN_SCALE, MAX_SCALE),
      });
      const from = { ...cameraRef.current };
      const near =
        Math.hypot(from.x - to.x, from.y - to.y) < 1 &&
        Math.abs(from.scale - to.scale) < 0.005;
      if (near || reducedRef.current) {
        cameraRef.current = to;
        applyCamera(true);
        bumpLayout();
        setBusy(false);
        return;
      }
      animationRef.current = {
        from,
        to,
        start: performance.now(),
        duration: clampCameraDuration(duration),
        phase,
      };
      markMotion(phase);
      startLoop();
    },
    [
      applyCamera,
      bumpLayout,
      cancelCameraMotion,
      clampCamera,
      markMotion,
      setBusy,
      startLoop,
    ],
  );

  const spawnRipple = useCallback(
    (screenPoint: Point, strong: boolean) => {
      const engine = rippleRef.current;
      if (!engine || reducedRef.current || document.hidden) return;
      const now = performance.now();
      const previous = lastRippleRef.current;
      if (
        now - previous.time < (strong ? 72 : 125) &&
        Math.hypot(screenPoint.x - previous.x, screenPoint.y - previous.y) <
          (strong ? 12 : 22)
      ) {
        return;
      }
      const world = screenToWorld(
        screenPoint,
        cameraRef.current,
        viewRef.current,
      );
      const sourcePoint = {
        x: (world.x / MAP_WIDTH) * MAP_COLS,
        y: (world.y / MAP_HEIGHT) * MAP_ROWS,
      };
      const cssPixelsPerTexel =
        (MAP_WIDTH / MAP_COLS) * cameraRef.current.scale;
      engine.add({
        x: sourcePoint.x,
        y: sourcePoint.y,
        cssRadius: strong ? 84 : 60,
        cssPixelsPerSourceTexel: cssPixelsPerTexel,
        ringCount: strong ? 3 : 2,
      });
      viewportRef.current?.setAttribute(
        "data-ripples",
        String(engine.activeCount),
      );
      lastRippleRef.current = {
        x: screenPoint.x,
        y: screenPoint.y,
        time: now,
      };
      startLoop();
    },
    [startLoop],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true;
    setReady(false);
    rippleRef.current?.reset();
    rippleRef.current = null;

    const image = new Image();
    image.src = "/travel/earth.jpg";
    image.onerror = () => {
      if (live) setReady(true);
    };
    image.onload = () => {
      if (!live) return;
      const result = paintTerrain({
        source: image,
        width: MAP_COLS,
        height: MAP_ROWS,
        palette: terrainPalette(),
      });
      const context = canvas.getContext("2d");
      if (!context) {
        setReady(true);
        return;
      }
      context.putImageData(result.baseImageData, 0, 0);
      rippleRef.current = createTerrainRippleEngine({
        context,
        baseImageData: result.baseImageData,
        landMask: result.landMask,
        reducedMotion: reducedRef.current,
      });
      setReady(true);
    };

    return () => {
      live = false;
      rippleRef.current?.reset();
      rippleRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    rippleRef.current?.setReducedMotion(reducedMotion);
    if (reducedMotion) {
      viewportRef.current?.setAttribute("data-ripples", "0");
    }
  }, [reducedMotion]);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.hidden;
      viewportRef.current?.setAttribute(
        "data-paused",
        hidden ? "1" : "0",
      );
      if (hidden) {
        rippleRef.current?.pause();
        if (loopRef.current) {
          cancelAnimationFrame(loopRef.current);
          loopRef.current = 0;
        }
      } else {
        rippleRef.current?.resume();
        startLoop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [startLoop]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const sync = () => {
      const rect = node.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      viewRef.current = next;
      setView(next);
      cameraRef.current = clampCamera(cameraRef.current);
      applyCamera(true);
      bumpLayout();
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyCamera, bumpLayout, clampCamera]);

  useLayoutEffect(() => {
    applyCamera(true);
    syncInteraction();
  }, [applyCamera, syncInteraction]);

  useEffect(() => {
    interactionRef.current = selectedId
      ? interactionReducer(interactionRef.current, {
          type: "ACTIVATE",
          id: selectedId,
          source: "programmatic",
        })
      : interactionReducer(interactionRef.current, { type: "DESELECT" });
    syncInteraction();
  }, [selectedId, syncInteraction]);

  const viewReady = view.width >= 80 && view.height >= 80;

  useEffect(() => {
    if (!viewReady || !selectedId) return;
    const selected = placesRef.current.find(
      (place) => place.id === selectedId,
    );
    if (!selected) return;
    const point = cityPoint(selected);
    const shift =
      viewRef.current.width > 820
        ? (viewRef.current.width * 0.08) /
          Math.max(cameraRef.current.scale, 2.8)
        : 0;
    if (selected.hubId) {
      focusedHubRef.current = selected.hubId;
      setFocusedHubId(selected.hubId);
    }
    startCameraAnimation(
      {
        x: point.x + shift,
        y: point.y,
        scale: Math.max(cameraRef.current.scale, 2.8),
      },
      460,
    );
  }, [selectedId, startCameraAnimation, viewReady]);

  useEffect(() => {
    if (!viewReady || focusTick < 1 || selectedRef.current) return;
    const code = focusCountryRef.current;
    if (!code) return;
    const frame = countryFrame(placesRef.current, code);
    if (!frame) return;
    focusedHubRef.current = null;
    setFocusedHubId(null);
    startCameraAnimation(
      {
        x: frame.minX + frame.w / 2,
        y: frame.minY + frame.h / 2,
        scale: clamp(
          fitScale(
            frame.minX,
            frame.minX + frame.w,
            frame.minY,
            frame.minY + frame.h,
            viewRef.current.width,
            viewRef.current.height,
            0.7,
          ),
          COUNTRY_FOCUS_MIN_SCALE,
          COUNTRY_FOCUS_SCALE,
        ),
      },
      520,
    );
  }, [focusTick, startCameraAnimation, viewReady]);

  useEffect(() => {
    if (!viewReady) return;
    const previous = previousModeRef.current;
    previousModeRef.current = mode;
    if (mode === "lived" && previous !== "lived") {
      previousCameraRef.current = { ...cameraRef.current };
      const points = getResidenceChapters().map(cityPoint);
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      focusedHubRef.current = null;
      setFocusedHubId(null);
      startCameraAnimation(
        {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          scale: fitScale(
            minX,
            maxX,
            minY,
            maxY,
            viewRef.current.width,
            viewRef.current.height,
            0.9,
          ),
        },
        540,
      );
      return;
    }
    if (previous === "lived" && mode !== "lived" && previousCameraRef.current) {
      startCameraAnimation(previousCameraRef.current, 480);
      previousCameraRef.current = null;
      return;
    }
    bumpLayout();
    publishView();
  }, [
    bumpLayout,
    mode,
    publishView,
    startCameraAnimation,
    viewReady,
  ]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelCameraMotion();
      const rect = node.getBoundingClientRect();
      const screenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const current = cameraRef.current;

      if (wheelShouldZoom(event)) {
        const delta =
          event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? event.deltaY * 16
            : event.deltaY;
        const scale = clamp(
          current.scale *
            Math.exp(-clamp(delta, -80, 80) * 0.0018),
          MIN_SCALE,
          MAX_SCALE,
        );
        cameraRef.current = clampCamera(
          zoomAtScreenPoint(
            current,
            scale,
            screenPoint,
            viewRef.current,
          ),
        );
        markMotion("zooming");
      } else {
        cameraRef.current = clampCamera(
          panByScreenDelta(current, {
            x: -event.deltaX,
            y: -event.deltaY,
          }),
        );
        markMotion("coasting");
      }

      spawnRipple(screenPoint, true);
      applyCamera(false);
      startLoop();
      if (wheelTimerRef.current) {
        window.clearTimeout(wheelTimerRef.current);
      }
      wheelTimerRef.current = window.setTimeout(
        scheduleSettle,
        WHEEL_SETTLE_MS,
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [
    applyCamera,
    cancelCameraMotion,
    clampCamera,
    markMotion,
    scheduleSettle,
    spawnRipple,
    startLoop,
  ]);

  useEffect(() => {
    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = 0;
      }
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (wheelTimerRef.current) {
        window.clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
    };
  }, []);

  const localPoint = (clientX: number, clientY: number): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-map-chrome]")) return;
    const point = localPoint(event.clientX, event.clientY);
    activePointersRef.current.set(event.pointerId, point);
    cancelCameraMotion();

    if (
      event.pointerType === "touch" &&
      activePointersRef.current.size === 2
    ) {
      const entries = [...activePointersRef.current.entries()];
      const [first, second] = entries;
      const center = midpoint(first[1], second[1]);
      pinchRef.current = {
        pointerIds: [first[0], second[0]],
        startDistance: Math.max(1, pointDistance(first[1], second[1])),
        startScale: cameraRef.current.scale,
        worldAnchor: screenToWorld(
          center,
          cameraRef.current,
          viewRef.current,
        ),
      };
      dragRef.current = null;
      interactionRef.current = {
        ...createInteractionState({ selectedId: selectedRef.current }),
        phase: "zooming",
        suppressPointerClick: true,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setHoveredId(null);
      markMotion("zooming");
      syncInteraction();
      startLoop();
      return;
    }

    if (!event.isPrimary && event.pointerType !== "touch") return;
    interactionRef.current = interactionReducer(interactionRef.current, {
      type: "POINTER_DOWN",
      pointerId: event.pointerId,
      point,
    });
    dragRef.current = {
      pointerId: event.pointerId,
      startCamera: { ...cameraRef.current },
      lastPoint: point,
      lastTime: performance.now(),
      velocity: { x: 0, y: 0 },
      captured: false,
    };
    syncInteraction();
    startLoop();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event.clientX, event.clientY);
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, point);
    }
    const pinch = pinchRef.current;
    if (pinch) {
      const first = activePointersRef.current.get(pinch.pointerIds[0]);
      const second = activePointersRef.current.get(pinch.pointerIds[1]);
      if (!first || !second) return;
      const center = midpoint(first, second);
      const distance = Math.max(1, pointDistance(first, second));
      const scale = clamp(
        (pinch.startScale * distance) / pinch.startDistance,
        MIN_SCALE,
        MAX_SCALE,
      );
      cameraRef.current = clampCamera({
        x:
          pinch.worldAnchor.x -
          (center.x - viewRef.current.width / 2) / scale,
        y:
          pinch.worldAnchor.y -
          (center.y - viewRef.current.height / 2) / scale,
        scale,
      });
      setBusy(true);
      spawnRipple(center, true);
      startLoop();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      if (event.pointerType === "mouse" && idleRipplesRef.current) {
        spawnRipple(point, false);
      }
      return;
    }

    const previousPhase = interactionRef.current.phase;
    interactionRef.current = interactionReducer(interactionRef.current, {
      type: "POINTER_MOVE",
      pointerId: event.pointerId,
      point,
    });
    if (
      previousPhase !== "dragging" &&
      interactionRef.current.phase === "dragging"
    ) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.captured = true;
      setHoveredId(null);
      setBusy(true);
      syncInteraction();
    }
    if (interactionRef.current.phase !== "dragging") return;

    const delta = {
      x: point.x - (interactionRef.current.pointer?.start.x ?? point.x),
      y: point.y - (interactionRef.current.pointer?.start.y ?? point.y),
    };
    const now = performance.now();
    const elapsed = Math.max(8, now - drag.lastTime);
    const instantVelocity = {
      x: ((point.x - drag.lastPoint.x) / elapsed) * 16,
      y: ((point.y - drag.lastPoint.y) / elapsed) * 16,
    };
    drag.velocity = {
      x: drag.velocity.x * 0.65 + instantVelocity.x * 0.35,
      y: drag.velocity.y * 0.65 + instantVelocity.y * 0.35,
    };
    drag.lastPoint = point;
    drag.lastTime = now;
    cameraRef.current = clampCamera(
      panByScreenDelta(drag.startCamera, delta),
    );
    spawnRipple(point, true);
    startLoop();
  };

  const endPointer = (
    event: React.PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    activePointersRef.current.delete(event.pointerId);
    if (pinchRef.current) {
      pinchRef.current = null;
      dragRef.current = null;
      interactionRef.current = {
        ...createInteractionState({ selectedId: selectedRef.current }),
        suppressPointerClick: true,
      };
      syncInteraction();
      scheduleSettle();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = interactionRef.current.phase === "dragging";
    interactionRef.current = interactionReducer(interactionRef.current, {
      type: cancelled ? "POINTER_CANCEL" : "POINTER_UP",
      pointerId: event.pointerId,
    });
    dragRef.current = null;
    if (
      drag.captured &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (
      wasDragging &&
      !cancelled &&
      !reducedRef.current &&
      Math.hypot(drag.velocity.x, drag.velocity.y) > 0.42
    ) {
      coastRef.current = drag.velocity;
      interactionRef.current = interactionReducer(interactionRef.current, {
        type: "CAMERA_MOTION_START",
        motion: "coasting",
      });
      markMotion("coasting");
      startLoop();
    } else if (wasDragging) {
      scheduleSettle();
    } else {
      setBusy(false);
      applyCamera(true);
    }
    syncInteraction();
  };

  const zoomFromCenter = (direction: 1 | -1) => {
    const scale = clamp(
      cameraRef.current.scale * (direction > 0 ? 1.3 : 0.77),
      MIN_SCALE,
      MAX_SCALE,
    );
    startCameraAnimation(
      clampCamera(
        zoomAtViewportCenter(
          cameraRef.current,
          scale,
          viewRef.current,
        ),
      ),
      420,
      "zooming",
    );
  };

  const onMapKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomFromCenter(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomFromCenter(-1);
      return;
    }
    const step = 56;
    const delta =
      event.key === "ArrowLeft"
        ? { x: step, y: 0 }
        : event.key === "ArrowRight"
          ? { x: -step, y: 0 }
          : event.key === "ArrowUp"
            ? { x: 0, y: step }
            : event.key === "ArrowDown"
              ? { x: 0, y: -step }
              : null;
    if (!delta) return;
    event.preventDefault();
    cancelCameraMotion();
    cameraRef.current = clampCamera(
      panByScreenDelta(cameraRef.current, delta),
    );
    applyCamera(true);
    bumpLayout();
  };

  const focusHub = (hubId: TravelHubId) => {
    const members = getHubMembers(placesRef.current, hubId);
    if (members.length === 0) return;
    const points = members.map(cityPoint);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    focusedHubRef.current = hubId;
    setFocusedHubId(hubId);
    startCameraAnimation(
      {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        scale: Math.max(
          2.85,
          fitScale(
            minX,
            maxX,
            minY,
            maxY,
            viewRef.current.width,
            viewRef.current.height,
            1.3,
          ),
        ),
      },
      460,
    );
  };

  const activateEntity = (
    entity: TravelMapEntity,
    source: ActivationSource,
  ) => {
    const activation = activateInteraction(
      interactionRef.current,
      entity.selectionId,
      source,
    );
    interactionRef.current = activation.state;
    syncInteraction();
    if (!activation.activated) return;
    if (entity.kind === "hub" && bandRef.current !== "city" && entity.hubId) {
      focusHub(entity.hubId);
      return;
    }
    onSelectRef.current(entity.selectionId);
  };

  const band = lodBandFromScale(layoutScale);
  const level = semanticLevelForLodBand(band);
  const allEntities = useMemo(
    () => {
      const built = buildTravelEntities(places, {
        level,
        filterMode: mode,
        selectedId,
      });
      const minimumDistance =
        level === "world" ? 34 : level === "country" ? 28 : 32;
      return spreadDenseEntities(
        built,
        layoutScale,
        minimumDistance,
      );
    },
    [layoutScale, level, mode, places, selectedId],
  );
  const entities = useMemo(() => {
    const camera = cameraRef.current;
    const { width, height } = viewRef.current;
    void layoutVersion;
    return allEntities.filter((entity) => {
      if (entity.selected) return true;
      const x = width / 2 + (entity.x - camera.x) * camera.scale;
      const y = height / 2 + (entity.y - camera.y) * camera.scale;
      return x > -40 && x < width + 40 && y > -40 && y < height + 40;
    });
  }, [allEntities, layoutVersion]);

  const labels = useMemo(() => {
    const camera = cameraRef.current;
    const { width, height } = viewRef.current;
    void layoutVersion;
    void view.height;
    void view.width;
    const candidates: LabelCandidate[] = [];
    const toScreen = (entity: TravelMapEntity) => ({
      x: width / 2 + (entity.x - camera.x) * camera.scale,
      y: height / 2 + (entity.y - camera.y) * camera.scale,
    });
    for (const entity of entities) {
      const hovered = entity.id === hoveredId;
      const currentHome = entity.members.some(
        (place) => place.id === currentHomeId,
      );
      const pastLived =
        entity.kind === "place" && entity.place.relationship === "lived";
      const featuredHub =
        entity.kind === "hub" || entity.place.category === "hub";
      const significantDestination =
        entity.place.featured && entity.place.importance >= 90;
      const worldDestination =
        entity.place.featured && entity.place.importance >= 94;
      if (
        focusedHubId &&
        entity.hubId !== focusedHubId &&
        !entity.selected &&
        !hovered
      ) {
        continue;
      }
      if (
        mode === "lived" &&
        entity.place.relationship === "visited" &&
        !entity.selected &&
        !hovered
      ) {
        continue;
      }
      const persistentPastLived =
        pastLived && (level === "metro" || mode === "lived");
      const persistentFeatured =
        level === "world"
          ? worldDestination
          : level === "country" && significantDestination;
      const persistentMetro =
        level === "metro" &&
        !focusedHubId &&
        entity.place.featured &&
        entity.place.importance >= 84;
      const eligible =
        entity.selected ||
        hovered ||
        currentHome ||
        persistentPastLived ||
        featuredHub ||
        persistentFeatured ||
        persistentMetro;
      if (!eligible) continue;
      candidates.push({
        id: entity.id,
        canonicalId: entity.place.canonicalKey,
        name: entity.place.name.toLocaleUpperCase("en-US"),
        point: toScreen(entity),
        selected: entity.selected,
        currentHome,
        pastLived,
        hovered,
        focused: hovered,
        featuredHub,
        significantDestination,
        markerRadius: 16,
        estimatedHeight: entity.kind === "hub" && entity.count > 1 ? 32 : 22,
      });
    }

    const mobile = width <= 820;
    const reserved: ScreenRect[] = [
      {
        x: Math.max(6, width / 2 - Math.min(360, width / 2 - 6)),
        y: 4,
        width: Math.min(720, width - 12),
        height: mobile ? 132 : 118,
      },
      {
        x: 4,
        y: Math.max(0, height - (mobile ? 60 : 54)),
        width: Math.max(0, width - 4),
        height: mobile ? 60 : 54,
      },
      {
        x: Math.max(0, width - 58),
        y: Math.max(0, height - 138),
        width: 58,
        height: 138,
      },
    ];
    if (selectedId) {
      reserved.push(
        mobile
          ? {
              x: 4,
              y: height * 0.54,
              width: Math.max(0, width - 8),
              height: height * 0.46,
            }
          : {
              x: Math.max(0, width - 380),
              y: 68,
              width: 380,
              height: Math.max(0, height - 128),
            },
      );
    }

    return new Map(
      resolveLabelCollisions(candidates, {
        viewport: { width, height },
        viewportPadding: 8,
        reservedRects: reserved,
        level,
        worldLabelLimit: mode === "lived" ? 4 : 6,
        averageCharacterWidth: 8,
        labelHeight: 22,
        horizontalPadding: 8,
        collisionPadding: 4,
        markerRadius: 14,
      }).map((label) => [label.id, label]),
    );
  }, [
    currentHomeId,
    entities,
    focusedHubId,
    hoveredId,
    layoutVersion,
    level,
    mode,
    selectedId,
    view.height,
    view.width,
  ]);

  const frame = useMemo(
    () =>
      highlightCountry
        ? countryFrame(places, highlightCountry)
        : null,
    [highlightCountry, places],
  );
  const residencePath = useMemo(
    () =>
      getResidenceChapters()
        .map((place) => {
          const entity = allEntities.find(
            (candidate) =>
              candidate.kind === "place" &&
              candidate.place.id === place.id,
          );
          const point = entity ?? cityPoint(place);
          return `${point.x},${point.y}`;
        })
        .join(" "),
    [allEntities],
  );
  const focusedHub = focusedHubId
    ? HUB_DEFINITIONS.find((hub) => hub.id === focusedHubId) ?? null
    : null;
  const focusedHubRoot = focusedHubId
    ? getHubRoot(places, focusedHubId)
    : null;
  const focusedHubMembers = focusedHubId
    ? getHubMembers(places, focusedHubId)
    : [];
  const highlightOnScreen = Boolean(
    highlightCountry &&
      entities.some((entity) =>
        entity.members.some(
          (place) => place.countryCode === highlightCountry,
        ),
      ),
  );

  return (
    <div
      ref={viewportRef}
      className={styles.mapViewport}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endPointer(event, false)}
      onPointerCancel={(event) => endPointer(event, true)}
      onLostPointerCapture={(event) => endPointer(event, true)}
      onKeyDown={onMapKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Pixel world map of places I have visited and lived"
      aria-describedby="travel-map-description"
      data-busy={busyRef.current ? "1" : "0"}
      data-paused="0"
      data-ripples="0"
    >
      <p id="travel-map-description" className={styles.srOnly}>
        Explore a pixel world map. Drag or use arrow keys to pan. Pinch, use
        the mouse wheel, or press plus and minus to zoom. Use ALL, LIVED, or
        VISITED to change which story is emphasized. Activate a travel hub to
        reveal nearby places and activate a place to open its story. Escape
        closes an open place card.
      </p>
      {!ready ? <p className={styles.mapBoot}>LOADING WORLD…</p> : null}

      <div
        ref={worldRef}
        className={styles.world}
        style={{
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          ["--map-scale" as string]: String(cameraRef.current.scale),
        }}
        data-layer="world"
      >
        <div className={styles.terrain} data-layer="terrain">
          <canvas
            ref={canvasRef}
            className={styles.earth}
            width={MAP_COLS}
            height={MAP_ROWS}
            aria-hidden="true"
          />
          {reducedMotion ? null : (
            <>
              <div className={styles.ocean} aria-hidden="true" />
              <div className={styles.cloudShadows} aria-hidden="true" />
            </>
          )}
        </div>

        <svg
          className={styles.routes}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          aria-hidden="true"
          data-layer="routes"
        >
          {mode === "lived" ? (
            <polyline
              className={styles.lifePath}
              points={residencePath}
              data-life-path
            />
          ) : null}
          {focusedHub && focusedHubRoot
            ? focusedHubMembers
                .filter(
                  (member) =>
                    member.canonicalKey !== focusedHubRoot.canonicalKey,
                )
                .map((member) => {
                  const start = cityPoint(focusedHubRoot);
                  const end = cityPoint(member);
                  return (
                    <line
                      key={member.canonicalKey}
                      className={styles.hubRoad}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                    />
                  );
                })
            : null}
        </svg>

        {frame ? (
          <div
            className={styles.countryFrame}
            style={{
              left: frame.minX,
              top: frame.minY,
              width: frame.w,
              height: frame.h,
            }}
            aria-hidden="true"
          />
        ) : null}

        <div className={styles.pins} data-layer="pins">
          {entities.map((entity) => {
            const label = labels.get(entity.id);
            const hovered = hoveredId === entity.id;
            const selected = entity.selected;
            const current = entity.members.some(
              (place) => place.id === currentHomeId,
            );
            const hotCountry = Boolean(
              highlightCountry &&
                entity.members.some(
                  (place) => place.countryCode === highlightCountry,
                ),
            );
            const dimmed =
              entity.emphasis === "dimmed" ||
              Boolean(
                focusedHubId &&
                  entity.hubId !== focusedHubId &&
                  !selected &&
                  !hovered,
              ) ||
              (highlightOnScreen && !hotCountry && !selected && !hovered);
            const chapter =
              entity.kind === "place"
                ? entity.place.residenceOrder
                : undefined;
            return (
              <button
                key={entity.id}
                type="button"
                className={[
                  styles.pin,
                  markerClass(entity, currentHomeId),
                  selected ? styles.pinOn : "",
                  hovered ? styles.pinHover : "",
                  current ? styles.pinHere : "",
                  entity.kind === "hub" ? styles.pinStack : "",
                  hotCountry ? styles.pinHi : "",
                  dimmed ? styles.pinDim : "",
                  styles[
                    `pinTier${
                      entity.presentationTier[0].toUpperCase() +
                      entity.presentationTier.slice(1)
                    }` as keyof typeof styles
                  ],
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: entity.x,
                  top: entity.y,
                  zIndex:
                    entity.presentationTier === "hero"
                      ? 8
                      : entity.presentationTier === "major"
                        ? 7
                        : entity.presentationTier === "standard"
                          ? 6
                          : 5,
                  ["--sparkle" as string]: sparkleDelay(entity.id),
                }}
                aria-label={entityA11yLabel(entity)}
                aria-pressed={selected}
                data-entity-id={entity.id}
                data-place-id={entity.place.id}
                data-relationship={entity.place.relationship}
                data-hub-id={entity.hubId ?? undefined}
                data-current-home={current ? "true" : undefined}
                data-interactive
                onClick={(event) =>
                  activateEntity(
                    entity,
                    event.detail === 0 ? "keyboard" : "pointer",
                  )
                }
                onPointerEnter={() => setHoverTarget(entity.id)}
                onPointerLeave={() => setHoverTarget(null)}
                onFocus={() => setHoverTarget(entity.id)}
                onBlur={() => setHoverTarget(null)}
              >
                <span className={styles.node} aria-hidden="true" />
                {selected ? (
                  <span className={styles.reticle} aria-hidden="true" />
                ) : null}
                {entity.kind === "hub" && entity.count > 1 ? (
                  <span className={styles.clusterCount} aria-hidden="true">
                    {entity.count}
                  </span>
                ) : null}
                {chapter ? (
                  <span className={styles.chapterBadge} aria-hidden="true">
                    {chapter}
                  </span>
                ) : null}
                {label ? (
                  <span
                    className={`${styles.pinLabel} ${labelClass(
                      label.placement,
                    )} ${
                      hovered || selected || hotCountry
                        ? styles.pinLabelHot
                        : ""
                    }`}
                  >
                    {entity.place.name.toLocaleUpperCase("en-US")}
                    {entity.kind === "hub" && entity.count > 1 ? (
                      <span className={styles.pinLabelCount}>
                        {entity.count} PLACES
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.crt} aria-hidden="true" />
      <div
        className={styles.zoomHud}
        data-layer="chrome"
        data-map-chrome
      >
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => zoomFromCenter(-1)}
          aria-label="Zoom out"
          data-interactive
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => zoomFromCenter(1)}
          aria-label="Zoom in"
          data-interactive
        >
          +
        </button>
      </div>
    </div>
  );
}
