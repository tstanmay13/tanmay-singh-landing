/**
 * A manual-clock Canvas 2D terrain ripple.
 *
 * The engine owns a private copy of the immutable base raster and writes only
 * bounded regions to the supplied terrain context. It never reads back the
 * destination canvas, and it intentionally has no animation scheduler.
 */

export const RIPPLE_MIN_CSS_RADIUS = 56;
export const RIPPLE_MAX_CSS_RADIUS = 96;
export const RIPPLE_MIN_DURATION_MS = 350;
export const RIPPLE_MAX_DURATION_MS = 500;
export const RIPPLE_MAX_ACTIVE = 3;
export const RIPPLE_MAX_DISPLACEMENT_TEXELS = 1.5;

export type RippleContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export interface RippleAxisScale {
  /** Rendered CSS pixels occupied by one source texel on the x axis. */
  readonly x: number;
  /** Rendered CSS pixels occupied by one source texel on the y axis. */
  readonly y: number;
}

export type RippleDisplayScale = number | RippleAxisScale;

export interface RippleSourceRadii {
  readonly x: number;
  readonly y: number;
}

export interface TerrainRippleInput {
  /** Ripple center in source-raster coordinates, not viewport coordinates. */
  readonly x: number;
  readonly y: number;
  /**
   * Desired radius on screen. Values are constrained to the 56–96px target
   * range before being converted into source-raster radii.
   */
  readonly cssRadius: number;
  /**
   * Measure this from the transformed terrain canvas. For a uniformly scaled
   * canvas, getBoundingClientRect().width / canvas.width is sufficient.
   */
  readonly cssPixelsPerSourceTexel: RippleDisplayScale;
  readonly startedAtMs?: number;
  readonly durationMs?: number;
  readonly ringCount?: 2 | 3;
}

export interface TerrainRippleOptions {
  readonly context: RippleContext;
  readonly baseImageData: ImageData;
  /**
   * Optional 0/1 mask matching the base raster. When supplied, displacement
   * never samples across a land/water boundary.
   */
  readonly landMask?: ArrayLike<number>;
  readonly reducedMotion?: boolean;
  readonly durationMs?: number;
  readonly ringCount?: 2 | 3;
  readonly maxDisplacementTexels?: number;
  /** Inject a clock for deterministic tests. */
  readonly now?: () => number;
}

export interface RippleRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TerrainRippleSnapshot {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly cssRadius: number;
  readonly sourceRadiusX: number;
  readonly sourceRadiusY: number;
  readonly cssPixelsPerSourceTexel: RippleAxisScale;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly ringCount: 2 | 3;
  readonly progress: number;
}

export interface TerrainRippleState {
  readonly activeCount: number;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  readonly ripples: readonly TerrainRippleSnapshot[];
}

export interface TerrainRippleFrame {
  readonly activeCount: number;
  readonly needsAnimationFrame: boolean;
  /** Bounding union for simple instrumentation; local writes use dirtyRects. */
  readonly dirtyRect: RippleRect | null;
  /** Separate local regions, so distant simultaneous ripples do not bridge. */
  readonly dirtyRects: readonly RippleRect[];
}

export interface TerrainRippleEngine {
  readonly activeCount: number;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  add(input: TerrainRippleInput): TerrainRippleSnapshot | null;
  render(nowMs?: number): TerrainRippleFrame;
  getState(nowMs?: number): TerrainRippleState;
  /**
   * Restores the last dirty area and freezes ripple time. Suitable for a
   * document.visibilityState === "hidden" handler.
   */
  pause(nowMs?: number): void;
  /** Continues existing ripples without charging hidden time to their decay. */
  resume(nowMs?: number): void;
  /** Clears all ripples and restores only their previous bounded dirty area. */
  reset(): readonly RippleRect[];
  /** Enabling reduced motion clears active animation; new ripples are ignored. */
  setReducedMotion(reduced: boolean): void;
}

type ActiveRipple = {
  id: number;
  x: number;
  y: number;
  cssRadius: number;
  scaleX: number;
  scaleY: number;
  startedAtMs: number;
  durationMs: number;
  ringCount: 2 | 3;
};

type PreparedRipple = ActiveRipple & {
  progress: number;
  frontRadiusCss: number;
  ringSpacingCss: number;
  ringHalfWidthCss: number;
  decay: number;
};

const DEFAULT_DURATION_MS = 420;
const DEFAULT_RING_COUNT = 3 as const;
const DEFAULT_MAX_DISPLACEMENT = 1.25;
const DIAGONAL_TEXEL_DISTANCE = Math.SQRT2;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function normalizeScale(scale: RippleDisplayScale): RippleAxisScale {
  const x = typeof scale === "number" ? scale : scale.x;
  const y = typeof scale === "number" ? scale : scale.y;
  finite(x, "Ripple display scale x");
  finite(y, "Ripple display scale y");
  if (x <= 0 || y <= 0) {
    throw new Error("Ripple display scale must be greater than zero.");
  }
  return Object.freeze({ x, y });
}

/**
 * Converts a circular CSS-space radius to source-raster radii. Separate axes
 * keep the visible ripple circular if CSS sizing is not perfectly uniform.
 */
export function cssRadiusToSourceRadii(
  cssRadius: number,
  cssPixelsPerSourceTexel: RippleDisplayScale,
): RippleSourceRadii {
  const radius = clamp(
    finite(cssRadius, "Ripple CSS radius"),
    RIPPLE_MIN_CSS_RADIUS,
    RIPPLE_MAX_CSS_RADIUS,
  );
  const scale = normalizeScale(cssPixelsPerSourceTexel);
  return Object.freeze({
    x: radius / scale.x,
    y: radius / scale.y,
  });
}

function defaultNow() {
  if (typeof performance !== "undefined") return performance.now();
  return Date.now();
}

function cloneMask(mask: ArrayLike<number> | undefined, pixelCount: number) {
  if (!mask) return null;
  if (mask.length !== pixelCount) {
    throw new Error("Ripple landMask dimensions must match baseImageData.");
  }
  const copy = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    copy[index] = mask[index] ? 1 : 0;
  }
  return copy;
}

function unionRect(
  first: RippleRect | null,
  second: RippleRect | null,
): RippleRect | null {
  if (!first) return second;
  if (!second) return first;
  const right = Math.max(
    first.x + first.width,
    second.x + second.width,
  );
  const bottom = Math.max(
    first.y + first.height,
    second.y + second.height,
  );
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function clipRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
  width: number,
  height: number,
): RippleRect | null {
  const x = clamp(Math.floor(left), 0, width);
  const y = clamp(Math.floor(top), 0, height);
  const clippedRight = clamp(Math.ceil(right), 0, width);
  const clippedBottom = clamp(Math.ceil(bottom), 0, height);
  if (clippedRight <= x || clippedBottom <= y) return null;
  return {
    x,
    y,
    width: clippedRight - x,
    height: clippedBottom - y,
  };
}

function rectsOverlap(first: RippleRect, second: RippleRect) {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
}

function mergeRects(rects: readonly RippleRect[]) {
  const merged: RippleRect[] = [];
  for (const rect of rects) {
    let candidate = rect;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      if (!rectsOverlap(candidate, merged[index])) continue;
      candidate = unionRect(candidate, merged[index]) as RippleRect;
      merged.splice(index, 1);
      index = merged.length;
    }
    merged.push(candidate);
  }
  return merged;
}

function easeOutQuadratic(progress: number) {
  return 1 - (1 - progress) * (1 - progress);
}

function prepareRipple(
  ripple: ActiveRipple,
  nowMs: number,
): PreparedRipple | null {
  const progress = (nowMs - ripple.startedAtMs) / ripple.durationMs;
  if (progress < 0 || progress >= 1) return null;
  const eased = easeOutQuadratic(progress);
  const smallerScale = Math.min(ripple.scaleX, ripple.scaleY);
  return {
    ...ripple,
    progress,
    frontRadiusCss: ripple.cssRadius * eased,
    ringSpacingCss: Math.max(3, ripple.cssRadius * 0.085),
    ringHalfWidthCss: clamp(smallerScale * 0.72, 1.2, 4),
    decay: (1 - progress) ** 1.25,
  };
}

function preparedBounds(
  ripple: PreparedRipple,
  width: number,
  height: number,
  maxDisplacement: number,
) {
  const radiusCss =
    ripple.frontRadiusCss +
    ripple.ringHalfWidthCss +
    Math.max(0, ripple.ringCount - 1) * 0.15;
  const radiusX = radiusCss / ripple.scaleX + maxDisplacement + 1;
  const radiusY = radiusCss / ripple.scaleY + maxDisplacement + 1;
  return clipRect(
    ripple.x - radiusX,
    ripple.y - radiusY,
    ripple.x + radiusX,
    ripple.y + radiusY,
    width,
    height,
  );
}

function snapshot(
  ripple: ActiveRipple,
  nowMs: number,
): TerrainRippleSnapshot {
  const progress = clamp(
    (nowMs - ripple.startedAtMs) / ripple.durationMs,
    0,
    1,
  );
  return Object.freeze({
    id: ripple.id,
    x: ripple.x,
    y: ripple.y,
    cssRadius: ripple.cssRadius,
    sourceRadiusX: ripple.cssRadius / ripple.scaleX,
    sourceRadiusY: ripple.cssRadius / ripple.scaleY,
    cssPixelsPerSourceTexel: Object.freeze({
      x: ripple.scaleX,
      y: ripple.scaleY,
    }),
    startedAtMs: ripple.startedAtMs,
    durationMs: ripple.durationMs,
    ringCount: ripple.ringCount,
    progress,
  });
}

function rippleDisplacement(
  x: number,
  y: number,
  ripple: PreparedRipple,
  maxDisplacement: number,
) {
  const dx = x + 0.5 - ripple.x;
  const dy = y + 0.5 - ripple.y;
  const distanceCss = Math.hypot(
    dx * ripple.scaleX,
    dy * ripple.scaleY,
  );
  if (distanceCss === 0) return { x: 0, y: 0 };

  let strength = 0;
  for (let ring = 0; ring < ripple.ringCount; ring += 1) {
    const radius = ripple.frontRadiusCss - ring * ripple.ringSpacingCss;
    if (radius <= 0) continue;
    const fromCenter = Math.abs(distanceCss - radius);
    if (fromCenter >= ripple.ringHalfWidthCss) continue;
    const band = 1 - fromCenter / ripple.ringHalfWidthCss;
    const ringWeight = 1 - ring * 0.18;
    const direction = ring % 2 === 0 ? 1 : -1;
    strength += direction * band * ringWeight;
  }

  if (strength === 0) return { x: 0, y: 0 };
  const sourceDistance = Math.hypot(dx, dy);
  const magnitude = clamp(
    strength * maxDisplacement * 0.78 * ripple.decay,
    -maxDisplacement,
    maxDisplacement,
  );
  return {
    x: (dx / sourceDistance) * magnitude,
    y: (dy / sourceDistance) * magnitude,
  };
}

/**
 * Converts sub-texel vector accumulation to a stable four/eight-direction
 * nearest-neighbor sample. The selected source texel is never more than the
 * configured displacement limit away.
 */
function quantizedOffset(
  x: number,
  y: number,
  maxDisplacement: number,
): readonly [number, number] {
  const magnitude = Math.hypot(x, y);
  if (magnitude < 0.5 || maxDisplacement < 1) return [0, 0];

  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const diagonal =
    maxDisplacement >= DIAGONAL_TEXEL_DISTANCE &&
    Math.min(absX, absY) / Math.max(absX, absY) > 0.42;
  if (diagonal) return [Math.sign(x), Math.sign(y)];
  return absX >= absY ? [Math.sign(x), 0] : [0, Math.sign(y)];
}

class CanvasTerrainRippleEngine implements TerrainRippleEngine {
  private readonly context: RippleContext;
  private readonly width: number;
  private readonly height: number;
  private readonly base: Uint8ClampedArray;
  private readonly mask: Uint8Array | null;
  private readonly clock: () => number;
  private readonly defaultDurationMs: number;
  private readonly defaultRingCount: 2 | 3;
  private readonly maxDisplacement: number;
  private ripples: ActiveRipple[] = [];
  private nextId = 1;
  private lastDirty: RippleRect[] = [];
  private pausedAtMs: number | null = null;
  private motionReduced: boolean;

  constructor(options: TerrainRippleOptions) {
    this.context = options.context;
    this.width = options.baseImageData.width;
    this.height = options.baseImageData.height;
    if (
      options.context.canvas.width !== this.width ||
      options.context.canvas.height !== this.height
    ) {
      throw new Error(
        "Ripple destination dimensions must match baseImageData.",
      );
    }

    this.base = new Uint8ClampedArray(options.baseImageData.data);
    this.mask = cloneMask(options.landMask, this.width * this.height);
    this.clock = options.now ?? defaultNow;
    this.defaultDurationMs = clamp(
      finite(
        options.durationMs ?? DEFAULT_DURATION_MS,
        "Default ripple duration",
      ),
      RIPPLE_MIN_DURATION_MS,
      RIPPLE_MAX_DURATION_MS,
    );
    this.defaultRingCount =
      options.ringCount === 2 ? 2 : DEFAULT_RING_COUNT;
    this.maxDisplacement = clamp(
      finite(
        options.maxDisplacementTexels ?? DEFAULT_MAX_DISPLACEMENT,
        "Ripple displacement",
      ),
      0,
      RIPPLE_MAX_DISPLACEMENT_TEXELS,
    );
    this.motionReduced = options.reducedMotion ?? false;
  }

  get activeCount() {
    return this.ripples.length;
  }

  get paused() {
    return this.pausedAtMs !== null;
  }

  get reducedMotion() {
    return this.motionReduced;
  }

  add(input: TerrainRippleInput) {
    if (this.motionReduced || this.pausedAtMs !== null) return null;
    const nowMs = input.startedAtMs ?? this.clock();
    finite(nowMs, "Ripple start time");
    finite(input.x, "Ripple source x");
    finite(input.y, "Ripple source y");
    const scale = normalizeScale(input.cssPixelsPerSourceTexel);
    const cssRadius = clamp(
      finite(input.cssRadius, "Ripple CSS radius"),
      RIPPLE_MIN_CSS_RADIUS,
      RIPPLE_MAX_CSS_RADIUS,
    );
    const durationMs = clamp(
      finite(
        input.durationMs ?? this.defaultDurationMs,
        "Ripple duration",
      ),
      RIPPLE_MIN_DURATION_MS,
      RIPPLE_MAX_DURATION_MS,
    );
    const ringCount = input.ringCount ?? this.defaultRingCount;

    this.ripples = this.ripples.filter(
      (ripple) => nowMs - ripple.startedAtMs < ripple.durationMs,
    );
    if (this.ripples.length >= RIPPLE_MAX_ACTIVE) {
      let oldestIndex = 0;
      for (let index = 1; index < this.ripples.length; index += 1) {
        if (
          this.ripples[index].startedAtMs <
          this.ripples[oldestIndex].startedAtMs
        ) {
          oldestIndex = index;
        }
      }
      this.ripples.splice(oldestIndex, 1);
    }

    const ripple: ActiveRipple = {
      id: this.nextId,
      x: input.x,
      y: input.y,
      cssRadius,
      scaleX: scale.x,
      scaleY: scale.y,
      startedAtMs: nowMs,
      durationMs,
      ringCount,
    };
    this.nextId += 1;
    this.ripples.push(ripple);
    return snapshot(ripple, nowMs);
  }

  render(nowMs = this.clock()): TerrainRippleFrame {
    finite(nowMs, "Ripple frame time");
    if (this.pausedAtMs !== null || this.motionReduced) {
      return Object.freeze({
        activeCount: this.ripples.length,
        needsAnimationFrame: false,
        dirtyRect: null,
        dirtyRects: Object.freeze([]),
      });
    }

    this.ripples = this.ripples.filter(
      (ripple) =>
        nowMs - ripple.startedAtMs < ripple.durationMs,
    );
    const prepared = this.ripples
      .map((ripple) => prepareRipple(ripple, nowMs))
      .filter((ripple): ripple is PreparedRipple => ripple !== null);

    const currentRects: RippleRect[] = [];
    for (const ripple of prepared) {
      const bounds = preparedBounds(
        ripple,
        this.width,
        this.height,
        this.maxDisplacement,
      );
      if (bounds) currentRects.push(bounds);
    }

    const currentDirty = mergeRects(currentRects);
    const dirtyRects = mergeRects([...this.lastDirty, ...currentDirty]);
    let dirty: RippleRect | null = null;
    for (const rect of dirtyRects) {
      this.paintRegion(rect, prepared);
      dirty = unionRect(dirty, rect);
    }
    this.lastDirty = currentDirty;

    return Object.freeze({
      activeCount: this.ripples.length,
      needsAnimationFrame: this.ripples.length > 0,
      dirtyRect: dirty ? Object.freeze({ ...dirty }) : null,
      dirtyRects: Object.freeze(
        dirtyRects.map((rect) => Object.freeze({ ...rect })),
      ),
    });
  }

  getState(nowMs = this.pausedAtMs ?? this.clock()): TerrainRippleState {
    finite(nowMs, "Ripple state time");
    const ripples = this.ripples
      .filter(
        (ripple) =>
          nowMs >= ripple.startedAtMs &&
          nowMs - ripple.startedAtMs < ripple.durationMs,
      )
      .map((ripple) => snapshot(ripple, nowMs));
    return Object.freeze({
      activeCount: ripples.length,
      paused: this.pausedAtMs !== null,
      reducedMotion: this.motionReduced,
      ripples: Object.freeze(ripples),
    });
  }

  pause(nowMs = this.clock()) {
    if (this.pausedAtMs !== null) return;
    finite(nowMs, "Ripple pause time");
    this.pausedAtMs = nowMs;
    this.restoreLastDirty();
  }

  resume(nowMs = this.clock()) {
    if (this.pausedAtMs === null) return;
    finite(nowMs, "Ripple resume time");
    const pausedDuration = Math.max(0, nowMs - this.pausedAtMs);
    for (const ripple of this.ripples) {
      ripple.startedAtMs += pausedDuration;
    }
    this.pausedAtMs = null;
  }

  reset() {
    this.ripples = [];
    return this.restoreLastDirty();
  }

  setReducedMotion(reduced: boolean) {
    if (reduced === this.motionReduced) return;
    this.motionReduced = reduced;
    if (reduced) this.reset();
  }

  private restoreLastDirty() {
    const dirtyRects = this.lastDirty;
    for (const dirty of dirtyRects) this.paintRegion(dirty, []);
    this.lastDirty = [];
    return Object.freeze(
      dirtyRects.map((dirty) => Object.freeze({ ...dirty })),
    );
  }

  private paintRegion(
    dirty: RippleRect,
    ripples: readonly PreparedRipple[],
  ) {
    const image = this.context.createImageData(dirty.width, dirty.height);
    const destination = image.data;

    for (let localY = 0; localY < dirty.height; localY += 1) {
      const y = dirty.y + localY;
      for (let localX = 0; localX < dirty.width; localX += 1) {
        const x = dirty.x + localX;
        const destinationOffset =
          (localY * dirty.width + localX) * 4;
        const baseIndex = y * this.width + x;

        let displacementX = 0;
        let displacementY = 0;
        for (const ripple of ripples) {
          const displacement = rippleDisplacement(
            x,
            y,
            ripple,
            this.maxDisplacement,
          );
          displacementX += displacement.x;
          displacementY += displacement.y;
        }

        const combinedMagnitude = Math.hypot(
          displacementX,
          displacementY,
        );
        if (combinedMagnitude > this.maxDisplacement) {
          const scale = this.maxDisplacement / combinedMagnitude;
          displacementX *= scale;
          displacementY *= scale;
        }

        const [offsetX, offsetY] = quantizedOffset(
          displacementX,
          displacementY,
          this.maxDisplacement,
        );
        const sampleX = clamp(x - offsetX, 0, this.width - 1);
        const sampleY = clamp(y - offsetY, 0, this.height - 1);
        let sampleIndex = sampleY * this.width + sampleX;
        if (
          this.mask &&
          this.mask[sampleIndex] !== this.mask[baseIndex]
        ) {
          sampleIndex = baseIndex;
        }
        const sampleOffset = sampleIndex * 4;

        destination[destinationOffset] = this.base[sampleOffset];
        destination[destinationOffset + 1] = this.base[sampleOffset + 1];
        destination[destinationOffset + 2] = this.base[sampleOffset + 2];
        destination[destinationOffset + 3] = this.base[sampleOffset + 3];
      }
    }

    this.context.putImageData(image, dirty.x, dirty.y);
  }
}

export function createTerrainRippleEngine(
  options: TerrainRippleOptions,
): TerrainRippleEngine {
  return new CanvasTerrainRippleEngine(options);
}
