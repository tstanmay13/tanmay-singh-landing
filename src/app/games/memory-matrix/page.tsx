'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

type GamePhase = 'idle' | 'preview' | 'input' | 'reveal' | 'levelComplete' | 'gameOver';

interface LevelConfig {
  gridSize: number;
  cellCount: number;
  flashDuration: number;
}

interface RoundResult {
  correct: number;
  wrong: number;
  missed: number;
  perfect: boolean;
  score: number;
}

/* ============================================
   LEVEL CONFIGURATION
   ============================================ */

const LEVELS: LevelConfig[] = [
  { gridSize: 3, cellCount: 3, flashDuration: 2000 },
  { gridSize: 3, cellCount: 4, flashDuration: 1500 },
  { gridSize: 4, cellCount: 5, flashDuration: 1500 },
  { gridSize: 4, cellCount: 6, flashDuration: 1200 },
  { gridSize: 5, cellCount: 7, flashDuration: 1200 },
  { gridSize: 5, cellCount: 9, flashDuration: 1000 },
  { gridSize: 6, cellCount: 10, flashDuration: 1000 },
  { gridSize: 6, cellCount: 12, flashDuration: 800 },
  { gridSize: 7, cellCount: 14, flashDuration: 800 },
  { gridSize: 7, cellCount: 16, flashDuration: 600 },
];

const PASS_THRESHOLD = 0.7;
const POINTS_PER_CORRECT = 100;
const POINTS_PER_WRONG = -50;
const PERFECT_BONUS = 200;

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

function generateTargetCells(gridSize: number, cellCount: number): Set<number> {
  const totalCells = gridSize * gridSize;
  const targets = new Set<number>();
  while (targets.size < cellCount) {
    targets.add(Math.floor(Math.random() * totalCells));
  }
  return targets;
}

function calculateScore(result: RoundResult, level: number): number {
  const baseScore = result.correct * POINTS_PER_CORRECT + result.wrong * POINTS_PER_WRONG;
  const bonus = result.perfect ? PERFECT_BONUS : 0;
  return Math.max(0, (baseScore + bonus) * level);
}

/* ============================================
   COMPONENT
   ============================================ */

export default function MemoryMatrixPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [targetCells, setTargetCells] = useState<Set<number>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [highestLevel, setHighestLevel] = useState(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Mount and load personal best
  useEffect(() => {
    setMounted(true);
    try {
      const savedBestScore = localStorage.getItem('memory-matrix-best-score');
      const savedBestLevel = localStorage.getItem('memory-matrix-best-level');
      if (savedBestScore) setBestScore(parseInt(savedBestScore, 10));
      if (savedBestLevel) setBestLevel(parseInt(savedBestLevel, 10));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Save personal best
  const saveBest = useCallback((newScore: number, newLevel: number) => {
    try {
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('memory-matrix-best-score', String(newScore));
      }
      if (newLevel > bestLevel) {
        setBestLevel(newLevel);
        localStorage.setItem('memory-matrix-best-level', String(newLevel));
      }
    } catch {
      // localStorage unavailable
    }
  }, [bestScore, bestLevel]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const currentConfig = LEVELS[Math.min(level - 1, LEVELS.length - 1)];

  // Start a new game from level 1
  const startGame = useCallback(() => {
    setLevel(1);
    setScore(0);
    setHighestLevel(1);
    setRoundResult(null);
    startRound(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start a round for the given level
  const startRound = useCallback((lvl: number) => {
    const config = LEVELS[Math.min(lvl - 1, LEVELS.length - 1)];
    const targets = generateTargetCells(config.gridSize, config.cellCount);
    setTargetCells(targets);
    setSelectedCells(new Set());
    setRoundResult(null);
    setPhase('preview');

    // Countdown timer
    const totalMs = config.flashDuration;
    const steps = Math.ceil(totalMs / 100);
    let remaining = steps;
    setCountdown(remaining);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 100);

    // After flash duration, switch to input phase
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPhase('input');
      setCountdown(0);
    }, totalMs);
  }, []);

  // Toggle cell selection during input phase
  const toggleCell = useCallback((index: number) => {
    if (phase !== 'input') return;
    setSelectedCells(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, [phase]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (phase !== 'input') return;

    let correct = 0;
    let wrong = 0;
    let missed = 0;

    // Count correct selections
    selectedCells.forEach(cell => {
      if (targetCells.has(cell)) {
        correct++;
      } else {
        wrong++;
      }
    });

    // Count missed targets
    targetCells.forEach(cell => {
      if (!selectedCells.has(cell)) {
        missed++;
      }
    });

    const perfect = correct === targetCells.size && wrong === 0;
    const result: RoundResult = { correct, wrong, missed, perfect, score: 0 };
    result.score = calculateScore(result, level);

    setRoundResult(result);
    setPhase('reveal');

    const newScore = score + result.score;
    setScore(newScore);

    // After a brief reveal, determine next phase
    const accuracy = targetCells.size > 0 ? correct / targetCells.size : 0;

    timerRef.current = setTimeout(() => {
      if (accuracy >= PASS_THRESHOLD) {
        const nextLevel = level + 1;
        if (nextLevel > LEVELS.length) {
          // Beat all levels
          saveBest(newScore, level);
          setPhase('gameOver');
        } else {
          setHighestLevel(Math.max(highestLevel, nextLevel));
          setPhase('levelComplete');
        }
      } else {
        saveBest(newScore, level);
        setPhase('gameOver');
      }
    }, 1500);
  }, [phase, selectedCells, targetCells, level, score, highestLevel, saveBest]);

  // Advance to next level
  const nextLevel = useCallback(() => {
    const next = level + 1;
    setLevel(next);
    startRound(next);
  }, [level, startRound]);

  // Get cell display style based on phase
  const getCellStyle = (index: number): string => {
    const baseSize = `aspect-square rounded-sm transition-all duration-200 cursor-pointer border-2 `;

    if (phase === 'preview') {
      if (targetCells.has(index)) {
        return baseSize + 'bg-[#D99C64] border-[#FFD966] shadow-[0_0_12px_rgba(217,156,100,0.6)] scale-95';
      }
      return baseSize + 'bg-[#FFF8F0] border-[#E8D5C4]';
    }

    if (phase === 'input') {
      if (selectedCells.has(index)) {
        return baseSize + 'bg-[#593B2B] border-[#D99C64] scale-95';
      }
      return baseSize + 'bg-[#FFF8F0] border-[#E8D5C4] hover:bg-[#FFE8D6] hover:border-[#D99C64] active:scale-90';
    }

    if (phase === 'reveal') {
      const isTarget = targetCells.has(index);
      const isSelected = selectedCells.has(index);

      if (isTarget && isSelected) {
        // Correct
        return baseSize + 'bg-green-400 border-green-600 shadow-[0_0_10px_rgba(74,222,128,0.5)]';
      }
      if (isTarget && !isSelected) {
        // Missed
        return baseSize + 'bg-yellow-400 border-yellow-600 shadow-[0_0_10px_rgba(250,204,21,0.5)]';
      }
      if (!isTarget && isSelected) {
        // Wrong
        return baseSize + 'bg-red-400 border-red-600 shadow-[0_0_10px_rgba(248,113,113,0.5)]';
      }
      return baseSize + 'bg-[#FFF8F0] border-[#E8D5C4]';
    }

    return baseSize + 'bg-[#FFF8F0] border-[#E8D5C4]';
  };

  // Calculate grid cell sizing based on viewport
  const getGridMaxWidth = (): string => {
    const size = currentConfig.gridSize;
    if (size <= 3) return 'max-w-[240px]';
    if (size <= 4) return 'max-w-[300px]';
    if (size <= 5) return 'max-w-[350px]';
    if (size <= 6) return 'max-w-[380px]';
    return 'max-w-[420px]';
  };

  const getGridCols = (): string => {
    const size = currentConfig.gridSize;
    if (size === 3) return 'grid-cols-3';
    if (size === 4) return 'grid-cols-4';
    if (size === 5) return 'grid-cols-5';
    if (size === 6) return 'grid-cols-6';
    return 'grid-cols-7';
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/games"
          className="inline-block mb-6 text-[#593B2B] hover:text-[#D99C64] transition-colors"
        >
          &larr; Back to Games
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#593B2B] mb-2">
            🧠 Memory Matrix
          </h1>
          <p className="text-lg text-[#D99C64]">
            Remember the pattern. Tap the cells. Test your memory.
          </p>
        </div>

        {/* Score Bar */}
        <div className="flex justify-between items-center bg-white rounded-2xl px-6 py-3 shadow-lg mb-6">
          <div className="text-center">
            <div className="text-xs text-[#D99C64] font-medium uppercase tracking-wide">Level</div>
            <div className="text-2xl font-bold text-[#593B2B]">{level}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#D99C64] font-medium uppercase tracking-wide">Score</div>
            <div className="text-2xl font-bold text-[#593B2B]">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#D99C64] font-medium uppercase tracking-wide">Best</div>
            <div className="text-2xl font-bold text-[#D99C64]">{bestScore}</div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col items-center gap-6">

          {/* Idle / Start Screen */}
          {phase === 'idle' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
              <div className="text-6xl mb-4">🧩</div>
              <h2 className="text-2xl font-bold text-[#593B2B] mb-3">
                How to Play
              </h2>
              <p className="text-[#D99C64] mb-2 text-sm">
                A pattern of cells will flash briefly. Memorize which cells light up,
                then tap them from memory.
              </p>
              <p className="text-[#D99C64] mb-6 text-sm">
                Get 70% accuracy to advance. Difficulty increases each level.
              </p>
              {bestLevel > 0 && (
                <p className="text-xs text-[#D99C64] mb-4">
                  Personal Best: Level {bestLevel} | Score {bestScore}
                </p>
              )}
              <button
                onClick={startGame}
                className="px-8 py-4 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors text-lg"
              >
                Start Game
              </button>
            </div>
          )}

          {/* Game Grid */}
          {(phase === 'preview' || phase === 'input' || phase === 'reveal') && (
            <>
              {/* Phase Indicator */}
              <div className="text-center">
                {phase === 'preview' && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xl font-bold text-[#593B2B] animate-pulse">
                      Memorize the pattern!
                    </p>
                    <div className="w-32 h-2 bg-[#FFE8D6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D99C64] rounded-full transition-all duration-100 ease-linear"
                        style={{
                          width: `${(countdown / Math.ceil(currentConfig.flashDuration / 100)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {phase === 'input' && (
                  <p className="text-xl font-bold text-[#593B2B]">
                    Tap the cells you remember!
                  </p>
                )}
                {phase === 'reveal' && roundResult && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xl font-bold text-[#593B2B]">
                      {roundResult.perfect ? 'Perfect!' : `${roundResult.correct}/${targetCells.size} correct`}
                    </p>
                    <p className="text-sm text-[#D99C64]">
                      +{roundResult.score} points
                      {roundResult.perfect && ' (Perfect Bonus!)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className={`${getGridMaxWidth()} w-full bg-white rounded-2xl p-4 shadow-lg`}>
                <div className={`grid ${getGridCols()} gap-1.5`}>
                  {Array.from({ length: currentConfig.gridSize * currentConfig.gridSize }).map((_, i) => (
                    <div
                      key={i}
                      className={getCellStyle(i)}
                      onClick={() => toggleCell(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button (Input Phase) */}
              {phase === 'input' && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={submitAnswer}
                    className="px-8 py-4 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors text-lg"
                  >
                    Submit ({selectedCells.size}/{currentConfig.cellCount})
                  </button>
                  <p className="text-xs text-[#D99C64]">
                    Tap cells to select/deselect, then submit
                  </p>
                </div>
              )}
            </>
          )}

          {/* Level Complete */}
          {phase === 'levelComplete' && roundResult && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-[#593B2B] mb-2">
                LEVEL COMPLETE!
              </h2>
              <p className="text-[#D99C64] mb-1">
                {roundResult.correct}/{targetCells.size} cells correct
                {roundResult.perfect && ' - PERFECT!'}
              </p>
              <p className="text-lg font-semibold text-[#593B2B] mb-4">
                +{roundResult.score} points
              </p>
              <div className="bg-[#FFF8F0] rounded-xl p-3 mb-6">
                <p className="text-sm text-[#D99C64]">
                  Next: Level {level + 1} - {LEVELS[Math.min(level, LEVELS.length - 1)].gridSize}x{LEVELS[Math.min(level, LEVELS.length - 1)].gridSize} grid, {LEVELS[Math.min(level, LEVELS.length - 1)].cellCount} cells
                </p>
              </div>
              <button
                onClick={nextLevel}
                className="px-8 py-4 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors text-lg"
              >
                Next Level
              </button>
            </div>
          )}

          {/* Game Over */}
          {phase === 'gameOver' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
              <div className="text-6xl mb-4">
                {level > LEVELS.length ? '🏆' : '💀'}
              </div>
              <h2 className="text-3xl font-bold text-[#593B2B] mb-2">
                {level > LEVELS.length ? 'YOU WIN!' : 'GAME OVER'}
              </h2>
              <div className="space-y-2 mb-6">
                <p className="text-lg text-[#D99C64]">
                  Final Score: <span className="font-bold text-[#593B2B]">{score}</span>
                </p>
                <p className="text-lg text-[#D99C64]">
                  Highest Level: <span className="font-bold text-[#593B2B]">{highestLevel}</span>
                </p>
                {score >= bestScore && score > 0 && (
                  <p className="text-sm font-semibold text-[#D99C64] animate-pulse">
                    New Personal Best!
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors text-lg"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Legend (during reveal phase) */}
          {phase === 'reveal' && (
            <div className="bg-white rounded-2xl p-4 shadow-lg max-w-md w-full">
              <div className="flex justify-around text-xs text-[#593B2B]">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-green-400 border border-green-600" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-600" />
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-red-400 border border-red-600" />
                  <span>Wrong</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
