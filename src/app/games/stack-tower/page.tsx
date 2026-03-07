"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGamePlay } from "@/components/GamePlayCounter";
import Link from "next/link";

// --- Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BLOCK_HEIGHT = 20;
const INITIAL_BLOCK_WIDTH = 200;
const BASE_SPEED = 2;
const SPEED_INCREMENT = 0.15;
const MAX_SPEED = 12;
const PERFECT_TOLERANCE = 2;
const VISIBLE_ROWS = Math.floor(CANVAS_HEIGHT / BLOCK_HEIGHT);
const LOCAL_STORAGE_KEY = "stack-tower-best";

const BLOCK_COLORS = [
  "#00ff88", // accent green
  "#a855f7", // purple
  "#ec4899", // pink
  "#3b82f6", // blue
  "#f59e0b", // orange
  "#ef4444", // red
  "#06b6d4", // cyan
];

interface Block {
  x: number;
  width: number;
  color: string;
}

interface GameState {
  stack: Block[];
  currentBlock: Block | null;
  direction: 1 | -1;
  speed: number;
  score: number;
  gameOver: boolean;
  started: boolean;
  perfectFlash: number; // countdown frames for "PERFECT!" text
  cameraOffset: number; // how many pixels to shift drawing up
}

function getColor(index: number): string {
  return BLOCK_COLORS[index % BLOCK_COLORS.length];
}

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}

export default function StackTowerPage() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [best, setBest] = useState(0);
  const { recordPlay } = useGamePlay('stack-tower');

  // Hydration safety
  useEffect(() => {
    setMounted(true);
    setBest(loadBest());
  }, []);

  const initGame = useCallback((): GameState => {
    const baseBlock: Block = {
      x: (CANVAS_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      width: INITIAL_BLOCK_WIDTH,
      color: getColor(0),
    };

    const newBlock: Block = {
      x: 0,
      width: INITIAL_BLOCK_WIDTH,
      color: getColor(1),
    };

    return {
      stack: [baseBlock],
      currentBlock: newBlock,
      direction: 1,
      speed: BASE_SPEED,
      score: 0,
      gameOver: false,
      started: true,
      perfectFlash: 0,
      cameraOffset: 0,
    };
  }, []);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const { stack, currentBlock, perfectFlash: pf, cameraOffset } = state;

    // Clear
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw faint grid lines
    ctx.strokeStyle = "rgba(42, 42, 58, 0.4)";
    ctx.lineWidth = 1;
    for (let y = 0; y < CANVAS_HEIGHT; y += BLOCK_HEIGHT) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Calculate the y position for each block:
    // The base block sits at the bottom of the canvas.
    // Each subsequent block sits one BLOCK_HEIGHT above.
    // When the stack grows beyond the visible area, cameraOffset shifts everything down.
    const baseY = CANVAS_HEIGHT - BLOCK_HEIGHT;

    // Draw stacked blocks
    for (let i = 0; i < stack.length; i++) {
      const block = stack[i];
      const y = baseY - i * BLOCK_HEIGHT + cameraOffset;

      if (y > CANVAS_HEIGHT || y + BLOCK_HEIGHT < 0) continue;

      // Block fill
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x, y, block.width, BLOCK_HEIGHT);

      // Block border (pixel-art style)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(block.x, y, block.width, BLOCK_HEIGHT);

      // Highlight on top edge
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(block.x + 1, y + 1, block.width - 2, 3);
    }

    // Draw current moving block
    if (currentBlock && !state.gameOver) {
      const currentY = baseY - stack.length * BLOCK_HEIGHT + cameraOffset;
      ctx.fillStyle = currentBlock.color;
      ctx.fillRect(currentBlock.x, currentY, currentBlock.width, BLOCK_HEIGHT);

      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(currentBlock.x, currentY, currentBlock.width, BLOCK_HEIGHT);

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(currentBlock.x + 1, currentY + 1, currentBlock.width - 2, 3);
    }

    // "PERFECT!" flash
    if (pf > 0) {
      const alpha = Math.min(1, pf / 15);
      ctx.save();
      ctx.font = "bold 24px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 20;
      const flashY = baseY - (stack.length - 1) * BLOCK_HEIGHT + cameraOffset - 10;
      ctx.fillText("PERFECT!", CANVAS_WIDTH / 2, Math.max(60, flashY));
      ctx.restore();
    }

    // Score on canvas
    ctx.save();
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232, 232, 240, 0.9)";
    ctx.fillText(`${state.score}`, CANVAS_WIDTH / 2, 30);
    ctx.restore();

    // Instruction text when not started
    if (!state.started) {
      ctx.save();
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(232, 232, 240, 0.6)";
      ctx.fillText("TAP TO DROP", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.restore();
    }
  }, []);

  const gameLoop = useCallback(() => {
    const state = gameRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (state.started && !state.gameOver && state.currentBlock) {
      // Move current block
      state.currentBlock.x += state.speed * state.direction;

      // Bounce off walls
      if (state.currentBlock.x + state.currentBlock.width >= CANVAS_WIDTH) {
        state.currentBlock.x = CANVAS_WIDTH - state.currentBlock.width;
        state.direction = -1;
      } else if (state.currentBlock.x <= 0) {
        state.currentBlock.x = 0;
        state.direction = 1;
      }

      // Smooth camera: when stack grows tall, smoothly scroll up
      const targetOffset = Math.max(
        0,
        (state.stack.length - VISIBLE_ROWS + 4) * BLOCK_HEIGHT
      );
      if (state.cameraOffset < targetOffset) {
        state.cameraOffset += Math.min(2, targetOffset - state.cameraOffset);
      }
    }

    // Decay perfect flash
    if (state.perfectFlash > 0) {
      state.perfectFlash -= 1;
      if (state.perfectFlash <= 0) {
        setPerfectFlash(false);
      }
    }

    drawGame(ctx, state);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame]);

  const handleDrop = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;

    // Start the game on first tap
    if (!state.started) {
      state.started = true;
      recordPlay();
      setStarted(true);
      return;
    }

    if (state.gameOver || !state.currentBlock) return;

    const current = state.currentBlock;
    const topBlock = state.stack[state.stack.length - 1];

    // Calculate overlap
    const overlapStart = Math.max(current.x, topBlock.x);
    const overlapEnd = Math.min(
      current.x + current.width,
      topBlock.x + topBlock.width
    );
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 0) {
      // No overlap -- game over
      state.gameOver = true;
      state.currentBlock = null;

      const finalScore = state.score;
      setGameOver(true);
      setScore(finalScore);

      const currentBest = loadBest();
      if (finalScore > currentBest) {
        saveBest(finalScore);
        setBest(finalScore);
      }
      return;
    }

    // Check for perfect placement
    const isPerfect = Math.abs(current.width - overlapWidth) <= PERFECT_TOLERANCE;

    const placedBlock: Block = {
      x: overlapStart,
      width: isPerfect ? topBlock.width : overlapWidth,
      color: current.color,
    };

    // If perfect, keep the same x and width as the block below
    if (isPerfect) {
      placedBlock.x = topBlock.x;
      placedBlock.width = topBlock.width;
    }

    state.stack.push(placedBlock);
    state.score += 1;

    if (isPerfect) {
      state.perfectFlash = 30;
      setPerfectFlash(true);
    }

    setScore(state.score);

    // Spawn next block
    const nextWidth = isPerfect ? placedBlock.width : overlapWidth;
    const newSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.score * SPEED_INCREMENT);

    state.currentBlock = {
      x: state.direction === 1 ? 0 : CANVAS_WIDTH - nextWidth,
      width: nextWidth,
      color: getColor(state.stack.length),
    };
    state.speed = newSpeed;
  }, []);

  const handleRestart = useCallback(() => {
    const newState = initGame();
    gameRef.current = newState;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    setPerfectFlash(false);
  }, [initGame]);

  // Initialize and start game loop
  useEffect(() => {
    if (!mounted) return;

    const state = initGame();
    state.started = false;
    gameRef.current = state;
    setStarted(false);
    setGameOver(false);
    setScore(0);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, initGame, gameLoop]);

  // Canvas event listeners
  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      handleDrop();
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleDrop();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleDrop();
      }
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    window.addEventListener("keydown", handleKey);

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("keydown", handleKey);
    };
  }, [mounted, handleDrop]);

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

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Grid background */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center px-4 py-8">
        {/* Back link */}
        <Link
          href="/games"
          className="pixel-text text-xs mb-6 transition-colors duration-200 self-start max-w-[500px] mx-auto w-full"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--color-text-secondary)")
          }
        >
          &lt; BACK TO GAMES
        </Link>

        {/* Title */}
        <h1
          className="pixel-text text-2xl sm:text-3xl mb-2 text-center"
          style={{
            color: "var(--color-accent)",
            textShadow: `
              0 0 10px var(--color-accent-glow),
              0 0 30px var(--color-accent-glow)
            `,
          }}
        >
          STACK TOWER
        </h1>

        {/* Score display */}
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <p
              className="pixel-text text-[10px] mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              SCORE
            </p>
            <p
              className="pixel-text text-lg"
              style={{ color: "var(--color-text)" }}
            >
              {score}
            </p>
          </div>
          <div className="text-center">
            <p
              className="pixel-text text-[10px] mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              BEST
            </p>
            <p
              className="pixel-text text-lg"
              style={{ color: "var(--color-orange)" }}
            >
              {best}
            </p>
          </div>
        </div>

        {/* Perfect flash indicator */}
        {perfectFlash && (
          <p
            className="pixel-text text-xs mb-2 animate-pixel-bounce"
            style={{
              color: "var(--color-accent)",
              textShadow: "0 0 10px var(--color-accent-glow)",
            }}
          >
            PERFECT!
          </p>
        )}

        {/* Canvas container */}
        <div
          className="relative pixel-border"
          style={{
            width: Math.min(CANVAS_WIDTH, typeof window !== "undefined" ? window.innerWidth - 32 : CANVAS_WIDTH),
            maxWidth: CANVAS_WIDTH,
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block w-full"
            style={{
              maxWidth: CANVAS_WIDTH,
              imageRendering: "pixelated",
              cursor: "pointer",
              touchAction: "none",
            }}
          />

          {/* Game Over overlay */}
          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                background: "rgba(10, 10, 15, 0.85)",
                backdropFilter: "blur(4px)",
              }}
            >
              <p
                className="pixel-text text-xl mb-2"
                style={{ color: "var(--color-red)" }}
              >
                GAME OVER
              </p>
              <p
                className="pixel-text text-sm mb-1"
                style={{ color: "var(--color-text)" }}
              >
                SCORE: {score}
              </p>
              <p
                className="pixel-text text-xs mb-6"
                style={{ color: "var(--color-text-muted)" }}
              >
                BEST: {best}
              </p>
              <button
                onClick={handleRestart}
                className="pixel-btn text-xs"
              >
                PLAY AGAIN
              </button>
            </div>
          )}

          {/* Tap to start overlay */}
          {!started && !gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              style={{ background: "rgba(10, 10, 15, 0.6)" }}
              onClick={handleDrop}
              onTouchStart={(e) => {
                e.preventDefault();
                handleDrop();
              }}
            >
              <p
                className="pixel-text text-sm animate-glow-pulse px-4 py-2"
                style={{
                  color: "var(--color-accent)",
                  border: "2px solid var(--color-accent)",
                }}
              >
                TAP TO START
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!started && !gameOver && (
          <p
            className="pixel-text text-[10px] mt-4 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            TAP / CLICK / SPACE TO DROP BLOCKS
          </p>
        )}

        {/* How to play */}
        <div
          className="mt-6 p-4 max-w-[400px] w-full border-2"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-card)",
          }}
        >
          <h3
            className="pixel-text text-[10px] mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            HOW TO PLAY
          </h3>
          <ul
            className="space-y-2 text-xs"
            style={{
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            <li>Tap or click to drop the sliding block</li>
            <li>Overhanging parts get sliced off</li>
            <li>Land perfectly for no penalty</li>
            <li>Stack as high as you can!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
