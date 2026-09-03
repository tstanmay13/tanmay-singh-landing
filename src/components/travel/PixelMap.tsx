"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CatalogCity } from "@/content/travel/types";
import {
  MAP_COLS,
  MAP_HEIGHT,
  MAP_ROWS,
  MAP_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  COUNTRY_FOCUS_MIN_SCALE,
  COUNTRY_FOCUS_SCALE,
  clamp,
  clampCam,
  countryFrame,
  describeAtlasView,
  fitScale,
  lodBandFromScale,
  nextExplodeScale,
  pinScale,
  placePins,
  sparkleDelay,
  visibleCities,
  type AtlasView,
  type Camera,
  type LodBand,
  type PlacedPin,
} from "@/lib/travel/geo";
import styles from "./travel.module.css";

type PixelMapProps = {
  cities: CatalogCity[];
  selectedId: string | null;
  hoveredId: string | null;
  hereId: string | null;
  highlightCountry: string | null;
  focusCountry: string | null;
  focusTick: number;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onView: (view: AtlasView) => void;
};

function nesTerrain(r: number, g: number, b: number): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);

  if (lum > 208 && sat < 42) return [252, 252, 252];
  if (lum > 172 && sat < 30) return [188, 188, 188];

  const water = b > r + 10 && b >= g - 10;
  if (water) {
    if (lum < 50) return [0, 88, 248];
    if (lum < 90) return [92, 148, 252];
    return [168, 228, 252];
  }

  if (r > g + 8 && r > b + 18) {
    return lum > 138 ? [252, 216, 168] : [216, 136, 80];
  }
  if (r > 108 && g > 88 && b < 96 && Math.abs(r - g) < 42) {
    return lum > 128 ? [252, 188, 176] : [188, 148, 88];
  }

  if (lum < 52) return [0, 80, 0];
  if (lum < 92) return [0, 120, 0];
  if (lum < 136) return [0, 168, 0];
  return [168, 228, 88];
}

function paintWorld(canvas: HTMLCanvasElement, onDone: () => void) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    onDone();
    return;
  }

  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, MAP_COLS, MAP_ROWS);

  const img = new Image();
  img.src = "/travel/earth.jpg";
  img.onerror = onDone;
  img.onload = () => {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, MAP_COLS, MAP_ROWS);
    const image = ctx.getImageData(0, 0, MAP_COLS, MAP_ROWS);
    const data = image.data;
    const classified = new Uint8Array(MAP_COLS * MAP_ROWS);

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const [nr, ng, nb] = nesTerrain(data[i], data[i + 1], data[i + 2]);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
      data[i + 3] = 255;
      classified[p] = nb > nr + 40 && nb >= ng ? 0 : 1;
    }

    for (let y = 1; y < MAP_ROWS - 1; y += 1) {
      for (let x = 1; x < MAP_COLS - 1; x += 1) {
        const i = y * MAP_COLS + x;
        if (classified[i] !== 1) continue;
        const edge =
          classified[i - 1] === 0 ||
          classified[i + 1] === 0 ||
          classified[i - MAP_COLS] === 0 ||
          classified[i + MAP_COLS] === 0;
        if (!edge) continue;
        const pix = i * 4;
        data[pix] = 0;
        data[pix + 1] = 80;
        data[pix + 2] = 0;
      }
    }

    ctx.putImageData(image, 0, 0);
    onDone();
  };
}

function wheelShouldZoom(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return true;
  if (Math.abs(event.deltaX) >= 1 && Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 0.28) {
    return false;
  }
  return Math.abs(event.deltaY) > 0;
}

export default function PixelMap({
  cities,
  selectedId,
  hoveredId,
  hereId,
  highlightCountry,
  focusCountry,
  focusTick,
  reducedMotion,
  onSelect,
  onHover,
  onView,
}: PixelMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef(0);
  const panRaf = useRef(0);
  const zoomEndTimer = useRef<number | null>(null);
  const bandRef = useRef<LodBand>("world");
  const viewKeyRef = useRef("");
  const viewRef = useRef({ w: 0, h: 0 });
  const flashTimer = useRef<number | null>(null);
  const dragMoved = useRef(false);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const dragRef = useRef<{
    x: number;
    y: number;
    camX: number;
    camY: number;
    scale: number;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
    capturing: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    x: number;
    y: number;
    camX: number;
    camY: number;
  } | null>(null);
  const flyRef = useRef<{
    from: Camera;
    to: Camera;
    start: number;
    duration: number;
  } | null>(null);
  const zoomRef = useRef<{
    pivotX: number;
    pivotY: number;
    screenX: number;
    screenY: number;
    toScale: number;
  } | null>(null);
  const coastRef = useRef({ vx: 0, vy: 0 });
  const smearRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    skx: 0,
    sky: 0,
    tx: 0,
    ty: 0,
  });
  const camRef = useRef<Camera>({
    x: ((-55 + 180) / 360) * MAP_WIDTH,
    y: ((90 - 32) / 180) * MAP_HEIGHT,
    scale: 0.88,
  });
  const citiesRef = useRef(cities);
  citiesRef.current = cities;
  const fittedRef = useRef(false);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const focusCountryRef = useRef(focusCountry);
  focusCountryRef.current = focusCountry;

  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [layoutScale, setLayoutScale] = useState(0.88);

  const setBusy = (on: boolean) => {
    viewportRef.current?.setAttribute("data-busy", on ? "1" : "0");
  };
  const setGrab = (on: boolean) => {
    viewportRef.current?.setAttribute("data-grab", on ? "1" : "0");
  };

  const applyWarp = useCallback(() => {
    const warp = warpRef.current;
    const terrain = terrainRef.current;
    const smear = smearRef.current;
    if (!warp || !terrain) return;
    warp.style.transform = `translate3d(${smear.x.toFixed(2)}px, ${smear.y.toFixed(2)}px, 0)`;
    terrain.style.transform = `translate3d(${smear.tx.toFixed(2)}px, ${smear.ty.toFixed(2)}px, 0) skew(${smear.skx.toFixed(2)}deg, ${smear.sky.toFixed(2)}deg)`;
  }, []);

  const applyCam = useCallback(() => {
    const node = worldRef.current;
    const cam = camRef.current;
    const { w, h } = viewRef.current;
    if (!node || w < 8) return;
    node.style.transform = `translate3d(${w / 2 - cam.x * cam.scale}px, ${h / 2 - cam.y * cam.scale}px, 0) scale(${cam.scale})`;
    node.style.setProperty("--map-scale", String(cam.scale));
    const nextBand = lodBandFromScale(cam.scale);
    if (nextBand !== bandRef.current) {
      bandRef.current = nextBand;
      setLayoutScale(cam.scale);
    }
    const next = describeAtlasView(
      cam,
      w,
      h,
      citiesRef.current,
      selectedRef.current,
      focusCountryRef.current,
    );
    const key = `${next.title}|${next.kicker}|${next.countryCode ?? ""}|${next.cityId ?? ""}|${next.visibleCountryCodes.join(",")}`;
    if (key !== viewKeyRef.current) {
      viewKeyRef.current = key;
      onViewRef.current(next);
    }
  }, []);

  const commit = useCallback((next: Camera) => {
    camRef.current = clampCam(next, viewRef.current.w, viewRef.current.h);
    if (panRaf.current) return;
    panRaf.current = requestAnimationFrame(() => {
      panRaf.current = 0;
      applyCam();
    });
  }, [applyCam]);

  const bumpLayout = useCallback(() => {
    setLayoutScale(camRef.current.scale);
  }, []);

  const scheduleLayout = useCallback(() => {
    if (zoomEndTimer.current) window.clearTimeout(zoomEndTimer.current);
    zoomEndTimer.current = window.setTimeout(bumpLayout, 120);
  }, [bumpLayout]);

  const stopFly = () => {
    flyRef.current = null;
    zoomRef.current = null;
  };

  const driveSmear = (screenVx: number, screenVy: number, dragging: boolean) => {
    if (reducedRef.current) {
      smearRef.current = { x: 0, y: 0, vx: 0, vy: 0, skx: 0, sky: 0, tx: 0, ty: 0 };
      return;
    }
    const smear = smearRef.current;
    const follow = dragging ? 0.42 : 0.2;
    smear.x += (clamp(-screenVx * 0.11, -2.2, 2.2) - smear.x) * follow;
    smear.y += (clamp(-screenVy * 0.11, -2.2, 2.2) - smear.y) * follow;
    smear.tx += (clamp(-screenVx * 0.07, -1.4, 1.4) - smear.tx) * follow;
    smear.ty += (clamp(-screenVy * 0.07, -1.4, 1.4) - smear.ty) * follow;
    smear.skx += (clamp(screenVx * 0.012, -0.28, 0.28) - smear.skx) * follow;
    smear.sky += (clamp(screenVy * 0.012, -0.28, 0.28) - smear.sky) * follow;
  };

  const springSmear = () => {
    const smear = smearRef.current;
    if (reducedRef.current) {
      smear.x = smear.y = smear.tx = smear.ty = smear.skx = smear.sky = 0;
      smear.vx = smear.vy = 0;
      return false;
    }
    smear.vx += -smear.x * 0.34;
    smear.vy += -smear.y * 0.34;
    smear.vx *= 0.72;
    smear.vy *= 0.72;
    smear.x += smear.vx;
    smear.y += smear.vy;
    smear.tx += -smear.tx * 0.38;
    smear.ty += -smear.ty * 0.38;
    smear.skx += -smear.skx * 0.4;
    smear.sky += -smear.sky * 0.4;
    const live =
      Math.hypot(smear.x, smear.y) > 0.04 ||
      Math.hypot(smear.tx, smear.ty) > 0.04 ||
      Math.abs(smear.skx) > 0.01;
    if (!live) {
      smear.x = smear.y = smear.tx = smear.ty = smear.skx = smear.sky = 0;
      smear.vx = smear.vy = 0;
    }
    return live;
  };

  const tickRef = useRef<() => boolean>(() => false);
  tickRef.current = () => {
    const { w, h } = viewRef.current;
    let keep = false;
    const coast = coastRef.current;
    const dragging = Boolean(dragRef.current?.capturing);

    if (zoomRef.current && !dragging) {
      const zoom = zoomRef.current;
      const current = camRef.current;
      const scale = current.scale + (zoom.toScale - current.scale) * 0.24;
      const done = Math.abs(zoom.toScale - scale) < 0.004;
      camRef.current = clampCam(
        {
          scale: done ? zoom.toScale : scale,
          x: zoom.pivotX - (zoom.screenX - w / 2) / (done ? zoom.toScale : scale),
          y: zoom.pivotY - (zoom.screenY - h / 2) / (done ? zoom.toScale : scale),
        },
        w,
        h,
      );
      if (done) zoomRef.current = null;
      else keep = true;
    } else if (flyRef.current && !dragging) {
      const fly = flyRef.current;
      const t = Math.min(1, (performance.now() - fly.start) / fly.duration);
      const ease = 1 - (1 - t) ** 3;
      camRef.current = clampCam(
        {
          x: fly.from.x + (fly.to.x - fly.from.x) * ease,
          y: fly.from.y + (fly.to.y - fly.from.y) * ease,
          scale: fly.from.scale + (fly.to.scale - fly.from.scale) * ease,
        },
        w,
        h,
      );
      if (t >= 1) flyRef.current = null;
      else keep = true;
    } else if (!dragging && Math.hypot(coast.vx, coast.vy) > 0.08) {
      coast.vx *= 0.9;
      coast.vy *= 0.9;
      const current = camRef.current;
      camRef.current = clampCam(
        {
          ...current,
          x: current.x - coast.vx / current.scale,
          y: current.y - coast.vy / current.scale,
        },
        w,
        h,
      );
      driveSmear(coast.vx, coast.vy, false);
      if (Math.hypot(coast.vx, coast.vy) < 0.08) {
        coast.vx = 0;
        coast.vy = 0;
      } else keep = true;
    }

    if (dragging) {
      const drag = dragRef.current;
      if (drag) driveSmear(drag.vx, drag.vy, true);
      keep = true;
    } else if (!keep || Math.hypot(coast.vx, coast.vy) <= 0.08) {
      if (springSmear()) keep = true;
    }

    applyCam();
    applyWarp();
    const busy = dragging || Boolean(flyRef.current) || Math.hypot(coast.vx, coast.vy) > 0.08;
    setBusy(busy);
    if (!keep) {
      bumpLayout();
      setBusy(false);
    }
    return keep;
  };

  const startLoop = useCallback(() => {
    if (loopRef.current) return;
    const step = () => {
      loopRef.current = 0;
      if (tickRef.current()) loopRef.current = requestAnimationFrame(step);
    };
    loopRef.current = requestAnimationFrame(step);
  }, []);

  const flyTo = useCallback(
    (to: Camera, duration = 360) => {
      stopFly();
      coastRef.current = { vx: 0, vy: 0 };
      const target = clampCam(to, viewRef.current.w, viewRef.current.h);
      const from = { ...camRef.current };
      const near =
        Math.hypot(from.x - target.x, from.y - target.y) < 18 &&
        Math.abs(from.scale - target.scale) < 0.08;
      if (near || reducedRef.current) {
        commit(target);
        bumpLayout();
        return;
      }
      flyRef.current = { from, to: target, start: performance.now(), duration };
      startLoop();
    },
    [bumpLayout, commit, startLoop],
  );

  const zoomToward = useCallback(
    (screenX: number, screenY: number, nextScale: number) => {
      const current = camRef.current;
      const { w, h } = viewRef.current;
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const pivotX = current.x + (screenX - w / 2) / current.scale;
      const pivotY = current.y + (screenY - h / 2) / current.scale;
      flyRef.current = null;
      coastRef.current = { vx: 0, vy: 0 };
      if (reducedRef.current) {
        commit({
          scale,
          x: pivotX - (screenX - w / 2) / scale,
          y: pivotY - (screenY - h / 2) / scale,
        });
        bumpLayout();
        return;
      }
      zoomRef.current = { pivotX, pivotY, screenX, screenY, toScale: scale };
      startLoop();
      scheduleLayout();
    },
    [bumpLayout, commit, scheduleLayout, startLoop],
  );
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;

  useLayoutEffect(() => {
    applyCam();
  }, [applyCam]);

  useEffect(() => {
    applyCam();
  }, [applyCam, focusCountry, selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) paintWorld(canvas, () => setReady(true));
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      const next = { w: rect.width, h: rect.height };
      viewRef.current = next;
      setView(next);
      camRef.current = clampCam(camRef.current, next.w, next.h);
      applyCam();
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyCam]);

  useEffect(() => {
    if (fittedRef.current || view.w < 80 || view.h < 80) return;
    fittedRef.current = true;
    commit({
      x: ((-55 + 180) / 360) * MAP_WIDTH,
      y: ((90 - 32) / 180) * MAP_HEIGHT,
      scale: 0.88,
    });
    applyCam();
    bumpLayout();
  }, [applyCam, bumpLayout, commit, view.h, view.w]);

  const viewReady = view.w >= 80;
  useEffect(() => {
    if (!viewReady || !selectedId) return;
    const all = citiesRef.current;
    const selected = all.find((city) => city.id === selectedId);
    if (!selected) return;
    const pins = placePins(all, camRef.current.scale, selectedId, true);
    const pin = pins.find((item) => item.city.id === selectedId) ?? {
      x: ((selected.lng + 180) / 360) * MAP_WIDTH,
      y: ((90 - selected.lat) / 180) * MAP_HEIGHT,
    };
    const shift =
      viewRef.current.w > 820 ? (viewRef.current.w * 0.08) / camRef.current.scale : 0;
    flyToRef.current(
      {
        x: pin.x + shift,
        y: pin.y,
        scale: camRef.current.scale < 2.2 ? 2.7 : Math.max(camRef.current.scale, 2.7),
      },
      420,
    );
  }, [selectedId, viewReady]);

  useEffect(() => {
    if (!viewReady || focusTick < 1) return;
    const country = focusCountryRef.current;
    if (!country || selectedRef.current) return;
    const { w, h } = viewRef.current;
    if (w < 80 || h < 80) return;
    const group = citiesRef.current.filter((city) => city.countryCode === country);
    if (group.length === 0) return;
    const points = group.map((city) => ({
      x: ((city.lng + 180) / 360) * MAP_WIDTH,
      y: ((90 - city.lat) / 180) * MAP_HEIGHT,
    }));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    flyToRef.current(
      {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        scale: clamp(
          fitScale(minX, maxX, minY, maxY, w, h, 0.7),
          COUNTRY_FOCUS_MIN_SCALE,
          COUNTRY_FOCUS_SCALE,
        ),
      },
      480,
    );
    // Only the country-strip click (focusTick) should fly. viewReady is a
    // boolean so this array stays length 2 and does not retrigger on resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick, viewReady]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const current = camRef.current;

      if (wheelShouldZoom(event)) {
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        const from = zoomRef.current?.toScale ?? current.scale;
        const next = from * Math.exp(-clamp(dy, -48, 48) * 0.0011);
        const scale = clamp(
          clamp(next, from * 0.9, from * 1.1),
          MIN_SCALE,
          MAX_SCALE,
        );
        zoomToward(mx, my, scale);
        return;
      }

      stopFly();
      coastRef.current = { vx: 0, vy: 0 };
      commit({
        ...current,
        x: current.x + event.deltaX / current.scale,
        y: current.y + event.deltaY / current.scale,
      });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [commit, zoomToward]);

  useEffect(() => {
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      if (panRaf.current) cancelAnimationFrame(panRaf.current);
      if (zoomEndTimer.current) window.clearTimeout(zoomEndTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const flashPin = (id: string) => {
    const node = viewportRef.current?.querySelector(`[data-pin="${id}"]`);
    if (!(node instanceof HTMLElement)) return;
    node.classList.remove(styles.pinFlash);
    void node.offsetWidth;
    node.classList.add(styles.pinFlash);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      node.classList.remove(styles.pinFlash);
    }, 220);
  };

  const explodeCluster = (pin: PlacedPin) => {
    flyTo(
      {
        x: pin.x,
        y: pin.y,
        scale: nextExplodeScale(camRef.current.scale),
      },
      280,
    );
  };

  const activatePin = (pin: PlacedPin) => {
    if (dragMoved.current) return;
    const band = lodBandFromScale(camRef.current.scale);
    if (pin.stacked && band !== "city") {
      explodeCluster(pin);
      return;
    }
    flashPin(pin.city.id);
    onSelectRef.current(pin.city.id);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    if (event.button !== 0) return;
    if (pinchRef.current) return;
    if ((event.target as HTMLElement).closest(`.${styles.zoomHud}`)) return;
    stopFly();
    dragMoved.current = false;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      camX: camRef.current.x,
      camY: camRef.current.y,
      scale: camRef.current.scale,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
      capturing: false,
    };
    startLoop();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const drag = dragRef.current;
    if (!drag) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastT);
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 7) {
      if (!drag.capturing) {
        drag.capturing = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setGrab(true);
        onHoverRef.current(null);
      }
      if (!dragMoved.current) setBusy(true);
      dragMoved.current = true;
    } else if (!dragMoved.current) {
      return;
    }
    const instVx = ((event.clientX - drag.lastX) / dt) * 16;
    const instVy = ((event.clientY - drag.lastY) / dt) * 16;
    drag.vx = drag.vx * 0.65 + instVx * 0.35;
    drag.vy = drag.vy * 0.65 + instVy * 0.35;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastT = now;
    commit({
      scale: drag.scale,
      x: drag.camX - dx / drag.scale,
      y: drag.camY - dy / drag.scale,
    });
  };

  const endPan = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setGrab(false);
    if (!drag || !dragMoved.current || reducedRef.current) {
      setBusy(false);
      startLoop();
      return;
    }
    if (Math.hypot(drag.vx, drag.vy) < 0.42) {
      startLoop();
      return;
    }
    coastRef.current = { vx: drag.vx, vy: drag.vy };
    startLoop();
  };

  const onPointerUp = () => {
    endPan();
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) return;
    dragRef.current = null;
    dragMoved.current = true;
    setGrab(false);
    setBusy(false);
    stopFly();
    const [a, b] = [event.touches[0], event.touches[1]];
    pinchRef.current = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      scale: camRef.current.scale,
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
      camX: camRef.current.x,
      camY: camRef.current.y,
    };
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current;
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const node = viewportRef.current;
    if (!node) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const scale = clamp((pinch.scale * dist) / pinch.dist, MIN_SCALE, MAX_SCALE);
    const rect = node.getBoundingClientRect();
    const mx = (a.clientX + b.clientX) / 2 - rect.left;
    const my = (a.clientY + b.clientY) / 2 - rect.top;
    zoomToward(mx, my, scale);
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const nudgeZoom = (dir: 1 | -1) => {
    const { w, h } = viewRef.current;
    zoomToward(w / 2, h / 2, camRef.current.scale * (dir > 0 ? 1.28 : 0.78));
  };

  const onMapKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      nudgeZoom(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      nudgeZoom(-1);
      return;
    }
    const step = 56;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    stopFly();
    const cam = camRef.current;
    commit({
      ...cam,
      x: cam.x + dx / cam.scale,
      y: cam.y + dy / cam.scale,
    });
    bumpLayout();
  };

  const band = lodBandFromScale(layoutScale);
  const explode = band === "city";
  const shown = useMemo(
    () => visibleCities(cities, band, selectedId, highlightCountry),
    [band, cities, highlightCountry, selectedId],
  );
  const placed = useMemo(
    () => placePins(shown, layoutScale, selectedId, explode),
    [explode, layoutScale, selectedId, shown],
  );
  const highlightOnScreen = useMemo(() => {
    if (!highlightCountry) return false;
    const cam = camRef.current;
    const { w, h } = viewRef.current;
    void layoutScale;
    void view.w;
    void view.h;
    return placed.some((pin) => {
      if (!pin.members.some((city) => city.countryCode === highlightCountry)) return false;
      const sx = w / 2 + (pin.x - cam.x) * cam.scale;
      const sy = h / 2 + (pin.y - cam.y) * cam.scale;
      return sx > 24 && sx < w - 24 && sy > 24 && sy < h - 24;
    });
  }, [highlightCountry, placed, layoutScale, view.w, view.h]);
  const heroIds = useMemo(() => {
    const best = new Map<string, CatalogCity>();
    for (const city of cities) {
      const current = best.get(city.countryCode);
      if (!current || city.dwellMs > current.dwellMs) best.set(city.countryCode, city);
    }
    return new Set([...best.values()].map((city) => city.id));
  }, [cities]);
  const frame = useMemo(
    () => (highlightCountry ? countryFrame(cities, highlightCountry) : null),
    [cities, highlightCountry],
  );

  const labels = useMemo(() => {
    const shownLabels = new Map<string, "below" | "above">();
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const cam = camRef.current;
    const { w: vw, h: vh } = viewRef.current;
    const toScreen = (x: number, y: number) => ({
      x: vw / 2 + (x - cam.x) * cam.scale,
      y: vh / 2 + (y - cam.y) * cam.scale,
    });
    const collides = (box: (typeof boxes)[number]) =>
      boxes.some(
        (other) =>
          box.x < other.x + other.w + 8 &&
          box.x + box.w + 8 > other.x &&
          box.y < other.y + other.h + 6 &&
          box.y + box.h + 6 > other.y,
      );
    const tryPlace = (id: string, x: number, y: number, name: string, force: boolean) => {
      const screen = toScreen(x, y);
      const width = name.length * 7.4 + 16;
      const height = 16;
      const below = { x: screen.x - width / 2, y: screen.y + 16, w: width, h: height };
      const above = { x: screen.x - width / 2, y: screen.y - 28, w: width, h: height };
      if (force || !collides(below)) {
        shownLabels.set(id, "below");
        boxes.push(below);
        return;
      }
      if (!collides(above)) {
        shownLabels.set(id, "above");
        boxes.push(above);
      } else if (force) {
        shownLabels.set(id, "below");
        boxes.push(below);
      }
    };

    const forced = placed.filter(
      (pin) =>
        pin.city.id === selectedId ||
        pin.city.id === hoveredId ||
        (highlightCountry && pin.city.countryCode === highlightCountry && heroIds.has(pin.city.id)),
    );
    for (const pin of forced) {
      tryPlace(pin.city.id, pin.x, pin.y, pin.city.name, true);
    }

    if (band === "world") return shownLabels;

    const optional = placed
      .filter((pin) => {
        if (shownLabels.has(pin.city.id)) return false;
        if (band === "region") {
          return heroIds.has(pin.city.id) || pin.stacked || pin.members.some((city) => city.id === hereId);
        }
        return true;
      })
      .sort((a, b) => b.city.dwellMs - a.city.dwellMs);

    for (const pin of optional) {
      tryPlace(pin.city.id, pin.x, pin.y, pin.city.name, false);
    }
    void layoutScale;
    void view.w;
    void view.h;
    return shownLabels;
  }, [band, hereId, heroIds, highlightCountry, hoveredId, placed, selectedId, layoutScale, view.w, view.h]);

  return (
    <div
      ref={viewportRef}
      className={styles.mapViewport}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onKeyDown={onMapKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Pixel world map of places I've been. Drag to pan, pinch or plus minus to zoom, activate a node for that city."
    >
      {!ready ? <p className={styles.mapBoot}>LOADING WORLD…</p> : null}

      <div ref={warpRef} className={styles.mapWarp}>
        <div
          ref={worldRef}
          className={styles.world}
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            ["--map-scale" as string]: String(camRef.current.scale),
          }}
        >
          <div ref={terrainRef} className={styles.terrain}>
            <canvas
              ref={canvasRef}
              className={styles.earth}
              width={MAP_COLS}
              height={MAP_ROWS}
              aria-hidden
            />
            {reducedMotion ? null : <div className={styles.ocean} aria-hidden />}
          </div>
          {frame ? (
            <div
              className={styles.countryFrame}
              style={{
                left: frame.minX,
                top: frame.minY,
                width: frame.w,
                height: frame.h,
              }}
              aria-hidden
            />
          ) : null}
          {placed.map((pin) => {
            const selected = pin.city.id === selectedId;
            const hovered = pin.city.id === hoveredId;
            const here = pin.members.some((city) => city.id === hereId);
            const hotCountry = Boolean(
              highlightCountry && pin.members.some((city) => city.countryCode === highlightCountry),
            );
            const dim = Boolean(highlightOnScreen && !hotCountry && !selected && !hovered);
            const label = labels.get(pin.city.id);
            return (
              <button
                key={pin.city.id}
                type="button"
                className={[
                  styles.pin,
                  selected ? styles.pinOn : "",
                  here ? styles.pinHere : "",
                  pin.stacked ? styles.pinStack : "",
                  hotCountry ? styles.pinHi : "",
                  dim ? styles.pinDim : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: pin.x,
                  top: pin.y,
                  zIndex: selected || hovered || hotCountry ? 6 : Math.round(pinScale(pin.city.dwellMs, false) * 10),
                  ["--pin" as string]: String(pinScale(pin.city.dwellMs, selected)),
                  ["--sparkle" as string]: sparkleDelay(pin.city.id),
                }}
                aria-label={
                  pin.stacked
                    ? `${pin.members.length} places near ${pin.city.name}. Zoom in to separate.`
                    : `${pin.city.name}${pin.city.admin ? `, ${pin.city.admin}` : ""}, ${pin.city.country}`
                }
                aria-pressed={selected}
                data-pin={pin.city.id}
                data-country={pin.city.countryCode}
                data-interactive
                onClick={() => activatePin(pin)}
                onPointerEnter={() => {
                  if (!dragRef.current) onHover(pin.city.id);
                }}
                onPointerLeave={() => onHover(null)}
              >
                <span className={styles.node} />
                {selected ? <span className={styles.reticle} aria-hidden /> : null}
                {pin.stacked ? (
                  <span className={styles.clusterCount}>{pin.members.length}</span>
                ) : null}
                {label ? (
                  <span
                    className={`${styles.pinLabel} ${label === "above" ? styles.pinLabelAbove : ""} ${hovered || selected || hotCountry ? styles.pinLabelHot : ""}`}
                  >
                    {pin.city.name}
                    {pin.stacked ? ` ·${pin.members.length}` : ""}
                  </span>
                ) : hovered ? (
                  <span className={`${styles.pinLabel} ${styles.pinLabelHot}`}>{pin.city.name}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.crt} aria-hidden />

      <div className={styles.zoomHud}>
        <button type="button" className={styles.zoomBtn} onClick={() => nudgeZoom(-1)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={styles.zoomBtn} onClick={() => nudgeZoom(1)} aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
