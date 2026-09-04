import { describe, expect, it } from "vitest";

import {
  chapterMarkerLabel,
  chapterTicks,
  pixelSteppedPath,
  polylinePoints,
} from "./lifePath";

describe("life path geometry", () => {
  it("steps horizontally then vertically on the texel grid", () => {
    const path = pixelSteppedPath([
      { x: 10, y: 10 },
      { x: 90, y: 50 },
    ]);
    expect(path[0]).toEqual({ x: 8, y: 8 });
    expect(path.some((point) => point.x === 88 && point.y === 8)).toBe(true);
    expect(path[path.length - 1]).toEqual({ x: 88, y: 48 });
    expect(polylinePoints(path)).toContain("88,8");
  });

  it("emits a tick at every chapter point", () => {
    const ticks = chapterTicks([
      { x: 0, y: 0 },
      { x: 16, y: 0 },
      { x: 16, y: 16 },
    ]);
    expect(ticks).toHaveLength(3);
  });

  it("formats explicit chapter labels", () => {
    expect(chapterMarkerLabel(1, "Murphy")).toBe("01 MURPHY");
    expect(chapterMarkerLabel(4, "New York City")).toBe("04 NEW YORK CITY");
    expect(chapterMarkerLabel(null, "Dallas")).toBeUndefined();
  });
});
