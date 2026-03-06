"use client";

import Link from "next/link";
import { useState, useEffect, useReducer, useCallback, useRef } from "react";

// ============================================
// TYPES
// ============================================

interface Recipe {
  id: string;
  name: string;
  icon: string;
  flourCost: number;
  sellPrice: number;
  bakeTime: number; // seconds
  unlockCost: number; // 0 = unlocked from start
}

interface OvenSlot {
  recipeId: string;
  startTime: number;
  duration: number; // ms
  done: boolean;
}

interface GameState {
  coins: number;
  flour: number;
  totalCoinsEarned: number;
  totalItemsBaked: number;
  selectedRecipe: string;
  unlockedRecipes: string[];
  ovenSlots: (OvenSlot | null)[];
  maxOvenSlots: number;
  flourMillLevel: number;
  speedBoostLevel: number;
  autoSell: boolean;
  extraOvenLevel: number;
}

type GameAction =
  | { type: "BAKE"; recipe: Recipe; speedMultiplier: number }
  | { type: "COLLECT"; slotIndex: number; sellPrice: number }
  | { type: "AUTO_COLLECT"; slotIndex: number; sellPrice: number }
  | { type: "TICK_FLOUR"; amount: number }
  | { type: "TICK_OVENS" }
  | { type: "UNLOCK_RECIPE"; recipeId: string; cost: number }
  | { type: "BUY_EXTRA_OVEN"; cost: number }
  | { type: "BUY_FLOUR_MILL"; cost: number }
  | { type: "BUY_SPEED_BOOST"; cost: number }
  | { type: "BUY_AUTO_SELL"; cost: number }
  | { type: "SELECT_RECIPE"; recipeId: string }
  | { type: "LOAD_STATE"; state: GameState };

// ============================================
// CONSTANTS
// ============================================

const RECIPES: Recipe[] = [
  { id: "bread", name: "Bread", icon: "\uD83C\uDF5E", flourCost: 1, sellPrice: 1, bakeTime: 2, unlockCost: 0 },
  { id: "croissant", name: "Croissant", icon: "\uD83E\uDD50", flourCost: 2, sellPrice: 3, bakeTime: 3, unlockCost: 50 },
  { id: "cake", name: "Cake", icon: "\uD83C\uDF70", flourCost: 5, sellPrice: 10, bakeTime: 5, unlockCost: 500 },
  { id: "pizza", name: "Pizza", icon: "\uD83C\uDF55", flourCost: 8, sellPrice: 25, bakeTime: 8, unlockCost: 2000 },
  { id: "wedding-cake", name: "Wedding Cake", icon: "\uD83C\uDF82", flourCost: 20, sellPrice: 100, bakeTime: 15, unlockCost: 10000 },
];

const EXTRA_OVEN_COSTS = [100, 500, 2000, 5000];
const FLOUR_MILL_COSTS = [50, 200, 800, 3000];
const SPEED_BOOST_COSTS = [200, 1000, 5000];
const AUTO_SELL_COST = 500;

const SAVE_KEY = "idle-bakery-save";
const SAVE_INTERVAL = 10000;
const TICK_INTERVAL = 100; // ms

// ============================================
// HELPERS
// ============================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toString();
}

function getSpeedMultiplier(level: number): number {
  return Math.pow(0.8, level);
}

function getFlourRate(level: number): number {
  // flour per second: base 0.5, doubles each level
  return 0.5 * Math.pow(2, level);
}

// ============================================
// REDUCER
// ============================================

function initialState(): GameState {
  return {
    coins: 0,
    flour: 5,
    totalCoinsEarned: 0,
    totalItemsBaked: 0,
    selectedRecipe: "bread",
    unlockedRecipes: ["bread"],
    ovenSlots: [null],
    maxOvenSlots: 1,
    flourMillLevel: 0,
    speedBoostLevel: 0,
    autoSell: false,
    extraOvenLevel: 0,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BAKE": {
      const { recipe, speedMultiplier } = action;
      if (state.flour < recipe.flourCost) return state;
      const emptyIdx = state.ovenSlots.findIndex((s) => s === null);
      if (emptyIdx === -1) return state;
      const newSlots = [...state.ovenSlots];
      const duration = recipe.bakeTime * 1000 * speedMultiplier;
      newSlots[emptyIdx] = {
        recipeId: recipe.id,
        startTime: Date.now(),
        duration,
        done: false,
      };
      return {
        ...state,
        flour: state.flour - recipe.flourCost,
        ovenSlots: newSlots,
      };
    }
    case "TICK_OVENS": {
      const now = Date.now();
      let changed = false;
      const newSlots = state.ovenSlots.map((slot) => {
        if (!slot || slot.done) return slot;
        if (now - slot.startTime >= slot.duration) {
          changed = true;
          return { ...slot, done: true };
        }
        return slot;
      });
      if (!changed) return state;
      return { ...state, ovenSlots: newSlots };
    }
    case "COLLECT": {
      const slot = state.ovenSlots[action.slotIndex];
      if (!slot || !slot.done) return state;
      const newSlots = [...state.ovenSlots];
      newSlots[action.slotIndex] = null;
      return {
        ...state,
        coins: state.coins + action.sellPrice,
        totalCoinsEarned: state.totalCoinsEarned + action.sellPrice,
        totalItemsBaked: state.totalItemsBaked + 1,
        ovenSlots: newSlots,
      };
    }
    case "AUTO_COLLECT": {
      const slot = state.ovenSlots[action.slotIndex];
      if (!slot || !slot.done) return state;
      const newSlots = [...state.ovenSlots];
      newSlots[action.slotIndex] = null;
      return {
        ...state,
        coins: state.coins + action.sellPrice,
        totalCoinsEarned: state.totalCoinsEarned + action.sellPrice,
        totalItemsBaked: state.totalItemsBaked + 1,
        ovenSlots: newSlots,
      };
    }
    case "TICK_FLOUR": {
      return { ...state, flour: state.flour + action.amount };
    }
    case "UNLOCK_RECIPE": {
      if (state.coins < action.cost) return state;
      if (state.unlockedRecipes.includes(action.recipeId)) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        unlockedRecipes: [...state.unlockedRecipes, action.recipeId],
      };
    }
    case "BUY_EXTRA_OVEN": {
      if (state.coins < action.cost) return state;
      if (state.extraOvenLevel >= 4) return state;
      const newSlots = [...state.ovenSlots, null];
      return {
        ...state,
        coins: state.coins - action.cost,
        extraOvenLevel: state.extraOvenLevel + 1,
        maxOvenSlots: state.maxOvenSlots + 1,
        ovenSlots: newSlots,
      };
    }
    case "BUY_FLOUR_MILL": {
      if (state.coins < action.cost) return state;
      if (state.flourMillLevel >= 4) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        flourMillLevel: state.flourMillLevel + 1,
      };
    }
    case "BUY_SPEED_BOOST": {
      if (state.coins < action.cost) return state;
      if (state.speedBoostLevel >= 3) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        speedBoostLevel: state.speedBoostLevel + 1,
      };
    }
    case "BUY_AUTO_SELL": {
      if (state.coins < action.cost) return state;
      if (state.autoSell) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        autoSell: true,
      };
    }
    case "SELECT_RECIPE": {
      return { ...state, selectedRecipe: action.recipeId };
    }
    case "LOAD_STATE": {
      return action.state;
    }
    default:
      return state;
  }
}

// ============================================
// COMPONENTS
// ============================================

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div
      className="w-full h-3 relative"
      style={{
        background: "var(--color-bg)",
        border: "2px solid var(--color-border)",
      }}
    >
      <div
        className="h-full transition-all duration-100"
        style={{
          width: `${Math.min(100, progress * 100)}%`,
          background: color,
          imageRendering: "pixelated" as const,
        }}
      />
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function IdleBakeryPage() {
  const [mounted, setMounted] = useState(false);
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [now, setNow] = useState(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Mount + load save
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        // Restore oven slots with correct length
        if (parsed.ovenSlots) {
          // Mark completed ovens
          const now = Date.now();
          parsed.ovenSlots = parsed.ovenSlots.map((slot) => {
            if (!slot) return null;
            if (now - slot.startTime >= slot.duration) {
              return { ...slot, done: true };
            }
            return slot;
          });
        }
        dispatch({ type: "LOAD_STATE", state: parsed });
      }
    } catch {
      // ignore bad saves
    }
  }, []);

  // Game tick
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      const currentState = stateRef.current;
      // Generate flour
      const flourRate = getFlourRate(currentState.flourMillLevel);
      dispatch({ type: "TICK_FLOUR", amount: (flourRate * TICK_INTERVAL) / 1000 });
      // Update ovens
      dispatch({ type: "TICK_OVENS" });
      // Auto-sell
      if (currentState.autoSell) {
        currentState.ovenSlots.forEach((slot, i) => {
          if (slot && slot.done) {
            const recipe = RECIPES.find((r) => r.id === slot.recipeId);
            if (recipe) {
              dispatch({ type: "AUTO_COLLECT", slotIndex: i, sellPrice: recipe.sellPrice });
            }
          }
        });
      }
      setNow(Date.now());
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [mounted]);

  // Auto-save
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current));
      } catch {
        // storage full, ignore
      }
    }, SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [mounted]);

  const handleBake = useCallback(() => {
    const recipe = RECIPES.find((r) => r.id === stateRef.current.selectedRecipe);
    if (!recipe) return;
    const speedMultiplier = getSpeedMultiplier(stateRef.current.speedBoostLevel);
    dispatch({ type: "BAKE", recipe, speedMultiplier });
  }, []);

  const handleCollect = useCallback((slotIndex: number) => {
    const slot = stateRef.current.ovenSlots[slotIndex];
    if (!slot) return;
    const recipe = RECIPES.find((r) => r.id === slot.recipeId);
    if (!recipe) return;
    dispatch({ type: "COLLECT", slotIndex, sellPrice: recipe.sellPrice });
  }, []);

  const selectedRecipe = RECIPES.find((r) => r.id === state.selectedRecipe);
  const hasEmptySlot = state.ovenSlots.some((s) => s === null);
  const canBake = selectedRecipe && state.flour >= selectedRecipe.flourCost && hasEmptySlot;
  const speedMultiplier = getSpeedMultiplier(state.speedBoostLevel);
  const flourRate = getFlourRate(state.flourMillLevel);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <p className="pixel-text text-sm" style={{ color: "var(--color-text-muted)" }}>
          LOADING BAKERY...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: "var(--color-bg)" }}>
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-6">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block mb-6 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          >
            &lt; BACK TO GAMES
          </Link>

          <h1
            className="pixel-text text-2xl sm:text-3xl mb-2"
            style={{
              color: "var(--color-orange)",
              textShadow: "0 0 10px rgba(245, 158, 11, 0.3), 0 0 30px rgba(245, 158, 11, 0.15)",
            }}
          >
            IDLE BAKERY
          </h1>
          <p className="pixel-text text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            BAKE - SELL - UPGRADE
          </p>
        </header>

        {/* Resources Bar */}
        <div
          className="pixel-card p-4 mb-4 flex justify-between items-center"
          style={{ overflow: "visible" }}
        >
          <div className="flex gap-6">
            <div>
              <span className="pixel-text text-[10px] block" style={{ color: "var(--color-text-muted)" }}>
                COINS
              </span>
              <span className="pixel-text text-sm" style={{ color: "var(--color-orange)" }}>
                {formatNumber(state.coins)}
              </span>
            </div>
            <div>
              <span className="pixel-text text-[10px] block" style={{ color: "var(--color-text-muted)" }}>
                FLOUR
              </span>
              <span className="pixel-text text-sm" style={{ color: "var(--color-text)" }}>
                {formatNumber(state.flour)}
              </span>
              <span className="pixel-text text-[8px] block" style={{ color: "var(--color-text-muted)" }}>
                +{flourRate.toFixed(1)}/s
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="pixel-text text-[10px] block" style={{ color: "var(--color-text-muted)" }}>
              BAKED
            </span>
            <span className="pixel-text text-sm" style={{ color: "var(--color-accent)" }}>
              {formatNumber(state.totalItemsBaked)}
            </span>
          </div>
        </div>

        {/* Oven Slots */}
        <div className="pixel-card p-4 mb-4" style={{ overflow: "visible" }}>
          <h2 className="pixel-text text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            OVENS ({state.ovenSlots.filter((s) => s !== null).length}/{state.maxOvenSlots})
          </h2>
          <div className="space-y-2">
            {state.ovenSlots.map((slot, i) => {
              if (!slot) {
                return (
                  <div
                    key={i}
                    className="p-3 text-center"
                    style={{
                      border: "2px dashed var(--color-border)",
                      background: "var(--color-bg)",
                    }}
                  >
                    <span className="pixel-text text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      EMPTY SLOT
                    </span>
                  </div>
                );
              }
              const recipe = RECIPES.find((r) => r.id === slot.recipeId);
              if (!recipe) return null;
              const elapsed = now - slot.startTime;
              const progress = Math.min(1, elapsed / slot.duration);
              const isDone = slot.done || progress >= 1;

              return (
                <div
                  key={i}
                  className="p-3"
                  style={{
                    border: `2px solid ${isDone ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: "var(--color-bg)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="pixel-text text-[10px]" style={{ color: "var(--color-text)" }}>
                      {recipe.icon} {recipe.name.toUpperCase()}
                    </span>
                    {isDone ? (
                      state.autoSell ? (
                        <span
                          className="pixel-text text-[8px] animate-glow-pulse"
                          style={{ color: "var(--color-accent)" }}
                        >
                          AUTO-SELLING...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCollect(i)}
                          className="pixel-text text-[8px] px-2 py-1 cursor-pointer transition-all duration-150"
                          style={{
                            background: "var(--color-accent)",
                            color: "var(--color-bg)",
                            border: "2px solid var(--color-accent-secondary)",
                          }}
                        >
                          SELL +{recipe.sellPrice}
                        </button>
                      )
                    ) : (
                      <span className="pixel-text text-[8px]" style={{ color: "var(--color-text-muted)" }}>
                        {Math.ceil((slot.duration - elapsed) / 1000)}s
                      </span>
                    )}
                  </div>
                  <ProgressBar
                    progress={progress}
                    color={isDone ? "var(--color-accent)" : "var(--color-orange)"}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* BAKE Button */}
        <div className="text-center mb-4">
          <button
            onClick={handleBake}
            disabled={!canBake}
            className="pixel-text text-lg px-10 py-4 cursor-pointer transition-all duration-150"
            style={{
              background: canBake ? "var(--color-orange)" : "var(--color-bg-card)",
              color: canBake ? "var(--color-bg)" : "var(--color-text-muted)",
              border: `3px solid ${canBake ? "var(--color-orange)" : "var(--color-border)"}`,
              boxShadow: canBake
                ? "0 0 20px rgba(245, 158, 11, 0.3), 4px 4px 0 rgba(245, 158, 11, 0.5)"
                : "none",
              transform: canBake ? "translate(-2px, -2px)" : "none",
              opacity: canBake ? 1 : 0.5,
            }}
          >
            BAKE {selectedRecipe?.icon}
          </button>
          {selectedRecipe && (
            <p className="pixel-text text-[8px] mt-2" style={{ color: "var(--color-text-muted)" }}>
              COST: {selectedRecipe.flourCost} FLOUR | SELLS: {selectedRecipe.sellPrice} COIN
              {selectedRecipe.sellPrice > 1 ? "S" : ""} |{" "}
              {(selectedRecipe.bakeTime * speedMultiplier).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Recipe Selector */}
        <div className="pixel-card p-4 mb-4" style={{ overflow: "visible" }}>
          <h2 className="pixel-text text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            RECIPES
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RECIPES.map((recipe) => {
              const isUnlocked = state.unlockedRecipes.includes(recipe.id);
              const isSelected = state.selectedRecipe === recipe.id;

              if (!isUnlocked) {
                return (
                  <button
                    key={recipe.id}
                    onClick={() => {
                      if (state.coins >= recipe.unlockCost) {
                        dispatch({ type: "UNLOCK_RECIPE", recipeId: recipe.id, cost: recipe.unlockCost });
                      }
                    }}
                    className="p-3 text-center cursor-pointer transition-all duration-150"
                    style={{
                      border: "2px solid var(--color-border)",
                      background: "var(--color-bg)",
                      opacity: state.coins >= recipe.unlockCost ? 0.8 : 0.4,
                    }}
                  >
                    <span className="text-xl block" style={{ filter: "grayscale(1)" }}>
                      {recipe.icon}
                    </span>
                    <span className="pixel-text text-[8px] block mt-1" style={{ color: "var(--color-text-muted)" }}>
                      {recipe.name.toUpperCase()}
                    </span>
                    <span className="pixel-text text-[8px] block mt-1" style={{ color: "var(--color-orange)" }}>
                      UNLOCK: {formatNumber(recipe.unlockCost)}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={recipe.id}
                  onClick={() => dispatch({ type: "SELECT_RECIPE", recipeId: recipe.id })}
                  className="p-3 text-center cursor-pointer transition-all duration-150"
                  style={{
                    border: `2px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: isSelected ? "var(--color-bg-card-hover)" : "var(--color-bg)",
                    boxShadow: isSelected ? "0 0 10px var(--color-accent-glow)" : "none",
                  }}
                >
                  <span className="text-xl block">{recipe.icon}</span>
                  <span
                    className="pixel-text text-[8px] block mt-1"
                    style={{ color: isSelected ? "var(--color-accent)" : "var(--color-text)" }}
                  >
                    {recipe.name.toUpperCase()}
                  </span>
                  <span className="pixel-text text-[7px] block mt-1" style={{ color: "var(--color-text-muted)" }}>
                    {recipe.flourCost}F = {recipe.sellPrice}C
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upgrades */}
        <div className="pixel-card p-4 mb-4" style={{ overflow: "visible" }}>
          <h2 className="pixel-text text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            UPGRADES
          </h2>
          <div className="space-y-2">
            {/* Extra Oven */}
            {state.extraOvenLevel < 4 && (
              <UpgradeRow
                name="EXTRA OVEN"
                description={`+1 baking slot (${state.maxOvenSlots}/5)`}
                cost={EXTRA_OVEN_COSTS[state.extraOvenLevel]}
                level={state.extraOvenLevel}
                maxLevel={4}
                canAfford={state.coins >= EXTRA_OVEN_COSTS[state.extraOvenLevel]}
                onBuy={() =>
                  dispatch({
                    type: "BUY_EXTRA_OVEN",
                    cost: EXTRA_OVEN_COSTS[state.extraOvenLevel],
                  })
                }
              />
            )}
            {state.extraOvenLevel >= 4 && (
              <MaxedRow name="EXTRA OVEN" description="5/5 slots" />
            )}

            {/* Flour Mill */}
            {state.flourMillLevel < 4 && (
              <UpgradeRow
                name="FLOUR MILL"
                description={`${getFlourRate(state.flourMillLevel).toFixed(1)} -> ${getFlourRate(state.flourMillLevel + 1).toFixed(1)} flour/s`}
                cost={FLOUR_MILL_COSTS[state.flourMillLevel]}
                level={state.flourMillLevel}
                maxLevel={4}
                canAfford={state.coins >= FLOUR_MILL_COSTS[state.flourMillLevel]}
                onBuy={() =>
                  dispatch({
                    type: "BUY_FLOUR_MILL",
                    cost: FLOUR_MILL_COSTS[state.flourMillLevel],
                  })
                }
              />
            )}
            {state.flourMillLevel >= 4 && (
              <MaxedRow name="FLOUR MILL" description={`${getFlourRate(state.flourMillLevel).toFixed(1)} flour/s`} />
            )}

            {/* Speed Boost */}
            {state.speedBoostLevel < 3 && (
              <UpgradeRow
                name="SPEED BOOST"
                description={`-20% bake time (Lv ${state.speedBoostLevel}/3)`}
                cost={SPEED_BOOST_COSTS[state.speedBoostLevel]}
                level={state.speedBoostLevel}
                maxLevel={3}
                canAfford={state.coins >= SPEED_BOOST_COSTS[state.speedBoostLevel]}
                onBuy={() =>
                  dispatch({
                    type: "BUY_SPEED_BOOST",
                    cost: SPEED_BOOST_COSTS[state.speedBoostLevel],
                  })
                }
              />
            )}
            {state.speedBoostLevel >= 3 && (
              <MaxedRow name="SPEED BOOST" description="-60% bake time" />
            )}

            {/* Auto-Sell */}
            {!state.autoSell && (
              <UpgradeRow
                name="AUTO-SELL"
                description="Auto-sell finished goods"
                cost={AUTO_SELL_COST}
                level={0}
                maxLevel={1}
                canAfford={state.coins >= AUTO_SELL_COST}
                onBuy={() => dispatch({ type: "BUY_AUTO_SELL", cost: AUTO_SELL_COST })}
              />
            )}
            {state.autoSell && (
              <MaxedRow name="AUTO-SELL" description="Active" />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pixel-card p-4 mb-4" style={{ overflow: "visible" }}>
          <h2 className="pixel-text text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            STATS
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="pixel-text text-[8px] block" style={{ color: "var(--color-text-muted)" }}>
                TOTAL EARNED
              </span>
              <span className="pixel-text text-xs" style={{ color: "var(--color-orange)" }}>
                {formatNumber(state.totalCoinsEarned)} COINS
              </span>
            </div>
            <div>
              <span className="pixel-text text-[8px] block" style={{ color: "var(--color-text-muted)" }}>
                ITEMS BAKED
              </span>
              <span className="pixel-text text-xs" style={{ color: "var(--color-accent)" }}>
                {formatNumber(state.totalItemsBaked)}
              </span>
            </div>
            <div>
              <span className="pixel-text text-[8px] block" style={{ color: "var(--color-text-muted)" }}>
                RECIPES
              </span>
              <span className="pixel-text text-xs" style={{ color: "var(--color-purple)" }}>
                {state.unlockedRecipes.length}/{RECIPES.length}
              </span>
            </div>
            <div>
              <span className="pixel-text text-[8px] block" style={{ color: "var(--color-text-muted)" }}>
                OVENS
              </span>
              <span className="pixel-text text-xs" style={{ color: "var(--color-cyan)" }}>
                {state.maxOvenSlots}/5
              </span>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="text-center mt-6 mb-8">
          <button
            onClick={() => {
              if (window.confirm("Reset all progress? This cannot be undone.")) {
                localStorage.removeItem(SAVE_KEY);
                dispatch({ type: "LOAD_STATE", state: initialState() });
              }
            }}
            className="pixel-text text-[8px] px-4 py-2 cursor-pointer transition-all duration-150"
            style={{
              color: "var(--color-red)",
              border: "1px solid var(--color-border)",
              background: "transparent",
            }}
          >
            RESET PROGRESS
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function UpgradeRow({
  name,
  description,
  cost,
  level,
  maxLevel,
  canAfford,
  onBuy,
}: {
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  canAfford: boolean;
  onBuy: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3"
      style={{
        border: "2px solid var(--color-border)",
        background: "var(--color-bg)",
      }}
    >
      <div className="flex-1 min-w-0">
        <span className="pixel-text text-[10px] block" style={{ color: "var(--color-text)" }}>
          {name}
        </span>
        <span className="pixel-text text-[7px] block mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </span>
        {/* Level pips */}
        <div className="flex gap-1 mt-1">
          {Array.from({ length: maxLevel }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2"
              style={{
                background: i < level ? "var(--color-accent)" : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        className="pixel-text text-[8px] px-3 py-2 cursor-pointer transition-all duration-150 shrink-0 ml-3"
        style={{
          background: canAfford ? "var(--color-orange)" : "var(--color-bg-card)",
          color: canAfford ? "var(--color-bg)" : "var(--color-text-muted)",
          border: `2px solid ${canAfford ? "var(--color-orange)" : "var(--color-border)"}`,
          opacity: canAfford ? 1 : 0.5,
        }}
      >
        {formatNumber(cost)}
      </button>
    </div>
  );
}

function MaxedRow({ name, description }: { name: string; description: string }) {
  return (
    <div
      className="flex items-center justify-between p-3"
      style={{
        border: "2px solid var(--color-accent-secondary)",
        background: "var(--color-bg)",
      }}
    >
      <div>
        <span className="pixel-text text-[10px] block" style={{ color: "var(--color-accent)" }}>
          {name}
        </span>
        <span className="pixel-text text-[7px] block mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </span>
      </div>
      <span className="pixel-text text-[8px]" style={{ color: "var(--color-accent)" }}>
        MAX
      </span>
    </div>
  );
}
