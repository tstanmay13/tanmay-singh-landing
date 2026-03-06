'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BrickType = 'normal' | 'tough' | 'indestructible';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  type: BrickType;
  hits: number; // hits remaining
  color: string;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
}

type PowerUpKind = 'wide' | 'multi' | 'slow';

interface PowerUp {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PowerUpKind;
  dy: number;
}

interface ActiveEffect {
  kind: PowerUpKind;
  remaining: number; // ms remaining
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_W = 500;
const CANVAS_H = 600;
const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = CANVAS_H - 30;
const BALL_R = 5;
const BALL_SPEED = 4;
const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BRICK_PAD = 4;
const BRICK_TOP = 60;
const POWERUP_CHANCE = 0.2;
const POWERUP_W = 20;
const POWERUP_H = 12;
const POWERUP_SPEED = 2;
const EFFECT_DURATION = 10000; // 10 seconds

// Colors from the theme
const COLORS = {
  bg: '#0a0a0f',
  surface: '#1a1a25',
  border: '#2a2a3a',
  accent: '#00ff88',
  accentDark: '#00cc6a',
  text: '#e8e8f0',
  textSecondary: '#8888a0',
  textMuted: '#555570',
  red: '#ef4444',
  orange: '#f59e0b',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indestructible: '#555570',
  indestructibleBorder: '#3a3a4f',
};

const BRICK_COLORS: string[] = [
  COLORS.red,
  COLORS.orange,
  COLORS.accent,
  COLORS.cyan,
  COLORS.purple,
];

const POWERUP_COLORS: Record<PowerUpKind, string> = {
  wide: COLORS.cyan,
  multi: COLORS.pink,
  slow: COLORS.orange,
};

const POWERUP_LABELS: Record<PowerUpKind, string> = {
  wide: 'W',
  multi: 'M',
  slow: 'S',
};

const POWERUP_NAMES: Record<PowerUpKind, string> = {
  wide: 'WIDE PADDLE',
  multi: 'MULTI-BALL',
  slow: 'SLOW BALL',
};

// ---------------------------------------------------------------------------
// Level layouts
// 'n' = normal, 't' = tough, 'x' = indestructible, '.' = empty
// ---------------------------------------------------------------------------

const LEVELS: string[][][] = [
  // Level 1 - simple full grid
  [
    ['n','n','n','n','n','n','n','n'],
    ['n','n','n','n','n','n','n','n'],
    ['n','n','n','n','n','n','n','n'],
    ['n','n','n','n','n','n','n','n'],
    ['n','n','n','n','n','n','n','n'],
  ],
  // Level 2 - tough center
  [
    ['n','n','n','n','n','n','n','n'],
    ['n','t','t','t','t','t','t','n'],
    ['n','t','n','n','n','n','t','n'],
    ['n','t','t','t','t','t','t','n'],
    ['n','n','n','n','n','n','n','n'],
  ],
  // Level 3 - indestructible walls
  [
    ['x','n','n','t','t','n','n','x'],
    ['n','t','n','n','n','n','t','n'],
    ['n','n','t','n','n','t','n','n'],
    ['n','t','n','n','n','n','t','n'],
    ['x','n','n','t','t','n','n','x'],
  ],
  // Level 4 - diamond
  [
    ['.','.','.','t','t','.','.','.'],
    ['.','.','t','n','n','t','.','.'],
    ['.','t','n','x','x','n','t','.'],
    ['.','.','t','n','n','t','.','.'],
    ['.','.','.','t','t','.','.','.'],
  ],
  // Level 5 - fortress
  [
    ['x','t','t','t','t','t','t','x'],
    ['t','n','n','n','n','n','n','t'],
    ['t','n','x','t','t','x','n','t'],
    ['t','n','n','n','n','n','n','t'],
    ['x','t','t','t','t','t','t','x'],
  ],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBricks(levelIndex: number): Brick[] {
  const layout = LEVELS[levelIndex];
  const bricks: Brick[] = [];
  const totalPadW = (BRICK_COLS + 1) * BRICK_PAD;
  const brickW = (CANVAS_W - totalPadW) / BRICK_COLS;
  const brickH = 16;

  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const cell = layout[r][c];
      if (cell === '.') continue;
      const type: BrickType =
        cell === 'x' ? 'indestructible' : cell === 't' ? 'tough' : 'normal';
      const hits = type === 'indestructible' ? 999 : type === 'tough' ? 2 : 1;
      const color =
        type === 'indestructible'
          ? COLORS.indestructible
          : type === 'tough'
          ? '#7c5cbf'
          : BRICK_COLORS[r % BRICK_COLORS.length];
      bricks.push({
        x: BRICK_PAD + c * (brickW + BRICK_PAD),
        y: BRICK_TOP + r * (brickH + BRICK_PAD),
        w: brickW,
        h: brickH,
        type,
        hits,
        color,
      });
    }
  }
  return bricks;
}

function makeBall(x: number, y: number, angle?: number): Ball {
  const a = angle ?? (-Math.PI / 2 + (Math.random() - 0.5) * 0.6);
  return {
    x,
    y,
    dx: BALL_SPEED * Math.cos(a),
    dy: BALL_SPEED * Math.sin(a),
    r: BALL_R,
  };
}

function randomPowerUpKind(): PowerUpKind {
  const kinds: PowerUpKind[] = ['wide', 'multi', 'slow'];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.floor(r * factor);
  const dg = Math.floor(g * factor);
  const db = Math.floor(b * factor);
  return `rgb(${dr},${dg},${db})`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreakoutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return <BreakoutGame />;
}

function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs (avoid re-renders during rAF loop)
  const paddleX = useRef(CANVAS_W / 2 - PADDLE_W / 2);
  const paddleW = useRef(PADDLE_W);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<Brick[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const effects = useRef<ActiveEffect[]>([]);
  const score = useRef(0);
  const lives = useRef(3);
  const level = useRef(0);
  const animFrame = useRef(0);
  const lastTime = useRef(0);
  const gameState = useRef<'idle' | 'playing' | 'levelClear' | 'gameOver'>('idle');
  const levelFlashTimer = useRef(0);

  // React state for UI overlays
  const [uiState, setUiState] = useState<'idle' | 'playing' | 'levelClear' | 'gameOver'>('idle');
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiLevel, setUiLevel] = useState(1);
  const [uiEffects, setUiEffects] = useState<ActiveEffect[]>([]);
  const [canvasScale, setCanvasScale] = useState(1);

  // -------------------------------------------------------------------
  // Initialise / reset
  // -------------------------------------------------------------------

  const initLevel = useCallback((lvl: number) => {
    bricks.current = buildBricks(lvl);
    balls.current = [makeBall(CANVAS_W / 2, PADDLE_Y - BALL_R - 2)];
    powerUps.current = [];
    effects.current = [];
    paddleW.current = PADDLE_W;
    paddleX.current = CANVAS_W / 2 - PADDLE_W / 2;
    level.current = lvl;
    gameState.current = 'playing';
    setUiLevel(lvl + 1);
    setUiState('playing');
    setUiEffects([]);
  }, []);

  const startGame = useCallback(() => {
    score.current = 0;
    lives.current = 3;
    setUiScore(0);
    setUiLives(3);
    initLevel(0);
  }, [initLevel]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // -------------------------------------------------------------------
  // Input handling
  // -------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const relX = (clientX - rect.left) * scaleX;
      paddleX.current = Math.max(0, Math.min(CANVAS_W - paddleW.current, relX - paddleW.current / 2));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  // -------------------------------------------------------------------
  // Responsive scaling
  // -------------------------------------------------------------------

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const maxW = containerRef.current.clientWidth - 32;
      const s = Math.min(1, maxW / CANVAS_W);
      setCanvasScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // -------------------------------------------------------------------
  // Game loop
  // -------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const dt = lastTime.current ? timestamp - lastTime.current : 16;
      lastTime.current = timestamp;

      // --- Update ---
      if (gameState.current === 'playing') {
        updateGame(dt);
      } else if (gameState.current === 'levelClear') {
        levelFlashTimer.current -= dt;
        if (levelFlashTimer.current <= 0) {
          const nextLvl = level.current + 1;
          if (nextLvl >= LEVELS.length) {
            gameState.current = 'gameOver';
            setUiState('gameOver');
          } else {
            initLevel(nextLvl);
          }
        }
      }

      // --- Draw ---
      draw(ctx);

      animFrame.current = requestAnimationFrame(loop);
    };

    animFrame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Update logic
  // -------------------------------------------------------------------

  const updateGame = (dt: number) => {
    // Update effects timers
    effects.current = effects.current
      .map((e) => ({ ...e, remaining: e.remaining - dt }))
      .filter((e) => e.remaining > 0);
    setUiEffects([...effects.current]);

    // Check if wide paddle effect expired
    const hasWide = effects.current.some((e) => e.kind === 'wide');
    paddleW.current = hasWide ? PADDLE_W * 1.5 : PADDLE_W;

    // Speed modifier
    const hasSlow = effects.current.some((e) => e.kind === 'slow');
    const speedMod = hasSlow ? 0.6 : 1;

    // Update balls
    const ballsToRemove: number[] = [];

    for (let bi = 0; bi < balls.current.length; bi++) {
      const ball = balls.current[bi];
      ball.x += ball.dx * speedMod;
      ball.y += ball.dy * speedMod;

      // Wall collisions
      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.dx = Math.abs(ball.dx);
      }
      if (ball.x + ball.r >= CANVAS_W) {
        ball.x = CANVAS_W - ball.r;
        ball.dx = -Math.abs(ball.dx);
      }
      if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.dy = Math.abs(ball.dy);
      }

      // Below paddle
      if (ball.y + ball.r > CANVAS_H) {
        ballsToRemove.push(bi);
        continue;
      }

      // Paddle collision
      const pX = paddleX.current;
      const pW = paddleW.current;
      if (
        ball.dy > 0 &&
        ball.y + ball.r >= PADDLE_Y &&
        ball.y + ball.r <= PADDLE_Y + PADDLE_H + 4 &&
        ball.x >= pX &&
        ball.x <= pX + pW
      ) {
        // Reflect based on hit position
        const hitPos = (ball.x - pX) / pW; // 0..1
        const angle = -Math.PI * (0.15 + 0.7 * (1 - hitPos)); // spread angle
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.cos(angle);
        ball.dy = speed * Math.sin(angle);
        ball.y = PADDLE_Y - ball.r;
      }

      // Brick collisions
      for (let i = bricks.current.length - 1; i >= 0; i--) {
        const br = bricks.current[i];
        // AABB vs circle
        const closestX = Math.max(br.x, Math.min(ball.x, br.x + br.w));
        const closestY = Math.max(br.y, Math.min(ball.y, br.y + br.h));
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        if (distX * distX + distY * distY <= ball.r * ball.r) {
          // Determine bounce direction
          const overlapLeft = ball.x + ball.r - br.x;
          const overlapRight = br.x + br.w - (ball.x - ball.r);
          const overlapTop = ball.y + ball.r - br.y;
          const overlapBottom = br.y + br.h - (ball.y - ball.r);
          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          if (minOverlapX < minOverlapY) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }

          // Damage brick
          if (br.type !== 'indestructible') {
            br.hits--;
            if (br.hits <= 0) {
              const pts = br.type === 'tough' ? 25 : 10;
              score.current += pts;
              setUiScore(score.current);

              // Maybe spawn power-up
              if (Math.random() < POWERUP_CHANCE) {
                powerUps.current.push({
                  x: br.x + br.w / 2 - POWERUP_W / 2,
                  y: br.y,
                  w: POWERUP_W,
                  h: POWERUP_H,
                  kind: randomPowerUpKind(),
                  dy: POWERUP_SPEED,
                });
              }

              bricks.current.splice(i, 1);
            }
          }

          break; // one brick collision per frame per ball
        }
      }
    }

    // Remove lost balls (iterate in reverse)
    for (let i = ballsToRemove.length - 1; i >= 0; i--) {
      balls.current.splice(ballsToRemove[i], 1);
    }

    // All balls lost
    if (balls.current.length === 0) {
      lives.current--;
      setUiLives(lives.current);
      if (lives.current <= 0) {
        gameState.current = 'gameOver';
        setUiState('gameOver');
      } else {
        // Reset ball and effects
        balls.current = [makeBall(CANVAS_W / 2, PADDLE_Y - BALL_R - 2)];
        effects.current = [];
        paddleW.current = PADDLE_W;
        setUiEffects([]);
      }
    }

    // Update power-ups
    for (let i = powerUps.current.length - 1; i >= 0; i--) {
      const pu = powerUps.current[i];
      pu.y += pu.dy;

      // Off screen
      if (pu.y > CANVAS_H) {
        powerUps.current.splice(i, 1);
        continue;
      }

      // Caught by paddle
      const pX = paddleX.current;
      const pW = paddleW.current;
      if (
        pu.y + pu.h >= PADDLE_Y &&
        pu.y <= PADDLE_Y + PADDLE_H &&
        pu.x + pu.w >= pX &&
        pu.x <= pX + pW
      ) {
        applyPowerUp(pu.kind);
        powerUps.current.splice(i, 1);
      }
    }

    // Check level clear (no breakable bricks left)
    const breakable = bricks.current.filter((b) => b.type !== 'indestructible');
    if (breakable.length === 0) {
      gameState.current = 'levelClear';
      setUiState('levelClear');
      levelFlashTimer.current = 2000;
    }
  };

  const applyPowerUp = (kind: PowerUpKind) => {
    // Remove existing effect of same kind to reset timer
    effects.current = effects.current.filter((e) => e.kind !== kind);
    effects.current.push({ kind, remaining: EFFECT_DURATION });

    if (kind === 'multi') {
      // Split first ball into 3
      if (balls.current.length > 0) {
        const src = balls.current[0];
        const speed = Math.sqrt(src.dx * src.dx + src.dy * src.dy);
        const baseAngle = Math.atan2(src.dy, src.dx);
        balls.current.push({
          ...src,
          dx: speed * Math.cos(baseAngle - 0.4),
          dy: speed * Math.sin(baseAngle - 0.4),
        });
        balls.current.push({
          ...src,
          dx: speed * Math.cos(baseAngle + 0.4),
          dy: speed * Math.sin(baseAngle + 0.4),
        });
      }
    }

    setUiEffects([...effects.current]);
  };

  // -------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines (subtle)
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Bricks
    for (const br of bricks.current) {
      ctx.fillStyle = br.type === 'tough' && br.hits === 1
        ? darkenColor(br.color, 0.6)
        : br.color;
      ctx.fillRect(br.x, br.y, br.w, br.h);

      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(br.x, br.y, br.w, 3);

      // Border
      ctx.strokeStyle = br.type === 'indestructible' ? COLORS.indestructibleBorder : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(br.x, br.y, br.w, br.h);

      // Crack indicator for tough bricks with 1 hit remaining
      if (br.type === 'tough' && br.hits === 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(br.x + br.w * 0.3, br.y + br.h * 0.2);
        ctx.lineTo(br.x + br.w * 0.5, br.y + br.h * 0.6);
        ctx.lineTo(br.x + br.w * 0.7, br.y + br.h * 0.3);
        ctx.stroke();
      }
    }

    // Power-ups
    for (const pu of powerUps.current) {
      ctx.fillStyle = POWERUP_COLORS[pu.kind];
      ctx.fillRect(pu.x, pu.y, pu.w, pu.h);
      ctx.fillStyle = '#fff';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_LABELS[pu.kind], pu.x + pu.w / 2, pu.y + pu.h / 2);
    }

    // Paddle
    const pX = paddleX.current;
    const pW = paddleW.current;
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(pX, PADDLE_Y, pW, PADDLE_H);
    // Paddle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(pX, PADDLE_Y, pW, 3);

    // Balls
    for (const ball of balls.current) {
      ctx.fillStyle = COLORS.text;
      ctx.fillRect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
    }

    // Level clear flash
    if (gameState.current === 'levelClear') {
      const alpha = 0.5 + 0.3 * Math.sin(Date.now() * 0.008);
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = COLORS.bg;
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LEVEL COMPLETE!', CANVAS_W / 2, CANVAS_H / 2);
    }

    // Idle state
    if (gameState.current === 'idle') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = COLORS.accent;
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BREAKOUT REMIX', CANVAS_W / 2, CANVAS_H / 2 - 30);
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('CLICK START TO PLAY', CANVAS_W / 2, CANVAS_H / 2 + 10);
    }

    // Game over
    if (gameState.current === 'gameOver') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = COLORS.red;
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const wonGame = level.current >= LEVELS.length - 1 &&
        bricks.current.filter((b) => b.type !== 'indestructible').length === 0;
      if (wonGame) {
        ctx.fillStyle = COLORS.accent;
        ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 40);
      } else {
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 40);
      }
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText(`SCORE: ${score.current}`, CANVAS_W / 2, CANVAS_H / 2);
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10" ref={containerRef}>
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
            className="pixel-text text-2xl sm:text-3xl mb-2"
            style={{
              color: 'var(--color-accent)',
              textShadow: '0 0 10px var(--color-accent-glow), 0 0 30px var(--color-accent-glow)',
            }}
          >
            BREAKOUT REMIX
          </h1>
        </header>

        {/* HUD */}
        <div className="max-w-[532px] mx-auto px-4 mb-2">
          <div
            className="flex justify-between items-center px-4 py-2 border-2"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-card)',
            }}
          >
            <span
              className="pixel-text text-[10px]"
              style={{ color: 'var(--color-text)' }}
            >
              SCORE: {uiScore}
            </span>
            <span
              className="pixel-text text-[10px]"
              style={{ color: 'var(--color-cyan)' }}
            >
              LVL {uiLevel}
            </span>
            <span
              className="pixel-text text-[10px]"
              style={{ color: uiLives <= 1 ? 'var(--color-red)' : 'var(--color-text)' }}
            >
              LIVES: {uiLives}
            </span>
          </div>
        </div>

        {/* Active effects */}
        {uiEffects.length > 0 && (
          <div className="max-w-[532px] mx-auto px-4 mb-2">
            <div className="flex gap-2 justify-center flex-wrap">
              {uiEffects.map((eff, i) => (
                <span
                  key={`${eff.kind}-${i}`}
                  className="pixel-text text-[8px] px-2 py-1 border"
                  style={{
                    borderColor: POWERUP_COLORS[eff.kind],
                    color: POWERUP_COLORS[eff.kind],
                    background: 'var(--color-bg-card)',
                  }}
                >
                  {POWERUP_NAMES[eff.kind]} {Math.ceil(eff.remaining / 1000)}s
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex justify-center px-4 pb-4">
          <div
            className="border-2"
            style={{
              borderColor: 'var(--color-border)',
              width: CANVAS_W * canvasScale,
              height: CANVAS_H * canvasScale,
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                width: CANVAS_W * canvasScale,
                height: CANVAS_H * canvasScale,
                display: 'block',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="text-center pb-4 space-y-3">
          {(uiState === 'idle' || uiState === 'gameOver') && (
            <button
              onClick={uiState === 'idle' ? startGame : restartGame}
              className="pixel-btn"
            >
              {uiState === 'idle' ? 'START GAME' : 'PLAY AGAIN'}
            </button>
          )}

          <p
            className="pixel-text text-[8px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            MOVE MOUSE OR TOUCH TO CONTROL PADDLE
          </p>
        </div>

        {/* How to Play */}
        <div className="max-w-md mx-auto px-4 pb-12">
          <div
            className="pixel-card p-5"
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-text)' }}
            >
              HOW TO PLAY
            </h3>
            <ul
              className="text-xs space-y-2"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
            >
              <li>Move your mouse or finger to control the paddle</li>
              <li>Break all bricks to clear each level (5 levels total)</li>
              <li>
                <span style={{ color: COLORS.cyan }}>W</span> = Wide paddle,{' '}
                <span style={{ color: COLORS.pink }}>M</span> = Multi-ball,{' '}
                <span style={{ color: COLORS.orange }}>S</span> = Slow ball
              </li>
              <li>Gray bricks are indestructible. Dark bricks take 2 hits.</li>
              <li>Normal brick: 10 pts | Tough brick: 25 pts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
