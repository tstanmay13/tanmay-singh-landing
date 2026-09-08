"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

type Pose = { x: number; y: number; zoom: number; reading?: boolean };
const INITIAL: Pose = { x: 0.5, y: 0.51, zoom: 1.08 };
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/** A demand-driven camera: React never re-renders on drag or animation frames. */
export function useRoomCamera() {
  const viewport = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const target = useRef<Pose>({ ...INITIAL });
  const current = useRef({ ...INITIAL });
  const size = useRef({ width: 1, height: 1, artWidth: 1, artHeight: 1 });
  const frame = useRef(0);
  const reduced = useRef(false);
  const wake = useRef<() => void>(() => {});
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const element = viewport.current;
    const artwork = scene.current;
    if (!element || !artwork) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = motion.matches;
    const motionChange = () => {
      reduced.current = motion.matches;
    };
    motion.addEventListener("change", motionChange);
    let previous = 0;
    const draw = (now: number) => {
      frame.current = 0;
      const dt = previous ? Math.min(now - previous, 64) : 16;
      previous = now;
      const amount =
        reduced.current || drag.current?.moved ? 1 : 1 - Math.exp(-dt / 125);
      const value = current.current;
      const destination = target.current;
      value.x += (destination.x - value.x) * amount;
      value.y += (destination.y - value.y) * amount;
      value.zoom += (destination.zoom - value.zoom) * amount;
      const { width, height, artWidth, artHeight } = size.current;
      const w = artWidth * value.zoom,
        h = artHeight * value.zoom;
      const anchorX = width / 2;
      const mobileReading =
        destination.reading &&
        (element.parentElement?.clientWidth ?? width) <= 760;
      const anchorY = mobileReading ? height * 0.28 : height / 2;
      const x = clamp(anchorX - value.x * w, width - w, 0);
      const y = clamp(
        anchorY - value.y * h,
        (mobileReading ? height * 0.49 : height) - h,
        0,
      );
      artwork.style.transform = `translate3d(${x}px,${y}px,0) scale(${value.zoom})`;
      artwork.style.setProperty("--camera-zoom", String(value.zoom));
      const remaining =
        Math.abs(value.x - destination.x) +
        Math.abs(value.y - destination.y) +
        Math.abs(value.zoom - destination.zoom);
      if (remaining > 0.0002 && !document.hidden)
        frame.current = requestAnimationFrame(draw);
      else previous = 0;
    };
    wake.current = () => {
      if (!frame.current && !document.hidden)
        frame.current = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      const artWidth = Math.max(width, (height * 1659) / 948);
      const artHeight = (artWidth * 948) / 1659;
      size.current = { width, height, artWidth, artHeight };
      artwork.style.width = `${artWidth}px`;
      artwork.style.height = `${artHeight}px`;
      wake.current();
    });
    resize.observe(element);
    const visibility = () => {
      element.dataset.sleeping = String(document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        previous = 0;
      } else wake.current();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      resize.disconnect();
      motion.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibility);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      wake.current = () => {};
    };
  }, []);

  const go = useCallback((pose: Pose) => {
    target.current = pose;
    wake.current();
  }, []);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || target.current.reading)
      return;
    suppressClick.current = false;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    if (
      !state.moved &&
      Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 7
    ) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    if (state.moved) {
      const { artWidth, artHeight, width, height } = size.current;
      const pose = target.current;
      const halfW = width / (2 * artWidth * pose.zoom),
        halfH = height / (2 * artHeight * pose.zoom);
      pose.x = clamp(
        pose.x - (event.clientX - state.x) / (artWidth * pose.zoom),
        halfW,
        1 - halfW,
      );
      pose.y = clamp(
        pose.y - (event.clientY - state.y) / (artHeight * pose.zoom),
        halfH,
        1 - halfH,
      );
      wake.current();
    }
    state.x = event.clientX;
    state.y = event.clientY;
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    suppressClick.current = drag.current.moved;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return {
    viewport,
    scene,
    go,
    gestures: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: pointerUp,
      onClickCapture: (event: React.MouseEvent) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      },
    },
  };
}
