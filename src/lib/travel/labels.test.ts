import { describe, expect, it } from "vitest";

import {
  compareLabelCandidates,
  isRectInsideViewport,
  labelPriority,
  resolveLabelCollisions,
  screenRectsIntersect,
  type LabelCandidate,
  type ResolveLabelsOptions,
  type ScreenRect,
} from "./labels";

function candidate(
  id: string,
  point: { x: number; y: number },
  flags: Partial<LabelCandidate> = {},
): LabelCandidate {
  return {
    id,
    canonicalId: `canonical:${id}`,
    name: id,
    point,
    dimensions: { width: 72, height: 18 },
    markerRadius: 4,
    gap: 4,
    ...flags,
  };
}

describe("label priority", () => {
  it("orders the exact selected-to-minor priority ladder", () => {
    const candidates = [
      candidate("minor", { x: 0, y: 0 }),
      candidate("significant", { x: 0, y: 0 }, {
        significantDestination: true,
      }),
      candidate("featured", { x: 0, y: 0 }, { featuredHub: true }),
      candidate("focused", { x: 0, y: 0 }, { focused: true }),
      candidate("past", { x: 0, y: 0 }, { pastLived: true }),
      candidate("current", { x: 0, y: 0 }, { currentHome: true }),
      candidate("selected", { x: 0, y: 0 }, { selected: true }),
    ];
    const sorted = [...candidates].sort(compareLabelCandidates);

    expect(sorted.map(({ id }) => id)).toEqual([
      "selected",
      "current",
      "past",
      "focused",
      "featured",
      "significant",
      "minor",
    ]);
    expect(sorted.map(labelPriority)).toEqual([
      "selected",
      "current-home",
      "past-lived",
      "hovered-or-focused",
      "featured-hub",
      "significant-destination",
      "minor",
    ]);
  });

  it("treats hovered and focused alike while higher flags still win", () => {
    expect(
      labelPriority(candidate("hovered", { x: 0, y: 0 }, { hovered: true })),
    ).toBe("hovered-or-focused");
    expect(
      labelPriority(candidate("focused", { x: 0, y: 0 }, { focused: true })),
    ).toBe("hovered-or-focused");
    expect(
      labelPriority(
        candidate("selected-current", { x: 0, y: 0 }, {
          selected: true,
          currentHome: true,
          pastLived: true,
          hovered: true,
          featuredHub: true,
          significantDestination: true,
        }),
      ),
    ).toBe("selected");
  });
});

describe("label collision resolution", () => {
  const viewport = { width: 560, height: 320 };
  const options: ResolveLabelsOptions = {
    viewport,
    viewportPadding: 8,
  };
  const candidates = [
    candidate("minor-b", { x: 420, y: 130 }),
    candidate("featured", { x: 260, y: 130 }, { featuredHub: true }),
    candidate("selected", { x: 100, y: 130 }, { selected: true }),
    candidate("minor-a", { x: 420, y: 130 }),
    candidate("past", { x: 100, y: 130 }, { pastLived: true }),
    candidate("significant", { x: 260, y: 130 }, {
      significantDestination: true,
    }),
    candidate("current", { x: 100, y: 130 }, { currentHome: true }),
    candidate("hovered", { x: 260, y: 130 }, { hovered: true }),
  ];

  it("is deterministic for repeated and reversed candidate input", () => {
    const first = resolveLabelCollisions(candidates, options);

    expect(resolveLabelCollisions(candidates, options)).toEqual(first);
    expect(
      resolveLabelCollisions([...candidates].reverse(), options),
    ).toEqual(first);
  });

  it("accepts only collision-free rectangles", () => {
    const placed = resolveLabelCollisions(candidates, options);

    expect(placed.length).toBeGreaterThan(0);
    for (let left = 0; left < placed.length; left += 1) {
      for (let right = left + 1; right < placed.length; right += 1) {
        expect(
          screenRectsIntersect(placed[left].rect, placed[right].rect),
        ).toBe(false);
      }
    }
  });

  it("keeps labels out of reserved HUD and detail-card rectangles", () => {
    const hudRect: ScreenRect = {
      x: 0,
      y: 0,
      width: 150,
      height: 80,
    };
    const cardRect: ScreenRect = {
      x: 420,
      y: 240,
      width: 180,
      height: 160,
    };
    const placed = resolveLabelCollisions(
      [
        candidate("hud-covered", { x: 75, y: 40 }, {
          dimensions: { width: 80, height: 20 },
        }),
        candidate("card-covered", { x: 500, y: 320 }, {
          dimensions: { width: 80, height: 20 },
        }),
        candidate("safe", { x: 300, y: 180 }, {
          dimensions: { width: 80, height: 20 },
        }),
      ],
      {
        viewport: { width: 600, height: 400 },
        viewportPadding: 8,
        reservedRects: [hudRect, cardRect],
      },
    );

    expect(placed.map(({ id }) => id)).toEqual(["safe"]);
    for (const label of placed) {
      expect(screenRectsIntersect(label.rect, hudRect)).toBe(false);
      expect(screenRectsIntersect(label.rect, cardRect)).toBe(false);
    }
  });

  it("clips labels to the padded viewport and tries alternate placements", () => {
    const clippingViewport = { width: 300, height: 200 };
    const padding = 5;
    const placed = resolveLabelCollisions(
      [
        candidate("top-left", { x: 2, y: 2 }, {
          dimensions: { width: 100, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
        candidate("bottom-edge", { x: 150, y: 195 }, {
          dimensions: { width: 60, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
        candidate("right-edge", { x: 295, y: 100 }, {
          dimensions: { width: 50, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
      ],
      {
        viewport: clippingViewport,
        viewportPadding: padding,
      },
    );

    expect(
      placed.map(({ id, placement }) => ({ id, placement })),
    ).toEqual([
      { id: "bottom-edge", placement: "above" },
      { id: "right-edge", placement: "left" },
    ]);
    expect(placed.some(({ id }) => id === "top-left")).toBe(false);
    for (const label of placed) {
      expect(
        isRectInsideViewport(label.rect, clippingViewport, padding),
      ).toBe(true);
    }
  });

  it("enforces the world label limit after priority sorting", () => {
    const placed = resolveLabelCollisions(
      [
        candidate("minor", { x: 500, y: 100 }),
        candidate("featured", { x: 380, y: 100 }, { featuredHub: true }),
        candidate("past", { x: 260, y: 100 }, { pastLived: true }),
        candidate("current", { x: 140, y: 100 }, { currentHome: true }),
        candidate("selected", { x: 40, y: 100 }, { selected: true }),
      ],
      {
        viewport: { width: 600, height: 220 },
        viewportPadding: 0,
        level: "world",
        worldLabelLimit: 3,
      },
    );

    expect(placed.map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: "selected", priority: "selected" },
      { id: "current", priority: "current-home" },
      { id: "past", priority: "past-lived" },
    ]);
  });

  it("lets a past-lived label beat a colliding minor label", () => {
    const placed = resolveLabelCollisions(
      [
        candidate("minor", { x: 150, y: 100 }, {
          dimensions: { width: 80, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
        candidate("past-home", { x: 150, y: 100 }, {
          dimensions: { width: 80, height: 20 },
          markerRadius: 0,
          gap: 0,
          pastLived: true,
        }),
      ],
      {
        viewport: { width: 300, height: 200 },
        viewportPadding: 0,
        reservedRects: [
          { x: 111, y: 81, width: 2, height: 2 },
          { x: 220, y: 91, width: 2, height: 2 },
          { x: 71, y: 91, width: 2, height: 2 },
        ],
      },
    );

    expect(placed.map(({ id, priority, placement }) => ({
      id,
      priority,
      placement,
    }))).toEqual([
      {
        id: "past-home",
        priority: "past-lived",
        placement: "below",
      },
    ]);
  });

  it("keeps a gap between labels when collision padding is set", () => {
    const padding = 8;
    const placed = resolveLabelCollisions(
      [
        candidate("current", { x: 80, y: 100 }, {
          currentHome: true,
          dimensions: { width: 60, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
        candidate("past", { x: 150, y: 100 }, {
          pastLived: true,
          dimensions: { width: 60, height: 20 },
          markerRadius: 0,
          gap: 0,
        }),
      ],
      {
        viewport: { width: 400, height: 240 },
        viewportPadding: 0,
        collisionPadding: padding,
      },
    );

    expect(placed[0]?.id).toBe("current");
    for (let left = 0; left < placed.length; left += 1) {
      for (let right = left + 1; right < placed.length; right += 1) {
        expect(
          screenRectsIntersect(
            {
              x: placed[left].rect.x - padding,
              y: placed[left].rect.y - padding,
              width: placed[left].rect.width + padding * 2,
              height: placed[left].rect.height + padding * 2,
            },
            {
              x: placed[right].rect.x - padding,
              y: placed[right].rect.y - padding,
              width: placed[right].rect.width + padding * 2,
              height: placed[right].rect.height + padding * 2,
            },
          ),
        ).toBe(false);
      }
    }
  });

  it("reserves the full accepted label width instead of clipping it", () => {
    const placed = resolveLabelCollisions(
      [
        candidate("KYOTO", { x: 200, y: 120 }, {
          featuredHub: true,
          dimensions: undefined,
        }),
      ],
      {
        viewport: { width: 640, height: 360 },
        averageCharacterWidth: 8,
        horizontalPadding: 8,
        labelHeight: 22,
      },
    );

    expect(placed).toHaveLength(1);
    expect(placed[0]?.name).toBe("KYOTO");
    expect(placed[0]?.width).toBeGreaterThanOrEqual("KYOTO".length * 8);
  });
});
