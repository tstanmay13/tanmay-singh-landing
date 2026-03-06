'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  neighborCount: number;
  exploded?: boolean; // the mine the player clicked
  revealDelay?: number; // ms delay for cascade animation
}

type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { rows: 9, cols: 9, mines: 10, label: 'EASY' },
  medium: { rows: 16, cols: 16, mines: 40, label: 'MEDIUM' },
  hard: { rows: 16, cols: 30, mines: 99, label: 'HARD' },
};

// Number colors (classic minesweeper palette)
const NUMBER_COLORS: Record<number, string> = {
  1: '#3b82f6', // blue
  2: '#22c55e', // green
  3: '#ef4444', // red
  4: '#7c3aed', // purple
  5: '#b91c1c', // maroon
  6: '#06b6d4', // cyan
  7: '#1a1a2e', // dark (uses text color)
  8: '#6b7280', // gray
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      neighborCount: 0,
    }))
  );
}

function placeMines(
  grid: Cell[][],
  rows: number,
  cols: number,
  mineCount: number,
  safeRow: number,
  safeCol: number
): Cell[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  let placed = 0;

  // Safe zone: the clicked cell and its neighbors
  const safeSet = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      safeSet.add(`${safeRow + dr},${safeCol + dc}`);
    }
  }

  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (newGrid[r][c].mine || safeSet.has(`${r},${c}`)) continue;
    newGrid[r][c].mine = true;
    placed++;
  }

  // Compute neighbor counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newGrid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].mine) {
            count++;
          }
        }
      }
      newGrid[r][c].neighborCount = count;
    }
  }

  return newGrid;
}

function floodFill(
  grid: Cell[][],
  rows: number,
  cols: number,
  startRow: number,
  startCol: number
): Cell[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const queue: [number, number, number][] = [[startRow, startCol, 0]];
  newGrid[startRow][startCol].revealed = true;
  newGrid[startRow][startCol].revealDelay = 0;

  let step = 0;
  while (queue.length > 0) {
    const [r, c, depth] = queue.shift()!;
    step++;

    if (newGrid[r][c].neighborCount === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols &&
            !newGrid[nr][nc].revealed &&
            !newGrid[nr][nc].flagged &&
            !newGrid[nr][nc].mine
          ) {
            newGrid[nr][nc].revealed = true;
            newGrid[nr][nc].revealDelay = (depth + 1) * 20; // stagger 20ms per layer
            queue.push([nr, nc, depth + 1]);
          }
        }
      }
    }
  }

  return newGrid;
}

function checkWin(grid: Cell[][], rows: number, cols: number, mineCount: number): boolean {
  let revealedCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].revealed) revealedCount++;
    }
  }
  return revealedCount === rows * cols - mineCount;
}

function countFlags(grid: Cell[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.flagged) count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Best Times (localStorage)
// ---------------------------------------------------------------------------

function getBestTime(difficulty: Difficulty): number | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(`minesweeper-best-${difficulty}`);
  return val ? parseInt(val, 10) : null;
}

function saveBestTime(difficulty: Difficulty, time: number): void {
  const current = getBestTime(difficulty);
  if (current === null || time < current) {
    localStorage.setItem(`minesweeper-best-${difficulty}`, time.toString());
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MinesweeperPage() {
  const [mounted, setMounted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const config = DIFFICULTIES[difficulty];

  // Mount guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load best times after mount
  useEffect(() => {
    if (mounted) {
      setBestTimes({
        easy: getBestTime('easy'),
        medium: getBestTime('medium'),
        hard: getBestTime('hard'),
      });
    }
  }, [mounted]);

  // Initialize grid
  const initGrid = useCallback(() => {
    setGrid(createEmptyGrid(config.rows, config.cols));
    setGameStatus('idle');
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [config.rows, config.cols]);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer((t) => Math.min(t + 1, 999));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  // Prevent context menu on the grid
  const preventContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ---------------------------------------------------------------------------
  // Cell Actions
  // ---------------------------------------------------------------------------

  const revealCell = useCallback(
    (row: number, col: number) => {
      if (gameStatus === 'won' || gameStatus === 'lost') return;

      setGrid((prev) => {
        const cell = prev[row][col];
        if (cell.revealed || cell.flagged) return prev;

        // First click: place mines ensuring safety
        let currentGrid = prev;
        let currentStatus = gameStatus;
        if (currentStatus === 'idle') {
          currentGrid = placeMines(prev, config.rows, config.cols, config.mines, row, col);
          currentStatus = 'playing';
          setGameStatus('playing');
        }

        const clickedCell = currentGrid[row][col];

        // Hit a mine
        if (clickedCell.mine) {
          const lostGrid = currentGrid.map((r) =>
            r.map((c) => ({
              ...c,
              revealed: c.mine ? true : c.revealed,
            }))
          );
          lostGrid[row][col].exploded = true;
          setGameStatus('lost');
          return lostGrid;
        }

        // Flood fill for empty cells, or just reveal the numbered cell
        let newGrid: Cell[][];
        if (clickedCell.neighborCount === 0) {
          newGrid = floodFill(currentGrid, config.rows, config.cols, row, col);
        } else {
          newGrid = currentGrid.map((r) => r.map((c) => ({ ...c })));
          newGrid[row][col].revealed = true;
          newGrid[row][col].revealDelay = 0;
        }

        // Check win
        if (checkWin(newGrid, config.rows, config.cols, config.mines)) {
          setGameStatus('won');
          saveBestTime(difficulty, timer);
          setBestTimes((bt) => ({
            ...bt,
            [difficulty]: getBestTime(difficulty) ?? timer,
          }));
        }

        return newGrid;
      });
    },
    [gameStatus, config, difficulty, timer]
  );

  const toggleFlag = useCallback(
    (row: number, col: number) => {
      if (gameStatus === 'won' || gameStatus === 'lost') return;

      setGrid((prev) => {
        const cell = prev[row][col];
        if (cell.revealed) return prev;
        const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
        newGrid[row][col].flagged = !newGrid[row][col].flagged;
        return newGrid;
      });
    },
    [gameStatus]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault();
      toggleFlag(row, col);
    },
    [toggleFlag]
  );

  // Long press for mobile flagging
  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      longPressTriggered.current = false;
      longPressRef.current = setTimeout(() => {
        longPressTriggered.current = true;
        toggleFlag(row, col);
      }, 500);
    },
    [toggleFlag]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (longPressTriggered.current) return;
      revealCell(row, col);
    },
    [revealCell]
  );

  // Difficulty change
  const changeDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
  }, []);

  // Smiley face
  const smiley = gameStatus === 'lost' ? '😵' : gameStatus === 'won' ? '😎' : '😊';

  // Flag counter
  const flagCount = grid.length > 0 ? countFlags(grid) : 0;
  const mineDisplay = Math.max(0, config.mines - flagCount);

  // Cell size
  const cellSize = difficulty === 'hard' ? 28 : difficulty === 'medium' ? 32 : 36;

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Dot background */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-8 pb-4 px-4 text-center">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block mb-6 transition-colors duration-200"
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

          <h1
            className="pixel-text text-3xl sm:text-4xl md:text-5xl mb-2"
            style={{
              color: 'var(--color-accent)',
              textShadow: `
                0 0 10px var(--color-accent-glow),
                0 0 30px var(--color-accent-glow)
              `,
            }}
          >
            MINESWEEPER
          </h1>
          <p
            className="pixel-text text-[10px] mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            PIXEL EDITION
          </p>
        </header>

        {/* Difficulty Selector */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-6 px-4">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
            const isActive = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => changeDifficulty(d)}
                className="pixel-text text-[10px] sm:text-xs px-3 sm:px-4 py-2 border-2 transition-all duration-200 cursor-pointer"
                style={{
                  borderColor: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  background: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-card)',
                  color: isActive
                    ? 'var(--color-bg)'
                    : 'var(--color-text-secondary)',
                  boxShadow: isActive
                    ? '0 0 15px var(--color-accent-glow), 3px 3px 0 var(--color-accent-secondary)'
                    : 'none',
                }}
              >
                {DIFFICULTIES[d].label}
              </button>
            );
          })}
        </div>

        {/* Best Time */}
        {bestTimes[difficulty] !== null && (
          <div className="text-center mb-4">
            <span
              className="pixel-text text-[10px]"
              style={{ color: 'var(--color-orange)' }}
            >
              BEST: {bestTimes[difficulty]}s
            </span>
          </div>
        )}

        {/* Status Bar: mines - smiley - timer */}
        <div className="flex justify-center mb-4 px-4">
          <div
            className="flex items-center gap-4 sm:gap-8 px-4 sm:px-6 py-3 border-2"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Mine Counter */}
            <div
              className="pixel-text text-lg sm:text-xl tabular-nums"
              style={{ color: 'var(--color-red)', minWidth: '3ch', textAlign: 'right' }}
            >
              {String(mineDisplay).padStart(3, '0')}
            </div>

            {/* Smiley Reset Button */}
            <button
              onClick={initGrid}
              className="text-2xl sm:text-3xl cursor-pointer hover:scale-110 transition-transform active:scale-95 select-none"
              title="New Game"
              style={{
                filter: 'drop-shadow(0 0 4px var(--color-accent-glow))',
              }}
            >
              {smiley}
            </button>

            {/* Timer */}
            <div
              className="pixel-text text-lg sm:text-xl tabular-nums"
              style={{ color: 'var(--color-red)', minWidth: '3ch', textAlign: 'left' }}
            >
              {String(Math.min(timer, 999)).padStart(3, '0')}
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div
          className="flex justify-center px-2 pb-8"
          style={{ overflowX: difficulty === 'hard' ? 'auto' : 'visible' }}
        >
          <div
            className="border-2 inline-block select-none"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-secondary)',
            }}
            onContextMenu={preventContext}
          >
            {grid.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <MinesweeperCell
                    key={`${r}-${c}`}
                    cell={cell}
                    size={cellSize}
                    onClick={() => handleCellClick(r, c)}
                    onRightClick={(e) => handleRightClick(e, r, c)}
                    onTouchStart={() => handleTouchStart(r, c)}
                    onTouchEnd={handleTouchEnd}
                    gameStatus={gameStatus}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Win / Lose Message */}
        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <div className="text-center pb-6 animate-fade-in-up">
            <p
              className="pixel-text text-lg sm:text-xl mb-2"
              style={{
                color:
                  gameStatus === 'won'
                    ? 'var(--color-accent)'
                    : 'var(--color-red)',
                textShadow:
                  gameStatus === 'won'
                    ? '0 0 10px var(--color-accent-glow)'
                    : '0 0 10px rgba(239,68,68,0.4)',
              }}
            >
              {gameStatus === 'won' ? 'YOU WIN!' : 'GAME OVER'}
            </p>
            {gameStatus === 'won' && (
              <p
                className="pixel-text text-xs mb-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                TIME: {timer}s
              </p>
            )}
            <button onClick={initGrid} className="pixel-btn text-[10px]">
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="max-w-md mx-auto px-4 pb-10">
          <div
            className="border-2 p-4"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-accent)' }}
            >
              HOW TO PLAY
            </h3>
            <ul
              className="space-y-1.5 text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <li>Click to reveal a cell</li>
              <li>Right-click or long-press to flag</li>
              <li>Numbers show adjacent mine count</li>
              <li>Reveal all safe cells to win</li>
              <li>First click is always safe</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell Component
// ---------------------------------------------------------------------------

interface MinesweeperCellProps {
  cell: Cell;
  size: number;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  gameStatus: GameStatus;
}

function MinesweeperCell({
  cell,
  size,
  onClick,
  onRightClick,
  onTouchStart,
  onTouchEnd,
  gameStatus,
}: MinesweeperCellProps) {
  const [visible, setVisible] = useState(false);

  // Cascade animation: delay reveal visibility
  useEffect(() => {
    if (cell.revealed) {
      const delay = cell.revealDelay ?? 0;
      if (delay === 0) {
        setVisible(true);
      } else {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [cell.revealed, cell.revealDelay]);

  const isRevealed = cell.revealed && visible;

  // Unrevealed style: raised 3D pixel look
  const unrevealedStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderTop: '2px solid var(--color-border-hover)',
    borderLeft: '2px solid var(--color-border-hover)',
    borderBottom: '2px solid #111118',
    borderRight: '2px solid #111118',
    background: 'var(--color-surface)',
    cursor: gameStatus === 'won' || gameStatus === 'lost' ? 'default' : 'pointer',
  };

  // Revealed style: flat
  const revealedStyle: React.CSSProperties = {
    width: size,
    height: size,
    border: '1px solid var(--color-border)',
    background: cell.exploded ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-bg-secondary)',
    cursor: 'default',
  };

  // Cell content
  let content: React.ReactNode = null;
  if (cell.flagged && !isRevealed) {
    content = <span style={{ fontSize: size * 0.45 }}>🚩</span>;
  } else if (isRevealed) {
    if (cell.mine) {
      content = <span style={{ fontSize: size * 0.45 }}>💣</span>;
    } else if (cell.neighborCount > 0) {
      content = (
        <span
          className="pixel-text"
          style={{
            fontSize: size * 0.38,
            color: NUMBER_COLORS[cell.neighborCount] || 'var(--color-text)',
            fontWeight: 'bold',
          }}
        >
          {cell.neighborCount}
        </span>
      );
    }
  }

  return (
    <div
      className="flex items-center justify-center select-none transition-all duration-100"
      style={isRevealed ? revealedStyle : unrevealedStyle}
      onClick={onClick}
      onContextMenu={onRightClick}
      onTouchStart={(e) => {
        e.stopPropagation();
        onTouchStart();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        onTouchEnd();
      }}
      onTouchMove={() => onTouchEnd()} // cancel long press on move
    >
      {content}
    </div>
  );
}
