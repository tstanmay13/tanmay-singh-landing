"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================
// WORD LIST & CONSTANTS
// ============================================

const WORDS = [
  "REACT", "ARRAY", "CLASS", "ASYNC", "FETCH",
  "STACK", "CACHE", "QUERY", "PROXY", "MERGE",
  "PARSE", "FLOAT", "CONST", "YIELD", "THROW",
  "CATCH", "WHILE", "BREAK", "SUPER", "PRINT",
  "DEBUG", "ROUTE", "PATCH", "REGEX", "TUPLE",
  "QUEUE", "MOUSE", "PIXEL", "INDEX", "SCOPE",
  "FRAME", "SHELL", "GUEST", "TOKEN", "MODEL",
  "GRAPH", "ERROR", "INPUT", "STATE", "STORE",
  "PROPS", "HOOKS", "STYLE", "EVENT", "TABLE",
  "FIELD", "BYTES", "CHUNK", "LOGIC", "BUILD",
];

const VALID_GUESSES = new Set(WORDS);

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

type TileState = "empty" | "tbd" | "correct" | "present" | "absent";
type GameStatus = "playing" | "won" | "lost";

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate: string;
}

// ============================================
// DATE-SEEDED WORD SELECTION
// ============================================

function getDailyWord(): string {
  const now = new Date();
  const epoch = new Date(2024, 0, 1);
  const daysSinceEpoch = Math.floor(
    (now.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24)
  );
  return WORDS[daysSinceEpoch % WORDS.length];
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ============================================
// LOCALSTORAGE HELPERS
// ============================================

const STATS_KEY = "dev-wordle-stats";
const STATE_KEY = "dev-wordle-state";

function getDefaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastPlayedDate: "",
  };
}

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return getDefaultStats();
}

function saveStats(stats: GameStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

interface SavedState {
  date: string;
  guesses: string[];
  status: GameStatus;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === getTodayString()) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: SavedState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// ============================================
// EVALUATION LOGIC
// ============================================

function evaluateGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill("absent");
  const answerChars = answer.split("");
  const guessChars = guess.split("");
  const remaining: (string | null)[] = [...answerChars];

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Second pass: wrong positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const idx = remaining.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = "present";
      remaining[idx] = null;
    }
  }

  return result;
}

// ============================================
// COMPONENT
// ============================================

export default function DevWordlePage() {
  const [mounted, setMounted] = useState(false);
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<GameStats>(getDefaultStats());
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [toastMessage, setToastMessage] = useState("");
  const [popTile, setPopTile] = useState(-1);

  // Mount + load state
  useEffect(() => {
    setMounted(true);
    const word = getDailyWord();
    setAnswer(word);

    const savedStats = loadStats();
    setStats(savedStats);

    const savedState = loadState();
    if (savedState) {
      setGuesses(savedState.guesses);
      setGameStatus(savedState.status);
    }
  }, []);

  // Show toast
  const showToast = useCallback((msg: string, duration = 1500) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), duration);
  }, []);

  // Persist state on changes
  useEffect(() => {
    if (!mounted) return;
    saveState({
      date: getTodayString(),
      guesses,
      status: gameStatus,
    });
  }, [guesses, gameStatus, mounted]);

  // Update stats on game end
  const updateStats = useCallback(
    (won: boolean, numGuesses: number) => {
      const newStats = { ...stats };
      newStats.gamesPlayed++;
      newStats.lastPlayedDate = getTodayString();
      if (won) {
        newStats.gamesWon++;
        newStats.currentStreak++;
        newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
        newStats.guessDistribution[numGuesses - 1]++;
      } else {
        newStats.currentStreak = 0;
      }
      setStats(newStats);
      saveStats(newStats);
    },
    [stats]
  );

  // Submit guess
  const submitGuess = useCallback(() => {
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeRow(guesses.length);
      showToast("Not enough letters");
      setTimeout(() => setShakeRow(-1), 600);
      return;
    }

    if (!VALID_GUESSES.has(currentGuess)) {
      setShakeRow(guesses.length);
      showToast("Not in word list");
      setTimeout(() => setShakeRow(-1), 600);
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setRevealingRow(guesses.length);
    setGuesses(newGuesses);
    setCurrentGuess("");

    // Wait for reveal animation to finish before checking win/loss
    const revealDuration = WORD_LENGTH * 300 + 200;
    setTimeout(() => {
      setRevealingRow(-1);
      if (currentGuess === answer) {
        setGameStatus("won");
        updateStats(true, newGuesses.length);
        showToast("Excellent!", 2000);
        setTimeout(() => setShowStats(true), 2500);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameStatus("lost");
        updateStats(false, newGuesses.length);
        showToast(answer, 3000);
        setTimeout(() => setShowStats(true), 3500);
      }
    }, revealDuration);
  }, [currentGuess, guesses, answer, showToast, updateStats]);

  // Handle key press
  const handleKey = useCallback(
    (key: string) => {
      if (gameStatus !== "playing") return;
      if (revealingRow !== -1) return;

      if (key === "ENTER") {
        submitGuess();
        return;
      }

      if (key === "DEL" || key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }

      if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        const newGuess = currentGuess + key;
        setCurrentGuess(newGuess);
        setPopTile(newGuess.length - 1);
        setTimeout(() => setPopTile(-1), 100);
      }
    },
    [gameStatus, currentGuess, revealingRow, submitGuess]
  );

  // Physical keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  // Compute keyboard letter states
  const letterStates = (() => {
    const states: Record<string, TileState> = {};
    for (const guess of guesses) {
      const evaluation = evaluateGuess(guess, answer);
      for (let i = 0; i < WORD_LENGTH; i++) {
        const letter = guess[i];
        const state = evaluation[i];
        const existing = states[letter];
        // Priority: correct > present > absent
        if (
          !existing ||
          state === "correct" ||
          (state === "present" && existing !== "correct")
        ) {
          states[letter] = state;
        }
      }
    }
    return states;
  })();

  // Generate share text
  const generateShareText = (): string => {
    const dayNum = Math.floor(
      (new Date().getTime() - new Date(2024, 0, 1).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const score = gameStatus === "won" ? guesses.length : "X";
    let text = `Dev Wordle #${dayNum} ${score}/${MAX_GUESSES}\n\n`;

    for (const guess of guesses) {
      const evaluation = evaluateGuess(guess, answer);
      const row = evaluation
        .map((s) => {
          if (s === "correct") return "\u{1F7E9}";
          if (s === "present") return "\u{1F7E8}";
          return "\u2B1B";
        })
        .join("");
      text += row + "\n";
    }

    return text.trim();
  };

  const handleShare = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(
      () => showToast("Copied to clipboard!", 2000),
      () => showToast("Failed to copy", 2000)
    );
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderTile = (
    letter: string,
    state: TileState,
    rowIdx: number,
    colIdx: number,
    isCurrentRow: boolean
  ) => {
    const isRevealing = revealingRow === rowIdx;
    const revealDelay = colIdx * 300;
    const shouldPop = isCurrentRow && popTile === colIdx;

    const stateColors: Record<TileState, { bg: string; border: string }> = {
      empty: { bg: "transparent", border: "var(--color-border)" },
      tbd: { bg: "transparent", border: "var(--color-border-hover)" },
      correct: { bg: "var(--color-accent)", border: "var(--color-accent)" },
      present: { bg: "var(--color-orange)", border: "var(--color-orange)" },
      absent: { bg: "var(--color-bg-card)", border: "var(--color-border)" },
    };

    const colors = stateColors[state];
    const textColor =
      state === "correct" || state === "present"
        ? "var(--color-bg)"
        : "var(--color-text)";

    return (
      <div
        key={colIdx}
        className="tile-container"
        style={{
          width: "58px",
          height: "58px",
          perspective: "500px",
          ...(isRevealing
            ? { animationDelay: `${revealDelay}ms` }
            : {}),
        }}
      >
        <div
          className={`
            pixel-text flex items-center justify-center text-xl sm:text-2xl
            border-2 w-full h-full transition-transform duration-100
            ${isRevealing ? "tile-flip" : ""}
            ${shouldPop ? "tile-pop" : ""}
          `}
          style={{
            background: colors.bg,
            borderColor: colors.border,
            color: textColor,
            animationDelay: isRevealing ? `${revealDelay}ms` : undefined,
          }}
        >
          {letter}
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const rows = [];

    for (let r = 0; r < MAX_GUESSES; r++) {
      const isCurrentRow = r === guesses.length && gameStatus === "playing";
      const isShaking = shakeRow === r;
      const tiles = [];

      for (let c = 0; c < WORD_LENGTH; c++) {
        let letter = "";
        let state: TileState = "empty";

        if (r < guesses.length) {
          // Submitted guess
          letter = guesses[r][c];
          state = evaluateGuess(guesses[r], answer)[c];
        } else if (isCurrentRow && c < currentGuess.length) {
          // Current typing
          letter = currentGuess[c];
          state = "tbd";
        }

        tiles.push(renderTile(letter, state, r, c, isCurrentRow));
      }

      rows.push(
        <div
          key={r}
          className={`flex gap-1.5 justify-center ${isShaking ? "row-shake" : ""}`}
        >
          {tiles}
        </div>
      );
    }

    return <div className="flex flex-col gap-1.5">{rows}</div>;
  };

  const renderKeyboard = () => {
    return (
      <div className="flex flex-col gap-1.5 items-center w-full max-w-lg mx-auto">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 sm:gap-1.5 justify-center w-full">
            {row.map((key) => {
              const state = letterStates[key];
              const isWide = key === "ENTER" || key === "DEL";

              let bg = "var(--color-bg-card)";
              let color = "var(--color-text)";
              let borderColor = "var(--color-border)";

              if (state === "correct") {
                bg = "var(--color-accent)";
                color = "var(--color-bg)";
                borderColor = "var(--color-accent)";
              } else if (state === "present") {
                bg = "var(--color-orange)";
                color = "var(--color-bg)";
                borderColor = "var(--color-orange)";
              } else if (state === "absent") {
                bg = "var(--color-bg-secondary)";
                color = "var(--color-text-muted)";
                borderColor = "var(--color-bg-secondary)";
              }

              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className="pixel-text border-2 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
                  style={{
                    background: bg,
                    color,
                    borderColor,
                    fontSize: isWide ? "0.55rem" : "0.7rem",
                    width: isWide ? "65px" : "36px",
                    height: "50px",
                    minWidth: isWide ? "65px" : "30px",
                  }}
                >
                  {key === "DEL" ? "\u232B" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderStatsModal = () => {
    if (!showStats) return null;

    const winPct =
      stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0;

    const maxDist = Math.max(...stats.guessDistribution, 1);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0, 0, 0, 0.7)" }}
        onClick={() => setShowStats(false)}
      >
        <div
          className="pixel-card p-6 sm:p-8 w-full max-w-sm animate-scale-in"
          style={{ background: "var(--color-bg-card)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            className="pixel-text text-sm text-center mb-6"
            style={{ color: "var(--color-accent)" }}
          >
            STATISTICS
          </h2>

          {/* Stat numbers */}
          <div className="grid grid-cols-4 gap-2 mb-6 text-center">
            {[
              { value: stats.gamesPlayed, label: "Played" },
              { value: winPct, label: "Win %" },
              { value: stats.currentStreak, label: "Streak" },
              { value: stats.maxStreak, label: "Max" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text)", fontFamily: "var(--font-body)" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[9px] pixel-text"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          {/* Guess distribution */}
          <h3
            className="pixel-text text-xs text-center mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            GUESS DISTRIBUTION
          </h3>
          <div className="space-y-1.5 mb-6">
            {stats.guessDistribution.map((count, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="pixel-text text-xs w-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {idx + 1}
                </span>
                <div
                  className="h-5 flex items-center justify-end px-2 transition-all duration-500"
                  style={{
                    width: `${Math.max((count / maxDist) * 100, 8)}%`,
                    background:
                      gameStatus === "won" && guesses.length === idx + 1
                        ? "var(--color-accent)"
                        : "var(--color-bg-card-hover)",
                  }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{
                      color:
                        gameStatus === "won" && guesses.length === idx + 1
                          ? "var(--color-bg)"
                          : "var(--color-text)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Share button */}
          {gameStatus !== "playing" && (
            <button
              onClick={handleShare}
              className="pixel-btn w-full text-center"
            >
              SHARE
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setShowStats(false)}
            className="pixel-text text-xs mt-4 w-full text-center cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <p
          className="pixel-text text-sm animate-flicker"
          style={{ color: "var(--color-text-muted)" }}
        >
          LOADING...
        </p>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div
      className="min-h-screen relative flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Background pattern */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div
            className="pixel-text text-xs px-4 py-2 border-2"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header
          className="border-b-2 py-3 px-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Link
              href="/games"
              className="pixel-text text-[10px] transition-colors duration-200"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
            >
              &lt; BACK
            </Link>

            <h1
              className="pixel-text text-sm sm:text-base"
              style={{
                color: "var(--color-accent)",
                textShadow: "0 0 10px var(--color-accent-glow)",
              }}
            >
              DEV WORDLE
            </h1>

            <button
              onClick={() => setShowStats(true)}
              className="pixel-text text-[10px] transition-colors duration-200 cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
            >
              STATS
            </button>
          </div>
        </header>

        {/* Game Area */}
        <main className="flex-1 flex flex-col items-center justify-between py-4 px-4 gap-4 max-w-lg mx-auto w-full">
          {/* Grid */}
          <div className="flex-1 flex items-center">
            {renderGrid()}
          </div>

          {/* Keyboard */}
          <div className="w-full pb-2">
            {renderKeyboard()}
          </div>
        </main>
      </div>

      {/* Stats Modal */}
      {renderStatsModal()}

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes tileFlip {
          0% {
            transform: rotateX(0deg);
          }
          50% {
            transform: rotateX(90deg);
          }
          100% {
            transform: rotateX(0deg);
          }
        }

        @keyframes tilePop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes rowShake {
          0%, 100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-5px);
          }
          40% {
            transform: translateX(5px);
          }
          60% {
            transform: translateX(-3px);
          }
          80% {
            transform: translateX(3px);
          }
        }

        :global(.tile-flip) {
          animation: tileFlip 500ms ease-in-out both;
        }

        :global(.tile-pop) {
          animation: tilePop 100ms ease-in-out;
        }

        :global(.row-shake) {
          animation: rowShake 500ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
