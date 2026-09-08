import { describe, expect, it } from "vitest";
import { INITIAL_SOUR, sourReducer, type SourState } from "./game";

describe("whiskey sour game", () => {
  it("finishes one pour and waits for a new gesture before the next ingredient", () => {
    let state = sourReducer(INITIAL_SOUR, { type: "hold" });
    for (let i = 0; i < 30; i++)
      state = sourReducer(state, { type: "tick", ms: 80 });
    expect(state).toEqual({ stage: "lemon", progress: 0, holding: false });
  });
  it("stops pouring on release and ignores a hidden-tab-sized time jump", () => {
    let state = sourReducer(INITIAL_SOUR, { type: "hold" });
    state = sourReducer(state, { type: "tick", ms: 100000 });
    expect(state.progress).toBeLessThan(0.05);
    state = sourReducer(state, { type: "release" });
    expect(sourReducer(state, { type: "tick", ms: 50 })).toBe(state);
  });
  it("supports the complete recipe using discrete accessible inputs", () => {
    let state: SourState = { ...INITIAL_SOUR };
    const stages: [SourState["stage"], number][] = [
      ["rye", 4],
      ["lemon", 4],
      ["syrup", 4],
      ["egg", 2],
      ["dry", 6],
      ["ice", 3],
      ["wet", 8],
      ["strain", 4],
      ["bitters", 3],
    ];
    for (const [stage, taps] of stages) {
      expect(state.stage).toBe(stage);
      for (let i = 0; i < taps; i++)
        state = sourReducer(state, { type: "tap" });
    }
    expect(state.stage).toBe("done");
    expect(sourReducer(state, { type: "tap" })).toBe(state);
    expect(sourReducer(state, { type: "reset" })).toEqual(INITIAL_SOUR);
  });
});
