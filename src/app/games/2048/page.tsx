'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean;
  isNew?: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/* ============================================
   CONSTANTS
   ============================================ */

const GRID_SIZE = 4;

const TIER_MAP: Record<number, { emoji: string; name: string; bg: string; text: string }> = {
  2:    { emoji: '\u{1F35A}', name: 'Rice',    bg: '#2a2a3a', text: '#e8e8f0' },
  4:    { emoji: '\u{1F359}', name: 'Onigiri', bg: '#2d2d40', text: '#e8e8f0' },
  8:    { emoji: '\u{1F363}', name: 'Sushi',   bg: '#1a3a2a', text: '#00ff88' },
  16:   { emoji: '\u{1F35C}', name: 'Ramen',   bg: '#2a3a1a', text: '#88ff44' },
  32:   { emoji: '\u{1F371}', name: 'Bento',   bg: '#3a2a1a', text: '#ffaa44' },
  64:   { emoji: '\u{1F370}', name: 'Cake',    bg: '#3a1a2a', text: '#ff66aa' },
  128:  { emoji: '\u{1F355}', name: 'Pizza',   bg: '#3a2a00', text: '#ffcc00' },
  256:  { emoji: '\u{1F354}', name: 'Burger',  bg: '#4a2a00', text: '#ffdd44' },
  512:  { emoji: '\u{1F969}', name: 'Steak',   bg: '#4a1a1a', text: '#ff6644' },
  1024: { emoji: '\u{1F99E}', name: 'Lobster', bg: '#4a0a2a', text: '#ff44aa' },
  2048: { emoji: '\u{1F451}', name: 'Crown',   bg: '#3a2a00', text: '#ffd700' },
  4096: { emoji: '\u{2B50}',  name: 'Star',    bg: '#2a1a4a', text: '#aa88ff' },
  8192: { emoji: '\u{1F308}', name: 'Rainbow', bg: '#1a2a4a', text: '#44ddff' },
};

function getTier(value: number) {
  return TIER_MAP[value] || { emoji: '\u{2728}', name: String(value), bg: '#1a1a25', text: '#e8e8f0' };
}

let tileIdCounter = 0;
function nextTileId(): number {
  return ++tileIdCounter;
}

/* ============================================
   GRID LOGIC
   ============================================ */

function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

function cloneGrid(grid: (Tile | null)[][]): (Tile | null)[][] {
  return grid.map(row =>
    row.map(cell => (cell ? { ...cell } : null))
  );
}

function addRandomTile(grid: (Tile | null)[][]): (Tile | null)[][] {
  const empty: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) empty.push({ row: r, col: c });
    }
  }
  if (empty.length === 0) return grid;

  const spot = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const newGrid = cloneGrid(grid);
  newGrid[spot.row][spot.col] = {
    id: nextTileId(),
    value,
    row: spot.row,
    col: spot.col,
    isNew: true,
  };
  return newGrid;
}

function initGrid(): (Tile | null)[][] {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
}

interface MoveResult {
  grid: (Tile | null)[][];
  score: number;
  moved: boolean;
}

function slideLine(line: (Tile | null)[]): { tiles: (Tile | null)[]; score: number; moved: boolean } {
  // Filter out nulls
  const filtered = line.filter((t): t is Tile => t !== null);
  const result: (Tile | null)[] = Array(GRID_SIZE).fill(null);
  let score = 0;
  let moved = false;
  let writeIdx = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      // Merge
      const newValue = filtered[i].value * 2;
      result[writeIdx] = {
        id: nextTileId(),
        value: newValue,
        row: 0, // will be set after
        col: 0,
        mergedFrom: true,
      };
      score += newValue;
      moved = true;
      i++; // skip next
    } else {
      result[writeIdx] = { ...filtered[i], mergedFrom: false, isNew: false };
    }
    writeIdx++;
  }

  // Check if anything moved
  if (!moved) {
    for (let i = 0; i < GRID_SIZE; i++) {
      const origVal = line[i]?.value ?? 0;
      const newVal = result[i]?.value ?? 0;
      if (origVal !== newVal) {
        moved = true;
        break;
      }
    }
  }

  return { tiles: result, score, moved };
}

function moveGrid(grid: (Tile | null)[][], direction: Direction): MoveResult {
  let totalScore = 0;
  let anyMoved = false;
  const newGrid = createEmptyGrid();

  if (direction === 'left') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const { tiles, score, moved } = slideLine(grid[r]);
      totalScore += score;
      if (moved) anyMoved = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (tiles[c]) {
          tiles[c]!.row = r;
          tiles[c]!.col = c;
        }
        newGrid[r][c] = tiles[c];
      }
    }
  } else if (direction === 'right') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const reversed = [...grid[r]].reverse();
      const { tiles, score, moved } = slideLine(reversed);
      totalScore += score;
      if (moved) anyMoved = true;
      const back = [...tiles].reverse();
      for (let c = 0; c < GRID_SIZE; c++) {
        if (back[c]) {
          back[c]!.row = r;
          back[c]!.col = c;
        }
        newGrid[r][c] = back[c];
      }
    }
  } else if (direction === 'up') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = [];
      for (let r = 0; r < GRID_SIZE; r++) col.push(grid[r][c]);
      const { tiles, score, moved } = slideLine(col);
      totalScore += score;
      if (moved) anyMoved = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (tiles[r]) {
          tiles[r]!.row = r;
          tiles[r]!.col = c;
        }
        newGrid[r][c] = tiles[r];
      }
    }
  } else {
    // down
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = [];
      for (let r = GRID_SIZE - 1; r >= 0; r--) col.push(grid[r][c]);
      const { tiles, score, moved } = slideLine(col);
      totalScore += score;
      if (moved) anyMoved = true;
      const back = [...tiles].reverse();
      for (let r = 0; r < GRID_SIZE; r++) {
        if (back[r]) {
          back[r]!.row = r;
          back[r]!.col = c;
        }
        newGrid[r][c] = back[r];
      }
    }
  }

  return { grid: newGrid, score: totalScore, moved: anyMoved };
}

function canMove(grid: (Tile | null)[][]): boolean {
  // Check for empty cells
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) return true;
    }
  }
  // Check for adjacent same values
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c]!.value;
      if (r + 1 < GRID_SIZE && grid[r + 1][c]?.value === val) return true;
      if (c + 1 < GRID_SIZE && grid[r][c + 1]?.value === val) return true;
    }
  }
  return false;
}

function hasWon(grid: (Tile | null)[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] && grid[r][c]!.value >= 2048) return true;
    }
  }
  return false;
}

/* ============================================
   COMPONENT
   ============================================ */

export default function Game2048Page() {
  const [mounted, setMounted] = useState(false);
  const [grid, setGrid] = useState<(Tile | null)[][]>(() => initGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Touch handling refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('bento2048-best');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  // Save best score
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      if (mounted) localStorage.setItem('bento2048-best', String(score));
    }
  }, [score, bestScore, mounted]);

  const performMove = useCallback((direction: Direction) => {
    if (animating) return;

    setGrid(prevGrid => {
      const result = moveGrid(prevGrid, direction);
      if (!result.moved) return prevGrid;

      setAnimating(true);
      setScore(prev => prev + result.score);

      const withNewTile = addRandomTile(result.grid);

      // Clear animation flags after a short delay
      setTimeout(() => {
        setGrid(g => g.map(row => row.map(cell =>
          cell ? { ...cell, isNew: false, mergedFrom: false } : null
        )));
        setAnimating(false);
      }, 150);

      // Check game state
      if (!keepPlaying && hasWon(withNewTile)) {
        setTimeout(() => setWon(true), 200);
      }
      if (!canMove(withNewTile)) {
        setTimeout(() => setGameOver(true), 300);
      }

      return withNewTile;
    });
  }, [animating, keepPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || (won && !keepPlaying)) return;

      let direction: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
      }

      if (direction) {
        e.preventDefault();
        performMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performMove, gameOver, won, keepPlaying]);

  // Touch / swipe controls
  useEffect(() => {
    const container = gameContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || gameOver || (won && !keepPlaying)) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const minSwipe = 30;

      if (Math.max(absDx, absDy) < minSwipe) return;

      e.preventDefault();

      let direction: Direction;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      performMove(direction);
      touchStartRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [performMove, gameOver, won, keepPlaying]);

  const newGame = () => {
    tileIdCounter = 0;
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setAnimating(false);
  };

  const handleKeepPlaying = () => {
    setWon(false);
    setKeepPlaying(true);
  };

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p
          className="pixel-text text-sm animate-flicker"
          style={{ color: 'var(--color-text-muted)' }}
        >
          LOADING...
        </p>
      </div>
    );
  }

  /* ============================================
     RENDER
     ============================================ */

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background pattern */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/games"
          className="pixel-text text-xs inline-block mb-8 transition-colors duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = 'var(--color-accent)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--color-text-secondary)')
          }
        >
          &lt; BACK TO GAMES
        </Link>

        {/* Title */}
        <div className="text-center mb-6">
          <h1
            className="pixel-text text-2xl sm:text-3xl mb-2"
            style={{
              color: 'var(--color-accent)',
              textShadow: `
                0 0 10px var(--color-accent-glow),
                0 0 30px var(--color-accent-glow)
              `,
            }}
          >
            2048 BENTO
          </h1>
          <p
            className="pixel-text text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            MERGE FOODS TO REACH THE CROWN
          </p>
        </div>

        {/* Score bar */}
        <div className="flex justify-between items-center mb-4 gap-3">
          <div
            className="flex-1 text-center py-3 px-2 border-2"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="pixel-text text-[8px] mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              SCORE
            </div>
            <div
              className="pixel-text text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              {score}
            </div>
          </div>

          <div
            className="flex-1 text-center py-3 px-2 border-2"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="pixel-text text-[8px] mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              BEST
            </div>
            <div
              className="pixel-text text-sm"
              style={{ color: 'var(--color-orange)' }}
            >
              {bestScore}
            </div>
          </div>

          <button
            onClick={newGame}
            className="pixel-btn text-[10px] px-3 py-2"
          >
            NEW GAME
          </button>
        </div>

        {/* Game grid */}
        <div
          ref={gameContainerRef}
          className="relative pixel-border p-2 sm:p-3 mx-auto select-none touch-none"
          style={{
            background: 'var(--color-bg-secondary)',
            maxWidth: '400px',
            aspectRatio: '1',
          }}
        >
          {/* Empty cell backgrounds */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full h-full">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ background: 'var(--color-surface)' }}
              />
            ))}
          </div>

          {/* Tiles layer - absolutely positioned */}
          <div className="absolute inset-0 p-2 sm:p-3">
            <div className="relative w-full h-full">
              {grid.flatMap(row =>
                row.filter((cell): cell is Tile => cell !== null)
              ).map(tile => {
                const tier = getTier(tile.value);
                // Calculate position as percentage
                const gap = 2; // percentage gap approximation
                const cellSize = (100 - gap * 3) / 4;
                const left = tile.col * (cellSize + gap);
                const top = tile.row * (cellSize + gap);

                return (
                  <div
                    key={tile.id}
                    className="absolute flex flex-col items-center justify-center rounded-sm"
                    style={{
                      width: `${cellSize}%`,
                      height: `${cellSize}%`,
                      left: `${left}%`,
                      top: `${top}%`,
                      background: tier.bg,
                      color: tier.text,
                      border: `2px solid ${tier.text}33`,
                      transition: 'left 120ms ease, top 120ms ease',
                      animation: tile.isNew
                        ? 'tileAppear 200ms ease'
                        : tile.mergedFrom
                        ? 'tileMerge 200ms ease'
                        : 'none',
                      zIndex: tile.mergedFrom ? 2 : 1,
                    }}
                  >
                    <span
                      className="leading-none"
                      style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}
                    >
                      {tier.emoji}
                    </span>
                    <span
                      className="pixel-text leading-none mt-0.5"
                      style={{
                        fontSize: 'clamp(0.35rem, 1.5vw, 0.55rem)',
                        opacity: 0.8,
                      }}
                    >
                      {tier.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Over overlay */}
          {gameOver && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: 'rgba(10, 10, 15, 0.85)' }}
            >
              <div className="text-center p-6">
                <div
                  className="pixel-text text-xl mb-2"
                  style={{ color: 'var(--color-red)' }}
                >
                  GAME OVER
                </div>
                <div
                  className="pixel-text text-xs mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  FINAL SCORE: {score}
                </div>
                <button
                  onClick={newGame}
                  className="pixel-btn text-[10px]"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* Win overlay */}
          {won && !keepPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: 'rgba(10, 10, 15, 0.85)' }}
            >
              <div className="text-center p-6">
                <div className="text-5xl mb-3">{'\u{1F451}'}</div>
                <div
                  className="pixel-text text-xl mb-2"
                  style={{
                    color: '#ffd700',
                    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                  }}
                >
                  YOU WIN!
                </div>
                <div
                  className="pixel-text text-xs mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  SCORE: {score}
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleKeepPlaying}
                    className="pixel-btn text-[10px]"
                  >
                    KEEP GOING
                  </button>
                  <button
                    onClick={newGame}
                    className="pixel-btn text-[10px]"
                    style={{
                      borderColor: 'var(--color-orange)',
                      color: 'var(--color-orange)',
                    }}
                  >
                    NEW GAME
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls hint */}
        <div className="text-center mt-4">
          <p
            className="pixel-text text-[8px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ARROW KEYS OR SWIPE TO PLAY
          </p>
        </div>

        {/* Tier guide */}
        <div
          className="mt-6 border-2 p-4"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h3
            className="pixel-text text-[10px] mb-3 text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            FOOD TIERS
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048].map(val => {
              const tier = getTier(val);
              return (
                <div
                  key={val}
                  className="flex flex-col items-center p-1.5 rounded-sm border"
                  style={{
                    background: tier.bg,
                    borderColor: `${tier.text}33`,
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{tier.emoji}</span>
                  <span
                    className="pixel-text mt-0.5"
                    style={{
                      fontSize: '0.35rem',
                      color: tier.text,
                      opacity: 0.7,
                    }}
                  >
                    {tier.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tile animations */}
      <style jsx>{`
        @keyframes tileAppear {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes tileMerge {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
