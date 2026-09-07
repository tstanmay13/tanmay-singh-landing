/**
 * Low-resolution, deterministic terrain painting for a pixel-rendered canvas.
 *
 * Palette values deliberately have no defaults. Callers should read their
 * theme's CSS custom properties with getComputedStyle and pass the resolved
 * values (Canvas 2D does not resolve `var(...)` in fillStyle).
 */

export type TerrainCanvas = HTMLCanvasElement | OffscreenCanvas;
export type TerrainContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export type TerrainRgba =
  | readonly [red: number, green: number, blue: number]
  | readonly [red: number, green: number, blue: number, alpha: number];

export type TerrainColor = string | TerrainRgba;

export interface TerrainPalette {
  readonly water: {
    readonly deep: TerrainColor;
    readonly mid: TerrainColor;
    readonly shallow: TerrainColor;
    readonly coast: TerrainColor;
    /** Used only for source-detected lakes, rivers, and very narrow water. */
    readonly inland: TerrainColor;
    readonly glint: TerrainColor;
  };
  readonly land: {
    readonly shadow: TerrainColor;
    readonly low: TerrainColor;
    readonly mid: TerrainColor;
    readonly high: TerrainColor;
    readonly coast: TerrainColor;
    readonly vegetation: TerrainColor;
    readonly forest: TerrainColor;
    readonly dry: TerrainColor;
    readonly dryDetail: TerrainColor;
    readonly snow: TerrainColor;
  };
}

export const TERRAIN_WATER = 0 as const;
export const TERRAIN_LAND = 1 as const;
export type TerrainMaskValue =
  | typeof TERRAIN_WATER
  | typeof TERRAIN_LAND;

export interface TerrainPaintOptions {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly palette: TerrainPalette;
  /** Changes detail placement without changing geography. */
  readonly seed?: number;
  /**
   * Crop of the source image, in source-image pixels. Omit to paint the
   * full source down to `width`×`height`.
   */
  readonly sourceRect?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /**
   * Useful in tests or runtimes where neither OffscreenCanvas nor document is
   * available. The factory must return a 2D-capable canvas of the given size.
   */
  readonly createCanvas?: (width: number, height: number) => TerrainCanvas;
}

export interface TerrainPaintResult {
  readonly width: number;
  readonly height: number;
  /**
   * Dedicated base raster. Treat it as immutable: animated effects should
   * draw or copy from it, never use it as their destination.
   */
  readonly baseCanvas: TerrainCanvas;
  /** Immutable-by-contract snapshot matching baseCanvas. */
  readonly baseImageData: ImageData;
  /** 1 for land and 0 for water, one entry per source texel. */
  readonly landMask: Uint8Array;
  /** Returns a writable copy, suitable for an animation engine. */
  readonly copyBaseImageData: () => ImageData;
  /** Returns a writable copy when a consumer cannot honor the mask contract. */
  readonly copyLandMask: () => Uint8Array;
}

type ResolvedPalette = {
  water: {
    deep: TerrainRgba4;
    mid: TerrainRgba4;
    shallow: TerrainRgba4;
    coast: TerrainRgba4;
    inland: TerrainRgba4;
    glint: TerrainRgba4;
  };
  land: {
    shadow: TerrainRgba4;
    low: TerrainRgba4;
    mid: TerrainRgba4;
    high: TerrainRgba4;
    coast: TerrainRgba4;
    vegetation: TerrainRgba4;
    forest: TerrainRgba4;
    dry: TerrainRgba4;
    dryDetail: TerrainRgba4;
    snow: TerrainRgba4;
  };
};

type TerrainRgba4 = readonly [
  red: number,
  green: number,
  blue: number,
  alpha: number,
];

const BYTE_MAX = 255;
const UNREACHED = 255;

function clampByte(value: number) {
  return Math.max(0, Math.min(BYTE_MAX, Math.round(value)));
}

function createTerrainCanvas(
  width: number,
  height: number,
  factory?: TerrainPaintOptions["createCanvas"],
): TerrainCanvas {
  if (factory) return factory(width, height);
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error(
    "Terrain painting needs OffscreenCanvas, document, or a createCanvas factory.",
  );
}

function context2d(canvas: TerrainCanvas): TerrainContext {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Terrain painting needs a Canvas 2D context.");
  return context as TerrainContext;
}

function rgbaTuple(color: TerrainRgba): TerrainRgba4 {
  return [
    clampByte(color[0]),
    clampByte(color[1]),
    clampByte(color[2]),
    clampByte(color[3] ?? BYTE_MAX),
  ];
}

function resolveColor(
  color: TerrainColor,
  colorContext: TerrainContext,
): TerrainRgba4 {
  if (typeof color !== "string") return rgbaTuple(color);
  if (color.includes("var(")) {
    throw new Error(
      "Resolve CSS custom properties with getComputedStyle before painting terrain.",
    );
  }
  if (typeof CSS !== "undefined" && !CSS.supports("color", color)) {
    throw new Error(`Invalid terrain palette color: ${color}`);
  }

  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = color;
  colorContext.fillRect(0, 0, 1, 1);
  const pixel = colorContext.getImageData(0, 0, 1, 1).data;
  return [pixel[0], pixel[1], pixel[2], pixel[3]];
}

function resolvePalette(
  palette: TerrainPalette,
  colorContext: TerrainContext,
): ResolvedPalette {
  return {
    water: {
      deep: resolveColor(palette.water.deep, colorContext),
      mid: resolveColor(palette.water.mid, colorContext),
      shallow: resolveColor(palette.water.shallow, colorContext),
      coast: resolveColor(palette.water.coast, colorContext),
      inland: resolveColor(palette.water.inland, colorContext),
      glint: resolveColor(palette.water.glint, colorContext),
    },
    land: {
      shadow: resolveColor(palette.land.shadow, colorContext),
      low: resolveColor(palette.land.low, colorContext),
      mid: resolveColor(palette.land.mid, colorContext),
      high: resolveColor(palette.land.high, colorContext),
      coast: resolveColor(palette.land.coast, colorContext),
      vegetation: resolveColor(palette.land.vegetation, colorContext),
      forest: resolveColor(palette.land.forest, colorContext),
      dry: resolveColor(palette.land.dry, colorContext),
      dryDetail: resolveColor(palette.land.dryDetail, colorContext),
      snow: resolveColor(palette.land.snow, colorContext),
    },
  };
}

function luminance(red: number, green: number, blue: number) {
  return Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
}

/**
 * Conservative source-image classification. It recognizes chromatic blue
 * rather than a particular map color, keeping snow and pale land out of the
 * water mask.
 */
export function sourceLooksLikeWater(
  red: number,
  green: number,
  blue: number,
  alpha: number,
) {
  if (alpha < 8) return true;
  // The source has near-black deep ocean, whose chroma falls below the
  // shallow-water threshold. Blue dominance distinguishes it from forests.
  if (blue < 48 && blue > red * 1.35 && blue > green * 1.2) return true;
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  const chroma = brightest - darkest;
  const blueOverRed = blue - red;
  const blueOverGreen = blue - green;
  const light = luminance(red, green, blue);

  return (
    light < 210 &&
    chroma > 18 &&
    blueOverRed > 11 &&
    blue >= green * 0.91 &&
    (blueOverGreen > 1 || blueOverRed > 28)
  );
}

function hash32(x: number, y: number, seed: number) {
  let value =
    seed ^
    Math.imul(x + 1, 0x9e3779b1) ^
    Math.imul(y + 1, 0x85ebca77);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function hashUnit(x: number, y: number, seed: number) {
  return hash32(x, y, seed) / 0x1_0000_0000;
}

function percentileFromHistogram(
  histogram: Uint32Array,
  count: number,
  fraction: number,
) {
  const target = Math.max(0, Math.floor((count - 1) * fraction));
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen > target) return value;
  }
  return BYTE_MAX;
}

function forEachNeighbor(
  index: number,
  width: number,
  height: number,
  visit: (neighbor: number) => void,
) {
  const x = index % width;
  const y = Math.floor(index / width);
  if (x > 0) visit(index - 1);
  if (x + 1 < width) visit(index + 1);
  if (y > 0) visit(index - width);
  if (y + 1 < height) visit(index + width);
}

function oceanConnectedMask(
  landMask: Uint8Array,
  width: number,
  height: number,
) {
  const connected = new Uint8Array(landMask.length);
  const queue = new Int32Array(landMask.length);
  let read = 0;
  let write = 0;

  const enqueue = (index: number) => {
    if (landMask[index] === TERRAIN_LAND || connected[index]) return;
    connected[index] = 1;
    queue[write] = index;
    write += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y + 1 < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (read < write) {
    const index = queue[read];
    read += 1;
    forEachNeighbor(index, width, height, enqueue);
  }
  return connected;
}

function waterDistanceFromLand(
  landMask: Uint8Array,
  width: number,
  height: number,
) {
  const distance = new Uint8Array(landMask.length);
  distance.fill(UNREACHED);
  const queue = new Int32Array(landMask.length);
  let read = 0;
  let write = 0;

  for (let index = 0; index < landMask.length; index += 1) {
    if (landMask[index] === TERRAIN_LAND) {
      distance[index] = 0;
      queue[write] = index;
      write += 1;
    }
  }

  while (read < write) {
    const index = queue[read];
    read += 1;
    const nextDistance = Math.min(UNREACHED, distance[index] + 1);
    forEachNeighbor(index, width, height, (neighbor) => {
      if (
        landMask[neighbor] === TERRAIN_WATER &&
        distance[neighbor] === UNREACHED
      ) {
        distance[neighbor] = nextDistance;
        queue[write] = neighbor;
        write += 1;
      }
    });
  }
  return distance;
}

function touchesWater(
  index: number,
  landMask: Uint8Array,
  width: number,
  height: number,
) {
  let found = false;
  forEachNeighbor(index, width, height, (neighbor) => {
    if (landMask[neighbor] === TERRAIN_WATER) found = true;
  });
  return found;
}

function safelyNarrowWater(
  index: number,
  landMask: Uint8Array,
  width: number,
  height: number,
) {
  const x = index % width;
  const y = Math.floor(index / width);
  if (x < 1 || x + 1 >= width || y < 1 || y + 1 >= height) return false;

  const landLeft = landMask[index - 1] === TERRAIN_LAND;
  const landRight = landMask[index + 1] === TERRAIN_LAND;
  const landAbove = landMask[index - width] === TERRAIN_LAND;
  const landBelow = landMask[index + width] === TERRAIN_LAND;
  const verticalChannel =
    landLeft &&
    landRight &&
    (landMask[index - width] === TERRAIN_WATER ||
      landMask[index + width] === TERRAIN_WATER);
  const horizontalChannel =
    landAbove &&
    landBelow &&
    (landMask[index - 1] === TERRAIN_WATER ||
      landMask[index + 1] === TERRAIN_WATER);
  return verticalChannel || horizontalChannel;
}

function writeColor(
  destination: Uint8ClampedArray,
  pixelOffset: number,
  color: TerrainRgba4,
) {
  destination[pixelOffset] = color[0];
  destination[pixelOffset + 1] = color[1];
  destination[pixelOffset + 2] = color[2];
  destination[pixelOffset + 3] = color[3];
}

function copyImageData(
  context: TerrainContext,
  source: ImageData,
): ImageData {
  const copy = context.createImageData(source.width, source.height);
  copy.data.set(source.data);
  return copy;
}

/**
 * Paints a source image into a small pixel terrain raster.
 *
 * The source must be loaded and Canvas-readable. This function is synchronous
 * and intentionally performs one source getImageData plus linear-time passes.
 */
export function paintTerrain({
  source,
  width,
  height,
  palette,
  seed = 0x51f15e,
  sourceRect,
  createCanvas,
}: TerrainPaintOptions): TerrainPaintResult {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("Terrain dimensions must be integers.");
  }
  if (width < 1 || height < 1) {
    throw new Error("Terrain dimensions must be positive.");
  }

  const canvas = createTerrainCanvas(width, height, createCanvas);
  canvas.width = width;
  canvas.height = height;
  const context = context2d(canvas);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  if (sourceRect) {
    context.drawImage(
      source,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      width,
      height,
    );
  } else {
    context.drawImage(source, 0, 0, width, height);
  }

  const sourceImage = context.getImageData(0, 0, width, height);
  const sourceData = sourceImage.data;
  const pixelCount = width * height;
  const landMask = new Uint8Array(pixelCount);
  const lightness = new Uint8Array(pixelCount);
  const greenSignal = new Int16Array(pixelCount);
  const drySignal = new Int16Array(pixelCount);
  const chroma = new Uint8Array(pixelCount);
  const histogram = new Uint32Array(BYTE_MAX + 1);
  let landCount = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const red = sourceData[offset];
    const green = sourceData[offset + 1];
    const blue = sourceData[offset + 2];
    const alpha = sourceData[offset + 3];
    const light = luminance(red, green, blue);
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    const isWater = sourceLooksLikeWater(red, green, blue, alpha);

    landMask[index] = isWater ? TERRAIN_WATER : TERRAIN_LAND;
    lightness[index] = light;
    chroma[index] = spread;
    greenSignal[index] = green * 2 - red - blue;
    drySignal[index] = red + green - blue * 2;
    if (!isWater) {
      histogram[light] += 1;
      landCount += 1;
    }
  }

  const lowCut = percentileFromHistogram(histogram, landCount, 0.25);
  const middleCut = percentileFromHistogram(histogram, landCount, 0.55);
  const highCut = percentileFromHistogram(histogram, landCount, 0.8);
  const oceanConnected = oceanConnectedMask(landMask, width, height);
  const coastDistance = waterDistanceFromLand(landMask, width, height);

  const colorCanvas = createTerrainCanvas(1, 1, createCanvas);
  const colors = resolvePalette(palette, context2d(colorCanvas));
  const output = context.createImageData(width, height);
  const outputData = output.data;

  for (let index = 0; index < pixelCount; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * 4;
    let color: TerrainRgba4;

    if (landMask[index] === TERRAIN_WATER) {
      const narrow = safelyNarrowWater(
        index,
        landMask,
        width,
        height,
      );
      const inland = oceanConnected[index] === 0;
      const distance = coastDistance[index];

      if (inland || narrow) color = colors.water.inland;
      else if (distance <= 1) color = colors.water.coast;
      else if (distance === 2 && (x + y) % 7 === 0) {
        color = colors.water.coast;
      } else {
        color = colors.water.deep;
      }

      const glint =
        !inland &&
        !narrow &&
        distance > 4 &&
        hashUnit(x, y, seed ^ 0x2c9277b5) < 0.0011;
      if (glint) color = colors.water.glint;
    } else {
      const light = lightness[index];
      const green = greenSignal[index];
      const dry = drySignal[index];
      const snowy =
        light >= Math.max(highCut, 176) &&
        chroma[index] < 28 &&
        dry < 28;
      const coastal = touchesWater(index, landMask, width, height);
      const forestMark =
        !coastal &&
        green > 22 &&
        hashUnit(x >> 2, y >> 2, seed ^ 0x6d2b79f5) < 0.07 &&
        hashUnit(x, y, seed ^ 0x1b56c4e9) < 0.55;
      const peakMark =
        !coastal &&
        !snowy &&
        light > middleCut &&
        dry > 8 &&
        hashUnit(x >> 2, y >> 2, seed ^ 0x51c2a7d3) < 0.035 &&
        hashUnit(x, y, seed ^ 0x7f4a7c15) < 0.42;

      if (snowy) {
        color = colors.land.snow;
      } else if (coastal) {
        color = colors.land.coast;
      } else if (peakMark) {
        color =
          hashUnit(x, y, seed ^ 0x27d4eb2d) < 0.35
            ? colors.land.high
            : colors.land.snow;
      } else if (forestMark) {
        color = colors.land.forest;
      } else if (dry > 42 && green < 16) {
        color =
          hashUnit(x, y, seed ^ 0x9e3779b1) < 0.12
            ? colors.land.dryDetail
            : colors.land.dry;
      } else if (light < lowCut) {
        color = colors.land.shadow;
      } else if (green > 14 || light < highCut) {
        color = colors.land.mid;
      } else {
        color = colors.land.vegetation;
      }
    }

    writeColor(outputData, offset, color);
  }

  context.putImageData(output, 0, 0);
  const result: TerrainPaintResult = {
    width,
    height,
    baseCanvas: canvas,
    baseImageData: output,
    landMask,
    copyBaseImageData: () => copyImageData(context, output),
    copyLandMask: () => landMask.slice(),
  };
  return Object.freeze(result);
}
