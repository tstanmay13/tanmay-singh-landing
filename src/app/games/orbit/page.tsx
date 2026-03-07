"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import GamePlayCounter from "@/components/GamePlayCounter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Vec2 {
  x: number;
  y: number;
}

interface Planet {
  id: number;
  pos: Vec2;
  vel: Vec2;
  mass: number;
  radius: number;
  color: string;
  trail: Vec2[];
}

type Preset = "solar" | "binary" | "random";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANET_COLORS = [
  "var(--color-accent)",
  "var(--color-purple)",
  "var(--color-pink)",
  "var(--color-blue)",
  "var(--color-cyan)",
  "var(--color-orange)",
];

const RESOLVED_COLORS: Record<string, string> = {
  "var(--color-accent)": "#00ff88",
  "var(--color-purple)": "#a855f7",
  "var(--color-pink)": "#ec4899",
  "var(--color-blue)": "#3b82f6",
  "var(--color-cyan)": "#06b6d4",
  "var(--color-orange)": "#f59e0b",
  "var(--color-red)": "#ef4444",
};

const G = 800; // gravitational constant (tuned for feel)
const SOFTENING = 20; // prevents singularities
const MAX_PLANETS = 20;
const TRAIL_LENGTH = 60;
const CANVAS_HEIGHT = 600;
const OFF_SCREEN_MARGIN = 800; // remove planets this far off-screen
const DT = 1 / 60;

const SIZES = [
  { mass: 40, radius: 6 },
  { mass: 120, radius: 10 },
  { mass: 300, radius: 16 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 0;
function newId(): number {
  return nextId++;
}

function randomColor(): string {
  return PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];
}

function randomSize() {
  return SIZES[Math.floor(Math.random() * SIZES.length)];
}

function resolveColor(cssVar: string): string {
  return RESOLVED_COLORS[cssVar] ?? cssVar;
}

function radiusFromMass(mass: number): number {
  return Math.max(4, Math.cbrt(mass) * 2.2);
}

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

function createSolarSystem(cx: number, cy: number): Planet[] {
  const sun: Planet = {
    id: newId(),
    pos: { x: cx, y: cy },
    vel: { x: 0, y: 0 },
    mass: 2000,
    radius: 24,
    color: "var(--color-orange)",
    trail: [],
  };

  const planets: Planet[] = [sun];
  const orbits = [
    { dist: 100, mass: 60, color: "var(--color-cyan)" },
    { dist: 170, mass: 100, color: "var(--color-blue)" },
    { dist: 260, mass: 80, color: "var(--color-accent)" },
  ];

  for (const o of orbits) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.sqrt((G * sun.mass) / o.dist) * 0.85;
    planets.push({
      id: newId(),
      pos: { x: cx + Math.cos(angle) * o.dist, y: cy + Math.sin(angle) * o.dist },
      vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
      mass: o.mass,
      radius: radiusFromMass(o.mass),
      color: o.color,
      trail: [],
    });
  }
  return planets;
}

function createBinaryStar(cx: number, cy: number): Planet[] {
  const sep = 80;
  const mass = 1200;
  const orbitalSpeed = Math.sqrt((G * mass) / (sep * 2)) * 0.7;

  return [
    {
      id: newId(),
      pos: { x: cx - sep, y: cy },
      vel: { x: 0, y: -orbitalSpeed },
      mass,
      radius: 18,
      color: "var(--color-pink)",
      trail: [],
    },
    {
      id: newId(),
      pos: { x: cx + sep, y: cy },
      vel: { x: 0, y: orbitalSpeed },
      mass,
      radius: 18,
      color: "var(--color-purple)",
      trail: [],
    },
  ];
}

function createRandom(cx: number, cy: number): Planet[] {
  const count = 5 + Math.floor(Math.random() * 6);
  const planets: Planet[] = [];
  for (let i = 0; i < count; i++) {
    const size = randomSize();
    planets.push({
      id: newId(),
      pos: {
        x: cx + (Math.random() - 0.5) * 500,
        y: cy + (Math.random() - 0.5) * 400,
      },
      vel: {
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
      },
      mass: size.mass,
      radius: size.radius,
      color: randomColor(),
      trail: [],
    });
  }
  return planets;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrbitPage() {
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [planetCount, setPlanetCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planetsRef = useRef<Planet[]>([]);
  const pausedRef = useRef(false);
  const showTrailsRef = useRef(true);
  const animFrameRef = useRef<number>(0);

  // Mouse / touch interaction state
  const isDragging = useRef(false);
  const dragStart = useRef<Vec2>({ x: 0, y: 0 });
  const dragCurrent = useRef<Vec2>({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    showTrailsRef.current = showTrails;
  }, [showTrails]);

  // -------------------------------------------------------------------------
  // Physics
  // -------------------------------------------------------------------------

  const step = useCallback(() => {
    const planets = planetsRef.current;
    const n = planets.length;

    // Compute gravitational accelerations (N-body)
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = planets[j].pos.x - planets[i].pos.x;
        const dy = planets[j].pos.y - planets[i].pos.y;
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
        const distVal = Math.sqrt(distSq);
        const force = G / distSq;

        const fx = force * (dx / distVal);
        const fy = force * (dy / distVal);

        ax[i] += fx * planets[j].mass;
        ay[i] += fy * planets[j].mass;
        ax[j] -= fx * planets[i].mass;
        ay[j] -= fy * planets[i].mass;
      }
    }

    // Euler integration
    for (let i = 0; i < n; i++) {
      planets[i].vel.x += ax[i] * DT;
      planets[i].vel.y += ay[i] * DT;
      planets[i].pos.x += planets[i].vel.x * DT;
      planets[i].pos.y += planets[i].vel.y * DT;

      // Record trail
      planets[i].trail.push({ x: planets[i].pos.x, y: planets[i].pos.y });
      if (planets[i].trail.length > TRAIL_LENGTH) {
        planets[i].trail.shift();
      }
    }

    // Collision detection and merging
    const merged = new Set<number>();
    for (let i = 0; i < n; i++) {
      if (merged.has(i)) continue;
      for (let j = i + 1; j < n; j++) {
        if (merged.has(j)) continue;
        const d = dist(planets[i].pos, planets[j].pos);
        if (d < planets[i].radius + planets[j].radius) {
          // Merge j into i (conserve momentum)
          const totalMass = planets[i].mass + planets[j].mass;
          planets[i].vel.x =
            (planets[i].vel.x * planets[i].mass + planets[j].vel.x * planets[j].mass) / totalMass;
          planets[i].vel.y =
            (planets[i].vel.y * planets[i].mass + planets[j].vel.y * planets[j].mass) / totalMass;
          planets[i].mass = totalMass;
          planets[i].radius = radiusFromMass(totalMass);
          // Keep the color of the larger body
          if (planets[j].mass > planets[i].mass) {
            planets[i].color = planets[j].color;
          }
          merged.add(j);
        }
      }
    }

    // Remove off-screen and merged planets
    const canvas = canvasRef.current;
    if (canvas) {
      planetsRef.current = planets.filter((p, idx) => {
        if (merged.has(idx)) return false;
        if (
          p.pos.x < -OFF_SCREEN_MARGIN ||
          p.pos.x > canvas.width + OFF_SCREEN_MARGIN ||
          p.pos.y < -OFF_SCREEN_MARGIN ||
          p.pos.y > canvas.height + OFF_SCREEN_MARGIN
        ) {
          return false;
        }
        return true;
      });
    }

    setPlanetCount(planetsRef.current.length);
  }, []);

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw faint stars
    // (Static seed-based so they don't flicker)
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 7919 + 13) % canvas.width);
      const sy = ((i * 6271 + 37) % canvas.height);
      const sr = ((i * 3571) % 3) * 0.4 + 0.4;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    const planets = planetsRef.current;

    // Draw trails
    if (showTrailsRef.current) {
      for (const p of planets) {
        if (p.trail.length < 2) continue;
        const resolved = resolveColor(p.color);
        ctx.lineWidth = Math.max(1, p.radius * 0.35);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < p.trail.length; i++) {
          const alpha = (i / p.trail.length) * 0.5;
          ctx.strokeStyle = resolved + Math.round(alpha * 255).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.stroke();
        }
      }
    }

    // Draw planets
    for (const p of planets) {
      const resolved = resolveColor(p.color);

      // Glow
      const gradient = ctx.createRadialGradient(
        p.pos.x, p.pos.y, p.radius * 0.5,
        p.pos.x, p.pos.y, p.radius * 3
      );
      gradient.addColorStop(0, resolved + "40");
      gradient.addColorStop(1, resolved + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = resolved;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(
        p.pos.x - p.radius * 0.3,
        p.pos.y - p.radius * 0.3,
        p.radius * 0.35,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw velocity arrow while dragging
    if (isDragging.current) {
      const sx = dragStart.current.x;
      const sy = dragStart.current.y;
      const cx = dragCurrent.current.x;
      const cy = dragCurrent.current.y;
      const dx = cx - sx;
      const dy = cy - sy;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 5) {
        // Draw arrow from start in opposite direction (velocity = opposite of drag)
        const vx = -dx;
        const vy = -dy;

        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + vx, sy + vy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const angle = Math.atan2(vy, vx);
        const headLen = 10;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.moveTo(sx + vx, sy + vy);
        ctx.lineTo(
          sx + vx - headLen * Math.cos(angle - 0.4),
          sy + vy - headLen * Math.sin(angle - 0.4)
        );
        ctx.lineTo(
          sx + vx - headLen * Math.cos(angle + 0.4),
          sy + vy - headLen * Math.sin(angle + 0.4)
        );
        ctx.closePath();
        ctx.fill();

        // Preview planet at start position
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Game Loop
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!mounted) return;

    const loop = () => {
      if (!pausedRef.current) {
        step();
      }
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [mounted, step, render]);

  // -------------------------------------------------------------------------
  // Canvas resize
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!mounted) return;

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = CANVAS_HEIGHT;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  // -------------------------------------------------------------------------
  // Input handlers
  // -------------------------------------------------------------------------

  const getCanvasPos = useCallback((clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const pos = getCanvasPos(clientX, clientY);
      isDragging.current = true;
      dragStart.current = pos;
      dragCurrent.current = pos;
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging.current) return;
      dragCurrent.current = getCanvasPos(clientX, clientY);
    },
    [getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (planetsRef.current.length >= MAX_PLANETS) return;

    const sx = dragStart.current.x;
    const sy = dragStart.current.y;
    const cx = dragCurrent.current.x;
    const cy = dragCurrent.current.y;

    const dx = cx - sx;
    const dy = cy - sy;

    // Velocity is opposite of drag direction, scaled
    const velScale = 3;
    const size = randomSize();

    const planet: Planet = {
      id: newId(),
      pos: { x: sx, y: sy },
      vel: { x: -dx * velScale, y: -dy * velScale },
      mass: size.mass,
      radius: size.radius,
      color: randomColor(),
      trail: [],
    };

    planetsRef.current.push(planet);
    setPlanetCount(planetsRef.current.length);
  }, []);

  // Mouse events
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => handlePointerDown(e.clientX, e.clientY),
    [handlePointerDown]
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => handlePointerMove(e.clientX, e.clientY),
    [handlePointerMove]
  );
  const onMouseUp = useCallback(() => handlePointerUp(), [handlePointerUp]);

  // Touch events
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    },
    [handlePointerDown]
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    },
    [handlePointerMove]
  );
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handlePointerUp();
    },
    [handlePointerUp]
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const clearAll = useCallback(() => {
    planetsRef.current = [];
    setPlanetCount(0);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const toggleTrails = useCallback(() => {
    setShowTrails((t) => !t);
  }, []);

  const loadPreset = useCallback(
    (preset: Preset) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const cx = (canvas.width / dpr) / 2;
      const cy = (canvas.height / dpr) / 2;

      let newPlanets: Planet[];
      switch (preset) {
        case "solar":
          newPlanets = createSolarSystem(cx, cy);
          break;
        case "binary":
          newPlanets = createBinaryStar(cx, cy);
          break;
        case "random":
          newPlanets = createRandom(cx, cy);
          break;
      }

      planetsRef.current = newPlanets;
      setPlanetCount(newPlanets.length);
      setPaused(false);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <p className="pixel-text text-sm" style={{ color: "var(--color-text-muted)" }}>
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: "var(--color-bg)" }}>
      {/* Grid background */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-8 pb-4 px-4 text-center">
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
            className="pixel-text text-3xl sm:text-4xl md:text-5xl mb-2"
            style={{
              color: "var(--color-accent)",
              textShadow: `
                0 0 10px var(--color-accent-glow),
                0 0 30px var(--color-accent-glow)
              `,
            }}
          >
            ORBIT
          </h1>
          <p
            className="pixel-text text-[10px] sm:text-xs mb-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            N-BODY GRAVITY SIMULATOR
          </p>
          <div className="mt-2"><GamePlayCounter slug="orbit" onPlay /></div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto px-4 pb-8">
          {/* Info bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p
              className="pixel-text text-[10px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              CLICK TO PLACE, DRAG FOR VELOCITY
            </p>
            <p
              className="pixel-text text-[10px]"
              style={{ color: "var(--color-accent)" }}
            >
              BODIES: {planetCount}
              {planetCount >= MAX_PLANETS && (
                <span style={{ color: "var(--color-red)" }}> (MAX)</span>
              )}
            </p>
          </div>

          {/* Canvas */}
          <div
            className="border-2 relative overflow-hidden"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "2px",
            }}
          >
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair"
              style={{ touchAction: "none" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />

            {/* Pause overlay */}
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span
                  className="pixel-text text-2xl animate-flicker"
                  style={{ color: "var(--color-accent)" }}
                >
                  PAUSED
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={clearAll}
              className="pixel-btn text-[10px] px-3 py-2"
            >
              CLEAR ALL
            </button>
            <button
              onClick={togglePause}
              className="pixel-btn text-[10px] px-3 py-2"
            >
              {paused ? "RESUME" : "PAUSE"}
            </button>
            <button
              onClick={toggleTrails}
              className="pixel-btn text-[10px] px-3 py-2"
              style={
                !showTrails
                  ? {
                      borderColor: "var(--color-text-muted)",
                      color: "var(--color-text-muted)",
                    }
                  : undefined
              }
            >
              TRAILS {showTrails ? "ON" : "OFF"}
            </button>

            <div
              className="w-px mx-1 self-stretch"
              style={{ background: "var(--color-border)" }}
            />

            <button
              onClick={() => loadPreset("solar")}
              className="pixel-btn text-[10px] px-3 py-2"
              style={{
                borderColor: "var(--color-orange)",
                color: "var(--color-orange)",
              }}
            >
              SOLAR SYSTEM
            </button>
            <button
              onClick={() => loadPreset("binary")}
              className="pixel-btn text-[10px] px-3 py-2"
              style={{
                borderColor: "var(--color-pink)",
                color: "var(--color-pink)",
              }}
            >
              BINARY STAR
            </button>
            <button
              onClick={() => loadPreset("random")}
              className="pixel-btn text-[10px] px-3 py-2"
              style={{
                borderColor: "var(--color-purple)",
                color: "var(--color-purple)",
              }}
            >
              RANDOM
            </button>
          </div>

          {/* Legend */}
          <div
            className="mt-6 p-4 border-2"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg-card)",
            }}
          >
            <h3
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              HOW IT WORKS
            </h3>
            <ul
              className="space-y-1 text-xs"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              <li>
                Click anywhere to place a planet with random mass.
              </li>
              <li>
                Click and drag to set an initial velocity (arrow shows direction).
              </li>
              <li>
                Planets attract each other with real gravitational force (F = Gm1m2/r2).
              </li>
              <li>
                Overlapping planets merge, conserving momentum.
              </li>
              <li>
                Planets that fly far off-screen are removed. Max {MAX_PLANETS} bodies.
              </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
