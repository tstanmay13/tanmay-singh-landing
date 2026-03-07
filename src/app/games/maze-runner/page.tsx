'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGamePlay } from '@/components/GamePlayCounter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Cell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

interface Pos {
  r: number;
  c: number;
}

type GamePhase = 'menu' | 'playing' | 'level-complete' | 'game-over';

interface LevelConfig {
  rows: number;
  cols: number;
}

const LEVELS: LevelConfig[] = [
  { rows: 10, cols: 10 },
  { rows: 15, cols: 15 },
  { rows: 20, cols: 20 },
  { rows: 25, cols: 25 },
  { rows: 30, cols: 30 },
];

const FOG_RADIUS = 3;
const SWIPE_THRESHOLD = 30;

// ---------------------------------------------------------------------------
// Maze generation -- recursive backtracking
// ---------------------------------------------------------------------------

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
      visited: false,
    }))
  );

  const stack: Pos[] = [];
  const start: Pos = { r: 0, c: 0 };
  grid[start.r][start.c].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: Pos[] = [];

    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of dirs) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        neighbors.push({ r: nr, c: nc });
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Remove walls between current and next
      const dr = next.r - current.r;
      const dc = next.c - current.c;
      if (dr === -1) {
        grid[current.r][current.c].top = false;
        grid[next.r][next.c].bottom = false;
      } else if (dr === 1) {
        grid[current.r][current.c].bottom = false;
        grid[next.r][next.c].top = false;
      } else if (dc === -1) {
        grid[current.r][current.c].left = false;
        grid[next.r][next.c].right = false;
      } else if (dc === 1) {
        grid[current.r][current.c].right = false;
        grid[next.r][next.c].left = false;
      }
      grid[next.r][next.c].visited = true;
      stack.push(next);
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MazeRunnerPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [level, setLevel] = useState(0);
  const [maze, setMaze] = useState<Cell[][] | null>(null);
  const [player, setPlayer] = useState<Pos>({ r: 0, c: 0 });
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hasMovedThisLevel, setHasMovedThisLevel] = useState(false);
  const [levelTimes, setLevelTimes] = useState<number[]>([]);
  const [bestTotal, setBestTotal] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { recordPlay } = useGamePlay('maze-runner');

  // Load personal best from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('maze-runner-best');
      if (stored) setBestTotal(Number(stored));
    } catch {
      // ignore
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Start a specific level
  // ---------------------------------------------------------------------------
  const startLevel = useCallback((lvl: number) => {
    const config = LEVELS[lvl];
    const newMaze = generateMaze(config.rows, config.cols);
    setMaze(newMaze);
    setPlayer({ r: 0, c: 0 });
    setLevel(lvl);
    setTimerStart(null);
    setElapsed(0);
    setHasMovedThisLevel(false);
    setPhase('playing');
  }, []);

  const startGame = useCallback(() => {
    recordPlay();
    setLevelTimes([]);
    startLevel(0);
  }, [startLevel]);

  // ---------------------------------------------------------------------------
  // Movement
  // ---------------------------------------------------------------------------
  const move = useCallback(
    (dr: number, dc: number) => {
      if (phase !== 'playing' || !maze) return;

      setPlayer((prev) => {
        const cell = maze[prev.r][prev.c];
        // Check wall in direction
        if (dr === -1 && cell.top) return prev;
        if (dr === 1 && cell.bottom) return prev;
        if (dc === -1 && cell.left) return prev;
        if (dc === 1 && cell.right) return prev;

        const nr = prev.r + dr;
        const nc = prev.c + dc;
        if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) return prev;

        // Start timer on first move
        if (!hasMovedThisLevel) {
          setTimerStart(Date.now());
          setHasMovedThisLevel(true);
        }

        const newPos = { r: nr, c: nc };

        // Check if reached exit
        if (nr === maze.length - 1 && nc === maze[0].length - 1) {
          // Level complete
          const now = Date.now();
          const levelTime = hasMovedThisLevel
            ? now - (timerStart ?? now)
            : 0;

          setLevelTimes((prev) => {
            const updated = [...prev, levelTime];

            if (level >= LEVELS.length - 1) {
              // Game over -- all levels complete
              const total = updated.reduce((a, b) => a + b, 0);
              try {
                const stored = localStorage.getItem('maze-runner-best');
                const currentBest = stored ? Number(stored) : Infinity;
                if (total < currentBest) {
                  localStorage.setItem('maze-runner-best', String(total));
                  setBestTotal(total);
                }
              } catch {
                // ignore
              }
              setTimeout(() => setPhase('game-over'), 100);
            } else {
              setTimeout(() => setPhase('level-complete'), 100);
            }
            return updated;
          });
        }

        return newPos;
      });
    },
    [phase, maze, hasMovedThisLevel, timerStart, level]
  );

  // ---------------------------------------------------------------------------
  // Keyboard controls
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          move(-1, 0);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          move(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          move(0, -1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          move(0, 1);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  // ---------------------------------------------------------------------------
  // Touch / swipe
  // ---------------------------------------------------------------------------
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        move(0, dx > 0 ? 1 : -1);
      } else {
        move(dy > 0 ? 1 : -1, 0);
      }
    },
    [move]
  );

  // ---------------------------------------------------------------------------
  // Timer tick
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing' || !timerStart) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - timerStart);
    }, 33);
    return () => clearInterval(id);
  }, [phase, timerStart]);

  // ---------------------------------------------------------------------------
  // Canvas rendering
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing' || !maze || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = maze.length;
    const cols = maze[0].length;

    // Determine cell size based on container
    const container = containerRef.current;
    const maxW = container ? container.clientWidth - 16 : 360;
    const maxH = Math.min(window.innerHeight * 0.55, 600);
    const cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
    const w = cellSize * cols;
    const h = cellSize * rows;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const styles = getComputedStyle(document.documentElement);
    const colorBg = styles.getPropertyValue('--color-bg').trim();
    const colorBorder = styles.getPropertyValue('--color-border').trim();
    const colorAccent = styles.getPropertyValue('--color-accent').trim();
    const colorBgCard = styles.getPropertyValue('--color-bg-card').trim();
    const colorSurface = styles.getPropertyValue('--color-surface').trim();

    const draw = () => {
      // Clear
      ctx.fillStyle = colorBgCard;
      ctx.fillRect(0, 0, w, h);

      // Draw cells: floor
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellSize;
          const y = r * cellSize;
          ctx.fillStyle = colorSurface;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }

      // Draw exit glow
      const exitX = (cols - 1) * cellSize;
      const exitY = (rows - 1) * cellSize;
      const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 400);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = colorAccent;
      ctx.shadowBlur = 20;
      ctx.fillStyle = colorAccent;
      ctx.fillRect(exitX + 2, exitY + 2, cellSize - 4, cellSize - 4);
      ctx.restore();
      // Solid exit cell
      ctx.fillStyle = colorAccent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(exitX + 2, exitY + 2, cellSize - 4, cellSize - 4);
      ctx.globalAlpha = 1;

      // Draw walls
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = maze[r][c];
          const x = c * cellSize;
          const y = r * cellSize;
          if (cell.top) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
            ctx.stroke();
          }
          if (cell.right) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.stroke();
          }
          if (cell.bottom) {
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.stroke();
          }
          if (cell.left) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
            ctx.stroke();
          }
        }
      }

      // Draw player
      const px = player.c * cellSize;
      const py = player.r * cellSize;
      const pad = Math.max(2, cellSize * 0.15);
      ctx.fillStyle = colorAccent;
      ctx.shadowColor = colorAccent;
      ctx.shadowBlur = 10;
      ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
      ctx.shadowBlur = 0;

      // Fog of war: overlay
      ctx.fillStyle = colorBg;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dist = Math.abs(r - player.r) + Math.abs(c - player.c);
          let alpha = 0;
          if (dist > FOG_RADIUS) {
            alpha = 0.95;
          } else if (dist > FOG_RADIUS - 1) {
            alpha = 0.7;
          } else if (dist > FOG_RADIUS - 2) {
            alpha = 0.35;
          }
          if (alpha > 0) {
            ctx.globalAlpha = alpha;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
      ctx.globalAlpha = 1;

      // Outer border
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, maze, player]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!mounted) return null;

  // Overlay screens
  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 text-center">
      <h1
        className="pixel-text text-3xl sm:text-4xl md:text-5xl"
        style={{
          color: 'var(--color-accent)',
          textShadow: '0 0 20px var(--color-accent-glow), 0 0 40px var(--color-accent-glow)',
        }}
      >
        MAZE RUNNER
      </h1>
      <p className="pixel-text text-[10px] sm:text-xs" style={{ color: 'var(--color-text-muted)' }}>
        NAVIGATE 5 PROCEDURALLY GENERATED MAZES
      </p>
      <p className="pixel-text text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
        ARROW KEYS / WASD / SWIPE TO MOVE
      </p>
      <p className="pixel-text text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
        FOG OF WAR REVEALS ONLY NEARBY CELLS
      </p>
      {bestTotal !== null && (
        <p className="pixel-text text-[10px]" style={{ color: 'var(--color-orange)' }}>
          PERSONAL BEST: {formatTime(bestTotal)}
        </p>
      )}
      <button onClick={startGame} className="pixel-btn text-xs mt-4">
        START GAME
      </button>
    </div>
  );

  const renderLevelComplete = () => {
    const lastTime = levelTimes[levelTimes.length - 1] ?? 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-4 text-center">
        <h2
          className="pixel-text text-2xl sm:text-3xl"
          style={{ color: 'var(--color-accent)' }}
        >
          LEVEL {level + 1} COMPLETE
        </h2>
        <p className="pixel-text text-sm" style={{ color: 'var(--color-text)' }}>
          TIME: {formatTime(lastTime)}
        </p>
        <p className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          NEXT: {LEVELS[level + 1].rows}x{LEVELS[level + 1].cols} MAZE
        </p>
        <button
          onClick={() => startLevel(level + 1)}
          className="pixel-btn text-xs mt-2"
        >
          NEXT LEVEL
        </button>
      </div>
    );
  };

  const renderGameOver = () => {
    const total = levelTimes.reduce((a, b) => a + b, 0);
    const isNewBest = bestTotal !== null && total <= bestTotal;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-4 text-center">
        <h2
          className="pixel-text text-2xl sm:text-3xl animate-glow-pulse"
          style={{ color: 'var(--color-accent)' }}
        >
          ALL MAZES CLEARED
        </h2>
        {isNewBest && (
          <p className="pixel-text text-xs animate-flicker" style={{ color: 'var(--color-orange)' }}>
            NEW PERSONAL BEST!
          </p>
        )}

        <div
          className="pixel-border p-4 sm:p-6 w-full max-w-sm"
          style={{ background: 'var(--color-bg-card)' }}
        >
          <p className="pixel-text text-[10px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            TIMES PER LEVEL
          </p>
          {levelTimes.map((t, i) => (
            <div key={i} className="flex justify-between mb-2">
              <span className="pixel-text text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                LEVEL {i + 1} ({LEVELS[i].rows}x{LEVELS[i].cols})
              </span>
              <span className="pixel-text text-[10px]" style={{ color: 'var(--color-text)' }}>
                {formatTime(t)}
              </span>
            </div>
          ))}
          <div
            className="border-t mt-3 pt-3 flex justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
              TOTAL
            </span>
            <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
              {formatTime(total)}
            </span>
          </div>
        </div>

        {bestTotal !== null && (
          <p className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            BEST TOTAL: {formatTime(bestTotal)}
          </p>
        )}

        <div className="flex gap-4 mt-2">
          <button onClick={startGame} className="pixel-btn text-[10px]">
            PLAY AGAIN
          </button>
          <Link href="/games" className="pixel-btn inline-block text-[10px]">
            BACK TO ARCADE
          </Link>
        </div>
      </div>
    );
  };

  const renderPlaying = () => (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto"
    >
      {/* HUD */}
      <div className="flex justify-between w-full px-2">
        <span className="pixel-text text-[10px] sm:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          LEVEL {level + 1} / {LEVELS.length}
        </span>
        <span className="pixel-text text-[10px] sm:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {LEVELS[level].rows}x{LEVELS[level].cols}
        </span>
        <span
          className="pixel-text text-[10px] sm:text-xs mono-text"
          style={{ color: 'var(--color-accent)' }}
        >
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Canvas */}
      <div
        className="pixel-border"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Mobile arrow buttons */}
      <div className="grid grid-cols-3 gap-2 w-36 sm:hidden">
        <div />
        <button
          onClick={() => move(-1, 0)}
          className="pixel-btn text-sm py-2 px-0"
          aria-label="Move up"
        >
          ^
        </button>
        <div />
        <button
          onClick={() => move(0, -1)}
          className="pixel-btn text-sm py-2 px-0"
          aria-label="Move left"
        >
          &lt;
        </button>
        <button
          onClick={() => move(1, 0)}
          className="pixel-btn text-sm py-2 px-0"
          aria-label="Move down"
        >
          v
        </button>
        <button
          onClick={() => move(0, 1)}
          className="pixel-btn text-sm py-2 px-0"
          aria-label="Move right"
        >
          &gt;
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--color-bg)' }}>
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 px-4 py-6 sm:py-10">
        {/* Back link */}
        {phase !== 'game-over' && (
          <div className="max-w-2xl mx-auto mb-4">
            <Link
              href="/games"
              className="pixel-text text-[10px] sm:text-xs transition-colors duration-200"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--color-accent)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--color-text-secondary)')
              }
            >
              &lt; BACK TO ARCADE
            </Link>
          </div>
        )}

        {phase === 'menu' && renderMenu()}
        {phase === 'playing' && renderPlaying()}
        {phase === 'level-complete' && renderLevelComplete()}
        {phase === 'game-over' && renderGameOver()}
      </div>
    </div>
  );
}
