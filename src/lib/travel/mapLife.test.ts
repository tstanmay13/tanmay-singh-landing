import { describe, expect, it } from "vitest";
import { greenLandMask, landSpots, oceanSpots } from "./mapLife";

describe("map decorations", () => {
  it("places a bounded, deterministic cast only on water", () => {
    const mask = new Uint8Array(320 * 160);
    for (let y = 0; y < 160; y++) mask.fill(1, y * 320, y * 320 + 160);
    const spots = oceanSpots(mask, 320, 160);
    expect(spots.length).toBeGreaterThan(10);
    expect(spots.length).toBeLessThanOrEqual(70);
    expect(spots.every((spot) => spot.x > 1280 + 56)).toBe(true);
    expect(oceanSpots(mask, 320, 160)).toEqual(spots);
    expect(oceanSpots(new Uint8Array(320 * 160).fill(1), 320, 160)).toEqual([]);
  });
  it("keeps land decorations away from destinations and off unsuitable ground", () => {
    const mask = new Uint8Array(320 * 160).fill(1);
    const destinations = [{ x: 96, y: 256 }, { x: 400, y: 400 }];
    const spots = landSpots(mask, 320, 160, destinations);
    expect(spots.length).toBeGreaterThan(0);
    expect(spots.length).toBeLessThanOrEqual(24);
    expect(spots.every((spot) => destinations.every((point) => Math.hypot(spot.x - point.x, spot.y - point.y) >= 120))).toBe(true);
    expect(landSpots(new Uint8Array(320 * 160), 320, 160, [])).toEqual([]);
    expect([...greenLandMask(new Uint8ClampedArray([20, 80, 20, 255, 180, 140, 90, 255, 220, 220, 220, 255]), new Uint8Array([1, 1, 1]))]).toEqual([1, 0, 0]);
  });
});
