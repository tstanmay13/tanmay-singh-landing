export const STAGES = [
  "rye",
  "lemon",
  "syrup",
  "egg",
  "dry",
  "ice",
  "wet",
  "strain",
  "bitters",
  "done",
] as const;
export type Stage = (typeof STAGES)[number];
export type SourState = { stage: Stage; progress: number; holding: boolean };
export type SourAction =
  { type: "hold" | "release" | "tap" | "reset" } | { type: "tick"; ms: number };
export const INITIAL_SOUR: SourState = {
  stage: "rye",
  progress: 0,
  holding: false,
};
export const HOLD_MS: Partial<Record<Stage, number>> = {
  rye: 1700,
  lemon: 1300,
  syrup: 1000,
  strain: 1800,
};
const TAPS: Partial<Record<Stage, number>> = {
  egg: 2,
  dry: 6,
  ice: 3,
  wet: 8,
  bitters: 3,
};
function advance(state: SourState, amount: number): SourState {
  const progress = Math.min(1, state.progress + amount);
  if (progress < 1 - 0.00001) return { ...state, progress };
  const index = STAGES.indexOf(state.stage);
  return {
    stage: STAGES[Math.min(index + 1, STAGES.length - 1)],
    progress: 0,
    holding: false,
  };
}
export function sourReducer(state: SourState, action: SourAction): SourState {
  switch (action.type) {
    case "reset":
      return { ...INITIAL_SOUR };
    case "hold":
      return HOLD_MS[state.stage] ? { ...state, holding: true } : state;
    case "release":
      return state.holding ? { ...state, holding: false } : state;
    case "tick": {
      const duration = HOLD_MS[state.stage];
      return state.holding && duration
        ? advance(state, Math.max(0, Math.min(action.ms, 80)) / duration)
        : state;
    }
    case "tap": {
      const taps = TAPS[state.stage];
      // A discrete alternative to holding is useful for assistive technology.
      return taps
        ? advance(state, 1 / taps)
        : HOLD_MS[state.stage]
          ? advance(state, 0.25)
          : state;
    }
  }
}
