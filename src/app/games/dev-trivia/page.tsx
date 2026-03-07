'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { QUESTIONS, CATEGORY_META, ALL_CATEGORIES, TEAM_NAMES, TEAM_COLORS } from './questions';
import type { Category, Difficulty, TriviaQuestion } from './questions';
import OnlineGame from './OnlineGame';

type GamePhase =
  | 'lobby'
  | 'team-setup'
  | 'category-pick'
  | 'wager'
  | 'question'
  | 'reveal'
  | 'rapid-intro'
  | 'rapid-question'
  | 'rapid-reveal'
  | 'game-over';

interface Player {
  name: string;
  team: 0 | 1;
}


const QUESTIONS_PER_GAME = 15;
const RAPID_FIRE_COUNT = 10;
const QUESTION_TIME = 15;
const RAPID_FIRE_TIME = 10;


// ─── Helpers ────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(category: Category, used: Set<number>): TriviaQuestion | null {
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => q.category === category && !used.has(i));
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  used.add(pick.i);
  return pick.q;
}

function pickRapidFireQuestions(used: Set<number>, count: number): TriviaQuestion[] {
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !used.has(i));
  const shuffled = shuffle(candidates);
  const picked = shuffled.slice(0, count);
  picked.forEach(({ i }) => used.add(i));
  return picked.map(({ q }) => q);
}

function difficultyPoints(d: Difficulty): number {
  return d === 'Easy' ? 100 : d === 'Medium' ? 200 : 300;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function DevTriviaShowdownPage() {
  const [mounted, setMounted] = useState(false);
  const [gameMode, setGameMode] = useState<'select' | 'same-device' | 'online'>('select');

  // Lobby / setup
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(6);
  const [mode, setMode] = useState<'teams' | 'pass'>('teams');

  // Game state
  const [scores, setScores] = useState([0, 0]);
  const [currentTeam, setCurrentTeam] = useState<0 | 1>(0);
  const [round, setRound] = useState(0);
  const [usedQuestions] = useState<Set<number>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [wager, setWager] = useState<1 | 2 | 3>(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  // Track used categories for potential UI hints (dimming used ones)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [usedCategories, setUsedCategories] = useState<Set<string>>(new Set());

  // Rapid fire
  const [rapidQuestions, setRapidQuestions] = useState<TriviaQuestion[]>([]);
  const [rapidIndex, setRapidIndex] = useState(0);
  const [rapidBuzzer, setRapidBuzzer] = useState<0 | 1 | null>(null);
  // Track rapid-fire round scores separately for potential breakdown display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rapidScores, setRapidScores] = useState([0, 0]);

  // Animations
  const [showCorrect, setShowCorrect] = useState<boolean | null>(null);
  const [lockedIn, setLockedIn] = useState(false);
  const [wagerLocked, setWagerLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Timer logic
  const startTimer = useCallback((seconds: number, onExpire: () => void) => {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ─── Lobby ────────────────────────────────────────────────────
  const startGame = () => {
    setScores([0, 0]);
    setRound(0);
    setCurrentTeam(0);
    usedQuestions.clear();
    setUsedCategories(new Set());
    setPhase('category-pick');
  };

  // ─── Category pick ───────────────────────────────────────────
  const pickCategory = (cat: Category) => {
    setSelectedCategory(cat);
    const q = pickQuestions(cat, usedQuestions);
    if (!q) return;
    setCurrentQuestion(q);
    setWager(1);
    setWagerLocked(false);
    setPhase('wager');
  };

  // ─── Wager ────────────────────────────────────────────────────
  const lockWager = () => {
    setWagerLocked(true);
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowCorrect(null);
      setLockedIn(false);
      setPhase('question');
      startTimer(QUESTION_TIME, () => handleAnswer(-1));
    }, 800);
  };

  // ─── Answer ───────────────────────────────────────────────────
  const handleAnswer = useCallback((answerIdx: number) => {
    if (lockedIn) return;
    setLockedIn(true);
    stopTimer();
    setSelectedAnswer(answerIdx);
    const correct = currentQuestion && answerIdx === currentQuestion.correct;
    setShowCorrect(!!correct);

    if (correct && currentQuestion) {
      const pts = difficultyPoints(currentQuestion.difficulty) * wager;
      setScores(prev => {
        const next = [...prev];
        next[currentTeam] += pts;
        return next;
      });
    }

    setTimeout(() => {
      setPhase('reveal');
    }, 400);
  }, [lockedIn, currentQuestion, wager, currentTeam, stopTimer]);

  const nextRound = () => {
    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= QUESTIONS_PER_GAME) {
      // Start rapid fire
      const rqs = pickRapidFireQuestions(usedQuestions, RAPID_FIRE_COUNT);
      setRapidQuestions(rqs);
      setRapidIndex(0);
      setRapidScores([0, 0]);
      setPhase('rapid-intro');
      return;
    }

    setCurrentTeam(prev => (prev === 0 ? 1 : 0) as 0 | 1);
    if (selectedCategory) {
      setUsedCategories(prev => new Set(prev).add(selectedCategory));
    }
    setPhase('category-pick');
  };

  // ─── Rapid fire ───────────────────────────────────────────────
  const startRapidFire = () => {
    setRapidBuzzer(null);
    setSelectedAnswer(null);
    setShowCorrect(null);
    setLockedIn(false);
    setPhase('rapid-question');
    startTimer(RAPID_FIRE_TIME, () => {
      setPhase('rapid-reveal');
    });
  };

  const rapidBuzz = (team: 0 | 1) => {
    if (rapidBuzzer !== null) return;
    setRapidBuzzer(team);
    stopTimer();
  };

  const rapidAnswer = (answerIdx: number) => {
    if (lockedIn) return;
    setLockedIn(true);
    setSelectedAnswer(answerIdx);
    const q = rapidQuestions[rapidIndex];
    const correct = q && answerIdx === q.correct;
    setShowCorrect(!!correct);

    if (correct && rapidBuzzer !== null) {
      setRapidScores(prev => {
        const next = [...prev];
        next[rapidBuzzer] += 150;
        return next;
      });
      setScores(prev => {
        const next = [...prev];
        next[rapidBuzzer] += 150;
        return next;
      });
    }

    setTimeout(() => {
      setPhase('rapid-reveal');
    }, 400);
  };

  const nextRapidQuestion = () => {
    const next = rapidIndex + 1;
    if (next >= rapidQuestions.length) {
      setPhase('game-over');
      return;
    }
    setRapidIndex(next);
    setRapidBuzzer(null);
    setSelectedAnswer(null);
    setShowCorrect(null);
    setLockedIn(false);
    setPhase('rapid-question');
    startTimer(RAPID_FIRE_TIME, () => {
      setPhase('rapid-reveal');
    });
  };

  // ─── Reset ────────────────────────────────────────────────────
  const resetGame = () => {
    stopTimer();
    setPhase('lobby');
    setScores([0, 0]);
    setRound(0);
    usedQuestions.clear();
    setUsedCategories(new Set());
  };

  // ─── Render ───────────────────────────────────────────────────
  if (!mounted) return null;

  // ─── Mode Select Screen ─────────────────────────────────────
  if (gameMode === 'select') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-md mx-auto">
          <Link
            href="/games"
            className="pixel-text text-xs hover:underline mb-6 block"
            style={{ color: 'var(--color-accent)' }}
          >
            &lt; BACK
          </Link>
          <div className="text-center mb-10">
            <h1 className="pixel-text text-xl md:text-2xl mb-3" style={{ color: 'var(--color-accent)' }}>
              DEV TRIVIA
            </h1>
            <h2 className="pixel-text text-sm md:text-base mb-2" style={{ color: 'var(--color-blue)' }}>
              SHOWDOWN
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Team-based programming trivia with wagering
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setGameMode('same-device')}
              className="pixel-btn w-full py-4 text-sm"
            >
              <div className="pixel-text text-xs mb-1">SAME DEVICE</div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                Pass the phone between teams
              </div>
            </button>
            <button
              onClick={() => setGameMode('online')}
              className="w-full py-4 text-sm rounded border transition-all hover:scale-[1.02]"
              style={{
                borderColor: 'var(--color-blue)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <div className="pixel-text text-xs mb-1" style={{ color: 'var(--color-blue)' }}>ONLINE</div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                Room code multiplayer on separate devices
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Online Mode ────────────────────────────────────────────
  if (gameMode === 'online') {
    return <OnlineGame onBack={() => setGameMode('select')} />;
  }

  // ─── Same-Device Mode (existing game) ───────────────────────
  const winner: 0 | 1 | -1 = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/games"
            className="pixel-text text-xs hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            &lt; BACK
          </Link>
          {phase !== 'lobby' && phase !== 'team-setup' && phase !== 'game-over' && (
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <div className="pixel-text text-[10px]" style={{ color: TEAM_COLORS[0] }}>{TEAM_NAMES[0]}</div>
                <div className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[0] }}>{scores[0]}</div>
              </div>
              <div className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                R{round + 1}/{QUESTIONS_PER_GAME}
              </div>
              <div className="text-center">
                <div className="pixel-text text-[10px]" style={{ color: TEAM_COLORS[1] }}>{TEAM_NAMES[1]}</div>
                <div className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[1] }}>{scores[1]}</div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ LOBBY ═══ */}
        {phase === 'lobby' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h1 className="pixel-text text-xl md:text-2xl mb-3" style={{ color: 'var(--color-accent)' }}>
                DEV TRIVIA
              </h1>
              <h2 className="pixel-text text-sm md:text-base mb-2" style={{ color: 'var(--color-blue)' }}>
                SHOWDOWN
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Team-based programming trivia with wagering
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex justify-center gap-3 mb-6">
              <button
                className={`pixel-btn text-xs px-4 py-2 ${mode === 'teams' ? '' : 'opacity-50'}`}
                onClick={() => setMode('teams')}
                style={mode === 'teams' ? { borderColor: 'var(--color-accent)' } : {}}
              >
                TEAM VS TEAM
              </button>
              <button
                className={`pixel-btn text-xs px-4 py-2 ${mode === 'pass' ? '' : 'opacity-50'}`}
                onClick={() => setMode('pass')}
                style={mode === 'pass' ? { borderColor: 'var(--color-accent)' } : {}}
              >
                PASS THE PHONE
              </button>
            </div>

            {/* Player count */}
            <div
              className="pixel-card rounded-lg p-5 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <h3 className="pixel-text text-xs mb-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                HOW MANY PLAYERS?
              </h3>
              <div className="flex gap-2 justify-center flex-wrap mb-3">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <button
                    key={n}
                    className="w-11 h-11 rounded-lg text-sm font-bold transition-all"
                    style={{
                      backgroundColor: playerCount === n ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                      border: `2px solid ${playerCount === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                    onClick={() => setPlayerCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Team preview */}
              <div className="flex justify-center gap-4 text-xs">
                <span style={{ color: TEAM_COLORS[0] }}>
                  {TEAM_NAMES[0]}: {Math.ceil(playerCount / 2)}
                </span>
                <span style={{ color: TEAM_COLORS[1] }}>
                  {TEAM_NAMES[1]}: {Math.floor(playerCount / 2)}
                </span>
              </div>
            </div>

            <div className="text-center">
              <button
                className="pixel-btn text-sm px-8 py-3"
                onClick={() => {
                  const generated = Array.from({ length: playerCount }, (_, i) => ({
                    name: `Player ${i + 1}`,
                    team: (i % 2) as 0 | 1,
                  }));
                  setPlayers(generated);
                  startGame();
                }}
              >
                START SHOWDOWN
              </button>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY PICK ═══ */}
        {phase === 'category-pick' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="pixel-text text-xs mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                TEAM {TEAM_NAMES[currentTeam]}&apos;S TURN
              </div>
              <h2 className="pixel-text text-base md:text-lg mb-1" style={{ color: 'var(--color-text)' }}>
                PICK A CATEGORY
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Round {round + 1} of {QUESTIONS_PER_GAME}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ALL_CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                const remaining = QUESTIONS.filter(q => q.category === cat && !usedQuestions.has(QUESTIONS.indexOf(q))).length;
                const disabled = remaining === 0;
                return (
                  <button
                    key={cat}
                    className="pixel-card rounded-lg p-4 text-center transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: disabled ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)',
                      borderColor: meta.color,
                      opacity: disabled ? 0.3 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    disabled={disabled}
                    onClick={() => pickCategory(cat)}
                  >
                    <div className="mono-text text-lg mb-2" style={{ color: meta.color }}>{meta.icon}</div>
                    <div className="pixel-text text-[10px]" style={{ color: meta.color }}>{cat.toUpperCase()}</div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{remaining} left</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ WAGER ═══ */}
        {phase === 'wager' && currentQuestion && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="pixel-text text-xs mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                TEAM {TEAM_NAMES[currentTeam]}
              </div>
              <h2 className="pixel-text text-sm md:text-base mb-2" style={{ color: 'var(--color-text)' }}>
                PLACE YOUR WAGER
              </h2>
              <div className="flex justify-center gap-2 items-center">
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: CATEGORY_META[currentQuestion.category].color,
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.category.toUpperCase()}
                </span>
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: currentQuestion.difficulty === 'Easy'
                      ? 'var(--color-accent)'
                      : currentQuestion.difficulty === 'Medium'
                        ? 'var(--color-orange)'
                        : 'var(--color-red)',
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Base points: {difficultyPoints(currentQuestion.difficulty)}
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              {([1, 2, 3] as const).map(w => (
                <button
                  key={w}
                  className={`pixel-card rounded-lg p-4 md:p-6 text-center transition-all duration-200 ${wager === w ? 'scale-110' : 'hover:scale-105'}`}
                  style={{
                    backgroundColor: wager === w ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
                    borderColor: wager === w ? TEAM_COLORS[currentTeam] : 'var(--color-border)',
                    borderWidth: wager === w ? '3px' : '2px',
                    minWidth: '90px',
                  }}
                  onClick={() => !wagerLocked && setWager(w)}
                  disabled={wagerLocked}
                >
                  <div className="pixel-text text-lg md:text-xl mb-1" style={{ color: TEAM_COLORS[currentTeam] }}>
                    {w}x
                  </div>
                  <div className="mono-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {difficultyPoints(currentQuestion.difficulty) * w} pts
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                className="pixel-btn text-sm px-8 py-3"
                onClick={lockWager}
                disabled={wagerLocked}
                style={{
                  opacity: wagerLocked ? 0.5 : 1,
                  borderColor: TEAM_COLORS[currentTeam],
                }}
              >
                {wagerLocked ? 'LOCKED IN!' : 'LOCK IN WAGER'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ QUESTION ═══ */}
        {phase === 'question' && currentQuestion && (
          <div className="animate-fade-in-up">
            {/* Timer bar */}
            <div className="mb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / QUESTION_TIME) * 100}%`,
                    backgroundColor: timeLeft <= 5 ? 'var(--color-red)' : TEAM_COLORS[currentTeam],
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {wager}x WAGER
                </span>
                <span
                  className="mono-text text-sm font-bold"
                  style={{ color: timeLeft <= 5 ? 'var(--color-red)' : 'var(--color-text)' }}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Question */}
            <div
              className="pixel-card rounded-lg p-5 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: CATEGORY_META[currentQuestion.category].color,
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.category.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-semibold leading-relaxed">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Answers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentQuestion.answers.map((ans, i) => {
                const labels = ['A', 'B', 'C', 'D'];
                return (
                  <button
                    key={i}
                    className="pixel-card rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: selectedAnswer === i
                        ? 'var(--color-bg-card-hover)'
                        : 'var(--color-bg-card)',
                      borderColor: selectedAnswer === i
                        ? TEAM_COLORS[currentTeam]
                        : 'var(--color-border)',
                    }}
                    onClick={() => handleAnswer(i)}
                    disabled={lockedIn}
                  >
                    <span
                      className="pixel-text text-[10px] mr-2"
                      style={{ color: TEAM_COLORS[currentTeam] }}
                    >
                      {labels[i]}.
                    </span>
                    <span className="text-sm">{ans}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ REVEAL ═══ */}
        {phase === 'reveal' && currentQuestion && (
          <div className="animate-fade-in-up text-center">
            <div
              className="pixel-text text-2xl md:text-3xl mb-4"
              style={{ color: showCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
            >
              {showCorrect ? 'CORRECT!' : 'WRONG!'}
            </div>

            <div
              className="pixel-card rounded-lg p-5 mb-6 mx-auto max-w-lg"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {currentQuestion.question}
              </p>
              <div className="space-y-2">
                {currentQuestion.answers.map((ans, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: i === currentQuestion.correct
                        ? 'rgba(0, 255, 136, 0.15)'
                        : i === selectedAnswer && i !== currentQuestion.correct
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'transparent',
                      border: i === currentQuestion.correct
                        ? '1px solid var(--color-accent)'
                        : i === selectedAnswer && i !== currentQuestion.correct
                          ? '1px solid var(--color-red)'
                          : '1px solid transparent',
                    }}
                  >
                    {i === currentQuestion.correct && (
                      <span style={{ color: 'var(--color-accent)' }}>[OK]</span>
                    )}
                    {i === selectedAnswer && i !== currentQuestion.correct && (
                      <span style={{ color: 'var(--color-red)' }}>[XX]</span>
                    )}
                    <span>{ans}</span>
                  </div>
                ))}
              </div>

              {showCorrect && (
                <div className="mt-4 pixel-text text-xs" style={{ color: TEAM_COLORS[currentTeam] }}>
                  +{difficultyPoints(currentQuestion.difficulty) * wager} PTS FOR {TEAM_NAMES[currentTeam]}
                </div>
              )}
            </div>

            <button className="pixel-btn text-sm px-8 py-3" onClick={nextRound}>
              {round + 1 >= QUESTIONS_PER_GAME ? 'RAPID FIRE ROUND!' : 'NEXT QUESTION'}
            </button>
          </div>
        )}

        {/* ═══ RAPID FIRE INTRO ═══ */}
        {phase === 'rapid-intro' && (
          <div className="animate-fade-in-up text-center py-12">
            <div className="pixel-text text-2xl md:text-3xl mb-4" style={{ color: 'var(--color-orange)' }}>
              RAPID FIRE!
            </div>
            <div className="pixel-text text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {RAPID_FIRE_COUNT} QUESTIONS | {RAPID_FIRE_TIME}s EACH
            </div>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              Both teams can buzz in! First team to buzz gets to answer.
              150 points per correct answer. No wagers.
            </p>
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[0] }}>{TEAM_NAMES[0]}</div>
                <div className="mono-text text-2xl font-bold" style={{ color: TEAM_COLORS[0] }}>{scores[0]}</div>
              </div>
              <div className="pixel-text text-lg" style={{ color: 'var(--color-text-muted)' }}>VS</div>
              <div className="text-center">
                <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[1] }}>{TEAM_NAMES[1]}</div>
                <div className="mono-text text-2xl font-bold" style={{ color: TEAM_COLORS[1] }}>{scores[1]}</div>
              </div>
            </div>
            <button className="pixel-btn text-sm px-8 py-3" onClick={startRapidFire}>
              START RAPID FIRE
            </button>
          </div>
        )}

        {/* ═══ RAPID FIRE QUESTION ═══ */}
        {phase === 'rapid-question' && rapidQuestions[rapidIndex] && (
          <div className="animate-fade-in-up">
            {/* Timer */}
            <div className="mb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / RAPID_FIRE_TIME) * 100}%`,
                    backgroundColor: timeLeft <= 3 ? 'var(--color-red)' : 'var(--color-orange)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="pixel-text text-[10px]" style={{ color: 'var(--color-orange)' }}>
                  RAPID FIRE {rapidIndex + 1}/{RAPID_FIRE_COUNT}
                </span>
                <span
                  className="mono-text text-sm font-bold"
                  style={{ color: timeLeft <= 3 ? 'var(--color-red)' : 'var(--color-text)' }}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Buzzer phase */}
            {rapidBuzzer === null ? (
              <>
                <div
                  className="pixel-card rounded-lg p-5 mb-6"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <h3 className="text-base md:text-lg font-semibold leading-relaxed">
                    {rapidQuestions[rapidIndex].question}
                  </h3>
                </div>
                <div className="text-center mb-4">
                  <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    BUZZ IN!
                  </p>
                  <div className="flex justify-center gap-6">
                    <button
                      className="pixel-btn text-sm px-8 py-4"
                      style={{
                        borderColor: TEAM_COLORS[0],
                        backgroundColor: 'var(--color-bg-card)',
                      }}
                      onClick={() => rapidBuzz(0)}
                    >
                      {TEAM_NAMES[0]}
                    </button>
                    <button
                      className="pixel-btn text-sm px-8 py-4"
                      style={{
                        borderColor: TEAM_COLORS[1],
                        backgroundColor: 'var(--color-bg-card)',
                      }}
                      onClick={() => rapidBuzz(1)}
                    >
                      {TEAM_NAMES[1]}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                    {TEAM_NAMES[rapidBuzzer]} BUZZED IN!
                  </div>
                </div>
                <div
                  className="pixel-card rounded-lg p-5 mb-6"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <h3 className="text-base md:text-lg font-semibold leading-relaxed mb-4">
                    {rapidQuestions[rapidIndex].question}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rapidQuestions[rapidIndex].answers.map((ans, i) => {
                    const labels = ['A', 'B', 'C', 'D'];
                    return (
                      <button
                        key={i}
                        className="pixel-card rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: 'var(--color-bg-card)',
                          borderColor: 'var(--color-border)',
                        }}
                        onClick={() => rapidAnswer(i)}
                        disabled={lockedIn}
                      >
                        <span
                          className="pixel-text text-[10px] mr-2"
                          style={{ color: 'var(--color-orange)' }}
                        >
                          {labels[i]}.
                        </span>
                        <span className="text-sm">{ans}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ RAPID FIRE REVEAL ═══ */}
        {phase === 'rapid-reveal' && rapidQuestions[rapidIndex] && (
          <div className="animate-fade-in-up text-center">
            {selectedAnswer !== null ? (
              <div
                className="pixel-text text-xl md:text-2xl mb-4"
                style={{ color: showCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
              >
                {showCorrect ? 'CORRECT!' : 'WRONG!'}
              </div>
            ) : (
              <div className="pixel-text text-xl md:text-2xl mb-4" style={{ color: 'var(--color-text-muted)' }}>
                TIME&apos;S UP!
              </div>
            )}

            <div
              className="pixel-card rounded-lg p-5 mb-6 mx-auto max-w-lg"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <p className="text-sm mb-3">{rapidQuestions[rapidIndex].question}</p>
              <div
                className="px-3 py-2 rounded text-sm mb-2"
                style={{
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>[OK]</span>{' '}
                {rapidQuestions[rapidIndex].answers[rapidQuestions[rapidIndex].correct]}
              </div>
              {showCorrect && rapidBuzzer !== null && (
                <div className="mt-3 pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                  +150 PTS FOR {TEAM_NAMES[rapidBuzzer]}
                </div>
              )}
            </div>

            <button className="pixel-btn text-sm px-8 py-3" onClick={nextRapidQuestion}>
              {rapidIndex + 1 >= rapidQuestions.length ? 'FINAL RESULTS' : 'NEXT QUESTION'}
            </button>
          </div>
        )}

        {/* ═══ GAME OVER ═══ */}
        {phase === 'game-over' && (
          <div className="animate-fade-in-up text-center py-8">
            <div className="pixel-text text-2xl md:text-3xl mb-2" style={{ color: 'var(--color-accent)' }}>
              GAME OVER
            </div>

            {winner >= 0 ? (
              <>
                <div className="mb-6">
                  <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: TEAM_COLORS[winner as 0 | 1] }}>
                    {TEAM_NAMES[winner as 0 | 1]} WINS!
                  </div>
                  <div className="text-6xl my-4">
                    {winner === 0 ? '[ A ]' : '[ B ]'}
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-6">
                <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: 'var(--color-orange)' }}>
                  IT&apos;S A TIE!
                </div>
                <div className="text-4xl my-4">
                  [ = ]
                </div>
              </div>
            )}

            {/* Score bars */}
            <div className="max-w-md mx-auto mb-8">
              {[0, 1].map(t => {
                const maxScore = Math.max(scores[0], scores[1], 1);
                return (
                  <div key={t} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[t] }}>
                        {TEAM_NAMES[t]}
                      </span>
                      <span className="mono-text text-sm font-bold" style={{ color: TEAM_COLORS[t] }}>
                        {scores[t]}
                      </span>
                    </div>
                    <div
                      className="w-full h-4 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(scores[t] / maxScore) * 100}%`,
                          backgroundColor: TEAM_COLORS[t],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Players */}
            <div
              className="pixel-card rounded-lg p-4 mb-6 max-w-md mx-auto"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(t => (
                  <div key={t}>
                    <div className="pixel-text text-[10px] mb-2" style={{ color: TEAM_COLORS[t] }}>
                      {TEAM_NAMES[t]}
                    </div>
                    {players.filter(p => p.team === t).map((p, i) => (
                      <div key={i} className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button className="pixel-btn text-sm px-6 py-3" onClick={startGame}>
                REMATCH
              </button>
              <button
                className="pixel-btn text-sm px-6 py-3"
                onClick={resetGame}
                style={{ borderColor: 'var(--color-text-muted)' }}
              >
                NEW GAME
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
