import { describe, expect, it } from "vitest";

import {
  MAX_CAMERA_DURATION_MS,
  MIN_CAMERA_DURATION_MS,
  clampCameraDuration,
  clampCameraToBounds,
  easeOutCubic,
  interpolateCamera,
  panByScreenDelta,
  screenToWorld,
  worldToScreen,
  zoomAtScreenPoint,
  zoomAtViewportCenter,
  type Camera,
  type Point,
  type Viewport,
} from "./camera";

const camera: Camera = { x: 125.25, y: -48.5, scale: 2.75 };
const viewport: Viewport = { width: 1280, height: 720 };

function expectPointWithin(
  actual: Point,
  expected: Point,
  tolerance = 1e-10,
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance);
}

describe("camera transforms", () => {
  it.each([
    { x: 0, y: 0 },
    { x: 640, y: 360 },
    { x: 1279.5, y: 719.25 },
    { x: 413.125, y: 87.75 },
  ])("round-trips screen point $x, $y through world space", (screenPoint) => {
    const worldPoint = screenToWorld(screenPoint, camera, viewport);

    expectPointWithin(
      worldToScreen(worldPoint, camera, viewport),
      screenPoint,
    );
  });

  it.each([
    { x: -400, y: 200 },
    { x: 125.25, y: -48.5 },
    { x: 750.125, y: -900.75 },
  ])("round-trips world point $x, $y through screen space", (worldPoint) => {
    const screenPoint = worldToScreen(worldPoint, camera, viewport);

    expectPointWithin(
      screenToWorld(screenPoint, camera, viewport),
      worldPoint,
    );
  });

  it("preserves the world point beneath a pointer-anchored zoom", () => {
    const anchor = { x: 913.75, y: 148.125 };
    const worldBefore = screenToWorld(anchor, camera, viewport);
    const zoomed = zoomAtScreenPoint(camera, 6.125, anchor, viewport);
    const worldAfter = screenToWorld(anchor, zoomed, viewport);

    expectPointWithin(worldAfter, worldBefore);
    expect(zoomed.scale).toBe(6.125);
  });

  it("preserves the viewport center during center-anchored zoom", () => {
    const zoomed = zoomAtViewportCenter(camera, 0.8, viewport);
    const center = { x: viewport.width / 2, y: viewport.height / 2 };

    expect(zoomed).toEqual({ ...camera, scale: 0.8 });
    expectPointWithin(
      screenToWorld(center, zoomed, viewport),
      screenToWorld(center, camera, viewport),
    );
  });

  it("converts screen drag distance into inverse world-space pan", () => {
    expect(panByScreenDelta(camera, { x: 55, y: -27.5 })).toEqual({
      x: 105.25,
      y: -38.5,
      scale: 2.75,
    });
  });

  it("clamps the viewport to offset world bounds", () => {
    const bounds = { x: -100, y: 50, width: 1_000, height: 500 };
    const clampedLowHigh = clampCameraToBounds(
      { x: -10_000, y: 10_000, scale: 2 },
      { width: 800, height: 600 },
      bounds,
    );
    const clampedHighLow = clampCameraToBounds(
      { x: 10_000, y: -10_000, scale: 2 },
      { width: 800, height: 600 },
      bounds,
    );

    expect(clampedLowHigh).toEqual({ x: 100, y: 400, scale: 2 });
    expect(clampedHighLow).toEqual({ x: 700, y: 200, scale: 2 });
  });

  it("centers a bounded axis when the map is smaller than the viewport", () => {
    expect(
      clampCameraToBounds(
        { x: 999, y: -999, scale: 2 },
        { width: 800, height: 600 },
        { x: -100, y: 25, width: 100, height: 120 },
      ),
    ).toEqual({ x: -50, y: 85, scale: 2 });
  });
});

describe("camera animation", () => {
  const from: Camera = { x: 0, y: 20, scale: 1 };
  const to: Camera = { x: 100, y: -20, scale: 5 };

  it("returns exact interpolation endpoints and clamps progress", () => {
    expect(interpolateCamera(from, to, 0)).toEqual(from);
    expect(interpolateCamera(from, to, 1)).toEqual(to);
    expect(interpolateCamera(from, to, -1)).toEqual(from);
    expect(interpolateCamera(from, to, 2)).toEqual(to);
  });

  it("uses clamped cubic easing and accepts a deterministic easing function", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(2)).toBe(1);
    expect(interpolateCamera(from, to, 0.5)).toEqual({
      x: 87.5,
      y: -15,
      scale: 4.5,
    });
    expect(interpolateCamera(from, to, 0.5, (progress) => progress ** 2)).toEqual(
      {
        x: 25,
        y: 10,
        scale: 2,
      },
    );
  });

  it("clamps animation duration to 400–700 milliseconds", () => {
    expect(MIN_CAMERA_DURATION_MS).toBe(400);
    expect(MAX_CAMERA_DURATION_MS).toBe(700);
    expect(clampCameraDuration(399)).toBe(400);
    expect(clampCameraDuration(400)).toBe(400);
    expect(clampCameraDuration(550)).toBe(550);
    expect(clampCameraDuration(700)).toBe(700);
    expect(clampCameraDuration(701)).toBe(700);
  });
});
