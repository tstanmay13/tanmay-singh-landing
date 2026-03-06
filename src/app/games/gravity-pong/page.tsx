"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Vec2 {
  x: number;
  y: number;
}

const CANVAS_W = 600;
const CANVAS_H = 400;

const PADDLE_W = 12;
const PADDLE_H = 70;
const PADDLE_MARGIN = 16;

const BALL_SIZE = 10;
const INITIAL_BALL_SPEED = 4;
const SPEED_INCREMENT = 0.25;
const MAX_BALL_SPEED = 12;

const WIN_SCORE = 7;

const AI_SPEED = 3.5;
const AI_REACTION_DELAY = 0.06; // lower = faster AI reaction

const GRAVITY_WELL_RADIUS = 28;

type GravityLevel = "LOW" | "MED" | "HIGH";

const GRAVITY_STRENGTHS: Record<GravityLevel, number> = {
  LOW: 800,
  MED: 2000,
  HIGH: 4000,
};

const GRAVITY_ORDER: GravityLevel[] = ["LOW", "MED", "HIGH"];

type GameState = "idle" | "playing" | "scored" | "gameover";

// ---------------------------------------------------------------------------
// Color helpers  (read CSS variables at runtime)
// ---------------------------------------------------------------------------

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GravityPongPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return <GravityPongGame />;
}

// ---------------------------------------------------------------------------
// Main game component (only rendered client-side after mount)
// ---------------------------------------------------------------------------

function GravityPongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs (mutated in rAF loop, no re-renders needed)
  const stateRef = useRef<GameState>("idle");
  const playerScoreRef = useRef(0);
  const cpuScoreRef = useRef(0);
  const gravityIndexRef = useRef(0);

  const playerYRef = useRef(CANVAS_H / 2 - PADDLE_H / 2);
  const cpuYRef = useRef(CANVAS_H / 2 - PADDLE_H / 2);

  const ballRef = useRef<Vec2>({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const ballVelRef = useRef<Vec2>({ x: INITIAL_BALL_SPEED, y: 0 });
  const rallyRef = useRef(0);

  const animFrameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pauseTimerRef = useRef(0);

  // React state only for overlay UI
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [gravityLevel, setGravityLevel] = useState<GravityLevel>("LOW");
  const [winner, setWinner] = useState<"player" | "cpu" | null>(null);

  // Gravity well pulse
  const pulseRef = useRef(0);

  // Scale factor for responsive canvas
  const [scale, setScale] = useState(1);

  // -----------------------------------------------------------------------
  // Responsive sizing
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const maxW = containerRef.current.clientWidth - 16; // some padding
      const s = Math.min(1, maxW / CANVAS_W);
      setScale(s);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // -----------------------------------------------------------------------
  // Reset helpers
  // -----------------------------------------------------------------------
  const resetBall = useCallback((serveTo: "player" | "cpu") => {
    ballRef.current = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
    const angle = (Math.random() - 0.5) * (Math.PI / 3); // -30..30 deg
    const dir = serveTo === "cpu" ? 1 : -1;
    const speed = INITIAL_BALL_SPEED;
    ballVelRef.current = {
      x: Math.cos(angle) * speed * dir,
      y: Math.sin(angle) * speed,
    };
    rallyRef.current = 0;
  }, []);

  const resetGame = useCallback(() => {
    playerScoreRef.current = 0;
    cpuScoreRef.current = 0;
    gravityIndexRef.current = 0;
    setPlayerScore(0);
    setCpuScore(0);
    setGravityLevel(GRAVITY_ORDER[0]);
    setWinner(null);
    playerYRef.current = CANVAS_H / 2 - PADDLE_H / 2;
    cpuYRef.current = CANVAS_H / 2 - PADDLE_H / 2;
    resetBall("cpu");
    stateRef.current = "playing";
    setGameState("playing");
  }, [resetBall]);

  // -----------------------------------------------------------------------
  // Input handling (mouse & touch)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasY(clientY: number): number {
      const rect = canvas!.getBoundingClientRect();
      return (clientY - rect.top) / scale;
    }

    function onMouseMove(e: MouseEvent) {
      if (stateRef.current !== "playing") return;
      const y = getCanvasY(e.clientY);
      playerYRef.current = Math.max(
        0,
        Math.min(CANVAS_H - PADDLE_H, y - PADDLE_H / 2)
      );
    }

    function onTouchMove(e: TouchEvent) {
      if (stateRef.current !== "playing") return;
      e.preventDefault();
      const touch = e.touches[0];
      const y = getCanvasY(touch.clientY);
      playerYRef.current = Math.max(
        0,
        Math.min(CANVAS_H - PADDLE_H, y - PADDLE_H / 2)
      );
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [scale]);

  // -----------------------------------------------------------------------
  // Game loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read theme colours once
    const colBg = cssVar("--color-bg", "#0a0a0f");
    const colAccent = cssVar("--color-accent", "#00ff88");
    const colAccentGlow = cssVar("--color-accent-glow", "rgba(0,255,136,0.15)");
    const colPurple = cssVar("--color-purple", "#a855f7");
    const colText = cssVar("--color-text", "#e8e8f0");
    const colMuted = cssVar("--color-text-muted", "#555570");
    const colBorder = cssVar("--color-border", "#2a2a3a");
    const colOrange = cssVar("--color-orange", "#f59e0b");
    const colRed = cssVar("--color-red", "#ef4444");
    const colCyan = cssVar("--color-cyan", "#06b6d4");

    function gravityColor(): string {
      const level = GRAVITY_ORDER[gravityIndexRef.current];
      if (level === "LOW") return colCyan;
      if (level === "MED") return colOrange;
      return colRed;
    }

    function tick(time: number) {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 16.667, 3) : 1;
      lastTimeRef.current = time;
      pulseRef.current += 0.03 * dt;

      const state = stateRef.current;

      // -- Update --
      if (state === "playing") {
        updatePlaying(dt);
      } else if (state === "scored") {
        pauseTimerRef.current -= dt;
        if (pauseTimerRef.current <= 0) {
          stateRef.current = "playing";
          setGameState("playing");
        }
      }

      // -- Draw --
      draw();

      animFrameRef.current = requestAnimationFrame(tick);
    }

    // -- Physics update --
    function updatePlaying(dt: number) {
      const ball = ballRef.current;
      const vel = ballVelRef.current;
      const gLevel = GRAVITY_ORDER[gravityIndexRef.current];
      const gStrength = GRAVITY_STRENGTHS[gLevel];

      // Gravity well at center
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const dx = cx - ball.x;
      const dy = cy - ball.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist > 5) {
        const cappedDistSq = Math.max(distSq, 1600); // cap at distance 40
        const force = gStrength / cappedDistSq;
        const cappedForce = Math.min(force, 1.5); // hard cap on acceleration
        vel.x += (dx / dist) * cappedForce * dt;
        vel.y += (dy / dist) * cappedForce * dt;
      }

      // Cap ball speed
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (speed > MAX_BALL_SPEED) {
        vel.x = (vel.x / speed) * MAX_BALL_SPEED;
        vel.y = (vel.y / speed) * MAX_BALL_SPEED;
      }

      // Move ball
      ball.x += vel.x * dt;
      ball.y += vel.y * dt;

      // Top/bottom wall bounce
      if (ball.y <= 0) {
        ball.y = 0;
        vel.y = Math.abs(vel.y);
      } else if (ball.y + BALL_SIZE >= CANVAS_H) {
        ball.y = CANVAS_H - BALL_SIZE;
        vel.y = -Math.abs(vel.y);
      }

      // Player paddle collision (left side)
      const pPadX = PADDLE_MARGIN;
      const pPadY = playerYRef.current;
      if (
        vel.x < 0 &&
        ball.x <= pPadX + PADDLE_W &&
        ball.x + BALL_SIZE >= pPadX &&
        ball.y + BALL_SIZE >= pPadY &&
        ball.y <= pPadY + PADDLE_H
      ) {
        ball.x = pPadX + PADDLE_W;
        const hitPos = (ball.y + BALL_SIZE / 2 - pPadY) / PADDLE_H; // 0..1
        const angle = (hitPos - 0.5) * (Math.PI / 3); // -30..30 deg
        const currentSpeed =
          Math.sqrt(vel.x * vel.x + vel.y * vel.y) + SPEED_INCREMENT;
        const cappedSpeed = Math.min(currentSpeed, MAX_BALL_SPEED);
        vel.x = Math.cos(angle) * cappedSpeed;
        vel.y = Math.sin(angle) * cappedSpeed;
        rallyRef.current++;
      }

      // CPU paddle collision (right side)
      const cPadX = CANVAS_W - PADDLE_MARGIN - PADDLE_W;
      const cPadY = cpuYRef.current;
      if (
        vel.x > 0 &&
        ball.x + BALL_SIZE >= cPadX &&
        ball.x <= cPadX + PADDLE_W &&
        ball.y + BALL_SIZE >= cPadY &&
        ball.y <= cPadY + PADDLE_H
      ) {
        ball.x = cPadX - BALL_SIZE;
        const hitPos = (ball.y + BALL_SIZE / 2 - cPadY) / PADDLE_H;
        const angle = (hitPos - 0.5) * (Math.PI / 3);
        const currentSpeed =
          Math.sqrt(vel.x * vel.x + vel.y * vel.y) + SPEED_INCREMENT;
        const cappedSpeed = Math.min(currentSpeed, MAX_BALL_SPEED);
        vel.x = -Math.cos(angle) * cappedSpeed;
        vel.y = Math.sin(angle) * cappedSpeed;
        rallyRef.current++;
      }

      // AI movement
      const ballCenterY = ball.y + BALL_SIZE / 2;
      const cpuCenterY = cpuYRef.current + PADDLE_H / 2;
      const diff = ballCenterY - cpuCenterY;
      const aiMove = AI_SPEED * (1 - AI_REACTION_DELAY) * dt;
      if (Math.abs(diff) > 4) {
        cpuYRef.current += Math.sign(diff) * Math.min(aiMove, Math.abs(diff));
      }
      cpuYRef.current = Math.max(
        0,
        Math.min(CANVAS_H - PADDLE_H, cpuYRef.current)
      );

      // Score detection
      if (ball.x + BALL_SIZE < 0) {
        // CPU scores
        cpuScoreRef.current++;
        setCpuScore(cpuScoreRef.current);
        afterScore("cpu");
      } else if (ball.x > CANVAS_W) {
        // Player scores
        playerScoreRef.current++;
        setPlayerScore(playerScoreRef.current);
        afterScore("player");
      }
    }

    function afterScore(scorer: "player" | "cpu") {
      // Check win
      if (playerScoreRef.current >= WIN_SCORE) {
        stateRef.current = "gameover";
        setGameState("gameover");
        setWinner("player");
        return;
      }
      if (cpuScoreRef.current >= WIN_SCORE) {
        stateRef.current = "gameover";
        setGameState("gameover");
        setWinner("cpu");
        return;
      }

      // Rotate gravity each round
      const totalPoints = playerScoreRef.current + cpuScoreRef.current;
      gravityIndexRef.current = totalPoints % GRAVITY_ORDER.length;
      setGravityLevel(GRAVITY_ORDER[gravityIndexRef.current]);

      // Pause briefly then serve
      stateRef.current = "scored";
      setGameState("scored");
      pauseTimerRef.current = 40; // ~40 frames ~ 0.67s
      resetBall(scorer === "player" ? "cpu" : "player");
    }

    // -- Draw --
    function draw() {
      if (!ctx) return;

      // Background
      ctx.fillStyle = colBg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Center line (dashed)
      ctx.strokeStyle = colBorder;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gravity well
      const pulse = Math.sin(pulseRef.current) * 0.4 + 0.6;
      const gCol = gravityColor();
      const wellR = GRAVITY_WELL_RADIUS + pulse * 8;

      // Outer glow rings
      for (let i = 3; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2, CANVAS_H / 2, wellR + i * 12, 0, Math.PI * 2);
        ctx.fillStyle = `${gCol}${Math.floor(10 + i * 3).toString(16).padStart(2, "0")}`;
        ctx.fill();
      }

      // Core
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, CANVAS_H / 2, wellR, 0, Math.PI * 2);
      ctx.fillStyle = `${gCol}44`;
      ctx.fill();
      ctx.strokeStyle = gCol;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = gCol;
      ctx.fill();

      // Paddles (pixel-art rectangles)
      // Player
      ctx.fillStyle = colAccent;
      ctx.shadowColor = colAccentGlow;
      ctx.shadowBlur = 10;
      ctx.fillRect(
        PADDLE_MARGIN,
        playerYRef.current,
        PADDLE_W,
        PADDLE_H
      );
      ctx.shadowBlur = 0;

      // CPU
      ctx.fillStyle = colPurple;
      ctx.shadowColor = `${colPurple}40`;
      ctx.shadowBlur = 10;
      ctx.fillRect(
        CANVAS_W - PADDLE_MARGIN - PADDLE_W,
        cpuYRef.current,
        PADDLE_W,
        PADDLE_H
      );
      ctx.shadowBlur = 0;

      // Ball
      ctx.fillStyle = colText;
      ctx.shadowColor = `${colText}60`;
      ctx.shadowBlur = 8;
      ctx.fillRect(ballRef.current.x, ballRef.current.y, BALL_SIZE, BALL_SIZE);
      ctx.shadowBlur = 0;

      // Score (pixel-text style)
      ctx.fillStyle = colMuted;
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(
        `${playerScoreRef.current}`,
        CANVAS_W / 2 - 60,
        36
      );
      ctx.fillText(
        `${cpuScoreRef.current}`,
        CANVAS_W / 2 + 60,
        36
      );

      // Labels
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = colAccent;
      ctx.fillText("YOU", CANVAS_W / 2 - 60, 52);
      ctx.fillStyle = colPurple;
      ctx.fillText("CPU", CANVAS_W / 2 + 60, 52);

      // Gravity label at bottom
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = gCol;
      ctx.textAlign = "center";
      ctx.fillText(
        `GRAVITY: ${GRAVITY_ORDER[gravityIndexRef.current]}`,
        CANVAS_W / 2,
        CANVAS_H - 12
      );
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center px-4 py-8">
        {/* Back link */}
        <Link
          href="/games"
          className="pixel-text text-xs self-start mb-6 transition-colors duration-200"
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
          className="pixel-text text-2xl sm:text-3xl md:text-4xl mb-2 text-center"
          style={{
            color: "var(--color-accent)",
            textShadow: `
              0 0 10px var(--color-accent-glow),
              0 0 30px var(--color-accent-glow)
            `,
          }}
        >
          GRAVITY PONG
        </h1>

        <p
          className="pixel-text text-[10px] mb-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          PLAYER vs CPU
        </p>

        {/* Score display (outside canvas for accessibility) */}
        <div className="flex items-center gap-6 mb-4">
          <span
            className="pixel-text text-lg"
            style={{ color: "var(--color-accent)" }}
          >
            {playerScore}
          </span>
          <span
            className="pixel-text text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            -
          </span>
          <span
            className="pixel-text text-lg"
            style={{ color: "var(--color-purple)" }}
          >
            {cpuScore}
          </span>
        </div>

        {/* Gravity indicator */}
        <p
          className="pixel-text text-[10px] mb-4"
          style={{
            color:
              gravityLevel === "LOW"
                ? "var(--color-cyan)"
                : gravityLevel === "MED"
                ? "var(--color-orange)"
                : "var(--color-red)",
          }}
        >
          GRAVITY: {gravityLevel}
        </p>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="w-full max-w-[632px] flex justify-center"
        >
          <div
            className="relative pixel-border"
            style={{
              width: CANVAS_W * scale,
              height: CANVAS_H * scale,
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                width: CANVAS_W * scale,
                height: CANVAS_H * scale,
                imageRendering: "pixelated",
                display: "block",
                cursor: gameState === "playing" ? "none" : "default",
              }}
            />

            {/* Idle overlay */}
            {gameState === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <p
                  className="pixel-text text-sm mb-6 animate-flicker"
                  style={{ color: "var(--color-accent)" }}
                >
                  FIRST TO {WIN_SCORE} WINS
                </p>
                <button
                  onClick={resetGame}
                  className="pixel-btn text-xs cursor-pointer"
                >
                  START GAME
                </button>
                <p
                  className="pixel-text text-[8px] mt-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  MOVE MOUSE / TOUCH TO CONTROL PADDLE
                </p>
              </div>
            )}

            {/* Game over overlay */}
            {gameState === "gameover" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <p
                  className="pixel-text text-xl sm:text-2xl mb-2"
                  style={{
                    color:
                      winner === "player"
                        ? "var(--color-accent)"
                        : "var(--color-red)",
                    textShadow:
                      winner === "player"
                        ? "0 0 20px var(--color-accent-glow)"
                        : "0 0 20px rgba(239,68,68,0.4)",
                  }}
                >
                  {winner === "player" ? "YOU WIN!" : "GAME OVER"}
                </p>
                <p
                  className="pixel-text text-xs mb-6"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {playerScore} - {cpuScore}
                </p>
                <button
                  onClick={resetGame}
                  className="pixel-btn text-xs cursor-pointer"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div
          className="mt-6 max-w-md text-center pixel-card p-4"
        >
          <p
            className="pixel-text text-[8px] leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            MOVE YOUR MOUSE OR DRAG TO CONTROL THE LEFT PADDLE.
            <br />
            THE GRAVITY WELL IN THE CENTER BENDS THE BALL&apos;S PATH.
            <br />
            GRAVITY STRENGTH CHANGES EACH ROUND.
          </p>
        </div>
      </div>
    </div>
  );
}
