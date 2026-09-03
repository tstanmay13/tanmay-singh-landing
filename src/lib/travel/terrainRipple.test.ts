import { describe, expect, it } from "vitest";

import {
  RIPPLE_MAX_ACTIVE,
  RIPPLE_MAX_CSS_RADIUS,
  RIPPLE_MAX_DURATION_MS,
  RIPPLE_MIN_CSS_RADIUS,
  RIPPLE_MIN_DURATION_MS,
  createTerrainRippleEngine,
  cssRadiusToSourceRadii,
  type RippleContext,
  type RippleRect,
  type TerrainRippleOptions,
} from "./terrainRipple";

interface ImageDataLike {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

interface ImageWrite {
  readonly image: ImageDataLike;
  readonly x: number;
  readonly y: number;
}

class FakeCanvasContext {
  readonly canvas: { width: number; height: number };
  readonly writes: ImageWrite[] = [];

  constructor(width: number, height: number) {
    this.canvas = { width, height };
  }

  createImageData(width: number, height: number): ImageDataLike {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    };
  }

  putImageData(image: ImageDataLike, x: number, y: number) {
    this.writes.push({
      image: {
        data: new Uint8ClampedArray(image.data),
        width: image.width,
        height: image.height,
      },
      x,
      y,
    });
  }

  clearWrites() {
    this.writes.length = 0;
  }

  asRippleContext(): RippleContext {
    return this as unknown as RippleContext;
  }
}

function createCoordinateRaster(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = x;
      data[offset + 1] = y;
      data[offset + 2] = (x + y) % 256;
      data[offset + 3] = 255;
    }
  }
  return { data, width, height } as unknown as ImageData;
}

function createHarness(
  width = 192,
  height = 128,
  options: Omit<
    TerrainRippleOptions,
    "context" | "baseImageData"
  > = {},
) {
  const context = new FakeCanvasContext(width, height);
  const baseImageData = createCoordinateRaster(width, height);
  const engine = createTerrainRippleEngine({
    context: context.asRippleContext(),
    baseImageData,
    now: () => 0,
    ...options,
  });
  return { baseImageData, context, engine };
}

function rectForWrite(write: ImageWrite): RippleRect {
  return {
    x: write.x,
    y: write.y,
    width: write.image.width,
    height: write.image.height,
  };
}

function sourceCoordinateAt(
  context: FakeCanvasContext,
  x: number,
  y: number,
) {
  const write = [...context.writes].reverse().find(
    (candidate) =>
      x >= candidate.x &&
      x < candidate.x + candidate.image.width &&
      y >= candidate.y &&
      y < candidate.y + candidate.image.height,
  );
  if (!write) throw new Error(`No write contains (${x}, ${y}).`);
  const localX = x - write.x;
  const localY = y - write.y;
  const offset = (localY * write.image.width + localX) * 4;
  return {
    x: write.image.data[offset],
    y: write.image.data[offset + 1],
  };
}

function expectWriteToMatchBase(
  write: ImageWrite,
  baseImageData: ImageData,
) {
  for (let localY = 0; localY < write.image.height; localY += 1) {
    for (let localX = 0; localX < write.image.width; localX += 1) {
      const destinationOffset =
        (localY * write.image.width + localX) * 4;
      const sourceOffset =
        ((write.y + localY) * baseImageData.width +
          write.x +
          localX) *
        4;
      expect(
        Array.from(
          write.image.data.subarray(
            destinationOffset,
            destinationOffset + 4,
          ),
        ),
      ).toEqual(
        Array.from(
          baseImageData.data.subarray(sourceOffset, sourceOffset + 4),
        ),
      );
    }
  }
}

function addStandardRipple(
  engine: ReturnType<typeof createTerrainRippleEngine>,
  overrides: Partial<Parameters<typeof engine.add>[0]> = {},
) {
  return engine.add({
    x: 80,
    y: 60,
    cssRadius: 56,
    cssPixelsPerSourceTexel: 4,
    startedAtMs: 0,
    durationMs: 350,
    ...overrides,
  });
}

describe("terrain ripple sizing and lifecycle", () => {
  it("clamps CSS radius to 56–96px before converting each source axis", () => {
    expect(RIPPLE_MIN_CSS_RADIUS).toBe(56);
    expect(RIPPLE_MAX_CSS_RADIUS).toBe(96);
    expect(cssRadiusToSourceRadii(12, { x: 2, y: 4 })).toEqual({
      x: 28,
      y: 14,
    });
    expect(cssRadiusToSourceRadii(120, { x: 2, y: 4 })).toEqual({
      x: 48,
      y: 24,
    });

    const { engine } = createHarness();
    const ripple = addStandardRipple(engine, {
      cssRadius: 120,
      cssPixelsPerSourceTexel: { x: 2, y: 4 },
    });
    expect(ripple).toMatchObject({
      cssRadius: 96,
      sourceRadiusX: 48,
      sourceRadiusY: 24,
    });
  });

  it("keeps at most three active ripples and drops the oldest timestamp", () => {
    const { engine } = createHarness();
    const first = addStandardRipple(engine, { startedAtMs: 20 });
    const oldest = addStandardRipple(engine, { startedAtMs: 0 });
    const third = addStandardRipple(engine, { startedAtMs: 10 });
    const newest = addStandardRipple(engine, { startedAtMs: 30 });

    expect(RIPPLE_MAX_ACTIVE).toBe(3);
    expect(engine.activeCount).toBe(3);
    expect(engine.getState(30).ripples.map(({ id }) => id)).toEqual([
      first?.id,
      third?.id,
      newest?.id,
    ]);
    expect(engine.getState(30).ripples.map(({ id }) => id)).not.toContain(
      oldest?.id,
    );
  });

  it("clamps duration to 350–500ms and restores the raster at completion", () => {
    const durationHarness = createHarness();
    expect(
      addStandardRipple(durationHarness.engine, { durationMs: 1 })
        ?.durationMs,
    ).toBe(RIPPLE_MIN_DURATION_MS);
    expect(
      addStandardRipple(durationHarness.engine, {
        startedAtMs: 1,
        durationMs: 1_000,
      })?.durationMs,
    ).toBe(RIPPLE_MAX_DURATION_MS);

    const { baseImageData, context, engine } = createHarness(96, 96);
    addStandardRipple(engine, {
      x: 48,
      y: 48,
      durationMs: RIPPLE_MIN_DURATION_MS,
    });
    const midFrame = engine.render(RIPPLE_MIN_DURATION_MS / 2);
    expect(engine.getState(RIPPLE_MIN_DURATION_MS / 2).ripples[0].progress)
      .toBe(0.5);
    expect(midFrame.activeCount).toBe(1);

    context.clearWrites();
    const completed = engine.render(RIPPLE_MIN_DURATION_MS);
    expect(completed).toMatchObject({
      activeCount: 0,
      needsAnimationFrame: false,
      dirtyRects: midFrame.dirtyRects,
    });
    expect(context.writes.map(rectForWrite)).toEqual(midFrame.dirtyRects);
    for (const write of context.writes) {
      expectWriteToMatchBase(write, baseImageData);
    }
  });

  it("supports two or three rings and renders the third ring distinctly", () => {
    const twoRingHarness = createHarness(64, 64, {
      ringCount: 2,
      maxDisplacementTexels: 1.5,
    });
    const threeRingHarness = createHarness(64, 64, {
      ringCount: 2,
      maxDisplacementTexels: 1.5,
    });
    const twoRings = addStandardRipple(twoRingHarness.engine, {
      x: 32,
      y: 32.5,
      cssPixelsPerSourceTexel: 2,
    });
    const threeRings = addStandardRipple(threeRingHarness.engine, {
      x: 32,
      y: 32.5,
      cssPixelsPerSourceTexel: 2,
      ringCount: 3,
    });

    expect(twoRings?.ringCount).toBe(2);
    expect(threeRings?.ringCount).toBe(3);
    twoRingHarness.engine.render(RIPPLE_MIN_DURATION_MS / 4);
    threeRingHarness.engine.render(RIPPLE_MIN_DURATION_MS / 4);
    expect(sourceCoordinateAt(twoRingHarness.context, 39, 32)).toEqual({
      x: 39,
      y: 32,
    });
    expect(sourceCoordinateAt(threeRingHarness.context, 39, 32)).toEqual({
      x: 38,
      y: 32,
    });
  });

  it("excludes paused hidden time from ripple progress", () => {
    let now = 0;
    const { engine } = createHarness(128, 96, {
      now: () => now,
    });
    addStandardRipple(engine, {
      x: 64,
      y: 48,
      durationMs: 500,
    });

    now = 100;
    engine.render();
    engine.pause();
    expect(engine.getState().ripples[0].progress).toBe(0.2);

    now = 1_100;
    engine.resume();
    expect(engine.getState().ripples[0]).toMatchObject({
      startedAtMs: 1_000,
      progress: 0.2,
    });

    now = 1_499;
    expect(engine.render().activeCount).toBe(1);
    now = 1_500;
    expect(engine.render()).toMatchObject({
      activeCount: 0,
      needsAnimationFrame: false,
    });
  });
});

describe("terrain ripple bounded raster writes", () => {
  it("keeps distant dirty regions separate and samples within each local write", () => {
    const { context, engine } = createHarness(192, 128, {
      maxDisplacementTexels: 1.5,
    });
    addStandardRipple(engine, { x: 30, y: 64 });
    addStandardRipple(engine, { x: 162, y: 64 });

    const frame = engine.render(RIPPLE_MIN_DURATION_MS / 2);
    expect(frame.dirtyRects).toHaveLength(2);
    expect(context.writes.map(rectForWrite)).toEqual(frame.dirtyRects);

    for (const write of context.writes) {
      const right = write.x + write.image.width;
      const bottom = write.y + write.image.height;
      for (let offset = 0; offset < write.image.data.length; offset += 4) {
        const sampledX = write.image.data[offset];
        const sampledY = write.image.data[offset + 1];
        expect(sampledX).toBeGreaterThanOrEqual(write.x);
        expect(sampledX).toBeLessThan(right);
        expect(sampledY).toBeGreaterThanOrEqual(write.y);
        expect(sampledY).toBeLessThan(bottom);
      }
    }
  });

  it("does not issue a full-canvas write for a small ripple", () => {
    const width = 192;
    const height = 128;
    const { context, engine } = createHarness(width, height);
    addStandardRipple(engine, { x: width / 2, y: height / 2 });

    engine.render(RIPPLE_MIN_DURATION_MS / 2);
    expect(context.writes).toHaveLength(1);
    expect(context.writes[0].image.width).toBeLessThan(width);
    expect(context.writes[0].image.height).toBeLessThan(height);
    expect(
      context.writes[0].image.width * context.writes[0].image.height,
    ).toBeLessThan(width * height);
  });

  it("reset restores only the previous dirty region from the immutable base", () => {
    const width = 160;
    const height = 120;
    const { baseImageData, context, engine } = createHarness(width, height);
    addStandardRipple(engine);
    const frame = engine.render(RIPPLE_MIN_DURATION_MS / 4);

    context.clearWrites();
    const restored = engine.reset();
    expect(restored).toEqual(frame.dirtyRects);
    expect(context.writes.map(rectForWrite)).toEqual(frame.dirtyRects);
    expect(engine.activeCount).toBe(0);
    for (const write of context.writes) {
      expect(write.image.width * write.image.height).toBeLessThan(
        width * height,
      );
      expectWriteToMatchBase(write, baseImageData);
    }
  });

  it("clears active ripples and ignores additions under reduced motion", () => {
    const { baseImageData, context, engine } = createHarness();
    addStandardRipple(engine);
    const frame = engine.render(RIPPLE_MIN_DURATION_MS / 4);

    context.clearWrites();
    engine.setReducedMotion(true);
    expect(engine.reducedMotion).toBe(true);
    expect(engine.activeCount).toBe(0);
    expect(context.writes.map(rectForWrite)).toEqual(frame.dirtyRects);
    for (const write of context.writes) {
      expectWriteToMatchBase(write, baseImageData);
    }

    context.clearWrites();
    expect(addStandardRipple(engine)).toBeNull();
    expect(engine.render(RIPPLE_MIN_DURATION_MS / 2)).toMatchObject({
      activeCount: 0,
      needsAnimationFrame: false,
      dirtyRect: null,
      dirtyRects: [],
    });
    expect(context.writes).toHaveLength(0);
  });

  it("uses the base texel when displacement would cross the land mask", () => {
    const width = 64;
    const height = 64;
    const landMask = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 39; x < width; x += 1) {
        landMask[y * width + x] = 1;
      }
    }
    const unmasked = createHarness(width, height, {
      maxDisplacementTexels: 1.5,
    });
    const masked = createHarness(width, height, {
      landMask,
      maxDisplacementTexels: 1.5,
    });
    const ripple = {
      x: 32,
      y: 32.5,
      cssPixelsPerSourceTexel: 2,
      ringCount: 3 as const,
    };
    addStandardRipple(unmasked.engine, ripple);
    addStandardRipple(masked.engine, ripple);

    unmasked.engine.render(RIPPLE_MIN_DURATION_MS / 4);
    masked.engine.render(RIPPLE_MIN_DURATION_MS / 4);
    expect(sourceCoordinateAt(unmasked.context, 39, 32)).toEqual({
      x: 38,
      y: 32,
    });
    expect(sourceCoordinateAt(masked.context, 39, 32)).toEqual({
      x: 39,
      y: 32,
    });
  });
});
