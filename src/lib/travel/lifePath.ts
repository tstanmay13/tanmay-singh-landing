import type { MapPoint } from "./geo";

const TEXEL = 8;

function quantize(value: number, step = TEXEL): number {
  return Math.round(value / step) * step;
}

/**
 * Orthogonal, texel-quantized path so the residence story reads as pixel
 * geography instead of a smooth airline diagonal.
 */
export function pixelSteppedPath(
  points: readonly MapPoint[],
  step = TEXEL,
): MapPoint[] {
  if (points.length === 0) return [];
  const path: MapPoint[] = [
    { x: quantize(points[0].x, step), y: quantize(points[0].y, step) },
  ];
  for (let index = 1; index < points.length; index += 1) {
    const previous = path[path.length - 1];
    const next = {
      x: quantize(points[index].x, step),
      y: quantize(points[index].y, step),
    };
    if (previous.x !== next.x) {
      path.push({ x: next.x, y: previous.y });
    }
    if (previous.y !== next.y) {
      path.push(next);
    }
  }
  return path;
}

export function polylinePoints(points: readonly MapPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

/** Short pixel ticks pointing along the next path segment. */
export function chapterTicks(
  points: readonly MapPoint[],
  length = TEXEL,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const toward = points[index + 1] ?? points[index - 1];
    if (!toward) continue;
    const dx = Math.sign(toward.x - current.x);
    const dy = Math.sign(toward.y - current.y);
    const nx = dx === 0 ? 1 : 0;
    const ny = dy === 0 ? 1 : 0;
    ticks.push({
      x1: current.x - nx * length,
      y1: current.y - ny * length,
      x2: current.x + nx * length,
      y2: current.y + ny * length,
    });
  }
  return ticks;
}

export function chapterMarkerLabel(
  order: number | null | undefined,
  name: string,
): string | undefined {
  if (!order) return undefined;
  return `${String(order).padStart(2, "0")} ${name.toLocaleUpperCase("en-US")}`;
}
