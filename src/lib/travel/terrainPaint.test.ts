import { describe, expect, it } from "vitest";
import { sourceLooksLikeWater } from "./terrainPaint";

describe("source geography classification", () => {
  it("preserves dark bathymetry as ocean instead of phantom continents", () => {
    for (const [r,g,b] of [[2,5,17], [3,9,24], [12,26,44], [20,52,89]]) {
      expect(sourceLooksLikeWater(r,g,b,255)).toBe(true);
    }
  });
  it("keeps snow, desert, vegetation and dark forests on land", () => {
    for (const [r,g,b] of [[240,242,239], [164,141,104], [34,54,29], [8,13,6]]) {
      expect(sourceLooksLikeWater(r,g,b,255)).toBe(false);
    }
  });
});
