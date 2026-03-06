'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

interface ShapeResult {
  shapeName: string;
  score: number;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'star';
type GamePhase = 'drawing' | 'scored' | 'finished';

interface ShapeConfig {
  type: ShapeType;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHAPES: ShapeConfig[] = [
  { type: 'circle', label: 'Circle' },
  { type: 'square', label: 'Square' },
  { type: 'triangle', label: 'Triangle' },
  { type: 'star', label: 'Star' },
];

const RATING_THRESHOLDS: { min: number; label: string; color: string }[] = [
  { min: 95, label: 'PERFECT!', color: '#00ff88' },
  { min: 80, label: 'GREAT!', color: '#3b82f6' },
  { min: 60, label: 'GOOD', color: '#D99C64' },
  { min: 40, label: 'MEH', color: '#f59e0b' },
  { min: 0, label: 'YIKES', color: '#ef4444' },
];

const STORAGE_KEY = 'perfect-shape-best';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function centroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function samplePointsEvenly(points: Point[], count: number): Point[] {
  if (points.length <= count) return [...points];
  const totalLen = pathLength(points);
  const step = totalLen / count;
  const sampled: Point[] = [points[0]];
  let accumulated = 0;
  let nextTarget = step;
  for (let i = 1; i < points.length && sampled.length < count; i++) {
    const segLen = dist(points[i - 1], points[i]);
    accumulated += segLen;
    while (accumulated >= nextTarget && sampled.length < count) {
      const overshoot = accumulated - nextTarget;
      const ratio = 1 - overshoot / segLen;
      sampled.push({
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio,
      });
      nextTarget += step;
    }
  }
  return sampled;
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i]);
  }
  return len;
}

function angleBetween(a: Point, vertex: Point, b: Point): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.abs(Math.atan2(cross, dot));
}

// ---------------------------------------------------------------------------
// Guide-shape generators (return points on the ideal shape)
// ---------------------------------------------------------------------------

function idealCirclePoints(cx: number, cy: number, r: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function idealSquarePoints(cx: number, cy: number, size: number): Point[] {
  const h = size / 2;
  return [
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h },
  ];
}

function idealTrianglePoints(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = (2 * Math.PI * i) / 3 - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function idealStarPoints(cx: number, cy: number, outerR: number, innerR: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * i) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Draw guide on canvas
// ---------------------------------------------------------------------------

function drawGuide(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = 'rgba(136,136,160,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const r = size * 0.4;

  switch (shape) {
    case 'circle': {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    }
    case 'square': {
      const pts = idealSquarePoints(cx, cy, r * 2);
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      break;
    }
    case 'triangle': {
      const pts = idealTrianglePoints(cx, cy, r);
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      break;
    }
    case 'star': {
      const pts = idealStarPoints(cx, cy, r, r * 0.4);
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      break;
    }
  }

  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

function scoreCircle(drawn: Point[], canvasSize: number): number {
  if (drawn.length < 10) return 0;
  const c = centroid(drawn);
  const distances = drawn.map((p) => dist(p, c));
  const avgR = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgR < canvasSize * 0.05) return 0; // too small

  const sampled = samplePointsEvenly(drawn, 72);
  const sampledDists = sampled.map((p) => dist(p, c));
  const deviations = sampledDists.map((d) => Math.abs(d - avgR) / avgR);
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Also check that the path is reasonably closed
  const closedGap = dist(drawn[0], drawn[drawn.length - 1]) / avgR;
  const closedPenalty = Math.min(closedGap * 10, 30);

  const raw = Math.max(0, 100 - avgDeviation * 200 - closedPenalty);
  return Math.round(clamp(raw, 0, 100));
}

function scoreSquare(drawn: Point[], canvasSize: number): number {
  if (drawn.length < 10) return 0;
  const c = centroid(drawn);
  const avgDist = drawn.reduce((a, p) => a + dist(p, c), 0) / drawn.length;
  if (avgDist < canvasSize * 0.05) return 0;

  // Find 4 corners: the points farthest from centroid with angular separation
  const corners = findCorners(drawn, 4);
  if (corners.length < 4) return Math.max(0, 20);

  // Sort corners by angle from centroid
  const sorted = sortByAngle(corners, c);

  // Check side lengths equality
  const sides: number[] = [];
  for (let i = 0; i < 4; i++) {
    sides.push(dist(sorted[i], sorted[(i + 1) % 4]));
  }
  const avgSide = sides.reduce((a, b) => a + b, 0) / 4;
  const sideDev = sides.map((s) => Math.abs(s - avgSide) / avgSide);
  const sideScore = Math.max(0, 100 - sideDev.reduce((a, b) => a + b, 0) * 100);

  // Check angles (should be ~90 degrees)
  const angles: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = sorted[(i + 3) % 4];
    const vertex = sorted[i];
    const b = sorted[(i + 1) % 4];
    angles.push(angleBetween(a, vertex, b));
  }
  const idealAngle = Math.PI / 2;
  const angleDev = angles.map((a) => Math.abs(a - idealAngle) / idealAngle);
  const angleScore = Math.max(0, 100 - angleDev.reduce((a, b) => a + b, 0) * 80);

  // Check straightness of sides
  const straightScore = scoreStraightness(drawn, sorted, 4);

  const raw = sideScore * 0.3 + angleScore * 0.35 + straightScore * 0.35;
  return Math.round(clamp(raw, 0, 100));
}

function scoreTriangle(drawn: Point[], canvasSize: number): number {
  if (drawn.length < 10) return 0;
  const c = centroid(drawn);
  const avgDist = drawn.reduce((a, p) => a + dist(p, c), 0) / drawn.length;
  if (avgDist < canvasSize * 0.05) return 0;

  const corners = findCorners(drawn, 3);
  if (corners.length < 3) return Math.max(0, 15);

  const sorted = sortByAngle(corners, c);

  // Side lengths
  const sides: number[] = [];
  for (let i = 0; i < 3; i++) {
    sides.push(dist(sorted[i], sorted[(i + 1) % 3]));
  }
  const avgSide = sides.reduce((a, b) => a + b, 0) / 3;
  const sideDev = sides.map((s) => Math.abs(s - avgSide) / avgSide);
  const sideScore = Math.max(0, 100 - sideDev.reduce((a, b) => a + b, 0) * 100);

  // Angles (equilateral = 60 degrees each)
  const angles: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = sorted[(i + 2) % 3];
    const vertex = sorted[i];
    const b = sorted[(i + 1) % 3];
    angles.push(angleBetween(a, vertex, b));
  }
  const idealAngle = Math.PI / 3;
  const angleDev = angles.map((a) => Math.abs(a - idealAngle) / idealAngle);
  const angleScore = Math.max(0, 100 - angleDev.reduce((a, b) => a + b, 0) * 80);

  const straightScore = scoreStraightness(drawn, sorted, 3);

  const raw = sideScore * 0.3 + angleScore * 0.35 + straightScore * 0.35;
  return Math.round(clamp(raw, 0, 100));
}

function scoreStar(drawn: Point[], canvasSize: number): number {
  if (drawn.length < 15) return 0;
  const c = centroid(drawn);
  const distances = drawn.map((p) => dist(p, c));
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgDist < canvasSize * 0.05) return 0;

  // Find 10 alternating peaks and valleys by distance from centroid
  // Group drawn points into angular bins (10 bins of 36 degrees each)
  const bins: Point[][] = Array.from({ length: 10 }, () => []);
  for (const p of drawn) {
    let angle = Math.atan2(p.y - c.y, p.x - c.x) + Math.PI / 2; // offset so top = 0
    if (angle < 0) angle += Math.PI * 2;
    const bin = Math.floor((angle / (Math.PI * 2)) * 10) % 10;
    bins[bin].push(p);
  }

  // Check that most bins have points (coverage)
  const filledBins = bins.filter((b) => b.length > 0).length;
  const coverageScore = (filledBins / 10) * 100;

  // For each bin, find the point farthest from center (peak) or closest (valley)
  // Even bins (0,2,4,6,8) should be peaks, odd bins (1,3,5,7,9) should be valleys
  const peakDists: number[] = [];
  const valleyDists: number[] = [];
  for (let i = 0; i < 10; i++) {
    if (bins[i].length === 0) continue;
    const dists = bins[i].map((p) => dist(p, c));
    if (i % 2 === 0) {
      peakDists.push(Math.max(...dists));
    } else {
      valleyDists.push(Math.min(...dists));
    }
  }

  // Peaks should be roughly equal, valleys should be roughly equal
  let uniformityScore = 100;
  if (peakDists.length >= 3) {
    const avgPeak = peakDists.reduce((a, b) => a + b, 0) / peakDists.length;
    const peakDev = peakDists.map((d) => Math.abs(d - avgPeak) / avgPeak);
    uniformityScore = Math.max(0, 100 - peakDev.reduce((a, b) => a + b, 0) * 60);
  } else {
    uniformityScore = 30;
  }

  // Valleys should be noticeably closer to center than peaks
  let ratioScore = 50;
  if (peakDists.length >= 3 && valleyDists.length >= 3) {
    const avgPeak = peakDists.reduce((a, b) => a + b, 0) / peakDists.length;
    const avgValley = valleyDists.reduce((a, b) => a + b, 0) / valleyDists.length;
    const ratio = avgValley / avgPeak;
    // Ideal ratio for a 5-pointed star is about 0.38
    const ratioDiff = Math.abs(ratio - 0.38);
    ratioScore = Math.max(0, 100 - ratioDiff * 200);
  }

  // Check that the path is reasonably closed
  const closedGap = dist(drawn[0], drawn[drawn.length - 1]) / avgDist;
  const closedPenalty = Math.min(closedGap * 8, 20);

  const raw = coverageScore * 0.25 + uniformityScore * 0.35 + ratioScore * 0.25 + (100 - closedPenalty) * 0.15;
  return Math.round(clamp(raw, 0, 100));
}

// ---------------------------------------------------------------------------
// Scoring utilities
// ---------------------------------------------------------------------------

function findCorners(points: Point[], numCorners: number): Point[] {
  // Use a simple approach: find points with the sharpest angle changes
  if (points.length < numCorners * 3) return points.slice(0, numCorners);

  const sampled = samplePointsEvenly(points, 100);
  const sharpness: { idx: number; angle: number }[] = [];
  const windowSize = 5;

  for (let i = windowSize; i < sampled.length - windowSize; i++) {
    const before = sampled[i - windowSize];
    const at = sampled[i];
    const after = sampled[i + windowSize];
    const angle = angleBetween(before, at, after);
    sharpness.push({ idx: i, angle });
  }

  // Sort by angle (smallest angle = sharpest corner)
  sharpness.sort((a, b) => a.angle - b.angle);

  // Pick corners that are angularly separated
  const corners: Point[] = [];
  const usedIndices: number[] = [];
  const minSep = Math.floor(sampled.length / (numCorners * 2));

  for (const s of sharpness) {
    if (corners.length >= numCorners) break;
    if (usedIndices.some((ui) => Math.abs(ui - s.idx) < minSep)) continue;
    corners.push(sampled[s.idx]);
    usedIndices.push(s.idx);
  }

  return corners;
}

function sortByAngle(points: Point[], center: Point): Point[] {
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
}

function scoreStraightness(drawn: Point[], corners: Point[], numSides: number): number {
  // For each side, measure how closely drawn points between corners follow a straight line
  const c = centroid(corners);
  const sorted = sortByAngle(corners, c);
  let totalScore = 0;

  for (let i = 0; i < numSides; i++) {
    const start = sorted[i];
    const end = sorted[(i + 1) % numSides];

    // Find drawn points near this side
    const sideLen = dist(start, end);
    if (sideLen < 1) continue;

    const nearPoints = drawn.filter((p) => {
      const d1 = dist(p, start);
      const d2 = dist(p, end);
      return d1 < sideLen * 1.2 && d2 < sideLen * 1.2;
    });

    if (nearPoints.length < 3) {
      totalScore += 50;
      continue;
    }

    // Distance from each point to the line segment
    const deviations = nearPoints.map((p) => pointToLineDist(p, start, end) / sideLen);
    const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    totalScore += Math.max(0, 100 - avgDev * 400);
  }

  return totalScore / numSides;
}

function pointToLineDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getRating(score: number): { label: string; color: string } {
  for (const t of RATING_THRESHOLDS) {
    if (score >= t.min) return { label: t.label, color: t.color };
  }
  return RATING_THRESHOLDS[RATING_THRESHOLDS.length - 1];
}

function scoreShape(type: ShapeType, drawn: Point[], canvasSize: number): number {
  switch (type) {
    case 'circle':
      return scoreCircle(drawn, canvasSize);
    case 'square':
      return scoreSquare(drawn, canvasSize);
    case 'triangle':
      return scoreTriangle(drawn, canvasSize);
    case 'star':
      return scoreStar(drawn, canvasSize);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PerfectShapePage() {
  const [mounted, setMounted] = useState(false);
  const [shapeIndex, setShapeIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('drawing');
  const [results, setResults] = useState<ShapeResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [bestTotal, setBestTotal] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnPoints = useRef<Point[]>([]);
  const canvasSizeRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setBestTotal(parseInt(stored, 10));
  }, []);

  // Canvas setup and resize
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, 500);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvasSizeRef.current = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    redrawCanvas(ctx, size);
  }, [shapeIndex, phase]);

  const redrawCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(0, 0, size, size);

      // Guide
      const cx = size / 2;
      const cy = size / 2;
      drawGuide(ctx, SHAPES[shapeIndex].type, cx, cy, size);

      // Drawn path
      const pts = drawnPoints.current;
      if (pts.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    },
    [shapeIndex]
  );

  useEffect(() => {
    if (!mounted) return;
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [mounted, setupCanvas]);

  // Score animation
  useEffect(() => {
    if (phase !== 'scored') return;
    let frame: number;
    const target = currentScore;
    let current = 0;
    const step = () => {
      current += Math.max(1, Math.ceil((target - current) * 0.12));
      if (current >= target) {
        setAnimatedScore(target);
        return;
      }
      setAnimatedScore(current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, currentScore]);

  // Input helpers
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'drawing') return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    drawnPoints.current = [point];
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || phase !== 'drawing') return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    drawnPoints.current.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawCanvas(ctx, canvasSizeRef.current);
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (!isDrawing || phase !== 'drawing') return;
    setIsDrawing(false);

    const pts = drawnPoints.current;
    if (pts.length < 10) return; // too short, ignore

    const score = scoreShape(SHAPES[shapeIndex].type, pts, canvasSizeRef.current);
    setCurrentScore(score);
    setPhase('scored');
  };

  const handleNextShape = () => {
    const newResults = [...results, { shapeName: SHAPES[shapeIndex].label, score: currentScore }];
    setResults(newResults);

    if (shapeIndex >= SHAPES.length - 1) {
      // All shapes done
      const total = Math.round(newResults.reduce((a, r) => a + r.score, 0) / newResults.length);
      if (bestTotal === null || total > bestTotal) {
        setBestTotal(total);
        localStorage.setItem(STORAGE_KEY, String(total));
      }
      setPhase('finished');
    } else {
      setShapeIndex(shapeIndex + 1);
      drawnPoints.current = [];
      setPhase('drawing');
      setCurrentScore(0);
      setAnimatedScore(0);
    }
  };

  const handleRestart = () => {
    setShapeIndex(0);
    setResults([]);
    setCurrentScore(0);
    setAnimatedScore(0);
    drawnPoints.current = [];
    setPhase('drawing');
  };

  const handleRetry = () => {
    drawnPoints.current = [];
    setCurrentScore(0);
    setAnimatedScore(0);
    setPhase('drawing');
    // Force canvas redraw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redrawCanvas(ctx, canvasSizeRef.current);
        ctx.restore();
      }
    }
  };

  if (!mounted) return null;

  const currentShape = SHAPES[shapeIndex];
  const rating = getRating(phase === 'scored' ? currentScore : 0);

  // Final results screen
  if (phase === 'finished') {
    const allResults = [...results];
    const total = Math.round(allResults.reduce((a, r) => a + r.score, 0) / allResults.length);
    const totalRating = getRating(total);

    return (
      <div className="min-h-screen p-5 md:p-10" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-lg mx-auto">
          <Link
            href="/games"
            className="inline-block mb-6 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          <div className="text-center mb-8 animate-fade-in-up">
            <h1
              className="pixel-text text-2xl md:text-3xl mb-4"
              style={{ color: 'var(--color-text)' }}
            >
              Results
            </h1>
            <div
              className="text-7xl md:text-8xl font-bold pixel-text mb-2"
              style={{ color: totalRating.color }}
            >
              {total}%
            </div>
            <div
              className="pixel-text text-lg mb-6"
              style={{ color: totalRating.color }}
            >
              {totalRating.label}
            </div>
            {bestTotal !== null && (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Personal Best: {bestTotal}%
              </p>
            )}
          </div>

          <div
            className="pixel-border rounded-lg p-6 mb-8"
            style={{ background: 'var(--color-bg-card)' }}
          >
            {allResults.map((r, i) => {
              const rr = getRating(r.score);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom:
                      i < allResults.length - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                  }}
                >
                  <span style={{ color: 'var(--color-text)' }}>{r.shapeName}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className="pixel-text text-sm"
                      style={{ color: rr.color }}
                    >
                      {r.score}%
                    </span>
                    <span className="text-xs" style={{ color: rr.color }}>
                      {rr.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={handleRestart} className="pixel-btn">
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 md:p-10" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto">
        <Link
          href="/games"
          className="inline-block mb-6 transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &larr; Back to Games
        </Link>

        {/* Title */}
        <h1
          className="pixel-text text-center text-lg md:text-xl mb-6"
          style={{ color: 'var(--color-text)' }}
        >
          Draw a Perfect {currentShape.label}
        </h1>

        {/* Progress dots */}
        <div className="flex justify-center gap-3 mb-6">
          {SHAPES.map((s, i) => {
            const done = i < shapeIndex || (i === shapeIndex && phase === 'scored');
            const active = i === shapeIndex;
            return (
              <div
                key={s.type}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  background: done
                    ? 'var(--color-accent)'
                    : active
                    ? 'var(--color-accent-secondary)'
                    : 'var(--color-border)',
                  boxShadow: active ? '0 0 8px var(--color-accent-glow)' : 'none',
                  transform: active ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex justify-center mb-6"
        >
          <div className="pixel-border rounded-lg overflow-hidden" style={{ lineHeight: 0 }}>
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair touch-none"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              onTouchCancel={handlePointerUp}
            />
          </div>
        </div>

        {/* Score display */}
        {phase === 'scored' && (
          <div className="text-center animate-fade-in-up mb-6">
            <div
              className="text-6xl md:text-7xl font-bold pixel-text mb-2"
              style={{ color: rating.color }}
            >
              {animatedScore}%
            </div>
            <div className="pixel-text text-sm mb-4" style={{ color: rating.color }}>
              {rating.label}
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={handleRetry} className="pixel-btn">
                Retry
              </button>
              <button onClick={handleNextShape} className="pixel-btn">
                {shapeIndex >= SHAPES.length - 1 ? 'See Results' : 'Next Shape'}
              </button>
            </div>
          </div>
        )}

        {/* Drawing hint */}
        {phase === 'drawing' && !isDrawing && drawnPoints.current.length === 0 && (
          <p
            className="text-center text-sm animate-flicker"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Draw on the canvas above. Follow the dotted guide.
          </p>
        )}

        {/* Best score */}
        {bestTotal !== null && phase === 'drawing' && (
          <p
            className="text-center text-xs mt-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Personal Best: {bestTotal}%
          </p>
        )}
      </div>
    </div>
  );
}
