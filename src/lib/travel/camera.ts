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

export const MIN_CAMERA_DURATION_MS = 450;
export const MAX_CAMERA_DURATION_MS = 650;
export const BUTTON_ZOOM_FACTOR = 1.18;
export const LABEL_SETTLE_MS = 180;
export const CAMERA_TRANSITION_MS = 520;

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

export function usableViewportCenter(
  viewport: Viewport,
  insets?: Partial<ViewInsets>,
): Point {
  const resolved = resolveInsets(insets);
  const width = Math.max(1, viewport.width - resolved.left - resolved.right);
  const height = Math.max(1, viewport.height - resolved.top - resolved.bottom);
  return {
    x: resolved.left + width / 2,
    y: resolved.top + height / 2,
  };
}

/**
 * Button zoom must keep the usable map center — not the geometric viewport
 * center under the HUD — stable in world space.
 */
export function zoomAtUsableCenter(
  camera: Camera,
  nextScale: number,
  viewport: Viewport,
  insets?: Partial<ViewInsets>,
): Camera {
  return zoomAtScreenPoint(
    camera,
    nextScale,
    usableViewportCenter(viewport, insets),
    viewport,
  );
}

/**
 * Interpolates scale and the world point under a screen anchor. Linearly
 * mixing camera.x/y/scale independently drifts that anchor during zoom.
 */
export function interpolateCameraAboutAnchor(
  from: Camera,
  to: Camera,
  progress: number,
  viewport: Viewport,
  anchor: Point,
  easing: EasingFunction = easeOutCubic,
): Camera {
  requirePositiveScale(from.scale);
  requirePositiveScale(to.scale);
  const eased = easing(clamp(progress, 0, 1));
  const worldFrom = screenToWorld(anchor, from, viewport);
  const worldTo = screenToWorld(anchor, to, viewport);
  const scale = Math.max(
    1e-6,
    from.scale + (to.scale - from.scale) * eased,
  );
  const world = {
    x: worldFrom.x + (worldTo.x - worldFrom.x) * eased,
    y: worldFrom.y + (worldTo.y - worldFrom.y) * eased,
  };
  return {
    x: world.x - (anchor.x - viewport.width / 2) / scale,
    y: world.y - (anchor.y - viewport.height / 2) / scale,
    scale,
  };
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

export type ViewInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type WorldBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type FitCameraOptions = {
  insets?: Partial<ViewInsets>;
  padding?: number;
  minScale?: number;
  maxScale?: number;
  /** Widens tiny country clusters so islands can fill the usable view. */
  minSpanX?: number;
  minSpanY?: number;
};

function resolveInsets(insets?: Partial<ViewInsets>): ViewInsets {
  return {
    top: insets?.top ?? 0,
    right: insets?.right ?? 0,
    bottom: insets?.bottom ?? 0,
    left: insets?.left ?? 0,
  };
}

export function boundsFromPoints(
  points: readonly Point[],
  pad = 0,
): WorldBounds | null {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
}

/**
 * Fits world bounds into the usable viewport, keeping the geographic center
 * in the inset-aware visual center rather than under the header.
 */
export function fitCameraToBounds(
  bounds: WorldBounds,
  viewport: Viewport,
  options: FitCameraOptions = {},
): Camera {
  const insets = resolveInsets(options.insets);
  const padding = options.padding ?? 0.2;
  const usableWidth = Math.max(1, viewport.width - insets.left - insets.right);
  const usableHeight = Math.max(1, viewport.height - insets.top - insets.bottom);
  const naturalWidth = Math.max(1, bounds.maxX - bounds.minX);
  const naturalHeight = Math.max(1, bounds.maxY - bounds.minY);
  const spanX = Math.max(
    options.minSpanX ?? 12,
    naturalWidth * (1 + padding),
  );
  const spanY = Math.max(
    options.minSpanY ?? 12,
    naturalHeight * (1 + padding),
  );
  const scale = clamp(
    Math.min(usableWidth / spanX, usableHeight / spanY),
    options.minScale ?? 0.42,
    options.maxScale ?? 6.4,
  );
  const worldCenterX = (bounds.minX + bounds.maxX) / 2;
  const worldCenterY = (bounds.minY + bounds.maxY) / 2;
  const usableCenterX = insets.left + usableWidth / 2;
  const usableCenterY = insets.top + usableHeight / 2;

  return {
    x: worldCenterX - (usableCenterX - viewport.width / 2) / scale,
    y: worldCenterY - (usableCenterY - viewport.height / 2) / scale,
    scale,
  };
}

export function nextButtonZoomScale(scale: number, direction: 1 | -1): number {
  return direction > 0
    ? scale * BUTTON_ZOOM_FACTOR
    : scale / BUTTON_ZOOM_FACTOR;
}
