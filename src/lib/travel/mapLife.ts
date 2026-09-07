import type { TerrainPaintResult } from "./terrainPaint";
import { latLngToXY, MAP_HEIGHT, MAP_WIDTH } from "./geo";

export type MapSprite = { x: number; y: number; kind: "wave" | "sailboat" | "whale" | "trees" | "camp"; delay: number };

/** A bounded, deterministic cast, placed using the actual terrain's land mask. */
export function oceanSpots(mask: Uint8Array, width: number, height: number): MapSprite[] {
  const clearWater = (x: number, y: number) => {
    // Fits the largest sprite even at minimum zoom, with room for its bob.
    const left = Math.floor((x - 56) * width / MAP_WIDTH);
    const right = Math.ceil((x + 56) * width / MAP_WIDTH);
    const top = Math.floor((y - 56) * height / MAP_HEIGHT);
    const bottom = Math.ceil((y + 56) * height / MAP_HEIGHT);
    if (left < 0 || top < 0 || right >= width || bottom >= height) return false;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (mask[row * width + col] !== 0) return false;
      }
    }
    return true;
  };
  const spots: MapSprite[] = [];
  const characters: Array<[number, number, "sailboat" | "whale"]> = [
    [27, -48, "sailboat"], [-12, -25, "whale"], [22, -135, "whale"],
    [-20, 75, "sailboat"], [15, 160, "sailboat"], [40, -30, "whale"],
  ];
  for (const [lat, lng, kind] of characters) {
    const point = latLngToXY(lat, lng);
    if (clearWater(point.x, point.y)) spots.push({ ...point, kind, delay: -spots.length * 2.3 });
  }
  const candidates: Array<{ x: number; y: number; rank: number }> = [];
  for (let y = 240; y < 1050; y += 80) {
    for (let x = 64; x < MAP_WIDTH - 64; x += 80) {
      const rank = Math.imul(x + 7, 73856093) ^ Math.imul(y + 13, 19349663);
      candidates.push({ x: x + (rank & 15), y, rank: rank >>> 0 });
    }
  }
  for (const candidate of candidates.sort((a, b) => a.rank - b.rank)) {
    if (spots.length >= 70) break;
    if (!clearWater(candidate.x, candidate.y)) continue;
    if (spots.some((spot) => Math.hypot(spot.x - candidate.x, spot.y - candidate.y) < 85)) continue;
    spots.push({ x: candidate.x, y: candidate.y, kind: "wave", delay: -(candidate.rank % 120) / 10 });
  }
  return spots;
}

/** Green land only; never put a grove on desert, ice, or a destination. */
export function landSpots(greenMask: Uint8Array, width: number, height: number, destinations: Array<{ x: number; y: number }>, land: Uint8Array = greenMask): MapSprite[] {
  const spots: MapSprite[] = [];
  for (let y = 256; y < 1030; y += 72) {
    for (let x = 96; x < MAP_WIDTH - 96; x += 112) {
      if (spots.length >= 24) return spots;
      if (destinations.some((point) => Math.hypot(point.x - x, point.y - y) < 120)) continue;
      let clear = true;
      let green = 0;
      let sampled = 0;
      for (let dy = -56; dy <= 56 && clear; dy += 4) {
        for (let dx = -56; dx <= 56; dx += 4) {
          const index = Math.floor((y + dy) * height / MAP_HEIGHT) * width + Math.floor((x + dx) * width / MAP_WIDTH);
          if (land[index] !== 1) { clear = false; break; }
          green += greenMask[index];
          sampled++;
        }
      }
      if (clear && green / sampled > 0.7) spots.push({ x, y, kind: spots.length % 3 === 1 ? "camp" : "trees", delay: -spots.length * 1.7 });
    }
  }
  return spots;
}

export function greenLandMask(data: Uint8ClampedArray, land: Uint8Array): Uint8Array {
  return land.map((value, index) => value && data[index * 4 + 1] > data[index * 4] * 1.15 && data[index * 4 + 1] > data[index * 4 + 2] * 1.15 ? 1 : 0);
}

export function buildMapSprites(
  terrain: Pick<TerrainPaintResult, "landMask" | "baseImageData" | "width" | "height">,
  destinations: Array<{ x: number; y: number }>,
): MapSprite[] {
  return [
    ...oceanSpots(terrain.landMask, terrain.width, terrain.height),
    ...landSpots(greenLandMask(terrain.baseImageData.data, terrain.landMask), terrain.width, terrain.height, destinations, terrain.landMask),
  ].filter((spot) => !destinations.some((point) => Math.hypot(point.x - spot.x, point.y - spot.y) < 120));
}
