'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import GamePlayCounter from '@/components/GamePlayCounter';

// --- Types ---

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker';
type CanvasSize = 8 | 16 | 32;

interface GalleryItem {
  id: string;
  grid: (string | null)[][];
  size: CanvasSize;
  thumbnail: string;
  createdAt: number;
}

// --- Constants ---

const PALETTE: string[] = [
  '#000000', '#1D2B53', '#7E2553', '#008751',
  '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
  '#FF004D', '#FFA300', '#FFEC27', '#00E436',
  '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
];

const MAX_UNDO = 20;
const MAX_GALLERY = 5;
const STORAGE_KEY = 'pixel-painter-gallery';

// --- Helpers ---

function createEmptyGrid(size: CanvasSize): (string | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map(row => [...row]);
}

function floodFill(
  grid: (string | null)[][],
  startRow: number,
  startCol: number,
  fillColor: string | null
): (string | null)[][] {
  const size = grid.length;
  const targetColor = grid[startRow][startCol];

  if (targetColor === fillColor) return grid;

  const newGrid = cloneGrid(grid);
  const queue: [number, number][] = [[startRow, startCol]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    if (r < 0 || r >= size || c < 0 || c >= size) continue;
    if (newGrid[r][c] !== targetColor) continue;

    visited.add(key);
    newGrid[r][c] = fillColor;

    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return newGrid;
}

function gridToDataURL(grid: (string | null)[][], pixelScale: number): string {
  const size = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = size * pixelScale;
  canvas.height = size * pixelScale;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        ctx.fillStyle = grid[r][c]!;
        ctx.fillRect(c * pixelScale, r * pixelScale, pixelScale, pixelScale);
      }
    }
  }

  return canvas.toDataURL('image/png');
}

// --- Component ---

export default function PixelPainterPage() {
  const [mounted, setMounted] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(16);
  const [grid, setGrid] = useState<(string | null)[][]>(() => createEmptyGrid(16));
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [showGrid, setShowGrid] = useState(true);
  const [undoStack, setUndoStack] = useState<(string | null)[][][]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isPainting, setIsPainting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);

  // --- Mount & Load Gallery ---

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setGallery(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // --- Save gallery to localStorage ---

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
    } catch {
      // Storage full or unavailable
    }
  }, [gallery, mounted]);

  // --- Sync painting ref ---

  useEffect(() => {
    paintingRef.current = isPainting;
  }, [isPainting]);

  // --- Push undo ---

  const pushUndo = useCallback((currentGrid: (string | null)[][]) => {
    setUndoStack(prev => {
      const next = [...prev, cloneGrid(currentGrid)];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });
  }, []);

  // --- Tool actions ---

  const applyTool = useCallback((row: number, col: number, currentGrid: (string | null)[][]) => {
    switch (tool) {
      case 'pencil': {
        const newGrid = cloneGrid(currentGrid);
        newGrid[row][col] = selectedColor;
        return newGrid;
      }
      case 'eraser': {
        const newGrid = cloneGrid(currentGrid);
        newGrid[row][col] = null;
        return newGrid;
      }
      case 'fill': {
        return floodFill(currentGrid, row, col, selectedColor);
      }
      case 'picker': {
        const pickedColor = currentGrid[row][col];
        if (pickedColor) {
          setSelectedColor(pickedColor);
        }
        setTool('pencil');
        return currentGrid;
      }
      default:
        return currentGrid;
    }
  }, [tool, selectedColor]);

  // --- Pixel interaction handlers ---

  const handlePixelDown = useCallback((row: number, col: number) => {
    if (tool === 'fill' || tool === 'picker') {
      pushUndo(grid);
      const newGrid = applyTool(row, col, grid);
      setGrid(newGrid);
      return;
    }
    pushUndo(grid);
    setIsPainting(true);
    const newGrid = applyTool(row, col, grid);
    setGrid(newGrid);
  }, [grid, tool, applyTool, pushUndo]);

  const handlePixelEnter = useCallback((row: number, col: number) => {
    if (!paintingRef.current) return;
    if (tool !== 'pencil' && tool !== 'eraser') return;
    setGrid(prev => {
      const newGrid = cloneGrid(prev);
      newGrid[row][col] = tool === 'pencil' ? selectedColor : null;
      return newGrid;
    });
  }, [tool, selectedColor]);

  // --- Global mouse/touch up ---

  useEffect(() => {
    const handleUp = () => {
      setIsPainting(false);
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, []);

  // --- Touch move handler for drag-painting ---

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!paintingRef.current) return;
      if (tool !== 'pencil' && tool !== 'eraser') return;
      e.preventDefault();

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!element) return;

      const row = element.getAttribute('data-row');
      const col = element.getAttribute('data-col');
      if (row === null || col === null) return;

      const r = parseInt(row);
      const c = parseInt(col);

      setGrid(prev => {
        const newGrid = cloneGrid(prev);
        newGrid[r][c] = tool === 'pencil' ? selectedColor : null;
        return newGrid;
      });
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [tool, selectedColor]);

  // --- Actions ---

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setGrid(prev);
  };

  const handleClear = () => {
    pushUndo(grid);
    setGrid(createEmptyGrid(canvasSize));
  };

  const handleSizeChange = (newSize: CanvasSize) => {
    if (newSize === canvasSize) return;
    pushUndo(grid);
    setCanvasSize(newSize);
    setGrid(createEmptyGrid(newSize));
    setUndoStack([]);
  };

  const handleExport = () => {
    const dataURL = gridToDataURL(grid, canvasSize <= 16 ? 32 : 16);
    const link = document.createElement('a');
    link.download = `pixel-art-${canvasSize}x${canvasSize}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleSaveToGallery = () => {
    const thumbnail = gridToDataURL(grid, 8);
    const item: GalleryItem = {
      id: `art-${Date.now()}`,
      grid: cloneGrid(grid),
      size: canvasSize,
      thumbnail,
      createdAt: Date.now(),
    };
    setGallery(prev => {
      const next = [item, ...prev];
      if (next.length > MAX_GALLERY) next.pop();
      return next;
    });
  };

  const handleLoadFromGallery = (item: GalleryItem) => {
    pushUndo(grid);
    setCanvasSize(item.size);
    setGrid(cloneGrid(item.grid));
    setUndoStack([]);
  };

  const handleDeleteFromGallery = (id: string) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  };

  // --- Tool definitions ---

  const tools: { id: Tool; label: string; icon: string; title: string }[] = [
    { id: 'pencil', label: 'Draw', icon: 'P', title: 'Pencil - Draw pixels' },
    { id: 'eraser', label: 'Erase', icon: 'E', title: 'Eraser - Clear pixels' },
    { id: 'fill', label: 'Fill', icon: 'F', title: 'Fill Bucket - Flood fill area' },
    { id: 'picker', label: 'Pick', icon: '?', title: 'Eyedropper - Pick color from canvas' },
  ];

  const sizes: CanvasSize[] = [8, 16, 32];

  // --- Compute cell size ---

  const maxCanvasPx = typeof window !== 'undefined'
    ? Math.min(window.innerWidth - 32, 512)
    : 512;
  const cellSize = Math.floor(maxCanvasPx / canvasSize);

  // --- Render ---

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p className="pixel-text" style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/games"
          className="inline-block mb-6 pixel-text transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.65rem',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          &lt;- Back to Games
        </Link>

        {/* Title */}
        <div className="text-center mb-6">
          <h1
            className="pixel-text text-lg md:text-2xl mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Pixel Painter
          </h1>
          <div className="mb-2"><GamePlayCounter slug="pixel-painter" onPlay /></div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Create pixel art. Click and drag to paint.
          </p>
        </div>

        {/* Toolbar */}
        <div
          className="pixel-border rounded-none p-3 mb-4 flex flex-wrap items-center gap-2"
          style={{ background: 'var(--color-bg-card)' }}
        >
          {/* Tools */}
          <div className="flex gap-1">
            {tools.map(t => (
              <button
                key={t.id}
                title={t.title}
                onClick={() => setTool(t.id)}
                className="pixel-text transition-all"
                style={{
                  width: '36px',
                  height: '36px',
                  fontSize: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: tool === t.id ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                  background: tool === t.id ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                  color: tool === t.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  imageRendering: 'pixelated' as const,
                }}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div
            className="hidden sm:block"
            style={{
              width: '1px',
              height: '28px',
              background: 'var(--color-border)',
              margin: '0 4px',
            }}
          />

          {/* Undo */}
          <button
            title="Undo"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="pixel-text transition-all"
            style={{
              width: '36px',
              height: '36px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              color: undoStack.length === 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              opacity: undoStack.length === 0 ? 0.4 : 1,
            }}
          >
            &#8634;
          </button>

          {/* Clear */}
          <button
            title="Clear canvas"
            onClick={handleClear}
            className="pixel-text transition-all"
            style={{
              width: '36px',
              height: '36px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-red)',
              cursor: 'pointer',
            }}
          >
            &#10005;
          </button>

          {/* Grid toggle */}
          <button
            title={showGrid ? 'Hide grid lines' : 'Show grid lines'}
            onClick={() => setShowGrid(prev => !prev)}
            className="pixel-text transition-all"
            style={{
              width: '36px',
              height: '36px',
              fontSize: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: showGrid ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
              background: showGrid ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
              color: showGrid ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            #
          </button>

          {/* Current color indicator */}
          <div
            className="ml-auto flex items-center gap-2"
          >
            <span
              className="pixel-text"
              style={{ fontSize: '0.5rem', color: 'var(--color-text-muted)' }}
            >
              COLOR
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                background: selectedColor,
                border: '2px solid var(--color-border)',
                imageRendering: 'pixelated' as const,
              }}
            />
          </div>
        </div>

        {/* Color Palette */}
        <div
          className="pixel-border rounded-none p-3 mb-4"
          style={{ background: 'var(--color-bg-card)' }}
        >
          <div className="flex flex-wrap gap-1 justify-center">
            {PALETTE.map(color => (
              <button
                key={color}
                title={color}
                onClick={() => {
                  setSelectedColor(color);
                  if (tool === 'eraser') setTool('pencil');
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  background: color,
                  border: selectedColor === color
                    ? '3px solid var(--color-accent)'
                    : '2px solid var(--color-border)',
                  cursor: 'pointer',
                  boxShadow: selectedColor === color
                    ? '0 0 8px var(--color-accent-glow)'
                    : 'none',
                  transition: 'border 0.1s, box-shadow 0.1s',
                  imageRendering: 'pixelated' as const,
                }}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="pixel-border rounded-none mb-4 flex items-center justify-center overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            padding: '8px',
          }}
        >
          <div
            ref={canvasRef}
            className="select-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${canvasSize}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${canvasSize}, ${cellSize}px)`,
              gap: showGrid ? '1px' : '0px',
              background: showGrid ? 'var(--color-border)' : 'transparent',
              imageRendering: 'pixelated' as const,
              touchAction: 'none',
              cursor: tool === 'picker'
                ? 'crosshair'
                : tool === 'fill'
                  ? 'cell'
                  : 'pointer',
            }}
            onMouseLeave={() => setIsPainting(false)}
          >
            {grid.map((row, r) =>
              row.map((color, c) => (
                <div
                  key={`${r}-${c}`}
                  data-row={r}
                  data-col={c}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePixelDown(r, c);
                  }}
                  onMouseEnter={() => handlePixelEnter(r, c)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handlePixelDown(r, c);
                  }}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    background: color || 'var(--color-bg-card)',
                    transition: 'background 0.05s',
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Size selector & actions */}
        <div
          className="pixel-border rounded-none p-3 mb-4 flex flex-wrap items-center gap-2 justify-between"
          style={{ background: 'var(--color-bg-card)' }}
        >
          {/* Size buttons */}
          <div className="flex items-center gap-2">
            <span
              className="pixel-text"
              style={{ fontSize: '0.5rem', color: 'var(--color-text-muted)' }}
            >
              SIZE
            </span>
            {sizes.map(s => (
              <button
                key={s}
                onClick={() => handleSizeChange(s)}
                className="pixel-text transition-all"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.55rem',
                  border: canvasSize === s ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                  background: canvasSize === s ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                  color: canvasSize === s ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {s}x{s}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToGallery}
              className="pixel-text transition-all"
              style={{
                padding: '6px 12px',
                fontSize: '0.55rem',
                border: '2px solid var(--color-accent)',
                background: 'transparent',
                color: 'var(--color-accent)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-accent)';
                e.currentTarget.style.color = 'var(--color-bg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
            >
              SAVE
            </button>
            <button
              onClick={handleExport}
              className="pixel-text transition-all"
              style={{
                padding: '6px 12px',
                fontSize: '0.55rem',
                border: '2px solid var(--color-purple)',
                background: 'transparent',
                color: 'var(--color-purple)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-purple)';
                e.currentTarget.style.color = 'var(--color-bg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-purple)';
              }}
            >
              DOWNLOAD PNG
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div
          className="pixel-border rounded-none p-4"
          style={{ background: 'var(--color-bg-card)' }}
        >
          <h2
            className="pixel-text mb-3"
            style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}
          >
            Gallery ({gallery.length}/{MAX_GALLERY})
          </h2>

          {gallery.length === 0 ? (
            <p
              className="text-sm text-center py-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No saved artworks yet. Click SAVE to add your creation.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {gallery.map(item => (
                <div
                  key={item.id}
                  className="relative group"
                  style={{
                    border: '2px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                    padding: '4px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt="Saved pixel art"
                    onClick={() => handleLoadFromGallery(item)}
                    style={{
                      width: '64px',
                      height: '64px',
                      imageRendering: 'pixelated',
                      display: 'block',
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFromGallery(item.id);
                    }}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      width: '18px',
                      height: '18px',
                      fontSize: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-red)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                    title="Delete"
                  >
                    x
                  </button>
                  <div
                    className="pixel-text text-center mt-1"
                    style={{
                      fontSize: '0.4rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {item.size}x{item.size}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 text-center">
          <p
            className="pixel-text"
            style={{ fontSize: '0.45rem', color: 'var(--color-text-muted)' }}
          >
            TIP: Click and drag to paint continuously
          </p>
        </div>
      </div>
    </div>
  );
}
