"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGamePlay } from "@/components/GamePlayCounter";
import Link from "next/link";

// --- Constants ---
const CANVAS_W = 400;
const CANVAS_H = 600;
const BIRD_SIZE = 24;
const PIPE_WIDTH = 52;
const PIPE_GAP_START = 160;
const PIPE_GAP_MIN = 110;
const PIPE_SPACING = 220;
const GRAVITY = 0.5;
const FLAP_IMPULSE = -8;
const PIPE_SPEED = 3;
const GROUND_HEIGHT = 60;
const GROUND_TILE = 24;

// --- Types ---
interface Pipe {
  x: number;
  gapY: number;
  gapH: number;
  scored: boolean;
}

type GameState = "idle" | "playing" | "dead";

// --- Pixel bird shape (6x6 grid, each cell = 4px) ---
// 1 = body, 2 = eye, 3 = beak, 0 = empty
const BIRD_PIXELS = [
  [0, 0, 1, 1, 0, 0],
  [0, 1, 1, 2, 1, 0],
  [1, 1, 1, 1, 3, 3],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0],
];

function getMedal(score: number): { label: string; color: string } | null {
  if (score >= 50) return { label: "GOLD", color: "#FFD700" };
  if (score >= 25) return { label: "SILVER", color: "#C0C0C0" };
  if (score >= 10) return { label: "BRONZE", color: "#CD7F32" };
  return null;
}

function getGapForScore(score: number): number {
  // Shrink the gap as score increases, down to minimum
  return Math.max(PIPE_GAP_MIN, PIPE_GAP_START - score * 2);
}

export default function FlappyPixelPage() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  // Game state refs (avoid re-renders during gameplay)
  const stateRef = useRef<GameState>("idle");
  const birdYRef = useRef(CANVAS_H / 2 - BIRD_SIZE / 2);
  const birdVelRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const groundXRef = useRef(0);
  const tickRef = useRef(0);

  // React state for overlay UI
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const { recordPlay } = useGamePlay('flappy');

  // --- CSS variable resolver ---
  const colorsRef = useRef<Record<string, string>>({});

  const resolveColors = useCallback(() => {
    if (typeof window === "undefined") return;
    const style = getComputedStyle(document.documentElement);
    const get = (name: string) => style.getPropertyValue(name).trim();
    colorsRef.current = {
      bg: get("--color-bg") || "#0a0a0f",
      bgSecondary: get("--color-bg-secondary") || "#12121a",
      bgCard: get("--color-bg-card") || "#16161f",
      surface: get("--color-surface") || "#1a1a25",
      border: get("--color-border") || "#2a2a3a",
      text: get("--color-text") || "#e8e8f0",
      textSecondary: get("--color-text-secondary") || "#8888a0",
      textMuted: get("--color-text-muted") || "#555570",
      accent: get("--color-accent") || "#00ff88",
      accentSecondary: get("--color-accent-secondary") || "#00cc6a",
      orange: get("--color-orange") || "#f59e0b",
      red: get("--color-red") || "#ef4444",
      blue: get("--color-blue") || "#3b82f6",
      cyan: get("--color-cyan") || "#06b6d4",
      purple: get("--color-purple") || "#a855f7",
    };
  }, []);

  // --- Load best score ---
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flappy-pixel-best");
      if (saved) {
        const n = parseInt(saved, 10);
        bestRef.current = n;
        setBest(n);
      }
    }
  }, []);

  // --- Drawing helpers ---
  const drawPixelBird = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
      const c = colorsRef.current;
      ctx.save();
      ctx.translate(x + BIRD_SIZE / 2, y + BIRD_SIZE / 2);
      ctx.rotate(angle);
      ctx.translate(-BIRD_SIZE / 2, -BIRD_SIZE / 2);
      const pxSize = 4;
      for (let row = 0; row < BIRD_PIXELS.length; row++) {
        for (let col = 0; col < BIRD_PIXELS[row].length; col++) {
          const v = BIRD_PIXELS[row][col];
          if (v === 0) continue;
          if (v === 1) ctx.fillStyle = c.accent;
          else if (v === 2) ctx.fillStyle = c.bg;
          else if (v === 3) ctx.fillStyle = c.orange;
          ctx.fillRect(col * pxSize, row * pxSize, pxSize, pxSize);
        }
      }
      ctx.restore();
    },
    []
  );

  const drawPipe = useCallback(
    (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
      const c = colorsRef.current;
      const capH = 12;
      const capOverhang = 6;

      // Top pipe body
      ctx.fillStyle = c.border;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
      // Top pipe cap
      ctx.fillStyle = c.textMuted;
      ctx.fillRect(
        pipe.x - capOverhang,
        pipe.gapY - capH,
        PIPE_WIDTH + capOverhang * 2,
        capH
      );

      // Bottom pipe
      const bottomY = pipe.gapY + pipe.gapH;
      ctx.fillStyle = c.border;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_H - bottomY - GROUND_HEIGHT);
      // Bottom pipe cap
      ctx.fillStyle = c.textMuted;
      ctx.fillRect(
        pipe.x - capOverhang,
        bottomY,
        PIPE_WIDTH + capOverhang * 2,
        capH
      );

      // Pixel highlight on pipes
      ctx.fillStyle = c.textSecondary;
      ctx.fillRect(pipe.x + 4, 0, 6, pipe.gapY - capH);
      ctx.fillRect(pipe.x + 4, bottomY + capH, 6, CANVAS_H - bottomY - capH - GROUND_HEIGHT);
    },
    []
  );

  const drawGround = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const c = colorsRef.current;
      const gy = CANVAS_H - GROUND_HEIGHT;
      // Ground fill
      ctx.fillStyle = c.bgSecondary;
      ctx.fillRect(0, gy, CANVAS_W, GROUND_HEIGHT);
      // Ground top border
      ctx.fillStyle = c.border;
      ctx.fillRect(0, gy, CANVAS_W, 4);
      // Ground tiles
      ctx.fillStyle = c.surface;
      const offset = Math.floor(groundXRef.current) % (GROUND_TILE * 2);
      for (let x = -offset; x < CANVAS_W + GROUND_TILE; x += GROUND_TILE * 2) {
        ctx.fillRect(x, gy + 8, GROUND_TILE, GROUND_TILE);
        ctx.fillRect(x + GROUND_TILE, gy + 8 + GROUND_TILE, GROUND_TILE, GROUND_TILE);
      }
    },
    []
  );

  const drawScore = useCallback(
    (ctx: CanvasRenderingContext2D, value: number) => {
      const c = colorsRef.current;
      ctx.save();
      ctx.font = "32px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Shadow
      ctx.fillStyle = c.bg;
      ctx.fillText(String(value), CANVAS_W / 2 + 3, 33);
      // Main
      ctx.fillStyle = c.text;
      ctx.fillText(String(value), CANVAS_W / 2, 30);
      ctx.restore();
    },
    []
  );

  // --- Spawn pipes ---
  const spawnPipe = useCallback((startX: number) => {
    const gap = getGapForScore(scoreRef.current);
    const minTop = 60;
    const maxTop = CANVAS_H - GROUND_HEIGHT - gap - 60;
    const gapY = minTop + Math.random() * (maxTop - minTop);
    return { x: startX, gapY, gapH: gap, scored: false } as Pipe;
  }, []);

  // --- Reset ---
  const resetGame = useCallback(() => {
    birdYRef.current = CANVAS_H / 2 - BIRD_SIZE / 2;
    birdVelRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    tickRef.current = 0;
    groundXRef.current = 0;
    setScore(0);
  }, []);

  // --- Flap ---
  const flap = useCallback(() => {
    const state = stateRef.current;
    if (state === "idle") {
      resetGame();
      recordPlay();
      stateRef.current = "playing";
      setGameState("playing");
      birdVelRef.current = FLAP_IMPULSE;
      // Seed initial pipes
      pipesRef.current = [
        spawnPipe(CANVAS_W + 100),
        spawnPipe(CANVAS_W + 100 + PIPE_SPACING),
      ];
    } else if (state === "playing") {
      birdVelRef.current = FLAP_IMPULSE;
    } else if (state === "dead") {
      stateRef.current = "idle";
      setGameState("idle");
      resetGame();
    }
  }, [resetGame, spawnPipe]);

  // --- Input handlers ---
  useEffect(() => {
    if (!mounted) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, flap]);

  // --- Game loop ---
  useEffect(() => {
    if (!mounted) return;
    resolveColors();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable image smoothing for pixel-art look
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      const c = colorsRef.current;
      const state = stateRef.current;

      // --- Update ---
      if (state === "playing") {
        // Bird physics
        birdVelRef.current += GRAVITY;
        birdYRef.current += birdVelRef.current;

        // Ground collision
        if (birdYRef.current + BIRD_SIZE >= CANVAS_H - GROUND_HEIGHT) {
          birdYRef.current = CANVAS_H - GROUND_HEIGHT - BIRD_SIZE;
          birdVelRef.current = 0;
          stateRef.current = "dead";
          setGameState("dead");
          // Save best
          if (scoreRef.current > bestRef.current) {
            bestRef.current = scoreRef.current;
            setBest(scoreRef.current);
            localStorage.setItem("flappy-pixel-best", String(scoreRef.current));
          }
        }

        // Ceiling
        if (birdYRef.current < 0) {
          birdYRef.current = 0;
          birdVelRef.current = 0;
        }

        // Pipe movement and collision
        const birdLeft = 80;
        const birdRight = birdLeft + BIRD_SIZE;
        const birdTop = birdYRef.current;
        const birdBottom = birdTop + BIRD_SIZE;

        for (const pipe of pipesRef.current) {
          pipe.x -= PIPE_SPEED;

          // Score
          if (!pipe.scored && pipe.x + PIPE_WIDTH < birdLeft) {
            pipe.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }

          // Collision
          if (stateRef.current === "playing") {
            const pipeLeft = pipe.x;
            const pipeRight = pipe.x + PIPE_WIDTH;

            if (birdRight > pipeLeft && birdLeft < pipeRight) {
              // Check top pipe
              if (birdTop < pipe.gapY) {
                stateRef.current = "dead";
                setGameState("dead");
                if (scoreRef.current > bestRef.current) {
                  bestRef.current = scoreRef.current;
                  setBest(scoreRef.current);
                  localStorage.setItem(
                    "flappy-pixel-best",
                    String(scoreRef.current)
                  );
                }
              }
              // Check bottom pipe
              if (birdBottom > pipe.gapY + pipe.gapH) {
                stateRef.current = "dead";
                setGameState("dead");
                if (scoreRef.current > bestRef.current) {
                  bestRef.current = scoreRef.current;
                  setBest(scoreRef.current);
                  localStorage.setItem(
                    "flappy-pixel-best",
                    String(scoreRef.current)
                  );
                }
              }
            }
          }
        }

        // Remove off-screen pipes and spawn new ones
        if (pipesRef.current.length > 0 && pipesRef.current[0].x + PIPE_WIDTH < -10) {
          pipesRef.current.shift();
          const last = pipesRef.current[pipesRef.current.length - 1];
          pipesRef.current.push(spawnPipe(last.x + PIPE_SPACING));
        }

        // Scroll ground
        groundXRef.current += PIPE_SPEED;
      }

      // Idle bobbing
      if (state === "idle") {
        tickRef.current += 1;
      }

      // --- Draw ---
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, c.bg);
      skyGrad.addColorStop(1, c.bgSecondary);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Pipes
      for (const pipe of pipesRef.current) {
        drawPipe(ctx, pipe);
      }

      // Ground
      drawGround(ctx);

      // Bird
      const birdX = 80;
      let birdY = birdYRef.current;
      if (state === "idle") {
        birdY = CANVAS_H / 2 - BIRD_SIZE / 2 + Math.sin(tickRef.current * 0.06) * 12;
      }
      const angle =
        state === "idle"
          ? 0
          : Math.max(-0.5, Math.min(1.2, birdVelRef.current * 0.08));
      drawPixelBird(ctx, birdX, birdY, angle);

      // Score (during play)
      if (state === "playing") {
        drawScore(ctx, scoreRef.current);
      }

      // Idle screen overlay
      if (state === "idle") {
        ctx.save();
        ctx.font = "18px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = c.text;
        ctx.fillText("FLAPPY PIXEL", CANVAS_W / 2, CANVAS_H / 2 - 80);

        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = c.textSecondary;
        // Blinking text
        if (Math.floor(tickRef.current / 30) % 2 === 0) {
          ctx.fillText("TAP TO START", CANVAS_W / 2, CANVAS_H / 2 + 60);
        }
        ctx.restore();
      }

      // Death screen overlay
      if (state === "dead") {
        // Dim overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Panel
        const panelW = 260;
        const panelH = 220;
        const panelX = (CANVAS_W - panelW) / 2;
        const panelY = (CANVAS_H - panelH) / 2 - 20;
        ctx.fillStyle = c.bgCard;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 3;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.save();
        ctx.textAlign = "center";

        // GAME OVER
        ctx.font = "14px 'Press Start 2P', monospace";
        ctx.fillStyle = c.red;
        ctx.fillText("GAME OVER", CANVAS_W / 2, panelY + 35);

        // Score
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = c.textSecondary;
        ctx.fillText("SCORE", CANVAS_W / 2, panelY + 65);
        ctx.font = "22px 'Press Start 2P', monospace";
        ctx.fillStyle = c.text;
        ctx.fillText(String(scoreRef.current), CANVAS_W / 2, panelY + 95);

        // Best
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = c.textSecondary;
        ctx.fillText("BEST", CANVAS_W / 2, panelY + 125);
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillStyle = c.accent;
        ctx.fillText(String(bestRef.current), CANVAS_W / 2, panelY + 150);

        // Medal
        const medal = getMedal(scoreRef.current);
        if (medal) {
          ctx.font = "10px 'Press Start 2P', monospace";
          ctx.fillStyle = medal.color;
          ctx.fillText(medal.label + " MEDAL", CANVAS_W / 2, panelY + 175);
        }

        // Play again
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = c.textSecondary;
        if (Math.floor(tickRef.current / 30) % 2 === 0) {
          ctx.fillText("TAP TO RETRY", CANVAS_W / 2, panelY + panelH + 25);
        }
        ctx.restore();

        tickRef.current += 1;
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mounted, resolveColors, drawPixelBird, drawPipe, drawGround, drawScore, spawnPipe]);

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
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Header */}
        <header className="pt-8 pb-4 px-4 text-center w-full max-w-lg">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block mb-6 transition-colors duration-200"
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

          <h1
            className="pixel-text text-2xl sm:text-3xl mb-2"
            style={{
              color: "var(--color-accent)",
              textShadow: `
                0 0 10px var(--color-accent-glow),
                0 0 30px var(--color-accent-glow)
              `,
            }}
          >
            FLAPPY PIXEL
          </h1>
          <p
            className="pixel-text text-[10px] mb-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            {gameState === "idle"
              ? "TAP / SPACE / CLICK TO PLAY"
              : gameState === "playing"
              ? `SCORE: ${score}`
              : `GAME OVER - SCORE: ${score}`}
          </p>
        </header>

        {/* Canvas container */}
        <div
          className="pixel-border relative"
          style={{
            width: CANVAS_W,
            maxWidth: "100vw",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={flap}
            onTouchStart={(e) => {
              e.preventDefault();
              flap();
            }}
            className="block cursor-pointer"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              maxWidth: "100%",
              imageRendering: "pixelated",
            }}
          />
        </div>

        {/* Info below canvas */}
        <div className="mt-6 mb-12 px-4 text-center max-w-lg">
          <div className="flex justify-center gap-8 mb-4">
            <div>
              <p
                className="pixel-text text-[9px] mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                BEST
              </p>
              <p
                className="pixel-text text-sm"
                style={{ color: "var(--color-accent)" }}
              >
                {best}
              </p>
            </div>
            <div>
              <p
                className="pixel-text text-[9px] mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                MEDALS
              </p>
              <div className="flex gap-2 justify-center">
                <span style={{ opacity: best >= 10 ? 1 : 0.2, color: "#CD7F32" }}>
                  B
                </span>
                <span style={{ opacity: best >= 25 ? 1 : 0.2, color: "#C0C0C0" }}>
                  S
                </span>
                <span style={{ opacity: best >= 50 ? 1 : 0.2, color: "#FFD700" }}>
                  G
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className="pixel-card p-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p
              className="pixel-text text-[9px] mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              CONTROLS
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              Space / Up Arrow / Click / Tap to flap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
