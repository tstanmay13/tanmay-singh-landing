import { describe, expect, it } from "vitest";
import { sourceLooksLikeWater } from "./terrainPaint";

describe("terrain water classification", () => {
  it("keeps dark ocean water instead of generating false islands", () => {
    expect(sourceLooksLikeWater(2, 6, 15, 255)).toBe(true);
    expect(sourceLooksLikeWater(3, 9, 21, 255)).toBe(true);
  });
  it("preserves dark forest, dry land and snow", () => {
    expect(sourceLooksLikeWater(9, 18, 8, 255)).toBe(false);
    expect(sourceLooksLikeWater(180, 150, 95, 255)).toBe(false);
    expect(sourceLooksLikeWater(220, 226, 230, 255)).toBe(false);
  });
});
