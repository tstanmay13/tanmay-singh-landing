export type Point = {
  x: number;
  y: number;
};

export type Camera = {
  /** World coordinate displayed at the viewport center. */
  x: number;
  /** World coordinate displayed at the viewport center. */
  y: number;
  /** Screen pixels per world unit. */
  scale: number;
};

export type Viewport = {
  width: number;
  height: number;
};

export type MapBounds = {
  /** World-space left edge. Defaults to zero. */
  x?: number;
  /** World-space top edge. Defaults to zero. */
  y?: number;
  width: number;
  height: number;
};

export type EasingFunction = (progress: number) => number;

export const MIN_CAMERA_DURATION_MS = 400;
export const MAX_CAMERA_DURATION_MS = 700;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requirePositiveScale(scale: number): void {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("Camera scale must be a positive finite number.");
  }
}

export function screenToWorld(
  point: Point,
  camera: Camera,
  viewport: Viewport,
): Point {
  requirePositiveScale(camera.scale);
  return {
    x: camera.x + (point.x - viewport.width / 2) / camera.scale,
    y: camera.y + (point.y - viewport.height / 2) / camera.scale,
  };
}

export function worldToScreen(
  point: Point,
  camera: Camera,
  viewport: Viewport,
): Point {
  requirePositiveScale(camera.scale);
  return {
    x: viewport.width / 2 + (point.x - camera.x) * camera.scale,
    y: viewport.height / 2 + (point.y - camera.y) * camera.scale,
  };
}

/**
 * Changes scale while keeping the anchor's current world coordinate beneath
 * the same screen coordinate.
 */
export function zoomAtScreenPoint(
  camera: Camera,
  nextScale: number,
  anchor: Point,
  viewport: Viewport,
): Camera {
  requirePositiveScale(nextScale);
  const worldAnchor = screenToWorld(anchor, camera, viewport);

  return {
    x: worldAnchor.x - (anchor.x - viewport.width / 2) / nextScale,
    y: worldAnchor.y - (anchor.y - viewport.height / 2) / nextScale,
    scale: nextScale,
  };
}

export function zoomAtViewportCenter(
  camera: Camera,
  nextScale: number,
  viewport: Viewport,
): Camera {
  return zoomAtScreenPoint(
    camera,
    nextScale,
    { x: viewport.width / 2, y: viewport.height / 2 },
    viewport,
  );
}

/**
 * Pans by the distance the rendered map moved on screen. A positive x delta
 * moves the map right, so the camera center moves left in world space.
 */
export function panByScreenDelta(
  camera: Camera,
  screenDelta: Point,
): Camera {
  requirePositiveScale(camera.scale);
  return {
    ...camera,
    x: camera.x - screenDelta.x / camera.scale,
    y: camera.y - screenDelta.y / camera.scale,
  };
}

/**
 * Keeps the viewport inside map bounds. An axis is centered when the scaled
 * map is smaller than the viewport on that axis.
 */
export function clampCameraToBounds(
  camera: Camera,
  viewport: Viewport,
  bounds: MapBounds,
): Camera {
  requirePositiveScale(camera.scale);

  const left = bounds.x ?? 0;
  const top = bounds.y ?? 0;
  const centerX = left + bounds.width / 2;
  const centerY = top + bounds.height / 2;
  const halfViewWidth = viewport.width / (2 * camera.scale);
  const halfViewHeight = viewport.height / (2 * camera.scale);

  return {
    scale: camera.scale,
    x:
      bounds.width * camera.scale <= viewport.width
        ? centerX
        : clamp(camera.x, left + halfViewWidth, left + bounds.width - halfViewWidth),
    y:
      bounds.height * camera.scale <= viewport.height
        ? centerY
        : clamp(camera.y, top + halfViewHeight, top + bounds.height - halfViewHeight),
  };
}

export function easeOutCubic(progress: number): number {
  const t = clamp(progress, 0, 1);
  return 1 - (1 - t) ** 3;
}

export function interpolateCamera(
  from: Camera,
  to: Camera,
  progress: number,
  easing: EasingFunction = easeOutCubic,
): Camera {
  const eased = easing(clamp(progress, 0, 1));
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    scale: from.scale + (to.scale - from.scale) * eased,
  };
}

export function clampCameraDuration(durationMs: number): number {
  return clamp(durationMs, MIN_CAMERA_DURATION_MS, MAX_CAMERA_DURATION_MS);
}
