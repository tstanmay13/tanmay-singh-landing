'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

type GameMode = 'hex-to-color' | 'color-to-hex';
type GamePhase = 'menu' | 'playing' | 'feedback' | 'results';
type Difficulty = 'easy' | 'medium' | 'hard';

interface RoundResult {
  round: number;
  correct: boolean;
  timeTaken: number;
  correctColor: string;
  selectedColor: string;
}

interface GameState {
  mode: GameMode;
  phase: GamePhase;
  round: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctColor: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  roundStartTime: number;
  results: RoundResult[];
}

// ============================================
// Constants
// ============================================

const TOTAL_ROUNDS = 10;

const DIFFICULTY_RANGES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 80, max: 160 },
  medium: { min: 40, max: 80 },
  hard: { min: 10, max: 40 },
};

// ============================================
// Color Utility Functions
// ============================================

function randomHexColor(): string {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return rgbToHex(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function generateSimilarColor(baseHex: string, difficulty: Difficulty): string {
  const { r, g, b } = hexToRgb(baseHex);
  const { min, max } = DIFFICULTY_RANGES[difficulty];

  const offset = () => {
    const magnitude = min + Math.random() * (max - min);
    return Math.random() > 0.5 ? magnitude : -magnitude;
  };

  return rgbToHex(
    clampChannel(Math.round(r + offset())),
    clampChannel(Math.round(g + offset())),
    clampChannel(Math.round(b + offset()))
  );
}

function getDifficultyForRound(round: number): Difficulty {
  if (round <= 3) return 'easy';
  if (round <= 7) return 'medium';
  return 'hard';
}

function generateOptions(correctColor: string, round: number, count: number): string[] {
  const difficulty = getDifficultyForRound(round);
  const options: string[] = [correctColor];
  const seen = new Set<string>([correctColor.toUpperCase()]);

  while (options.length < count) {
    const similar = generateSimilarColor(correctColor, difficulty);
    if (!seen.has(similar.toUpperCase())) {
      seen.add(similar.toUpperCase());
      options.push(similar);
    }
  }

  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

// ============================================
// Component
// ============================================

export default function ColorGuesserPage() {
  const [mounted, setMounted] = useState(false);
  const [game, setGame] = useState<GameState>({
    mode: 'hex-to-color',
    phase: 'menu',
    round: 1,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctColor: '',
    options: [],
    selectedIndex: null,
    correctIndex: 0,
    roundStartTime: 0,
    results: [],
  });

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    const correctColor = randomHexColor();
    const options = generateOptions(correctColor, 1, mode === 'hex-to-color' ? 6 : 4);
    const correctIndex = options.indexOf(correctColor);

    setGame({
      mode,
      phase: 'playing',
      round: 1,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctColor,
      options,
      selectedIndex: null,
      correctIndex,
      roundStartTime: Date.now(),
      results: [],
    });
  }, []);

  const advanceRound = useCallback(() => {
    setGame((prev) => {
      if (prev.round >= TOTAL_ROUNDS) {
        return { ...prev, phase: 'results' };
      }

      const nextRound = prev.round + 1;
      const correctColor = randomHexColor();
      const count = prev.mode === 'hex-to-color' ? 6 : 4;
      const options = generateOptions(correctColor, nextRound, count);
      const correctIndex = options.indexOf(correctColor);

      return {
        ...prev,
        phase: 'playing',
        round: nextRound,
        correctColor,
        options,
        selectedIndex: null,
        correctIndex,
        roundStartTime: Date.now(),
      };
    });
  }, []);

  const handleGuess = useCallback((index: number) => {
    if (game.phase !== 'playing') return;

    const timeTaken = Date.now() - game.roundStartTime;
    const isCorrect = index === game.correctIndex;

    const streakBonus = isCorrect ? Math.min(game.streak, 5) : 0;
    const basePoints = isCorrect ? 100 : 0;
    const timeBonus = isCorrect ? Math.max(0, Math.floor((5000 - timeTaken) / 100)) : 0;
    const pointsEarned = basePoints + streakBonus * 10 + timeBonus;

    const newStreak = isCorrect ? game.streak + 1 : 0;
    const newBestStreak = Math.max(game.bestStreak, newStreak);

    const result: RoundResult = {
      round: game.round,
      correct: isCorrect,
      timeTaken,
      correctColor: game.correctColor,
      selectedColor: game.options[index],
    };

    setGame((prev) => ({
      ...prev,
      phase: 'feedback',
      selectedIndex: index,
      score: prev.score + pointsEarned,
      streak: newStreak,
      bestStreak: newBestStreak,
      results: [...prev.results, result],
    }));

    feedbackTimeoutRef.current = setTimeout(() => {
      advanceRound();
    }, 1500);
  }, [game.phase, game.roundStartTime, game.correctIndex, game.streak, game.bestStreak, game.round, game.correctColor, game.options, advanceRound]);

  const resetToMenu = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGame((prev) => ({
      ...prev,
      phase: 'menu',
      round: 1,
      score: 0,
      streak: 0,
      bestStreak: 0,
      results: [],
      selectedIndex: null,
    }));
  }, []);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p className="pixel-text" style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
          Loading...
        </p>
      </div>
    );
  }

  const accuracy = game.results.length > 0
    ? Math.round((game.results.filter((r) => r.correct).length / game.results.length) * 100)
    : 0;

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          href="/games"
          className="inline-block mb-6 pixel-text transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.65rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          &lt; Back to Games
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="pixel-text text-xl md:text-2xl mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Color Guesser
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Test your color perception skills
          </p>
        </div>

        {/* ============================================
            MENU PHASE
           ============================================ */}
        {game.phase === 'menu' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <p
              className="pixel-text text-center"
              style={{ color: 'var(--color-text)', fontSize: '0.7rem' }}
            >
              Choose a mode
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
              <button
                onClick={() => startGame('hex-to-color')}
                className="pixel-card p-6 text-center cursor-pointer"
                style={{ borderRadius: '4px' }}
              >
                <div className="text-4xl mb-3">🎨</div>
                <h2
                  className="pixel-text mb-2"
                  style={{ color: 'var(--color-text)', fontSize: '0.65rem' }}
                >
                  Hex to Color
                </h2>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  See a hex code, pick the matching color swatch
                </p>
              </button>

              <button
                onClick={() => startGame('color-to-hex')}
                className="pixel-card p-6 text-center cursor-pointer"
                style={{ borderRadius: '4px' }}
              >
                <div className="text-4xl mb-3">🔤</div>
                <h2
                  className="pixel-text mb-2"
                  style={{ color: 'var(--color-text)', fontSize: '0.65rem' }}
                >
                  Color to Hex
                </h2>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  See a color swatch, pick the correct hex code
                </p>
              </button>
            </div>

            {/* Rules */}
            <div
              className="pixel-card p-5 w-full max-w-lg"
              style={{ borderRadius: '4px' }}
            >
              <h3
                className="pixel-text mb-3"
                style={{ color: 'var(--color-accent)', fontSize: '0.6rem' }}
              >
                How to Play
              </h3>
              <ul
                className="space-y-2 text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <li>- 10 rounds per game, difficulty increases each round</li>
                <li>- Earn points for correct answers + speed bonus</li>
                <li>- Build streaks for bonus multipliers</li>
                <li>- Rounds 1-3: Easy | 4-7: Medium | 8-10: Hard</li>
              </ul>
            </div>
          </div>
        )}

        {/* ============================================
            PLAYING / FEEDBACK PHASE
           ============================================ */}
        {(game.phase === 'playing' || game.phase === 'feedback') && (
          <div className="animate-fade-in-up">
            {/* HUD */}
            <div
              className="flex items-center justify-between mb-6 px-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="pixel-text" style={{ fontSize: '0.55rem' }}>
                Round {game.round}/{TOTAL_ROUNDS}
              </span>
              <span className="pixel-text" style={{ fontSize: '0.55rem' }}>
                {game.streak > 0 && (
                  <span style={{ color: 'var(--color-orange)' }}>
                    {game.streak}x{' '}
                  </span>
                )}
                Score: <span style={{ color: 'var(--color-accent)' }}>{game.score}</span>
              </span>
            </div>

            {/* Difficulty indicator */}
            <div className="flex justify-center mb-4">
              <span
                className="pixel-text px-3 py-1"
                style={{
                  fontSize: '0.5rem',
                  color:
                    getDifficultyForRound(game.round) === 'easy'
                      ? 'var(--color-accent)'
                      : getDifficultyForRound(game.round) === 'medium'
                        ? 'var(--color-orange)'
                        : 'var(--color-red)',
                  border: '1px solid',
                  borderColor:
                    getDifficultyForRound(game.round) === 'easy'
                      ? 'var(--color-accent)'
                      : getDifficultyForRound(game.round) === 'medium'
                        ? 'var(--color-orange)'
                        : 'var(--color-red)',
                }}
              >
                {getDifficultyForRound(game.round).toUpperCase()}
              </span>
            </div>

            {/* Prompt */}
            <div className="text-center mb-6">
              {game.mode === 'hex-to-color' ? (
                <div>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Which color is this?
                  </p>
                  <p
                    className="mono-text text-3xl md:text-4xl font-bold tracking-wider"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {game.correctColor}
                  </p>
                </div>
              ) : (
                <div>
                  <p
                    className="text-xs mb-3"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    What hex code is this color?
                  </p>
                  <div
                    className="mx-auto w-32 h-32 md:w-40 md:h-40"
                    style={{
                      backgroundColor: game.correctColor,
                      border: '3px solid var(--color-border)',
                      boxShadow: '3px 3px 0 var(--color-border)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Options Grid */}
            {game.mode === 'hex-to-color' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {game.options.map((color, index) => {
                  const isSelected = game.selectedIndex === index;
                  const isCorrect = index === game.correctIndex;
                  const showFeedback = game.phase === 'feedback';

                  let borderColor = 'var(--color-border)';
                  let shadowStyle = '3px 3px 0 var(--color-border)';
                  if (showFeedback && isCorrect) {
                    borderColor = 'var(--color-accent)';
                    shadowStyle = '3px 3px 0 var(--color-accent), 0 0 15px var(--color-accent-glow)';
                  } else if (showFeedback && isSelected && !isCorrect) {
                    borderColor = 'var(--color-red)';
                    shadowStyle = '3px 3px 0 var(--color-red)';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleGuess(index)}
                      disabled={game.phase === 'feedback'}
                      className="aspect-square w-full transition-all duration-200 cursor-pointer disabled:cursor-default"
                      style={{
                        backgroundColor: color,
                        border: `3px solid ${borderColor}`,
                        boxShadow: shadowStyle,
                        transform:
                          showFeedback && isCorrect
                            ? 'scale(1.05)'
                            : showFeedback && isSelected && !isCorrect
                              ? 'scale(0.95)'
                              : undefined,
                        opacity: showFeedback && !isCorrect && !isSelected ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (game.phase === 'playing') {
                          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                          e.currentTarget.style.transform = 'scale(1.03)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (game.phase === 'playing') {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {game.options.map((color, index) => {
                  const isSelected = game.selectedIndex === index;
                  const isCorrect = index === game.correctIndex;
                  const showFeedback = game.phase === 'feedback';

                  let borderStyle = '2px solid var(--color-border)';
                  let bgColor = 'var(--color-bg-card)';
                  if (showFeedback && isCorrect) {
                    borderStyle = '2px solid var(--color-accent)';
                    bgColor = 'var(--color-bg-card-hover)';
                  } else if (showFeedback && isSelected && !isCorrect) {
                    borderStyle = '2px solid var(--color-red)';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleGuess(index)}
                      disabled={game.phase === 'feedback'}
                      className="p-4 text-center transition-all duration-200 cursor-pointer disabled:cursor-default"
                      style={{
                        border: borderStyle,
                        background: bgColor,
                        opacity: showFeedback && !isCorrect && !isSelected ? 0.4 : 1,
                        transform:
                          showFeedback && isCorrect
                            ? 'scale(1.03)'
                            : showFeedback && isSelected && !isCorrect
                              ? 'scale(0.97)'
                              : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (game.phase === 'playing') {
                          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                          e.currentTarget.style.background = 'var(--color-bg-card-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (game.phase === 'playing') {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.background = 'var(--color-bg-card)';
                        }
                      }}
                    >
                      <span
                        className="mono-text text-lg font-semibold tracking-wider"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {color}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Feedback message */}
            {game.phase === 'feedback' && (
              <div className="text-center animate-scale-in">
                <p
                  className="pixel-text"
                  style={{
                    fontSize: '0.7rem',
                    color:
                      game.selectedIndex === game.correctIndex
                        ? 'var(--color-accent)'
                        : 'var(--color-red)',
                  }}
                >
                  {game.selectedIndex === game.correctIndex
                    ? game.streak > 1
                      ? `Correct! ${game.streak}x Streak!`
                      : 'Correct!'
                    : `Wrong! It was ${game.correctColor}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================
            RESULTS PHASE
           ============================================ */}
        {game.phase === 'results' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <div
              className="pixel-card p-8 w-full max-w-md text-center"
              style={{ borderRadius: '4px' }}
            >
              <h2
                className="pixel-text text-lg mb-6"
                style={{ color: 'var(--color-accent)' }}
              >
                Game Over
              </h2>

              <div className="space-y-4 mb-8">
                <div>
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Final Score
                  </p>
                  <p
                    className="pixel-text text-2xl"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {game.score}
                  </p>
                </div>

                <div
                  className="flex justify-around pt-4"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Accuracy
                    </p>
                    <p
                      className="pixel-text"
                      style={{
                        fontSize: '0.8rem',
                        color: accuracy >= 70 ? 'var(--color-accent)' : accuracy >= 40 ? 'var(--color-orange)' : 'var(--color-red)',
                      }}
                    >
                      {accuracy}%
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Best Streak
                    </p>
                    <p
                      className="pixel-text"
                      style={{ fontSize: '0.8rem', color: 'var(--color-orange)' }}
                    >
                      {game.bestStreak}x
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Correct
                    </p>
                    <p
                      className="pixel-text"
                      style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}
                    >
                      {game.results.filter((r) => r.correct).length}/{TOTAL_ROUNDS}
                    </p>
                  </div>
                </div>
              </div>

              {/* Round-by-round summary */}
              <div
                className="mb-6 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <p
                  className="pixel-text mb-3"
                  style={{ fontSize: '0.5rem', color: 'var(--color-text-muted)' }}
                >
                  Round Summary
                </p>
                <div className="flex justify-center gap-1 flex-wrap">
                  {game.results.map((result, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 flex items-center justify-center text-xs font-bold"
                      style={{
                        border: '1px solid var(--color-border)',
                        backgroundColor: result.correct
                          ? 'var(--color-accent)'
                          : 'var(--color-red)',
                        color: 'var(--color-bg)',
                      }}
                      title={`Round ${result.round}: ${result.correct ? 'Correct' : 'Wrong'} (${(result.timeTaken / 1000).toFixed(1)}s)`}
                    >
                      {result.round}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => startGame(game.mode)}
                  className="pixel-btn"
                >
                  Play Again
                </button>
                <button
                  onClick={resetToMenu}
                  className="pixel-btn"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  Change Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
