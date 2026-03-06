'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'idle' | 'racing' | 'finished';

interface RaceResult {
  wpm: number;
  accuracy: number;
  timeTaken: number;
  rating: string;
}

const SNIPPETS: string[] = [
  // Code snippets
  'const greeting = (name) => `Hello, ${name}!`;',
  'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
  'const [state, setState] = useState(initialValue);',
  'array.filter(x => x > 0).map(x => x * 2).reduce((a, b) => a + b, 0);',
  'export default async function handler(req, res) { res.json({ ok: true }); }',
  'const result = await fetch(url).then(res => res.json());',
  'document.querySelectorAll(".item").forEach(el => el.classList.toggle("active"));',
  'const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };',
  // Famous dev quotes
  '"Any fool can write code that a computer can understand."',
  '"First, solve the problem. Then, write the code."',
  '"Code is like humor. When you have to explain it, it\'s bad."',
  '"The best error message is the one that never shows up."',
  '"Programming isn\'t about what you know; it\'s about what you can figure out."',
  '"Simplicity is the soul of efficiency."',
  '"Make it work, make it right, make it fast."',
  // Fun ones
  '"I don\'t always test my code, but when I do, I do it in production."',
  '"There are only 10 types of people: those who understand binary and those who don\'t."',
  '"It works on my machine."',
];

function getRandomSnippet(exclude?: string): string {
  const available = exclude ? SNIPPETS.filter(s => s !== exclude) : SNIPPETS;
  return available[Math.floor(Math.random() * available.length)];
}

function getRating(wpm: number): string {
  if (wpm >= 80) return 'SPEED DEMON!';
  if (wpm >= 60) return 'FAST FINGERS!';
  if (wpm >= 40) return 'GETTING THERE';
  return 'KEEP PRACTICING';
}

function getRatingColor(wpm: number): string {
  if (wpm >= 80) return 'var(--color-accent)';
  if (wpm >= 60) return 'var(--color-cyan)';
  if (wpm >= 40) return 'var(--color-orange)';
  return 'var(--color-red)';
}

export default function TypeRacerPage() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [snippet, setSnippet] = useState('');
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<number>(0);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [personalBest, setPersonalBest] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wpmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('typeracer-pb');
    if (saved) setPersonalBest(parseFloat(saved));
    setSnippet(getRandomSnippet());
  }, []);

  const calculateWpm = useCallback((charsTyped: number, start: number): number => {
    const minutes = (Date.now() - start) / 60000;
    if (minutes < 0.01) return 0;
    return Math.round((charsTyped / 5) / minutes);
  }, []);

  const startRace = useCallback(() => {
    setGameState('racing');
    setTyped('');
    setErrors(new Set());
    const now = Date.now();
    setStartTime(now);
    setCurrentWpm(0);
    setResult(null);
    inputRef.current?.focus();

    wpmIntervalRef.current = setInterval(() => {
      setTyped(prev => {
        const correctChars = prev.length;
        if (correctChars > 0) {
          const wpm = calculateWpm(correctChars, now);
          setCurrentWpm(wpm);
        }
        return prev;
      });
    }, 500);
  }, [calculateWpm]);

  const finishRace = useCallback((finalTyped: string, errorSet: Set<number>, start: number) => {
    if (wpmIntervalRef.current) {
      clearInterval(wpmIntervalRef.current);
      wpmIntervalRef.current = null;
    }

    const timeTaken = (Date.now() - start) / 1000;
    const minutes = timeTaken / 60;
    const wpm = minutes > 0 ? Math.round((finalTyped.length / 5) / minutes) : 0;
    const accuracy = finalTyped.length > 0
      ? Math.round(((finalTyped.length - errorSet.size) / finalTyped.length) * 100)
      : 100;
    const rating = getRating(wpm);

    setCurrentWpm(wpm);
    setResult({ wpm, accuracy, timeTaken, rating });
    setGameState('finished');

    if (wpm > personalBest) {
      setPersonalBest(wpm);
      localStorage.setItem('typeracer-pb', String(wpm));
    }
  }, [personalBest]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return;

    const value = e.target.value;
    const newErrors = new Set(errors);

    // Check the latest character
    if (value.length > typed.length) {
      const idx = value.length - 1;
      if (value[idx] !== snippet[idx]) {
        newErrors.add(idx);
      }
    }

    setTyped(value);
    setErrors(newErrors);

    // Check completion
    if (value.length >= snippet.length) {
      finishRace(value, newErrors, startTime);
    }
  }, [gameState, typed, snippet, errors, finishRace, startTime]);

  const raceAgain = useCallback(() => {
    const newSnippet = getRandomSnippet(snippet);
    setSnippet(newSnippet);
    setTyped('');
    setErrors(new Set());
    setResult(null);
    setCurrentWpm(0);
    setGameState('idle');
  }, [snippet]);

  useEffect(() => {
    return () => {
      if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    };
  }, []);

  // Auto-focus input when racing
  useEffect(() => {
    if (gameState === 'racing') {
      inputRef.current?.focus();
    }
  }, [gameState]);

  const progress = snippet.length > 0 ? (typed.length / snippet.length) * 100 : 0;
  const accuracy = typed.length > 0
    ? Math.round(((typed.length - errors.size) / typed.length) * 100)
    : 100;

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      onClick={() => { if (gameState === 'racing') inputRef.current?.focus(); }}
    >
      <div className="max-w-3xl w-full mx-auto px-4 py-6 md:py-10 flex-1 flex flex-col">
        {/* Header */}
        <Link
          href="/games"
          className="inline-block mb-6 text-sm pixel-text"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &lt; BACK TO GAMES
        </Link>

        <div className="text-center mb-6">
          <h1
            className="pixel-text text-xl md:text-2xl mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            TYPE RACER
          </h1>
          <p
            className="pixel-text text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            RETRO EDITION
          </p>
        </div>

        {/* Personal Best */}
        {personalBest > 0 && (
          <div className="text-center mb-4">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-orange)' }}
            >
              PERSONAL BEST: {personalBest} WPM
            </span>
          </div>
        )}

        {/* Race Track */}
        <div
          className="pixel-border rounded mb-6 p-3 md:p-4"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          {/* Track background */}
          <div
            className="relative h-16 md:h-20 rounded overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
            }}
          >
            {/* Road lines */}
            <div
              className="absolute top-1/2 left-0 w-full"
              style={{
                height: '2px',
                backgroundImage: `repeating-linear-gradient(90deg, var(--color-text-muted) 0px, var(--color-text-muted) 12px, transparent 12px, transparent 24px)`,
                transform: 'translateY(-50%)',
              }}
            />
            {/* Finish line */}
            <div
              className="absolute right-2 top-0 h-full w-3"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  var(--color-text) 0px,
                  var(--color-text) 4px,
                  transparent 4px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  0deg,
                  transparent 0px,
                  transparent 4px,
                  var(--color-text) 4px,
                  var(--color-text) 8px
                )`,
                backgroundSize: '50% 8px',
                backgroundPosition: '0 0, 50% 0',
                opacity: 0.5,
              }}
            />
            {/* Pixel Car */}
            <div
              className="absolute top-1/2 transition-all duration-200 ease-linear"
              style={{
                left: `${Math.min(progress, 95)}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {/* Car body - CSS pixel art */}
              <div className="relative" style={{ imageRendering: 'pixelated' }}>
                {/* Roof */}
                <div
                  className="absolute"
                  style={{
                    width: '12px',
                    height: '6px',
                    background: 'var(--color-accent)',
                    top: '-6px',
                    left: '6px',
                    boxShadow: '0 0 8px var(--color-accent-glow)',
                  }}
                />
                {/* Body */}
                <div
                  style={{
                    width: '28px',
                    height: '10px',
                    background: 'var(--color-accent)',
                    boxShadow: '0 0 12px var(--color-accent-glow)',
                  }}
                />
                {/* Wheels */}
                <div
                  className="absolute"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: 'var(--color-text)',
                    bottom: '-4px',
                    left: '2px',
                    borderRadius: '1px',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: 'var(--color-text)',
                    bottom: '-4px',
                    right: '2px',
                    borderRadius: '1px',
                  }}
                />
                {/* Windshield */}
                <div
                  className="absolute"
                  style={{
                    width: '4px',
                    height: '4px',
                    background: 'var(--color-cyan)',
                    top: '-4px',
                    right: '6px',
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Progress text */}
          <div className="flex justify-between mt-2">
            <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)', fontSize: '0.55rem' }}>
              START
            </span>
            <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)', fontSize: '0.55rem' }}>
              {Math.round(progress)}%
            </span>
            <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)', fontSize: '0.55rem' }}>
              FINISH
            </span>
          </div>
        </div>

        {/* Live Stats */}
        {gameState === 'racing' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div
              className="text-center p-3 rounded"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="pixel-text text-lg md:text-xl" style={{ color: 'var(--color-accent)' }}>
                {currentWpm}
              </div>
              <div className="pixel-text" style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}>
                WPM
              </div>
            </div>
            <div
              className="text-center p-3 rounded"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="pixel-text text-lg md:text-xl" style={{ color: 'var(--color-cyan)' }}>
                {accuracy}%
              </div>
              <div className="pixel-text" style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}>
                ACCURACY
              </div>
            </div>
            <div
              className="text-center p-3 rounded"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="pixel-text text-lg md:text-xl" style={{ color: 'var(--color-orange)' }}>
                {typed.length}
              </div>
              <div className="pixel-text" style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}>
                CHARS
              </div>
            </div>
          </div>
        )}

        {/* Text Display */}
        <div
          className="pixel-border rounded p-4 md:p-6 mb-6 relative"
          style={{
            background: 'var(--color-bg-card)',
            minHeight: '120px',
          }}
        >
          {gameState === 'idle' && (
            <div className="text-center py-6">
              <p
                className="mono-text text-base md:text-lg mb-6 leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {snippet}
              </p>
              <button
                onClick={startRace}
                className="pixel-btn"
              >
                START RACE
              </button>
            </div>
          )}

          {gameState === 'racing' && (
            <div className="mono-text text-base md:text-lg leading-relaxed select-none" style={{ wordBreak: 'break-all' }}>
              {snippet.split('').map((char, idx) => {
                let color = 'var(--color-text-muted)';
                let bg = 'transparent';

                if (idx < typed.length) {
                  if (errors.has(idx)) {
                    color = 'var(--color-bg)';
                    bg = 'var(--color-red)';
                  } else {
                    color = 'var(--color-accent)';
                  }
                } else if (idx === typed.length) {
                  // Current character - cursor
                  bg = 'var(--color-accent)';
                  color = 'var(--color-bg)';
                }

                return (
                  <span
                    key={idx}
                    style={{
                      color,
                      backgroundColor: bg,
                      transition: 'color 0.05s',
                    }}
                    className={idx === typed.length ? 'animate-cursor-blink' : ''}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          )}

          {gameState === 'finished' && result && (
            <div className="text-center py-4">
              <p
                className="pixel-text text-lg md:text-2xl mb-6"
                style={{ color: getRatingColor(result.wpm) }}
              >
                {result.rating}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div
                    className="pixel-text text-xl md:text-3xl"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {result.wpm}
                  </div>
                  <div
                    className="pixel-text mt-1"
                    style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
                  >
                    WPM
                  </div>
                </div>
                <div>
                  <div
                    className="pixel-text text-xl md:text-3xl"
                    style={{ color: 'var(--color-cyan)' }}
                  >
                    {result.accuracy}%
                  </div>
                  <div
                    className="pixel-text mt-1"
                    style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
                  >
                    ACCURACY
                  </div>
                </div>
                <div>
                  <div
                    className="pixel-text text-xl md:text-3xl"
                    style={{ color: 'var(--color-orange)' }}
                  >
                    {result.timeTaken.toFixed(1)}s
                  </div>
                  <div
                    className="pixel-text mt-1"
                    style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
                  >
                    TIME
                  </div>
                </div>
              </div>

              {result.wpm >= personalBest && personalBest > 0 && (
                <p
                  className="pixel-text text-xs mb-4 animate-glow-pulse inline-block px-3 py-1 rounded"
                  style={{
                    color: 'var(--color-orange)',
                    border: '1px solid var(--color-orange)',
                  }}
                >
                  NEW PERSONAL BEST!
                </p>
              )}

              <div className="mt-4">
                <button
                  onClick={raceAgain}
                  className="pixel-btn"
                >
                  RACE AGAIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden input for capturing keystrokes */}
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={handleInput}
          className="sr-only"
          aria-label="Type the snippet text here"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={snippet.length}
          disabled={gameState !== 'racing'}
        />

        {/* Tap to focus hint on mobile */}
        {gameState === 'racing' && (
          <p
            className="text-center pixel-text mb-4"
            style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
          >
            TAP ANYWHERE TO FOCUS INPUT
          </p>
        )}

        {/* Instructions (idle only) */}
        {gameState === 'idle' && (
          <div
            className="rounded p-4 text-center"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="pixel-text text-xs mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              HOW TO PLAY
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Type the snippet as fast and accurately as you can. Your pixel car races based on your progress. Try to beat your personal best!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
