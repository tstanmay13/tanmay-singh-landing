'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---

type CellColor = string | null;
type Grid = CellColor[][];
type GamePhase = 'idle' | 'preview' | 'drawing' | 'scoring' | 'finished';

interface Pattern {
  name: string;
  grid: Grid;
  palette: string[];
}

interface LevelResult {
  level: number;
  patternName: string;
  score: number;
}

// --- Pattern Definitions ---

const _ = null;
const R = '#ef4444'; // red
const Y = '#facc15'; // yellow
const G = '#22c55e'; // green
const BR = '#92400e'; // brown
const BL = '#3b82f6'; // blue
const W = '#ffffff'; // white
const GR = '#6b7280'; // gray
const BK = '#1a1a2e'; // dark/black

const PATTERNS: Pattern[] = [
  {
    name: 'Heart',
    palette: [R],
    grid: [
      [_, _, _, _, _, _, _, _],
      [_, R, R, _, _, R, R, _],
      [R, R, R, R, R, R, R, R],
      [R, R, R, R, R, R, R, R],
      [R, R, R, R, R, R, R, R],
      [_, R, R, R, R, R, R, _],
      [_, _, R, R, R, R, _, _],
      [_, _, _, R, R, _, _, _],
    ],
  },
  {
    name: 'Smiley',
    palette: [Y, BK],
    grid: [
      [_, _, Y, Y, Y, Y, _, _],
      [_, Y, Y, Y, Y, Y, Y, _],
      [Y, Y, BK, Y, Y, BK, Y, Y],
      [Y, Y, Y, Y, Y, Y, Y, Y],
      [Y, Y, Y, Y, Y, Y, Y, Y],
      [Y, BK, Y, Y, Y, Y, BK, Y],
      [_, Y, BK, BK, BK, BK, Y, _],
      [_, _, Y, Y, Y, Y, _, _],
    ],
  },
  {
    name: 'Arrow',
    palette: [G],
    grid: [
      [_, _, _, G, _, _, _, _],
      [_, _, _, G, G, _, _, _],
      [_, _, _, G, G, G, _, _],
      [G, G, G, G, G, G, G, _],
      [G, G, G, G, G, G, G, _],
      [_, _, _, G, G, G, _, _],
      [_, _, _, G, G, _, _, _],
      [_, _, _, G, _, _, _, _],
    ],
  },
  {
    name: 'House',
    palette: [R, BR],
    grid: [
      [_, _, _, R, R, _, _, _],
      [_, _, R, R, R, R, _, _],
      [_, R, R, R, R, R, R, _],
      [R, R, R, R, R, R, R, R],
      [BR, BR, BR, BR, BR, BR, BR, BR],
      [BR, BR, _, _, _, _, BR, BR],
      [BR, BR, _, _, _, _, BR, BR],
      [BR, BR, _, _, _, _, BR, BR],
    ],
  },
  {
    name: 'Tree',
    palette: [G, BR],
    grid: [
      [_, _, _, G, G, _, _, _],
      [_, _, G, G, G, G, _, _],
      [_, G, G, G, G, G, G, _],
      [_, _, G, G, G, G, _, _],
      [_, G, G, G, G, G, G, _],
      [G, G, G, G, G, G, G, G],
      [_, _, _, BR, BR, _, _, _],
      [_, _, _, BR, BR, _, _, _],
    ],
  },
  {
    name: 'Star',
    palette: [Y],
    grid: [
      [_, _, _, Y, Y, _, _, _],
      [_, _, _, Y, Y, _, _, _],
      [Y, Y, Y, Y, Y, Y, Y, Y],
      [_, Y, Y, Y, Y, Y, Y, _],
      [_, _, Y, Y, Y, Y, _, _],
      [_, Y, Y, _, _, Y, Y, _],
      [Y, Y, _, _, _, _, Y, Y],
      [Y, _, _, _, _, _, _, Y],
    ],
  },
  {
    name: 'Diamond',
    palette: [BL],
    grid: [
      [_, _, _, BL, BL, _, _, _],
      [_, _, BL, BL, BL, BL, _, _],
      [_, BL, BL, BL, BL, BL, BL, _],
      [BL, BL, BL, BL, BL, BL, BL, BL],
      [BL, BL, BL, BL, BL, BL, BL, BL],
      [_, BL, BL, BL, BL, BL, BL, _],
      [_, _, BL, BL, BL, BL, _, _],
      [_, _, _, BL, BL, _, _, _],
    ],
  },
  {
    name: 'Mushroom',
    palette: [R, W],
    grid: [
      [_, _, R, R, R, R, _, _],
      [_, R, R, W, R, W, R, _],
      [R, R, W, W, R, W, W, R],
      [R, R, R, R, R, R, R, R],
      [_, _, W, W, W, W, _, _],
      [_, _, W, W, W, W, _, _],
      [_, W, W, W, W, W, W, _],
      [_, W, W, W, W, W, W, _],
    ],
  },
  {
    name: 'Skull',
    palette: [W, BK],
    grid: [
      [_, _, W, W, W, W, _, _],
      [_, W, W, W, W, W, W, _],
      [W, W, BK, W, W, BK, W, W],
      [W, W, BK, W, W, BK, W, W],
      [W, W, W, W, W, W, W, W],
      [_, W, W, W, W, W, W, _],
      [_, _, W, BK, BK, W, _, _],
      [_, _, BK, W, BK, W, _, _],
    ],
  },
  {
    name: 'Lightning',
    palette: [Y],
    grid: [
      [_, _, _, _, Y, Y, _, _],
      [_, _, _, Y, Y, _, _, _],
      [_, _, Y, Y, _, _, _, _],
      [_, Y, Y, Y, Y, Y, _, _],
      [_, _, _, Y, Y, _, _, _],
      [_, _, Y, Y, _, _, _, _],
      [_, Y, Y, _, _, _, _, _],
      [Y, Y, _, _, _, _, _, _],
    ],
  },
  {
    name: 'Spaceship',
    palette: [GR, BL],
    grid: [
      [_, _, _, BL, BL, _, _, _],
      [_, _, BL, BL, BL, BL, _, _],
      [_, BL, GR, GR, GR, GR, BL, _],
      [_, GR, GR, GR, GR, GR, GR, _],
      [GR, GR, GR, GR, GR, GR, GR, GR],
      [_, _, GR, GR, GR, GR, _, _],
      [_, _, BL, _, _, BL, _, _],
      [_, BL, _, _, _, _, BL, _],
    ],
  },
  {
    name: 'Ghost',
    palette: [W],
    grid: [
      [_, _, W, W, W, W, _, _],
      [_, W, W, W, W, W, W, _],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, _, W, W, _, W, W, _],
    ],
  },
];

const GRID_SIZE = 8;
const TOTAL_LEVELS = 10;
const LS_KEY = 'pixel-perfector-best';

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function getPreviewDuration(level: number): number {
  if (level <= 3) return 4;
  if (level <= 6) return 3;
  return 2;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateScore(reference: Grid, player: Grid): number {
  let totalColored = 0;
  let correct = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const ref = reference[r][c];
      const play = player[r][c];
      if (ref !== null) {
        totalColored++;
        if (play === ref) {
          correct++;
        }
      }
    }
  }

  if (totalColored === 0) return 100;
  return Math.round((correct / totalColored) * 100);
}

// --- Component ---

export default function PixelPerfectorPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [level, setLevel] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [playerGrid, setPlayerGrid] = useState<Grid>(createEmptyGrid);
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [levelScore, setLevelScore] = useState(0);
  const [results, setResults] = useState<LevelResult[]>([]);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [levelOrder, setLevelOrder] = useState<number[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setPersonalBest(parseInt(stored, 10));
    } catch { /* noop */ }
  }, []);

  const startGame = useCallback(() => {
    const order = shuffleArray(Array.from({ length: PATTERNS.length }, (_, i) => i)).slice(0, TOTAL_LEVELS);
    setLevelOrder(order);
    setLevel(1);
    setResults([]);
    startLevel(1, order);
  }, []);

  const startLevel = (lvl: number, order: number[]) => {
    const pattern = PATTERNS[order[lvl - 1]];
    setCurrentPattern(pattern);
    setPlayerGrid(createEmptyGrid());
    setSelectedColor(pattern.palette[0]);
    setLevelScore(0);

    const duration = getPreviewDuration(lvl);
    setCountdown(duration);
    setPhase('preview');

    let remaining = duration;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('drawing');
      }
    }, 1000);
  };

  const handleCellClick = (row: number, col: number) => {
    if (phase !== 'drawing' || !selectedColor) return;

    setPlayerGrid((prev) => {
      const next = prev.map((r) => [...r]);
      if (next[row][col] === selectedColor) {
        next[row][col] = null;
      } else {
        next[row][col] = selectedColor;
      }
      return next;
    });
  };

  const submitDrawing = () => {
    if (!currentPattern) return;
    const score = calculateScore(currentPattern.grid, playerGrid);
    setLevelScore(score);
    setPhase('scoring');
  };

  const handleNext = () => {
    if (!currentPattern) return;
    const newResults = [...results, { level, patternName: currentPattern.name, score: levelScore }];
    setResults(newResults);

    if (level >= TOTAL_LEVELS) {
      const avg = Math.round(newResults.reduce((s, r) => s + r.score, 0) / newResults.length);
      if (avg > personalBest) {
        setPersonalBest(avg);
        try { localStorage.setItem(LS_KEY, String(avg)); } catch { /* noop */ }
      }
      setPhase('finished');
      return;
    }

    const nextLvl = level + 1;
    setLevel(nextLvl);
    startLevel(nextLvl, levelOrder);
  };

  const retryLevel = () => {
    startLevel(level, levelOrder);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!mounted) return null;

  const totalScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  // --- Render helpers ---

  const renderGrid = (grid: Grid, interactive: boolean, comparison?: Grid) => {
    return (
      <div
        className="grid gap-[2px] p-2 pixel-border mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          background: 'var(--color-bg-secondary)',
          width: 'min(85vw, 360px)',
          height: 'min(85vw, 360px)',
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            let borderStyle = {};
            if (comparison) {
              const ref = comparison[r][c];
              const play = cell;
              if (ref !== null && play === ref) {
                borderStyle = { outline: '2px solid #22c55e', outlineOffset: '-2px' };
              } else if (ref !== null && play !== ref) {
                borderStyle = { outline: '2px solid #ef4444', outlineOffset: '-2px' };
              } else if (ref === null && play !== null) {
                borderStyle = { outline: '2px solid #f59e0b', outlineOffset: '-2px' };
              }
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => interactive && handleCellClick(r, c)}
                className={`aspect-square transition-colors duration-100 ${interactive ? 'cursor-pointer hover:opacity-80' : ''}`}
                style={{
                  backgroundColor: cell || 'var(--color-surface)',
                  ...borderStyle,
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  const renderPalette = () => {
    if (!currentPattern) return null;
    return (
      <div className="flex items-center gap-3 justify-center mt-4">
        <span className="pixel-text text-[0.55rem]" style={{ color: 'var(--color-text-secondary)' }}>
          Colors:
        </span>
        {currentPattern.palette.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className="w-10 h-10 rounded transition-transform"
            style={{
              backgroundColor: color,
              border: selectedColor === color ? '3px solid var(--color-accent)' : '2px solid var(--color-border)',
              transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
              boxShadow: selectedColor === color ? '0 0 12px var(--color-accent-glow)' : 'none',
            }}
          />
        ))}
        <button
          onClick={() => setSelectedColor('__eraser__')}
          className="w-10 h-10 rounded flex items-center justify-center text-lg transition-transform"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: selectedColor === '__eraser__' ? '3px solid var(--color-accent)' : '2px solid var(--color-border)',
            transform: selectedColor === '__eraser__' ? 'scale(1.2)' : 'scale(1)',
          }}
          title="Eraser"
        >
          x
        </button>
      </div>
    );
  };

  // Override handleCellClick for eraser
  const handleCellClickWrapped = (row: number, col: number) => {
    if (phase !== 'drawing') return;
    if (selectedColor === '__eraser__') {
      setPlayerGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = null;
        return next;
      });
      return;
    }
    handleCellClick(row, col);
  };

  const renderGridInteractive = (grid: Grid) => {
    return (
      <div
        className="grid gap-[2px] p-2 pixel-border mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          background: 'var(--color-bg-secondary)',
          width: 'min(85vw, 360px)',
          height: 'min(85vw, 360px)',
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => handleCellClickWrapped(r, c)}
              className="aspect-square cursor-pointer hover:opacity-80 transition-colors duration-100"
              style={{
                backgroundColor: cell || 'var(--color-surface)',
              }}
            />
          ))
        )}
      </div>
    );
  };

  // --- Phase renders ---

  if (phase === 'idle') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="p-4 md:p-6">
          <Link
            href="/games"
            className="pixel-text text-[0.65rem] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &lt; back to games
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="text-6xl mb-4">🎨</div>
            <h1
              className="pixel-text text-xl md:text-2xl mb-3"
              style={{ color: 'var(--color-accent)' }}
            >
              Pixel Perfector
            </h1>
            <p
              className="text-sm md:text-base max-w-md"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Memorize pixel art patterns, then recreate them from memory.
              How sharp is your pixel eye?
            </p>
          </div>

          {personalBest > 0 && (
            <div
              className="pixel-border px-4 py-2 mb-6 text-center"
              style={{ background: 'var(--color-bg-card)' }}
            >
              <span className="pixel-text text-[0.55rem]" style={{ color: 'var(--color-text-muted)' }}>
                Personal Best:
              </span>{' '}
              <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
                {personalBest}%
              </span>
            </div>
          )}

          <button onClick={startGame} className="pixel-btn text-sm">
            Start Game
          </button>

          <div
            className="mt-8 max-w-sm text-center text-xs leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p className="pixel-text text-[0.5rem] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              How to play
            </p>
            <p>
              A pixel art pattern will flash on screen. Memorize it, then paint it
              back from memory. Score 60% or higher to advance. 10 levels total.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const finalAvg = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="p-4 md:p-6">
          <Link
            href="/games"
            className="pixel-text text-[0.65rem] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &lt; back to games
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="text-6xl mb-4">
              {finalAvg >= 90 ? '🏆' : finalAvg >= 70 ? '🌟' : finalAvg >= 50 ? '👍' : '🤔'}
            </div>
            <h2
              className="pixel-text text-lg md:text-xl mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              Game Over!
            </h2>
            <p className="pixel-text text-2xl mb-1" style={{ color: 'var(--color-text)' }}>
              {finalAvg}%
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Average Accuracy
            </p>
            {finalAvg >= personalBest && finalAvg > 0 && (
              <p className="pixel-text text-[0.6rem] mt-2" style={{ color: 'var(--color-orange)' }}>
                New Personal Best!
              </p>
            )}
          </div>

          <div
            className="pixel-border p-4 mb-6 w-full max-w-sm"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <p
              className="pixel-text text-[0.55rem] mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Level Breakdown
            </p>
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.level} className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Lv{r.level}: {r.patternName}
                  </span>
                  <span
                    className="pixel-text text-[0.6rem]"
                    style={{ color: r.score >= 60 ? 'var(--color-accent)' : 'var(--color-red)' }}
                  >
                    {r.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame} className="pixel-btn text-xs">
              Play Again
            </button>
            <Link href="/games" className="pixel-btn text-xs">
              Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Active game phases (preview, drawing, scoring) ---

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '2px solid var(--color-border)' }}
      >
        <Link
          href="/games"
          className="pixel-text text-[0.55rem] transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &lt; exit
        </Link>
        <div className="flex items-center gap-4">
          <span className="pixel-text text-[0.55rem]" style={{ color: 'var(--color-text-muted)' }}>
            Lv {level}/{TOTAL_LEVELS}
          </span>
          {results.length > 0 && (
            <span className="pixel-text text-[0.55rem]" style={{ color: 'var(--color-accent)' }}>
              Avg: {totalScore}%
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        {/* Pattern name */}
        {phase === 'preview' && currentPattern && (
          <div className="text-center animate-fade-in-up">
            <p className="pixel-text text-[0.6rem] mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Memorize this pattern
            </p>
            <p className="pixel-text text-base" style={{ color: 'var(--color-text)' }}>
              {currentPattern.name}
            </p>
          </div>
        )}

        {phase === 'drawing' && currentPattern && (
          <div className="text-center">
            <p className="pixel-text text-[0.6rem] mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Recreate from memory
            </p>
            <p className="pixel-text text-base" style={{ color: 'var(--color-text)' }}>
              {currentPattern.name}
            </p>
          </div>
        )}

        {/* Countdown during preview */}
        {phase === 'preview' && (
          <div
            className="pixel-text text-3xl animate-glow-pulse"
            style={{ color: 'var(--color-accent)' }}
          >
            {countdown}
          </div>
        )}

        {/* Grid */}
        {phase === 'preview' && currentPattern && renderGrid(currentPattern.grid, false)}

        {phase === 'drawing' && renderGridInteractive(playerGrid)}

        {phase === 'scoring' && currentPattern && (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-center">
              <p className="pixel-text text-[0.5rem] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Your Drawing
              </p>
              {renderGrid(playerGrid, false, currentPattern.grid)}
            </div>
            <div className="text-center">
              <p className="pixel-text text-[0.5rem] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Reference
              </p>
              {renderGrid(currentPattern.grid, false)}
            </div>
          </div>
        )}

        {/* Color palette during drawing */}
        {phase === 'drawing' && renderPalette()}

        {/* Submit button during drawing */}
        {phase === 'drawing' && (
          <button onClick={submitDrawing} className="pixel-btn text-xs mt-2">
            Check My Drawing
          </button>
        )}

        {/* Scoring result */}
        {phase === 'scoring' && (
          <div className="text-center mt-4 animate-fade-in-up">
            <p
              className="pixel-text text-2xl mb-1"
              style={{ color: levelScore >= 60 ? 'var(--color-accent)' : 'var(--color-red)' }}
            >
              {levelScore}%
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {levelScore >= 90
                ? 'Perfect memory!'
                : levelScore >= 70
                ? 'Great job!'
                : levelScore >= 60
                ? 'Not bad!'
                : 'Keep practicing!'}
            </p>
            <div className="flex gap-3 justify-center">
              {levelScore < 60 && (
                <button onClick={retryLevel} className="pixel-btn text-xs">
                  Try Again
                </button>
              )}
              <button onClick={handleNext} className="pixel-btn text-xs">
                {levelScore >= 60
                  ? level >= TOTAL_LEVELS
                    ? 'See Results'
                    : 'Next Level'
                  : 'Skip'}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-[0.5rem]">
              <span style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />
                Correct
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />
                Missing
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} />
                Extra
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
