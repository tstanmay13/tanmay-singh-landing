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
  CAMERA_TRANSITION_MS,
  LABEL_SETTLE_MS,
  boundsFromPoints,
  clampCameraDuration,
  clampCameraToBounds,
  fitCameraToBounds,
  interpolateCameraAboutAnchor,
  nextButtonZoomScale,
  panByScreenDelta,
  screenToWorld,
  usableViewportCenter,
  zoomAtScreenPoint,
  zoomAtUsableCenter,
  type Camera,
  type Point,
} from "@/lib/travel/camera";
import {
  COUNTRY_FOCUS_MIN_SCALE,
  COUNTRY_FOCUS_MIN_SPAN_X,
  COUNTRY_FOCUS_MIN_SPAN_Y,
  COUNTRY_FOCUS_SCALE,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  cityPoint,
  clamp,
  describeAtlasView,
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
  chapterTicks,
  pixelSteppedPath,
  polylinePoints,
} from "@/lib/travel/lifePath";
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
  onExplore: () => void;
  onReset: () => void;
};

type CameraAnimation = {
  from: Camera;
  to: Camera;
  start: number;
  duration: number;
  phase: CameraMotionPhase;
  anchor: Point;
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
const WHEEL_SETTLE_MS = 160;

function chromeExclusionRects(viewport: HTMLElement): ScreenRect[] {
  const origin = viewport.getBoundingClientRect();
  const root =
    viewport.closest("[data-map-mode]") ?? viewport.parentElement;
  if (!root) return [];
  return [...root.querySelectorAll(
    "header, nav[data-layer='chrome'], [data-layer='chrome'], [data-map-chrome], [role='dialog']",
  )]
    .map((node) => {
      const box = node.getBoundingClientRect();
      return {
        x: box.left - origin.left,
        y: box.top - origin.top,
        width: box.width,
        height: box.height,
      };
    })
    .filter((rect) => rect.width > 4 && rect.height > 4);
}

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

function pointDistance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function midpoint(left: Point, right: Point): Point {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

function resolvedThemeColor(name: string, root?: Element | null) {
  const color = getComputedStyle(root ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!color) throw new Error(`Missing travel terrain color token ${name}.`);
  return color;
}

function terrainPalette(root?: Element | null): TerrainPalette {
  return {
    water: {
      deep: resolvedThemeColor("--map-ocean-deep", root),
      mid: resolvedThemeColor("--map-ocean-deep", root),
      shallow: resolvedThemeColor("--map-ocean-coast", root),
      coast: resolvedThemeColor("--map-ocean-coast", root),
      inland: resolvedThemeColor("--map-ocean-inland", root),
      glint: resolvedThemeColor("--map-ocean-glint", root),
    },
    land: {
      shadow: resolvedThemeColor("--map-land-shadow", root),
      low: resolvedThemeColor("--map-land-low", root),
      mid: resolvedThemeColor("--map-land-mid", root),
      high: resolvedThemeColor("--map-land-high", root),
      coast: resolvedThemeColor("--map-land-coast", root),
      vegetation: resolvedThemeColor("--map-land-vegetation", root),
      forest: resolvedThemeColor("--map-land-forest", root),
      dry: resolvedThemeColor("--map-land-dry", root),
      dryDetail: resolvedThemeColor("--map-land-dry-detail", root),
      snow: resolvedThemeColor("--map-land-snow", root),
    },
  };
}

function chromeInsets(width: number, selected: boolean, height = 0) {
  const mobile = width <= 820;
  return {
    top: mobile ? (width <= 420 ? 220 : 192) : 152,
    right: selected && !mobile ? 348 : 20,
    bottom: selected && mobile ? height * 0.4 + 96 : mobile ? 76 : 64,
    left: 16,
  };
}

function overviewCamera(viewport: { width: number; height: number }): Camera {
  const mobile = viewport.width <= 820;
  return fitCameraToBounds(mobile
    ? { minX: 490, maxX: 820, minY: 275, maxY: 560 }
    : { minX: 220, maxX: 2380, minY: 160, maxY: 1000 }, viewport,
    { insets: chromeInsets(viewport.width, false), padding: 0.08, minScale: MIN_SCALE, maxScale: mobile ? 1 : 0.75 });
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
  if (entity.kind === "cluster") {
    return `${entity.label ?? entity.place.name} residence cluster. Activate to expand.`;
  }
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
  onExplore,
  onReset,
}: PixelMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const regionalCanvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<HTMLDivElement>(null);
  const terrainViewportRef = useRef<HTMLCanvasElement>(null);
  const terrainDrawKey = useRef("");
  const loopRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const wheelGestureRef = useRef<{zoom: boolean; time: number} | null>(null);
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
  const pinchedRef = useRef(false);
  const interactionRef = useRef<InteractionState>(createInteractionState());
  const rippleRef = useRef<TerrainRippleEngine | null>(null);
  const lastRippleRef = useRef({ x: 0, y: 0, time: 0 });
  const previousCameraRef = useRef<Camera | null>(null);
  const previousModeRef = useRef<TravelFilterMode>(mode);
  const initializedRef = useRef(false);
  const focusedHubRef = useRef<TravelHubId | null>(null);
  const placesRef = useRef(places);
  const selectedRef = useRef(selectedId);
  const focusCountryRef = useRef(focusCountry);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const onViewRef = useRef(onView);
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;
  const [ready, setReady] = useState(false);
  const [terrainError, setTerrainError] = useState(false);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [layoutScale, setLayoutScale] = useState(cameraRef.current.scale);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedHubId, setFocusedHubId] = useState<TravelHubId | null>(null);

  const [regionalLayer, setRegionalLayer] = useState({
    x: 0,
    y: 0,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    opacity: 0,
  });

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
      if (!hubId && !focusCountryRef.current) {
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
      const target = terrainViewportRef.current;
      const source = regionalCanvasRef.current;
      const drawKey = `${width},${height},${camera.x},${camera.y},${camera.scale},${ready}`;
      if (target && source && ready && terrainDrawKey.current !== drawKey) {
        terrainDrawKey.current = drawKey;
        const w = Math.ceil(width / 2), h = Math.ceil(height / 2);
        if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
        const context = target.getContext("2d");
        if (context) {
          context.imageSmoothingEnabled = false;
          context.clearRect(0, 0, w, h);
          context.drawImage(source, (width / 2 - camera.x * camera.scale) / 2,
            (height / 2 - camera.y * camera.scale) / 2,
            MAP_WIDTH * camera.scale / 2, MAP_HEIGHT * camera.scale / 2);
        }
      }
      node.style.transform = `translate3d(${
        width / 2 - camera.x * camera.scale
      }px, ${height / 2 - camera.y * camera.scale}px, 0) scale(${
        camera.scale
      })`;
      node.style.setProperty("--map-scale", String(camera.scale));
      // No inverse scaling: text and hit targets stay at native CSS resolution.
      pinsRef.current?.querySelectorAll<HTMLElement>("[data-world-x]").forEach((pin) => {
        const x = width / 2 + (Number(pin.dataset.worldX) - camera.x) * camera.scale;
        const y = height / 2 + (Number(pin.dataset.worldY) - camera.y) * camera.scale;
        pin.style.left = `${Math.round(x)}px`;
        pin.style.top = `${Math.round(y)}px`;
      });
      viewportRef.current?.setAttribute(
        "data-camera",
        `${camera.x.toFixed(4)},${camera.y.toFixed(4)},${camera.scale.toFixed(4)}`,
      );
      viewportRef.current?.setAttribute(
        "data-texel",
        Math.max(2, MAP_WIDTH / 4096 * camera.scale).toFixed(2),
      );
      const insets = chromeInsets(width, Boolean(selectedRef.current), height);
      const anchor = usableViewportCenter({ width, height }, insets);
      const worldAnchor = screenToWorld(anchor, camera, { width, height });
      viewportRef.current?.setAttribute(
        "data-anchor",
        `${worldAnchor.x.toFixed(3)},${worldAnchor.y.toFixed(3)}`,
      );
      const band = lodBandFromScale(camera.scale);
      viewportRef.current?.setAttribute("data-band", band);
      if (!animationRef.current && band !== bandRef.current) {
        bandRef.current = band;
        setLayoutScale(camera.scale);
      }
      if (publish) publishView();
    },
    [publishView, ready],
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
    setFocusedHubId(focusedHubRef.current);
    bandRef.current = lodBandFromScale(cameraRef.current.scale);
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
      setHoverTarget(null);
      setBusy(true);
    },
    [setBusy, setHoverTarget, syncInteraction],
  );

  const tickRef = useRef<(now: number) => boolean>(() => false);
  tickRef.current = (now) => {
    let keep = false;
    const animation = animationRef.current;
    if (animation && interactionRef.current.phase !== "dragging") {
      const progress = Math.min(1, (now - animation.start) / animation.duration);
      cameraRef.current = clampCamera(
        interpolateCameraAboutAnchor(
          animation.from,
          animation.to,
          progress,
          viewRef.current,
          animation.anchor,
        ),
      );
      if (progress >= 1) {
        cameraRef.current = clampCamera(animation.to);
        animationRef.current = null;
        scheduleSettle();
      } else {
        keep = true;
      }
    }

    if (dragRef.current || pinchRef.current) keep = true;
    const rippleFrame = rippleRef.current?.render(now);
    if (rippleFrame) {
      viewportRef.current?.setAttribute(
        "data-ripples",
        String(rippleFrame.activeCount),
      );
      if (rippleFrame.dirtyRects.length) terrainDrawKey.current = "";
      if (rippleFrame.needsAnimationFrame) keep = true;
    }
    applyCamera(false);
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
      duration = CAMERA_TRANSITION_MS,
      phase: CameraMotionPhase = "camera-animating",
    ) => {
      cancelCameraMotion();
      const to = clampCamera({
        ...target,
        scale: clamp(target.scale, MIN_SCALE, MAX_SCALE),
      });
      const from = { ...cameraRef.current };
      const insets = chromeInsets(
        viewRef.current.width,
        Boolean(selectedRef.current),
        viewRef.current.height,
      );
      const anchor = usableViewportCenter(viewRef.current, insets);
      const near =
        Math.hypot(from.x - to.x, from.y - to.y) < 1 &&
        Math.abs(from.scale - to.scale) < 0.005;
      if (near || reducedRef.current) {
        cameraRef.current = to;
        animationRef.current = null;
        applyCamera(true);
        bumpLayout();
        setFocusedHubId(focusedHubRef.current);
        setBusy(false);
        return;
      }
      animationRef.current = {
        from,
        to,
        start: performance.now(),
        duration: clampCameraDuration(duration),
        phase,
        anchor,
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
      if (!engine || reducedRef.current || document.hidden || cameraRef.current.scale < 1.5) return;
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
        x: (world.x / MAP_WIDTH) * 4096,
        y: (world.y / MAP_HEIGHT) * 2048,
      };
      const cssPixelsPerTexel =
        (MAP_WIDTH / 4096) * cameraRef.current.scale;
      engine.add({
        x: sourcePoint.x,
        y: sourcePoint.y,
        cssRadius: 60,
        cssPixelsPerSourceTexel: cssPixelsPerTexel,
        ringCount: 2,
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
    const canvas = regionalCanvasRef.current;
    if (!canvas) return;
    let live = true;
    setReady(false);
    rippleRef.current?.reset();
    rippleRef.current = null;
    terrainDrawKey.current = "";
    const image = new Image();
    image.onload = () => {
      if (!live) return;
      setTerrainError(false);
      const terrain = paintTerrain({ source: image, width: 4096, height: 2048,
        palette: terrainPalette(canvas.closest(`.${styles.root}`)) });
      canvas.width = terrain.width;
      canvas.height = terrain.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.putImageData(terrain.baseImageData, 0, 0);
      rippleRef.current = createTerrainRippleEngine({ context, baseImageData: terrain.baseImageData,
        landMask: terrain.landMask, reducedMotion: reducedRef.current, maxDisplacementTexels: 0.6 });
      setRegionalLayer({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT, opacity: 1 });
      setReady(true);
    };
    image.onerror = () => { if (live) setTerrainError(true); };
    image.src = "/travel/earth.jpg";

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
        activePointersRef.current.clear();
        dragRef.current = null;
        pinchRef.current = null;
        animationRef.current = null;
        interactionRef.current = createInteractionState({ selectedId: selectedRef.current });
        setBusy(false);
        syncInteraction();
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
  }, [startLoop, setBusy, syncInteraction]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const sync = () => {
      const rect = node.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      viewRef.current = next;
      setView(next);
      if (!initializedRef.current && next.width > 80) {
        initializedRef.current = true;
        cameraRef.current = overviewCamera(next);
      }
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
    if (selected.hubId) {
      focusedHubRef.current = selected.hubId;
    }
    startCameraAnimation(
      clampCamera(
        fitCameraToBounds(
          { minX: point.x, maxX: point.x, minY: point.y, maxY: point.y },
          viewRef.current,
          {
            insets: chromeInsets(viewRef.current.width, true, viewRef.current.height),
            padding: 0,
            minScale: Math.max(cameraRef.current.scale, 3.1),
            maxScale: MAX_SCALE,
            minSpanX: 36,
            minSpanY: 28,
          },
        ),
      ),
      CAMERA_TRANSITION_MS,
    );
  }, [selectedId, startCameraAnimation, viewReady, clampCamera]);

  useEffect(() => {
    if (!viewReady || focusTick < 1 || selectedRef.current) return;
    const code = focusCountryRef.current;
    if (!code) return;
    const bounds = boundsFromPoints(
      placesRef.current
        .filter((place) => place.countryCode === code)
        .map(cityPoint),
    );
    if (!bounds) return;
    focusedHubRef.current = null;
    const naturalSpan = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    startCameraAnimation(
      clampCamera(
        fitCameraToBounds(bounds, viewRef.current, {
          insets: chromeInsets(viewRef.current.width, false),
          padding: 0.22,
          minScale: COUNTRY_FOCUS_MIN_SCALE,
          maxScale: naturalSpan > 140 ? 2.48 : COUNTRY_FOCUS_SCALE,
          minSpanX: COUNTRY_FOCUS_MIN_SPAN_X,
          minSpanY: COUNTRY_FOCUS_MIN_SPAN_Y,
        }),
      ),
      CAMERA_TRANSITION_MS,
    );
  }, [focusTick, startCameraAnimation, viewReady, clampCamera]);

  useEffect(() => {
    if (!viewReady) return;
    setHoverTarget(null);
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
      startCameraAnimation(
        clampCamera(
          fitCameraToBounds(
            { minX, maxX, minY, maxY },
            viewRef.current,
            {
              insets: chromeInsets(viewRef.current.width, false),
              padding: 0.35,
              minScale: MIN_SCALE,
              maxScale: 2.45,
            },
          ),
        ),
        CAMERA_TRANSITION_MS,
      );
      return;
    }
    if (previous === "lived" && mode !== "lived" && previousCameraRef.current) {
      startCameraAnimation(previousCameraRef.current, CAMERA_TRANSITION_MS);
      previousCameraRef.current = null;
      return;
    }
    bumpLayout();
    publishView();
  }, [
    bumpLayout,
    clampCamera,
    mode,
    setHoverTarget,
    publishView,
    startCameraAnimation,
    viewReady,
  ]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      onExploreRef.current();
      const pendingScale = animationRef.current?.phase === "zooming" ? animationRef.current.to.scale : cameraRef.current.scale;
      cancelCameraMotion();
      const rect = node.getBoundingClientRect();
      const screenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const current = cameraRef.current;

      const now = performance.now();
      if (!wheelGestureRef.current || now - wheelGestureRef.current.time > WHEEL_SETTLE_MS) {
        wheelGestureRef.current = { zoom: wheelShouldZoom(event), time: now };
      }
      wheelGestureRef.current.time = now;
      if (wheelGestureRef.current.zoom) {
        const delta =
          event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? event.deltaY * 16
            : event.deltaY;
        const scale = clamp(
          pendingScale *
            Math.exp(-clamp(delta, -80, 80) * 0.0018),
          MIN_SCALE,
          MAX_SCALE,
        );
        const target = clampCamera(zoomAtScreenPoint(current, scale, screenPoint, viewRef.current));
        if (reducedRef.current) cameraRef.current = target;
        else animationRef.current = { from: {...current}, to: target, start: performance.now(), duration: 180, phase: "zooming", anchor: screenPoint };
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
    if (activePointersRef.current.size === 0) pinchedRef.current = false;
    activePointersRef.current.set(event.pointerId, point);
    cancelCameraMotion();
    setHoverTarget(null);
    setBusy(false);

    if (
      event.pointerType === "touch" &&
      activePointersRef.current.size === 2
    ) {
      pinchedRef.current = true;
      onExploreRef.current();
      const entries = [...activePointersRef.current.entries()];
      const [first, second] = entries;
      event.currentTarget.setPointerCapture(first[0]);
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
      onExploreRef.current();
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
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const remaining = cancelled ? undefined : [...activePointersRef.current.entries()][0];
      if (remaining) {
        const [id, point] = remaining;
        interactionRef.current = interactionReducer(interactionRef.current, { type: "POINTER_DOWN", pointerId: id, point });
        dragRef.current = { pointerId: id, startCamera: {...cameraRef.current}, lastPoint: point,
          lastTime: performance.now(), velocity: {x: 0, y: 0}, captured: true };
      } else {
        activePointersRef.current.clear();
        scheduleSettle();
      }
      syncInteraction();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = interactionRef.current.phase === "dragging";
    interactionRef.current = interactionReducer(interactionRef.current, {
      type: cancelled ? "POINTER_CANCEL" : "POINTER_UP",
      pointerId: event.pointerId,
    });
    if (cancelled || pinchedRef.current) interactionRef.current.suppressPointerClick = true;
    dragRef.current = null;
    if (
      drag.captured &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (
      wasDragging || cancelled
    ) {
      scheduleSettle();
    } else if (!wasDragging) {
      setBusy(false);
      applyCamera(true);
    }
    syncInteraction();
  };

  const zoomFromCenter = (direction: 1 | -1) => {
    onExploreRef.current();
    const base = animationRef.current?.phase === "zooming" ? animationRef.current.to : cameraRef.current;
    const scale = clamp(
      nextButtonZoomScale(base.scale, direction),
      MIN_SCALE,
      MAX_SCALE,
    );
    const insets = chromeInsets(
      viewRef.current.width,
      Boolean(selectedRef.current),
      viewRef.current.height,
    );
    startCameraAnimation(
      clampCamera(
        zoomAtUsableCenter(
          base,
          scale,
          viewRef.current,
          insets,
        ),
      ),
      CAMERA_TRANSITION_MS,
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
    onExploreRef.current();
    cancelCameraMotion();
    cameraRef.current = clampCamera(
      panByScreenDelta(cameraRef.current, delta),
    );
    applyCamera(true);
    finishMotion();
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
    startCameraAnimation(
      clampCamera(
        fitCameraToBounds(
          { minX, maxX, minY, maxY },
          viewRef.current,
          {
            insets: chromeInsets(viewRef.current.width, false),
            padding: 0.28,
            minScale: 3.2,
            maxScale: MAX_SCALE,
          },
        ),
      ),
      CAMERA_TRANSITION_MS,
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
    if (
      (entity.kind === "hub" || entity.kind === "cluster") &&
      bandRef.current !== "city" &&
      entity.hubId
    ) {
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
        focusedHubId,
      });
      const minimumDistance =
        level === "world" ? 34 : level === "country" ? 28 : 32;
      return spreadDenseEntities(
        built,
        layoutScale,
        minimumDistance,
      );
    },
    [focusedHubId, layoutScale, level, mode, places, selectedId],
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
      const hovered = false;
      const currentHome = entity.members.some(
        (place) => place.id === currentHomeId,
      );
      const pastLived =
        entity.kind === "place" && entity.place.relationship === "lived";
      const featuredHub =
        entity.kind === "hub" ||
        entity.kind === "cluster" ||
        entity.place.category === "hub";
      const significantDestination =
        entity.place.featured && entity.place.importance >= 90;
      const worldDestination =
        entity.place.featured && entity.place.importance >= 94;
      if (
        mode === "lived" &&
        entity.place.relationship === "visited" &&
        !entity.selected &&
        !hovered
      ) {
        continue;
      }
      const persistentPastLived =
        pastLived;
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
        name:
          entity.label ??
          entity.place.name.toLocaleUpperCase("en-US"),
        point: toScreen(entity),
        selected: entity.selected,
        currentHome,
        pastLived,
        hovered,
        focused: hovered,
        featuredHub,
        significantDestination,
        markerRadius: 25,
        estimatedHeight: entity.kind === "hub" && entity.count > 1 ? 34 : 24,
      });
    }

    const mobile = width <= 820;
    const measured = viewportRef.current
      ? chromeExclusionRects(viewportRef.current)
      : [];
    const reserved: ScreenRect[] =
      measured.length > 0
        ? measured
        : [
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
        worldLabelLimit: width <= 820 ? 4 : mode === "lived" ? 7 : 8,
        averageCharacterWidth: 8,
        labelHeight: 22,
        horizontalPadding: 10,
        collisionPadding: 4,
        markerRadius: 25,
      }).map((label) => [label.id, label]),
    );
  }, [
    currentHomeId,
    entities,
    focusedHubId,
    layoutVersion,
    level,
    mode,
    selectedId,
    view.height,
    view.width,
  ]);

  const residenceChapters = useMemo(
    () => getResidenceChapters().map((place) => cityPoint(place)),
    [],
  );
  const residencePath = useMemo(
    () => polylinePoints(pixelSteppedPath(residenceChapters)),
    [residenceChapters],
  );
  const residenceTicks = useMemo(
    () => chapterTicks(residenceChapters),
    [residenceChapters],
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
        the mouse wheel, or press plus and minus to zoom.         Use ALL, LIVED, or VISITED to change which story is emphasized.
        Activate a travel hub to reveal nearby places and activate a place to
        open its story. Escape closes an open place card.
      </p>
      {!ready ? <p className={styles.mapBoot} role="status">{terrainError ? "Terrain unavailable. Reload to try again." : "LOADING WORLD…"}</p> : null}
      <canvas ref={terrainViewportRef} className={styles.terrainViewport} aria-hidden="true" />

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
        <div className={styles.terrain} data-layer="terrain" style={{ visibility: "hidden" }}>
          <canvas
            ref={regionalCanvasRef}
            className={styles.regionEarth}
            style={{
              left: regionalLayer.x,
              top: regionalLayer.y,
              width: regionalLayer.width,
              height: regionalLayer.height,
              opacity: regionalLayer.opacity,
            }}
            aria-hidden="true"
            data-regional-terrain={regionalLayer.opacity > 0 ? "1" : "0"}
          />

        </div>

        <svg
          className={styles.routes}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          aria-hidden="true"
          data-layer="routes"
        >
          {entities.map(entity => {
            const point = cityPoint(entity.place);
            return Math.hypot(entity.x - point.x, entity.y - point.y) * layoutScale > 4
              ? <line key={`leader-${entity.id}`} className={styles.markerLeader}
                  x1={point.x} y1={point.y} x2={entity.x} y2={entity.y} /> : null;
          })}
          {mode === "lived" ? (
            <>
              <polyline
                className={styles.lifePath}
                points={residencePath}
                data-life-path
              />
              {residenceTicks.map((tick, index) => (
                <line
                  key={`tick-${index}`}
                  className={styles.lifePathTick}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                />
              ))}
            </>
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

      </div>
        <div ref={pinsRef} className={styles.pins} data-layer="pins">
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
                  left: Math.round(view.width / 2 + (entity.x - cameraRef.current.x) * cameraRef.current.scale),
                  top: Math.round(view.height / 2 + (entity.y - cameraRef.current.y) * cameraRef.current.scale),
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
                data-world-x={entity.x}
                data-world-y={entity.y}
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
                {entity.kind === "hub" &&
                entity.count > 1 &&
                mode !== "lived" ? (
                  <span className={styles.clusterCount} aria-hidden="true">
                    {entity.count}
                  </span>
                ) : null}
                {chapter && entity.kind === "place" ? (
                  <span className={styles.chapterBadge} aria-hidden="true">
                    {String(chapter).padStart(2, "0")}
                  </span>
                ) : null}
                {hovered && !selected ? (
                  <span className={styles.pinTooltip} role="tooltip">
                    {entity.label ??
                      entity.place.name.toLocaleUpperCase("en-US")}
                  </span>
                ) : null}
                {label && (!hovered || selected) ? (
                  <span
                    className={`${styles.pinLabel} ${labelClass(
                      label.placement,
                    )} ${selected ? styles.pinLabelOn : ""}`}
                  >
                    {entity.label ??
                      entity.place.name.toLocaleUpperCase("en-US")}
                    {entity.kind === "hub" &&
                    entity.count > 1 &&
                    mode !== "lived" ? (
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

      <div className={styles.crt} aria-hidden="true" />
      <div className={styles.mapHint} data-map-chrome>DRAG TO EXPLORE · SCROLL TO ZOOM</div>
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
        <button type="button" className={styles.zoomBtn} aria-label="Reset world view" data-interactive
          onClick={() => {
            onReset();
            focusCountryRef.current = null;
            focusedHubRef.current = null;
            setFocusedHubId(null);
            startCameraAnimation(overviewCamera(viewRef.current));
          }}>⌂</button>
      </div>
    </div>
  );
}
