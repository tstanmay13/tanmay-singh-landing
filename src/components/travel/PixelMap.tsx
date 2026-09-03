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
  clamp,
  countryPaths,
  fitScale,
  lodBandFromScale,
  pinScale,
  placePins,
  type LodBand,
} from "@/lib/travel/geo";
import styles from "./travel.module.css";

type Camera = { x: number; y: number; scale: number };

type PixelMapProps = {
  cities: CatalogCity[];
  selectedId: string | null;
  hoveredId: string | null;
  hereId: string | null;
  focusCountry: string | null;
  focusTick: number;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBand: (band: LodBand) => void;
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

function clampCam(cam: Camera, viewW: number, viewH: number): Camera {
  const marginX = viewW / (2 * cam.scale);
  const marginY = viewH / (2 * cam.scale);
  return {
    scale: cam.scale,
    x:
      MAP_WIDTH * cam.scale <= viewW
        ? MAP_WIDTH / 2
        : clamp(cam.x, marginX, MAP_WIDTH - marginX),
    y:
      MAP_HEIGHT * cam.scale <= viewH
        ? MAP_HEIGHT / 2
        : clamp(cam.y, marginY, MAP_HEIGHT - marginY),
  };
}

function wheelShouldZoom(event: WheelEvent) {
  return event.ctrlKey || event.metaKey;
}

export default function PixelMap({
  cities,
  selectedId,
  hoveredId,
  hereId,
  focusCountry,
  focusTick,
  reducedMotion,
  onSelect,
  onHover,
  onBand,
}: PixelMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const panRaf = useRef(0);
  const zoomEndTimer = useRef<number | null>(null);
  const bandRef = useRef<LodBand>("world");
  const viewRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{
    x: number;
    y: number;
    camX: number;
    camY: number;
    scale: number;
    moved: boolean;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
  } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    x: number;
    y: number;
    camX: number;
    camY: number;
  } | null>(null);
  const camRef = useRef<Camera>({
    x: ((-55 + 180) / 360) * MAP_WIDTH,
    y: ((90 - 32) / 180) * MAP_HEIGHT,
    scale: 1.28,
  });
  const citiesRef = useRef(cities);
  citiesRef.current = cities;
  const fittedRef = useRef(false);
  const onBandRef = useRef(onBand);
  onBandRef.current = onBand;

  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [layoutScale, setLayoutScale] = useState(1.28);

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
      onBandRef.current(nextBand);
    }
  }, []);

  const commit = useCallback(
    (next: Camera) => {
      camRef.current = clampCam(next, viewRef.current.w, viewRef.current.h);
      if (panRaf.current) return;
      panRaf.current = requestAnimationFrame(() => {
        panRaf.current = 0;
        applyCam();
      });
    },
    [applyCam],
  );

  const bumpLayout = useCallback(() => {
    setLayoutScale(camRef.current.scale);
  }, []);

  const scheduleLayout = useCallback(() => {
    if (zoomEndTimer.current) window.clearTimeout(zoomEndTimer.current);
    zoomEndTimer.current = window.setTimeout(bumpLayout, 140);
  }, [bumpLayout]);

  useLayoutEffect(() => {
    applyCam();
  }, [applyCam]);

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
      scale: 1.28,
    });
    applyCam();
    bumpLayout();
  }, [applyCam, bumpLayout, commit, view.h, view.w]);

  const stopAnim = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const flyTo = useCallback(
    (to: Camera) => {
      stopAnim();
      const target = clampCam(to, viewRef.current.w, viewRef.current.h);
      const from = { ...camRef.current };
      const near =
        Math.hypot(from.x - target.x, from.y - target.y) < 18 &&
        Math.abs(from.scale - target.scale) < 0.08;
      if (near) {
        commit(target);
        bumpLayout();
        return;
      }
      if (reducedMotion) {
        commit(target);
        applyCam();
        bumpLayout();
        return;
      }
      const start = performance.now();
      const duration = 320;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const ease = 1 - (1 - t) ** 3;
        camRef.current = clampCam(
          {
            x: from.x + (target.x - from.x) * ease,
            y: from.y + (target.y - from.y) * ease,
            scale: from.scale + (target.scale - from.scale) * ease,
          },
          viewRef.current.w,
          viewRef.current.h,
        );
        applyCam();
        if (t < 1) animRef.current = requestAnimationFrame(tick);
        else bumpLayout();
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [applyCam, bumpLayout, commit, reducedMotion],
  );

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
    const shift = (viewRef.current.w * 0.14) / camRef.current.scale;
    flyTo({
      x: pin.x + shift,
      y: pin.y,
      scale: camRef.current.scale < 1.7 ? 2.05 : camRef.current.scale,
    });
  }, [flyTo, selectedId, viewReady]);

  useEffect(() => {
    if (view.w < 80 || !focusCountry || selectedId) return;
    const group = citiesRef.current.filter((city) => city.countryCode === focusCountry);
    if (group.length === 0) return;
    const points = group.map((city) => ({
      x: ((city.lng + 180) / 360) * MAP_WIDTH,
      y: ((90 - city.lat) / 180) * MAP_HEIGHT,
    }));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    flyTo({
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      scale: fitScale(minX, maxX, minY, maxY, viewRef.current.w, viewRef.current.h, 0.55),
    });
    // Only recenter when the user picks a world, not when a card closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo, focusTick]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopAnim();
      const rect = node.getBoundingClientRect();
      const current = camRef.current;

      if (wheelShouldZoom(event)) {
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        const next = current.scale * Math.exp(-clamp(dy, -48, 48) * 0.0011);
        const scale = clamp(
          clamp(next, current.scale * 0.94, current.scale * 1.06),
          MIN_SCALE,
          MAX_SCALE,
        );
        const worldX = current.x + (mx - rect.width / 2) / current.scale;
        const worldY = current.y + (my - rect.height / 2) / current.scale;
        commit({
          scale,
          x: worldX - (mx - rect.width / 2) / scale,
          y: worldY - (my - rect.height / 2) / scale,
        });
        scheduleLayout();
        return;
      }

      commit({
        ...current,
        x: current.x + event.deltaX / current.scale,
        y: current.y + event.deltaY / current.scale,
      });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [commit, scheduleLayout]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    stopAnim();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      camX: camRef.current.x,
      camY: camRef.current.y,
      scale: camRef.current.scale,
      moved: false,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastT);
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    drag.vx = ((event.clientX - drag.lastX) / dt) * 16;
    drag.vy = ((event.clientY - drag.lastY) / dt) * 16;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastT = now;
    commit({
      scale: drag.scale,
      x: drag.camX - dx / drag.scale,
      y: drag.camY - dy / drag.scale,
    });
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || reducedMotion) return;
    if (Math.hypot(drag.vx, drag.vy) < 0.35) return;
    const decay = 0.9;
    const tick = () => {
      drag.vx *= decay;
      drag.vy *= decay;
      if (Math.hypot(drag.vx, drag.vy) < 0.08) return;
      const current = camRef.current;
      commit({
        ...current,
        x: current.x - drag.vx / current.scale,
        y: current.y - drag.vy / current.scale,
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    stopAnim();
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
    const worldX = pinch.camX + (mx - rect.width / 2) / pinch.scale;
    const worldY = pinch.camY + (my - rect.height / 2) / pinch.scale;
    commit({
      scale,
      x: worldX - (mx - rect.width / 2) / scale,
      y: worldY - (my - rect.height / 2) / scale,
    });
    scheduleLayout();
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const nudgeZoom = (dir: 1 | -1) => {
    stopAnim();
    const current = camRef.current;
    commit({
      ...current,
      scale: clamp(current.scale * (dir > 0 ? 1.22 : 0.82), MIN_SCALE, MAX_SCALE),
    });
    bumpLayout();
  };

  const band = lodBandFromScale(layoutScale);
  const explode = band === "close";
  const placed = useMemo(
    () => placePins(cities, layoutScale, selectedId, explode),
    [cities, explode, layoutScale, selectedId],
  );
  const paths = useMemo(() => countryPaths(cities), [cities]);
  const heroIds = useMemo(() => {
    const best = new Map<string, CatalogCity>();
    for (const city of cities) {
      const current = best.get(city.countryCode);
      if (!current || city.dwellMs > current.dwellMs) best.set(city.countryCode, city);
    }
    return new Set([...best.values()].map((city) => city.id));
  }, [cities]);

  const labels = useMemo(() => {
    const shown = new Map<string, "below" | "above">();
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
        shown.set(id, "below");
        boxes.push(below);
        return;
      }
      if (!collides(above)) {
        shown.set(id, "above");
        boxes.push(above);
      } else if (force) {
        shown.set(id, "below");
        boxes.push(below);
      }
    };

    const forced = placed.filter(
      (pin) => pin.city.id === selectedId || pin.city.id === hoveredId,
    );
    for (const pin of forced) {
      tryPlace(pin.city.id, pin.x, pin.y, pin.city.name, true);
    }

    if (band === "close") return shown;

    const optional = placed
      .filter((pin) => {
        if (shown.has(pin.city.id)) return false;
        const here = pin.members.some((city) => city.id === hereId);
        return here || heroIds.has(pin.city.id) || pin.stacked;
      })
      .sort((a, b) => b.city.dwellMs - a.city.dwellMs);

    for (const pin of optional) {
      tryPlace(pin.city.id, pin.x, pin.y, pin.city.name, false);
    }
    return shown;
  }, [band, hereId, heroIds, hoveredId, placed, selectedId, layoutScale, view.w, view.h]);

  return (
    <div
      ref={viewportRef}
      className={styles.mapViewport}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="application"
      aria-label="Pixel world map. Two-finger scroll pans, pinch or mouse wheel zooms, activate a node for that city."
    >
      {!ready ? <p className={styles.mapBoot}>LOADING WORLD…</p> : null}

      <div
        ref={worldRef}
        className={styles.world}
        style={{
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          ["--map-scale" as string]: String(camRef.current.scale),
        }}
      >
        <canvas
          ref={canvasRef}
          className={styles.earth}
          width={MAP_COLS}
          height={MAP_ROWS}
          aria-hidden
        />
        <svg
          className={styles.paths}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          aria-hidden
        >
          {paths.map((path) => (
            <polyline
              key={path.key}
              points={path.points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#fcbcb0"
              strokeWidth="3"
              strokeLinecap="square"
              strokeDasharray="10 12"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {placed.map((pin) => {
          const selected = pin.city.id === selectedId;
          const hovered = pin.city.id === hoveredId;
          const here = pin.members.some((city) => city.id === hereId);
          const label = labels.get(pin.city.id);
          return (
            <button
              key={pin.city.id}
              type="button"
              className={`${styles.pin} ${selected ? styles.pinOn : ""} ${here ? styles.pinHere : ""} ${pin.stacked ? styles.pinStack : ""}`}
              style={{
                left: pin.x,
                top: pin.y,
                zIndex: selected || hovered ? 6 : Math.round(pinScale(pin.city.dwellMs, false) * 10),
                ["--pin" as string]: String(pinScale(pin.city.dwellMs, selected)),
              }}
              aria-label={`${pin.city.name}${pin.stacked ? ` and ${pin.members.length - 1} nearby` : ""}${pin.city.admin ? `, ${pin.city.admin}` : ""}, ${pin.city.country}`}
              aria-pressed={selected}
              onClick={() => onSelect(pin.city.id)}
              onPointerEnter={() => onHover(pin.city.id)}
              onPointerLeave={() => onHover(null)}
              data-interactive
            >
              <span className={styles.node} />
              {label ? (
                <span
                  className={`${styles.pinLabel} ${label === "above" ? styles.pinLabelAbove : ""} ${hovered || selected ? styles.pinLabelHot : ""}`}
                >
                  {pin.city.name}
                  {pin.stacked ? ` ·${pin.members.length}` : ""}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

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
