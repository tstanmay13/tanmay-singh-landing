import { describe, expect, it } from "vitest";

import {
  activateInteraction,
  createInteractionState,
  interactionReducer,
  type CameraMotionPhase,
  type InteractionState,
} from "./interaction";

function pointerDown(
  state: InteractionState,
  point = { x: 10, y: 20 },
  pointerId = 1,
) {
  return interactionReducer(state, {
    type: "POINTER_DOWN",
    pointerId,
    point,
  });
}

function pointerMove(
  state: InteractionState,
  point: { x: number; y: number },
  pointerId = 1,
) {
  return interactionReducer(state, {
    type: "POINTER_MOVE",
    pointerId,
    point,
  });
}

function completedDrag(initial = createInteractionState()) {
  const down = pointerDown(initial, { x: 10, y: 20 });
  const dragging = pointerMove(down, { x: 16, y: 20 });
  return interactionReducer(dragging, { type: "POINTER_UP", pointerId: 1 });
}

describe("pointer drag transitions", () => {
  it.each([
    { point: { x: 15.99, y: 20 }, label: "5.99 horizontal pixels" },
    { point: { x: 13, y: 25 }, label: "an under-six diagonal distance" },
  ])("keeps $label in pointer-down", ({ point }) => {
    const state = pointerMove(pointerDown(createInteractionState()), point);

    expect(state.phase).toBe("pointer-down");
    expect(state.pointer?.current).toEqual(point);
    expect(state.suppressPointerClick).toBe(false);
  });

  it("enters dragging at exactly six pixels", () => {
    const state = pointerMove(
      pointerDown(createInteractionState(), { x: 10, y: 20 }),
      { x: 13.6, y: 24.8 },
    );

    expect(state.phase).toBe("dragging");
    expect(state.suppressPointerClick).toBe(true);
  });

  it("clears hover when dragging begins", () => {
    const state = pointerMove(
      pointerDown(createInteractionState({ hoveredId: "austin" })),
      { x: 16, y: 20 },
    );

    expect(state.phase).toBe("dragging");
    expect(state.hoveredId).toBeNull();
  });

  it("arms pointer-click suppression when a drag ends", () => {
    const state = completedDrag();

    expect(state.pointer).toBeNull();
    expect(state.phase).toBe("idle");
    expect(state.suppressPointerClick).toBe(true);
  });

  it("suppresses the immediate pointer activation once, then allows the next", () => {
    const afterDrag = completedDrag(
      createInteractionState({ selectedId: "original" }),
    );
    const immediate = activateInteraction(afterDrag, "austin", "pointer");

    expect(immediate.activated).toBe(false);
    expect(immediate.state.selectedId).toBe("original");
    expect(immediate.state.suppressPointerClick).toBe(false);

    const later = activateInteraction(immediate.state, "austin", "pointer");
    expect(later.activated).toBe(true);
    expect(later.state.selectedId).toBe("austin");
    expect(later.state.phase).toBe("selected");
  });

  it.each(["keyboard", "programmatic"] as const)(
    "never blocks %s activation because of stale pointer suppression",
    (source) => {
      const staleSuppression = {
        ...createInteractionState(),
        suppressPointerClick: true,
      };
      const result = activateInteraction(
        staleSuppression,
        `${source}-selection`,
        source,
      );

      expect(result.activated).toBe(true);
      expect(result.state.selectedId).toBe(`${source}-selection`);
      expect(result.state.phase).toBe("selected");
    },
  );
});

describe("interaction phase ownership", () => {
  it.each([
    "camera-animating",
    "zooming",
    "coasting",
  ] satisfies CameraMotionPhase[])(
    "lets pointer down cancel the %s phase",
    (motion) => {
      const animating = interactionReducer(createInteractionState(), {
        type: "CAMERA_MOTION_START",
        motion,
      });
      const state = pointerDown(animating, { x: 40, y: 50 }, 7);

      expect(state.phase).toBe("pointer-down");
      expect(state.pointer).toEqual({
        pointerId: 7,
        start: { x: 40, y: 50 },
        current: { x: 40, y: 50 },
      });
    },
  );

  it("cancels an uncommitted pointer sequence without arming suppression", () => {
    const initial = createInteractionState({
      hoveredId: "hovered",
      selectedId: "selected",
    });
    const moved = pointerMove(pointerDown(initial), { x: 15.99, y: 20 });
    const cancelled = interactionReducer(moved, {
      type: "POINTER_CANCEL",
      pointerId: 1,
    });

    expect(cancelled).toMatchObject({
      phase: "hovering",
      pointer: null,
      hoveredId: "hovered",
      selectedId: "selected",
      suppressPointerClick: false,
    });
  });

  it("cancels a drag and clears its pending pointer suppression", () => {
    const initial = createInteractionState({
      hoveredId: "hovered",
      selectedId: "selected",
    });
    const dragging = pointerMove(pointerDown(initial), { x: 16, y: 20 });
    const cancelled = interactionReducer(dragging, {
      type: "POINTER_CANCEL",
      pointerId: 1,
    });

    expect(cancelled).toMatchObject({
      phase: "selected",
      pointer: null,
      hoveredId: null,
      selectedId: "selected",
      suppressPointerClick: false,
    });
  });

  it("keeps selection and hover as distinct state", () => {
    let state = createInteractionState({
      hoveredId: "hovered-a",
      selectedId: "selected-a",
    });

    state = interactionReducer(state, { type: "HOVER", id: "hovered-b" });
    expect(state.hoveredId).toBe("hovered-b");
    expect(state.selectedId).toBe("selected-a");

    state = interactionReducer(state, {
      type: "ACTIVATE",
      id: "selected-b",
      source: "keyboard",
    });
    expect(state.hoveredId).toBe("hovered-b");
    expect(state.selectedId).toBe("selected-b");

    state = interactionReducer(state, { type: "DESELECT" });
    expect(state.hoveredId).toBe("hovered-b");
    expect(state.selectedId).toBeNull();
    expect(state.phase).toBe("hovering");
  });
});
