'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

type GamePhase = 'ready' | 'waiting' | 'draw' | 'result' | 'cheated';

interface GameResult {
  reactionTime: number;
  rating: string;
  ratingEmoji: string;
}

function getRating(ms: number): { rating: string; ratingEmoji: string } {
  if (ms < 200) return { rating: 'LEGENDARY GUNSLINGER!', ratingEmoji: '🏆' };
  if (ms <= 300) return { rating: 'QUICK DRAW!', ratingEmoji: '⚡' };
  if (ms <= 500) return { rating: 'NOT BAD, PARTNER', ratingEmoji: '🤠' };
  return { rating: 'SLOWPOKE...', ratingEmoji: '🐢' };
}

export default function ReflexDuelPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [result, setResult] = useState<GameResult | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  const drawTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('reflex-duel-best');
    if (stored) {
      setPersonalBest(parseInt(stored, 10));
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startDuel = useCallback(() => {
    setPhase('waiting');
    setResult(null);

    const delay = 1000 + Math.random() * 4000; // 1-5 seconds
    timeoutRef.current = setTimeout(() => {
      drawTimeRef.current = Date.now();
      setPhase('draw');
    }, delay);
  }, []);

  const handleScreenClick = useCallback(() => {
    if (phase === 'ready') {
      startDuel();
      return;
    }

    if (phase === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPhase('cheated');
      setResult({
        reactionTime: 0,
        rating: 'DISHONORED! You drew too early!',
        ratingEmoji: '💀',
      });
      return;
    }

    if (phase === 'draw') {
      const reactionTime = Date.now() - drawTimeRef.current;
      const { rating, ratingEmoji } = getRating(reactionTime);

      setResult({ reactionTime, rating, ratingEmoji });
      setPhase('result');

      // Update personal best
      if (personalBest === null || reactionTime < personalBest) {
        setPersonalBest(reactionTime);
        localStorage.setItem('reflex-duel-best', reactionTime.toString());
      }
      return;
    }
  }, [phase, startDuel, personalBest]);

  const resetGame = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPhase('ready');
    setResult(null);
  }, []);

  if (!mounted) {
    return null;
  }

  // Phase-dependent styles
  const bgColor =
    phase === 'ready'
      ? 'bg-[var(--color-bg)]'
      : phase === 'waiting'
        ? 'bg-[#1a0505]'
        : phase === 'draw'
          ? 'bg-[#0a2a0a]'
          : phase === 'cheated'
            ? 'bg-[#2a0a0a]'
            : 'bg-[var(--color-bg)]';

  const borderColor =
    phase === 'draw'
      ? 'border-[#00ff88]'
      : phase === 'waiting'
        ? 'border-[#ff3333]'
        : phase === 'cheated'
          ? 'border-[#ff3333]'
          : 'border-[var(--color-border)]';

  return (
    <div
      className={`min-h-screen ${bgColor} transition-colors duration-200 flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 md:p-6 flex justify-between items-center">
        <Link
          href="/games"
          className="pixel-text text-[0.65rem] md:text-xs"
          style={{ color: 'var(--color-accent)' }}
        >
          {'<'} BACK TO GAMES
        </Link>
        {personalBest !== null && (
          <div
            className="pixel-text text-[0.55rem] md:text-[0.65rem]"
            style={{ color: 'var(--color-orange)' }}
          >
            BEST: {personalBest}ms
          </div>
        )}
      </div>

      {/* Game Area */}
      <div
        className={`flex-1 flex items-center justify-center p-4 cursor-pointer select-none`}
        onClick={
          phase === 'result' || phase === 'cheated' ? undefined : handleScreenClick
        }
      >
        <div
          className={`w-full max-w-2xl border-4 ${borderColor} transition-colors duration-200 relative`}
          style={{
            boxShadow:
              phase === 'draw'
                ? '0 0 40px rgba(0, 255, 136, 0.3), inset 0 0 40px rgba(0, 255, 136, 0.05)'
                : phase === 'waiting'
                  ? '0 0 40px rgba(255, 51, 51, 0.2), inset 0 0 40px rgba(255, 51, 51, 0.05)'
                  : '3px 3px 0 var(--color-border)',
          }}
        >
          {/* Pixel corner decorations */}
          <div
            className="absolute top-0 left-0 w-3 h-3"
            style={{ background: phase === 'draw' ? '#00ff88' : 'var(--color-accent)' }}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3"
            style={{ background: phase === 'draw' ? '#00ff88' : 'var(--color-accent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3"
            style={{ background: phase === 'draw' ? '#00ff88' : 'var(--color-accent)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3"
            style={{ background: phase === 'draw' ? '#00ff88' : 'var(--color-accent)' }}
          />

          <div className="p-8 md:p-16 text-center min-h-[60vh] flex flex-col items-center justify-center gap-6">
            {/* ===== READY PHASE ===== */}
            {phase === 'ready' && (
              <>
                {/* Cowboys Scene */}
                <div className="flex items-end justify-center gap-8 md:gap-20 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="text-5xl md:text-7xl" role="img" aria-label="cowboy">
                      🤠
                    </div>
                    <div
                      className="w-12 h-1 mt-1"
                      style={{ background: 'var(--color-border)' }}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="pixel-text text-xs md:text-sm mb-2 animate-flicker"
                      style={{ color: 'var(--color-red)' }}
                    >
                      VS
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="text-5xl md:text-7xl"
                      style={{ transform: 'scaleX(-1)' }}
                      role="img"
                      aria-label="opponent cowboy"
                    >
                      🤠
                    </div>
                    <div
                      className="w-12 h-1 mt-1"
                      style={{ background: 'var(--color-border)' }}
                    />
                  </div>
                </div>

                {/* Desert ground line */}
                <div
                  className="w-full max-w-md h-[2px] mb-6"
                  style={{ background: 'var(--color-border)' }}
                />

                <h1
                  className="pixel-text text-lg md:text-2xl mb-4 animate-glow-pulse"
                  style={{
                    color: 'var(--color-accent)',
                    padding: '0.75rem 1.5rem',
                    border: '2px solid var(--color-accent)',
                  }}
                >
                  CLICK TO START DUEL
                </h1>

                <p
                  className="pixel-text text-[0.5rem] md:text-[0.6rem] leading-relaxed max-w-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  WAIT FOR &quot;DRAW!&quot; THEN CLICK AS FAST AS YOU CAN.
                  <br />
                  CLICK TOO EARLY AND YOU&apos;RE DISHONORED.
                </p>

                {personalBest !== null && (
                  <div className="mt-6 pixel-border p-4" style={{ borderColor: 'var(--color-orange)' }}>
                    <span
                      className="pixel-text text-[0.55rem] md:text-[0.65rem]"
                      style={{ color: 'var(--color-orange)' }}
                    >
                      PERSONAL BEST: {personalBest}ms
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ===== WAITING PHASE ===== */}
            {phase === 'waiting' && (
              <>
                <div className="text-6xl md:text-8xl mb-6">
                  🔫
                </div>
                <h2
                  className="pixel-text text-3xl md:text-5xl animate-pulse"
                  style={{ color: '#ff3333' }}
                >
                  WAIT...
                </h2>
                <p
                  className="pixel-text text-[0.5rem] md:text-[0.6rem] mt-4"
                  style={{ color: '#882222' }}
                >
                  HOLD YOUR NERVE, PARTNER...
                </p>

                {/* Tense atmosphere dots */}
                <div className="flex gap-3 mt-8">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        background: '#ff3333',
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ===== DRAW PHASE ===== */}
            {phase === 'draw' && (
              <>
                <div className="text-6xl md:text-8xl mb-4">
                  💥
                </div>
                <h2
                  className="pixel-text text-5xl md:text-7xl animate-pixel-bounce"
                  style={{
                    color: '#00ff88',
                    textShadow:
                      '0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  DRAW!!!
                </h2>
                <p
                  className="pixel-text text-xs md:text-sm mt-4"
                  style={{ color: '#00cc6a' }}
                >
                  CLICK NOW!
                </p>
              </>
            )}

            {/* ===== RESULT PHASE ===== */}
            {(phase === 'result' || phase === 'cheated') && result && (
              <>
                <div className="text-6xl md:text-8xl mb-2">{result.ratingEmoji}</div>

                {phase === 'result' && (
                  <div
                    className="pixel-text text-5xl md:text-7xl mb-4"
                    style={{
                      color: 'var(--color-accent)',
                      textShadow:
                        '0 0 20px var(--color-accent-glow), 0 0 40px var(--color-accent-glow)',
                    }}
                  >
                    {result.reactionTime}ms
                  </div>
                )}

                <div
                  className="pixel-text text-sm md:text-lg mb-2"
                  style={{
                    color:
                      phase === 'cheated'
                        ? '#ff3333'
                        : result.reactionTime < 200
                          ? 'var(--color-orange)'
                          : 'var(--color-text)',
                  }}
                >
                  {result.rating}
                </div>

                {phase === 'result' && personalBest === result.reactionTime && (
                  <div
                    className="pixel-text text-[0.55rem] md:text-[0.65rem] mt-1"
                    style={{ color: 'var(--color-orange)' }}
                  >
                    NEW PERSONAL BEST!
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetGame();
                  }}
                  className="pixel-btn mt-8 text-[0.65rem] md:text-xs"
                >
                  DUEL AGAIN
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
