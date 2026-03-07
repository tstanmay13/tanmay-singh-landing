'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

interface Player {
  id: number;
  name: string;
  scores: number[];         // points per challenge
  times: number[];          // ms per challenge
  totalPoints: number;
  streak: number;
  bestStreak: number;
}

interface ChallengeResult {
  challengeIndex: number;
  type: string;
  label: string;
  winnerId: number | null;  // null = tie
  playerTimes: Record<number, number>;
}

type GameMode = 'pass' | 'split';
type Phase =
  | 'menu'
  | 'setup'
  | 'countdown'
  | 'pass-ready'       // "Hand the phone to Player X"
  | 'challenge'
  | 'challenge-result'
  | 'round-result'
  | 'final';

interface ChallengeState {
  type: string;
  label: string;
  data: Record<string, unknown>;
  startTime: number;
  completed: boolean;
  playerTime: number;       // ms to complete (for current player)
}

// ============================================================
// WORD + DATA POOLS
// ============================================================

const WORDS = [
  'pixel', 'react', 'debug', 'stack', 'array', 'fetch', 'async', 'route',
  'hooks', 'state', 'props', 'merge', 'build', 'style', 'query', 'cache',
  'class', 'typed', 'scope', 'parse', 'yield', 'proxy', 'event', 'focus',
  'modal', 'badge', 'token', 'craft', 'blaze', 'swift', 'logic', 'frame',
];

const EMOJIS = [
  '🎮', '🕹️', '👾', '🎲', '🎯', '🏆', '⚡', '🔥', '💎', '🌟',
  '🎪', '🎨', '🎭', '🎵', '🎸', '🍕', '🍔', '🌮', '🍩', '🧁',
  '🐱', '🐶', '🦊', '🐸', '🐙', '🦄', '🐝', '🦋', '🌈', '🚀',
];

const HEX_COLORS: { hex: string; name: string }[] = [
  { hex: '#FF0000', name: 'Red' },
  { hex: '#00FF00', name: 'Green' },
  { hex: '#0000FF', name: 'Blue' },
  { hex: '#FFFF00', name: 'Yellow' },
  { hex: '#FF00FF', name: 'Magenta' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#FF8800', name: 'Orange' },
  { hex: '#8800FF', name: 'Purple' },
];

const ARROW_DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

// ============================================================
// UTILS
// ============================================================

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// ============================================================
// CHALLENGE DEFINITIONS (30 unique types)
// ============================================================

interface ChallengeDef {
  type: string;
  label: string;
  instruction: string;
  generate: () => Record<string, unknown>;
}

const CHALLENGE_DEFS: ChallengeDef[] = [
  // 1. Reaction time — tap when green
  {
    type: 'reaction-green',
    label: 'Green Light',
    instruction: 'Tap when the screen turns GREEN!',
    generate: () => ({ delay: rand(1500, 4000) }),
  },
  // 2. Tap largest number
  {
    type: 'tap-largest',
    label: 'Biggest Number',
    instruction: 'Tap the LARGEST number!',
    generate: () => {
      const nums = Array.from({ length: 6 }, () => rand(1, 999));
      return { nums, answer: Math.max(...nums) };
    },
  },
  // 3. Speed typing
  {
    type: 'speed-type',
    label: 'Speed Type',
    instruction: 'Type the word as fast as you can!',
    generate: () => ({ word: pick(WORDS).toUpperCase() }),
  },
  // 4. Sequence tap 1-5
  {
    type: 'sequence-tap',
    label: 'In Order',
    instruction: 'Tap the buttons 1 through 5 in order!',
    generate: () => {
      const positions = shuffle([0, 1, 2, 3, 4]);
      return { positions };
    },
  },
  // 5. Odd emoji out
  {
    type: 'odd-emoji',
    label: 'Odd One Out',
    instruction: 'Find and tap the DIFFERENT emoji!',
    generate: () => {
      const base = pick(EMOJIS);
      let diff = pick(EMOJIS);
      while (diff === base) diff = pick(EMOJIS);
      const count = 16;
      const oddIndex = rand(0, count - 1);
      const grid = Array.from({ length: count }, (_, i) =>
        i === oddIndex ? diff : base
      );
      return { grid, oddIndex };
    },
  },
  // 6. Mental math
  {
    type: 'math-solve',
    label: 'Quick Math',
    instruction: 'Solve the math problem!',
    generate: () => {
      const ops = ['+', '-', '*'] as const;
      const op = pick([...ops]);
      let a: number, b: number, answer: number;
      if (op === '*') {
        a = rand(2, 12);
        b = rand(2, 12);
        answer = a * b;
      } else if (op === '+') {
        a = rand(10, 99);
        b = rand(10, 99);
        answer = a + b;
      } else {
        a = rand(20, 99);
        b = rand(1, a);
        answer = a - b;
      }
      const choices = shuffle([
        answer,
        answer + rand(1, 5),
        answer - rand(1, 5),
        answer + rand(6, 15),
      ]);
      return { expression: `${a} ${op} ${b}`, answer, choices };
    },
  },
  // 7. Tap the red circle
  {
    type: 'tap-red',
    label: 'Red Alert',
    instruction: 'Tap the RED circle!',
    generate: () => {
      const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899'];
      const count = 9;
      const redIdx = rand(0, count - 1);
      const circles = Array.from({ length: count }, (_, i) =>
        i === redIdx ? '#ef4444' : pick(colors)
      );
      return { circles, redIdx };
    },
  },
  // 8. Count the dots
  {
    type: 'count-dots',
    label: 'Dot Counter',
    instruction: 'Count the dots! (they vanish quickly)',
    generate: () => {
      const count = rand(5, 15);
      const dots = Array.from({ length: count }, () => ({
        x: rand(10, 90),
        y: rand(10, 90),
      }));
      return { dots, count, showTime: 1500 };
    },
  },
  // 9. Color sequence memory
  {
    type: 'color-memory',
    label: 'Color Memory',
    instruction: 'Remember the color sequence!',
    generate: () => {
      const palette = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
      const len = rand(4, 5);
      const seq = Array.from({ length: len }, () => pick(palette));
      return { sequence: seq, palette };
    },
  },
  // 10. Arrow swipe/tap
  {
    type: 'arrow-tap',
    label: 'Arrow Rush',
    instruction: 'Tap the matching arrow direction!',
    generate: () => {
      const arrows = Array.from({ length: 4 }, () => pick([...ARROW_DIRS]));
      return { arrows };
    },
  },
  // 11. Tap all bugs
  {
    type: 'tap-bugs',
    label: 'Bug Squasher',
    instruction: 'Tap ALL the bugs!',
    generate: () => {
      const bugCount = rand(5, 8);
      const bugs = Array.from({ length: bugCount }, (_, i) => ({
        id: i,
        x: rand(5, 85),
        y: rand(5, 85),
        squashed: false,
      }));
      return { bugs, total: bugCount };
    },
  },
  // 12. Number comparison
  {
    type: 'number-compare',
    label: 'Which is Bigger?',
    instruction: 'Tap the BIGGER number!',
    generate: () => {
      const a = rand(100, 9999);
      let b = rand(100, 9999);
      while (b === a) b = rand(100, 9999);
      return { a, b, answer: Math.max(a, b) };
    },
  },
  // 13. Speed tapping
  {
    type: 'speed-tap',
    label: 'Turbo Tap',
    instruction: 'Tap the button 15 times as fast as you can!',
    generate: () => ({ target: 15 }),
  },
  // 14. Sort numbers
  {
    type: 'sort-numbers',
    label: 'Sort It!',
    instruction: 'Tap numbers smallest to largest!',
    generate: () => {
      const nums = shuffle(Array.from({ length: 4 }, () => rand(1, 99)));
      // ensure unique
      const unique = [...new Set(nums)];
      while (unique.length < 4) unique.push(rand(1, 99));
      const sorted = [...unique].sort((a, b) => a - b);
      return { nums: shuffle(unique), sorted };
    },
  },
  // 15. Hex color identification
  {
    type: 'hex-color',
    label: 'Hex Master',
    instruction: 'Which hex code matches this color?',
    generate: () => {
      const target = pick(HEX_COLORS);
      const wrong = shuffle(HEX_COLORS.filter((c) => c.hex !== target.hex)).slice(0, 3);
      const choices = shuffle([target, ...wrong]);
      return { target, choices };
    },
  },
  // 16. Timer stop at 5.00
  {
    type: 'timer-stop',
    label: 'Perfect Timing',
    instruction: 'Stop the timer at exactly 3.00 seconds!',
    generate: () => ({ targetTime: 3000 }),
  },
  // 17. Word search
  {
    type: 'find-word',
    label: 'Word Hunt',
    instruction: 'Find and tap the word "CODE"!',
    generate: () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const grid: string[] = [];
      const size = 16;
      const codeIdx = rand(0, size - 1);
      for (let i = 0; i < size; i++) {
        grid.push(i === codeIdx ? 'CODE' : Array.from({ length: 4 }, () => letters[rand(0, 25)]).join(''));
      }
      return { grid, codeIdx };
    },
  },
  // 18. Mini memory match
  {
    type: 'memory-match',
    label: 'Pair Up',
    instruction: 'Match all the pairs!',
    generate: () => {
      const emojis = shuffle(EMOJIS).slice(0, 4);
      const cards = shuffle([...emojis, ...emojis]).map((e, i) => ({
        id: i,
        emoji: e,
        flipped: false,
        matched: false,
      }));
      return { cards };
    },
  },
  // 19. Prime numbers
  {
    type: 'tap-primes',
    label: 'Prime Time',
    instruction: 'Tap ONLY the prime numbers!',
    generate: () => {
      const nums = Array.from({ length: 9 }, () => rand(2, 30));
      // Ensure at least 2 primes
      while (nums.filter(isPrime).length < 2) {
        nums[rand(0, 8)] = pick([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
      }
      return { nums, primeCount: nums.filter(isPrime).length };
    },
  },
  // 20. Spinner stop
  {
    type: 'spinner-stop',
    label: 'Wheel Stop',
    instruction: 'Stop the spinner in the GREEN zone!',
    generate: () => ({ zoneStart: rand(60, 120), zoneSize: 60 }),
  },
  // 21. Tap disappearing targets
  {
    type: 'disappearing-targets',
    label: 'Quick Shot',
    instruction: 'Tap the targets before they vanish!',
    generate: () => ({ totalTargets: 5, showDuration: 1200 }),
  },
  // 22. Emoji equation
  {
    type: 'emoji-equation',
    label: 'Emoji Math',
    instruction: 'Solve the emoji equation!',
    generate: () => {
      const a = rand(1, 9);
      const b = rand(1, 9);
      const emA = pick(['🍎', '⭐', '🔥', '💎']);
      const emB = pick(['🎮', '🎯', '🏆', '🌟']);
      const answer = a + b;
      const choices = shuffle([answer, answer + 1, answer - 1, answer + 2]);
      return { a, b, emA, emB, expression: `${emA}(${a}) + ${emB}(${b}) = ?`, answer, choices };
    },
  },
  // 23. Pattern match
  {
    type: 'pattern-match',
    label: 'Pattern Match',
    instruction: 'Which pattern matches?',
    generate: () => {
      const pattern = Array.from({ length: 4 }, () => rand(0, 1));
      const correct = [...pattern];
      const wrong1 = [...pattern]; wrong1[rand(0, 3)] ^= 1;
      const wrong2 = [...pattern]; wrong2[rand(0, 3)] ^= 1; wrong2[(rand(0, 2) + 1) % 4] ^= 1;
      const wrong3 = pattern.map((v) => v ^ 1);
      const choices = shuffle([
        { pattern: correct, correct: true },
        { pattern: wrong1, correct: false },
        { pattern: wrong2, correct: false },
        { pattern: wrong3, correct: false },
      ]);
      return { pattern, choices };
    },
  },
  // 24. Tap the moving target
  {
    type: 'moving-target',
    label: 'Moving Target',
    instruction: 'Tap the bouncing target!',
    generate: () => ({
      speed: rand(2, 4),
    }),
  },
  // 25. Reverse word
  {
    type: 'reverse-word',
    label: 'Reverse It',
    instruction: 'Type this word BACKWARDS!',
    generate: () => {
      const word = pick(WORDS).toUpperCase();
      return { word, answer: word.split('').reverse().join('') };
    },
  },
  // 26. Tap even numbers only
  {
    type: 'tap-evens',
    label: 'Even Steven',
    instruction: 'Tap ONLY the even numbers!',
    generate: () => {
      const nums = Array.from({ length: 9 }, () => rand(1, 50));
      while (nums.filter((n) => n % 2 === 0).length < 2) {
        nums[rand(0, 8)] = rand(1, 25) * 2;
      }
      return { nums, evenCount: nums.filter((n) => n % 2 === 0).length };
    },
  },
  // 27. Color word stroop
  {
    type: 'stroop',
    label: 'Stroop Test',
    instruction: 'Tap the ACTUAL COLOR, ignore the text!',
    generate: () => {
      const colorMap: Record<string, string> = {
        RED: '#ef4444',
        BLUE: '#3b82f6',
        GREEN: '#22c55e',
        YELLOW: '#f59e0b',
      };
      const names = Object.keys(colorMap);
      const textWord = pick(names);
      let actualColor = pick(names);
      while (actualColor === textWord) actualColor = pick(names);
      return { textWord, actualColor, actualHex: colorMap[actualColor], choices: shuffle(names), colorMap };
    },
  },
  // 28. Simon says
  {
    type: 'simon-says',
    label: 'Simon Says',
    instruction: 'Do what Simon says... or NOT!',
    generate: () => {
      const actions = ['TAP TOP', 'TAP BOTTOM', 'TAP LEFT', 'TAP RIGHT'];
      const isSays = Math.random() > 0.4; // 60% simon says
      const action = pick(actions);
      return {
        simon: isSays,
        text: isSays ? `Simon says: ${action}` : action,
        action,
      };
    },
  },
  // 29. Longer string
  {
    type: 'longer-string',
    label: 'Longer Word',
    instruction: 'Tap the LONGER word!',
    generate: () => {
      const words = shuffle(WORDS);
      const a = words[0];
      let b = words[1];
      while (a.length === b.length) {
        b = pick(WORDS);
      }
      return { a: a.toUpperCase(), b: b.toUpperCase(), answer: a.length > b.length ? a.toUpperCase() : b.toUpperCase() };
    },
  },
  // 30. Double tap the star
  {
    type: 'double-tap',
    label: 'Double Tap',
    instruction: 'DOUBLE TAP the star!',
    generate: () => ({
      x: rand(20, 80),
      y: rand(20, 80),
    }),
  },
  // 31. Tap ascending colors (lightest to darkest)
  {
    type: 'shade-sort',
    label: 'Shade Sort',
    instruction: 'Tap the shades from LIGHTEST to DARKEST!',
    generate: () => {
      const base = rand(0, 360);
      const shades = [20, 40, 60, 80].map((l) => ({
        hsl: `hsl(${base}, 70%, ${l}%)`,
        lightness: l,
      }));
      return { shades: shuffle(shades), sorted: [...shades].sort((a, b) => b.lightness - a.lightness) };
    },
  },
  // 32. Quick binary conversion
  {
    type: 'binary-convert',
    label: 'Binary Brain',
    instruction: 'What is this binary number in decimal?',
    generate: () => {
      const decimal = rand(1, 31);
      const binary = decimal.toString(2);
      const choices = shuffle([decimal, decimal + 1, decimal - 1, decimal + rand(2, 5)].filter(n => n >= 0));
      return { binary, decimal, choices };
    },
  },
];

const CHALLENGES_PER_GAME = 15;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RetroReflexDuelPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('pass');
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [challenges, setChallenges] = useState<ChallengeDef[]>([]);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [countdown, setCountdown] = useState(3);

  // Split-screen states (player 0 and player 1)
  const [splitStates, setSplitStates] = useState<[ChallengeState | null, ChallengeState | null]>([null, null]);
  const [splitDone, setSplitDone] = useState<[boolean, boolean]>([false, false]);

  // Per-round pass-the-phone: collect times for all players before showing result
  const [roundTimes, setRoundTimes] = useState<Record<number, number>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cleanup
  useEffect(() => {
    const ref = timerRef.current;
    return () => {
      if (ref) clearInterval(ref);
    };
  }, []);

  // ============================================================
  // GAME SETUP
  // ============================================================

  const startSetup = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'split') {
      // Split screen is always 2 players — skip setup, go straight to game
      setPlayerCount(2);
      setPlayerNames(['P1', 'P2']);
      setPhase('setup'); // will auto-start via startGame
      // Directly start the game
      const pList: Player[] = ['P1', 'P2'].map((name, i) => ({
        id: i,
        name,
        scores: [],
        times: [],
        totalPoints: 0,
        streak: 0,
        bestStreak: 0,
      }));
      setPlayers(pList);
      setCurrentChallengeIdx(0);
      setCurrentPlayerIdx(0);
      setResults([]);
      setRoundTimes({});
      const picked = shuffle([...CHALLENGE_DEFS]).slice(0, CHALLENGES_PER_GAME);
      setChallenges(picked);
      setCountdown(3);
      setPhase('countdown');
      return;
    }
    const count = playerCount;
    setPlayerCount(count);
    setPlayerNames(Array.from({ length: count }, (_, i) => `P${i + 1}`));
    setPhase('setup');
  };

  const startGame = () => {
    const pList: Player[] = playerNames.map((name, i) => ({
      id: i,
      name,
      scores: [],
      times: [],
      totalPoints: 0,
      streak: 0,
      bestStreak: 0,
    }));
    setPlayers(pList);
    setCurrentChallengeIdx(0);
    setCurrentPlayerIdx(0);
    setResults([]);
    setRoundTimes({});

    // Pick random challenges
    const picked = shuffle([...CHALLENGE_DEFS]).slice(0, CHALLENGES_PER_GAME);
    setChallenges(picked);

    // Start countdown
    setCountdown(3);
    setPhase('countdown');
  };

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      if (gameMode === 'pass') {
        setPhase('pass-ready');
      } else {
        launchSplitChallenge();
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ============================================================
  // PASS-THE-PHONE MODE
  // ============================================================

  const launchPassChallenge = () => {
    const def = challenges[currentChallengeIdx];
    const data = def.generate();
    setChallengeState({
      type: def.type,
      label: def.label,
      data,
      startTime: Date.now(),
      completed: false,
      playerTime: 0,
    });
    setPhase('challenge');
  };

  const completePassChallenge = useCallback((timeMs: number) => {
    const newRoundTimes = { ...roundTimes, [currentPlayerIdx]: timeMs };
    setRoundTimes(newRoundTimes);

    const allPlayersGone = Object.keys(newRoundTimes).length === players.length;

    if (allPlayersGone) {
      // Determine winner
      const best = Math.min(...Object.values(newRoundTimes));
      const winnerId = Object.entries(newRoundTimes).find(([, t]) => t === best)?.[0];

      const def = challenges[currentChallengeIdx];
      const result: ChallengeResult = {
        challengeIndex: currentChallengeIdx,
        type: def.type,
        label: def.label,
        winnerId: winnerId !== undefined ? parseInt(winnerId) : null,
        playerTimes: newRoundTimes,
      };
      setResults((prev) => [...prev, result]);

      // Award points
      setPlayers((prev) =>
        prev.map((p) => {
          const isWinner = p.id === (winnerId !== undefined ? parseInt(winnerId) : -1);
          const newStreak = isWinner ? p.streak + 1 : 0;
          const streakBonus = isWinner && newStreak >= 3 ? (newStreak - 2) * 25 : 0;
          return {
            ...p,
            scores: [...p.scores, isWinner ? 100 + streakBonus : 0],
            times: [...p.times, newRoundTimes[p.id] || 99999],
            totalPoints: p.totalPoints + (isWinner ? 100 + streakBonus : 0),
            streak: newStreak,
            bestStreak: Math.max(p.bestStreak, newStreak),
          };
        })
      );

      setPhase('round-result');
    } else {
      // Next player's turn
      setCurrentPlayerIdx((prev) => prev + 1);
      setPhase('pass-ready');
    }
  }, [roundTimes, currentPlayerIdx, players.length, currentChallengeIdx, challenges]);

  const nextRound = () => {
    const nextIdx = currentChallengeIdx + 1;
    if (nextIdx >= CHALLENGES_PER_GAME) {
      setPhase('final');
    } else {
      setCurrentChallengeIdx(nextIdx);
      setCurrentPlayerIdx(0);
      setRoundTimes({});
      setPhase('pass-ready');
    }
  };

  // ============================================================
  // SPLIT-SCREEN MODE
  // ============================================================

  const launchSplitChallenge = () => {
    const def = challenges[currentChallengeIdx];
    const data0 = def.generate();
    const data1 = def.generate();
    const now = Date.now();
    setSplitStates([
      { type: def.type, label: def.label, data: data0, startTime: now, completed: false, playerTime: 0 },
      { type: def.type, label: def.label, data: data1, startTime: now, completed: false, playerTime: 0 },
    ]);
    setSplitDone([false, false]);
    setPhase('challenge');
  };

  const completeSplitChallenge = useCallback((playerIdx: 0 | 1, timeMs: number) => {
    setSplitStates((prev) => {
      const copy = [...prev] as [ChallengeState | null, ChallengeState | null];
      if (copy[playerIdx]) {
        copy[playerIdx] = { ...copy[playerIdx]!, completed: true, playerTime: timeMs };
      }
      return copy;
    });
    setSplitDone((prev) => {
      const copy = [...prev] as [boolean, boolean];
      copy[playerIdx] = true;
      return copy;
    });
  }, []);

  // Check if both split-screen players are done
  useEffect(() => {
    if (gameMode !== 'split' || phase !== 'challenge') return;
    if (!splitDone[0] || !splitDone[1]) return;

    const t0 = splitStates[0]?.playerTime || 99999;
    const t1 = splitStates[1]?.playerTime || 99999;
    const winnerId = t0 < t1 ? 0 : t1 < t0 ? 1 : null;

    const def = challenges[currentChallengeIdx];
    const result: ChallengeResult = {
      challengeIndex: currentChallengeIdx,
      type: def.type,
      label: def.label,
      winnerId,
      playerTimes: { 0: t0, 1: t1 },
    };
    setResults((prev) => [...prev, result]);

    setPlayers((prev) =>
      prev.map((p) => {
        const isWinner = p.id === winnerId;
        const newStreak = isWinner ? p.streak + 1 : 0;
        const streakBonus = isWinner && newStreak >= 3 ? (newStreak - 2) * 25 : 0;
        return {
          ...p,
          scores: [...p.scores, isWinner ? 100 + streakBonus : 0],
          times: [...p.times, p.id === 0 ? t0 : t1],
          totalPoints: p.totalPoints + (isWinner ? 100 + streakBonus : 0),
          streak: newStreak,
          bestStreak: Math.max(p.bestStreak, newStreak),
        };
      })
    );

    setTimeout(() => setPhase('round-result'), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitDone]);

  const nextSplitRound = () => {
    const nextIdx = currentChallengeIdx + 1;
    if (nextIdx >= CHALLENGES_PER_GAME) {
      setPhase('final');
    } else {
      setCurrentChallengeIdx(nextIdx);
      setSplitDone([false, false]);
      setCountdown(3);
      setPhase('countdown');
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetToMenu = () => {
    setPhase('menu');
    setPlayers([]);
    setResults([]);
    setChallenges([]);
    setRoundTimes({});
    setCurrentChallengeIdx(0);
    setCurrentPlayerIdx(0);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const formatMs = (ms: number) => {
    if (ms >= 99999) return 'DNF';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // ============================================================
  // CHALLENGE RENDERER
  // ============================================================

  const ChallengeRenderer = ({
    state,
    onComplete,
  }: {
    state: ChallengeState;
    onComplete: (timeMs: number) => void;
    playerId: number;
  }) => {
    // All state for challenges
    const [localData, setLocalData] = useState<Record<string, unknown>>(state.data);
    const [inputVal, setInputVal] = useState('');
    const [taps, setTaps] = useState(0);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [matchedCards, setMatchedCards] = useState<number[]>([]);
    const [reactionPhase, setReactionPhase] = useState<'waiting' | 'go' | 'done'>('waiting');
    const [timerDisplay, setTimerDisplay] = useState(0);
    const [arrowIdx, setArrowIdx] = useState(0);
    const [memoryPhase, setMemoryPhase] = useState<'show' | 'input'>('show');
    const [memoryInput, setMemoryInput] = useState<string[]>([]);
    const [dotsVisible, setDotsVisible] = useState(true);
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
    const [targetsHit, setTargetsHit] = useState(0);
    const [currentTarget, setCurrentTarget] = useState({ x: rand(10, 90), y: rand(10, 90), visible: true });
    const [spinnerAngle, setSpinnerAngle] = useState(0);
    const [lastTapTime, setLastTapTime] = useState(0);
    const [simonTapped, setSimonTapped] = useState(false);
    const [shadeOrder, setShadeOrder] = useState<number[]>([]);

    const startTimeRef = useRef(state.startTime);
    const completedRef = useRef(false);
    const animFrameRef = useRef<number>(0);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
      startTimeRef.current = Date.now();
      const refs = timeoutRefs.current;
      const animRef = animFrameRef.current;
      return () => {
        refs.forEach(clearTimeout);
        if (animRef) cancelAnimationFrame(animRef);
      };
    }, []);

    const finish = useCallback((overrideTime?: number) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const elapsed = overrideTime ?? (Date.now() - startTimeRef.current);
      onComplete(elapsed);
    }, [onComplete]);

    // Fail timeout: 10 seconds max per challenge
    useEffect(() => {
      const t = setTimeout(() => {
        if (!completedRef.current) finish(10000);
      }, 10000);
      timeoutRefs.current.push(t);
      return () => clearTimeout(t);
    }, [finish]);

    // Challenge-specific renders
    switch (state.type) {
      // 1. Reaction green
      case 'reaction-green': {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const delay = state.data.delay as number;
          const t = setTimeout(() => setReactionPhase('go'), delay);
          timeoutRefs.current.push(t);
          return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
          <div
            className="w-full h-64 rounded-lg flex items-center justify-center cursor-pointer select-none transition-colors duration-100"
            style={{
              backgroundColor: reactionPhase === 'go' ? '#22c55e' : reactionPhase === 'done' ? 'var(--color-bg-card)' : '#ef4444',
            }}
            onClick={() => {
              if (reactionPhase === 'go') {
                setReactionPhase('done');
                finish();
              }
            }}
          >
            <span className="pixel-text text-sm text-white">
              {reactionPhase === 'waiting' ? 'WAIT FOR GREEN...' : reactionPhase === 'go' ? 'TAP NOW!' : 'DONE!'}
            </span>
          </div>
        );
      }

      // 2. Tap largest
      case 'tap-largest': {
        const nums = state.data.nums as number[];
        const answer = state.data.answer as number;
        return (
          <div className="grid grid-cols-3 gap-3">
            {nums.map((n, i) => (
              <button
                key={i}
                className="pixel-btn text-lg py-4"
                onClick={() => { if (n === answer) finish(); }}
              >
                {n}
              </button>
            ))}
          </div>
        );
      }

      // 3. Speed type
      case 'speed-type': {
        const word = state.data.word as string;
        return (
          <div className="text-center">
            <p className="pixel-text text-xl mb-4" style={{ color: 'var(--color-accent)' }}>{word}</p>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-center text-xl mono-text"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '2px solid var(--color-border)',
              }}
              value={inputVal}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setInputVal(v);
                if (v === word) finish();
              }}
              placeholder="Type here..."
            />
          </div>
        );
      }

      // 4. Sequence tap
      case 'sequence-tap': {
        const positions = state.data.positions as number[];
        return (
          <div className="grid grid-cols-5 gap-2">
            {positions.map((pos, gridIdx) => {
              const num = pos + 1;
              const isNext = taps === pos;
              const isDone = taps > pos;
              return (
                <button
                  key={gridIdx}
                  className="pixel-btn py-4 text-lg"
                  style={{
                    opacity: isDone ? 0.3 : 1,
                    borderColor: isNext ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                  onClick={() => {
                    if (isDone) return;
                    if (isNext) {
                      const next = taps + 1;
                      setTaps(next);
                      if (next >= 5) finish();
                    }
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>
        );
      }

      // 5. Odd emoji
      case 'odd-emoji': {
        const grid = state.data.grid as string[];
        const oddIndex = state.data.oddIndex as number;
        return (
          <div className="grid grid-cols-4 gap-2">
            {grid.map((emoji, i) => (
              <button
                key={i}
                className="text-2xl p-3 rounded-lg transition-transform active:scale-90"
                style={{ backgroundColor: 'var(--color-surface)' }}
                onClick={() => { if (i === oddIndex) finish(); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        );
      }

      // 6. Math solve
      case 'math-solve': {
        const expression = state.data.expression as string;
        const answer = state.data.answer as number;
        const choices = state.data.choices as number[];
        return (
          <div className="text-center">
            <p className="pixel-text text-xl mb-6" style={{ color: 'var(--color-accent)' }}>{expression}</p>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((c, i) => (
                <button
                  key={i}
                  className="pixel-btn text-lg py-4"
                  onClick={() => { if (c === answer) finish(); }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 7. Tap red
      case 'tap-red': {
        const circles = state.data.circles as string[];
        const redIdx = state.data.redIdx as number;
        return (
          <div className="grid grid-cols-3 gap-3">
            {circles.map((color, i) => (
              <button
                key={i}
                className="w-16 h-16 mx-auto rounded-full transition-transform active:scale-90"
                style={{ backgroundColor: color }}
                onClick={() => { if (i === redIdx) finish(); }}
              />
            ))}
          </div>
        );
      }

      // 8. Count dots
      case 'count-dots': {
        const dots = state.data.dots as { x: number; y: number }[];
        const count = state.data.count as number;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const t = setTimeout(() => setDotsVisible(false), 1500);
          timeoutRefs.current.push(t);
          return () => clearTimeout(t);
        }, []);

        if (dotsVisible) {
          return (
            <div className="relative w-full h-48 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
              {dots.map((d, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 rounded-full"
                  style={{ left: `${d.x}%`, top: `${d.y}%`, backgroundColor: 'var(--color-accent)' }}
                />
              ))}
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Memorize the count...
              </p>
            </div>
          );
        }

        return (
          <div className="text-center">
            <p className="pixel-text text-sm mb-4">How many dots were there?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: 7 }, (_, i) => count - 3 + i).filter(n => n > 0).map((n) => (
                <button
                  key={n}
                  className="pixel-btn py-3 px-5 text-lg"
                  onClick={() => { if (n === count) finish(); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 9. Color memory
      case 'color-memory': {
        const sequence = state.data.sequence as string[];
        const palette = state.data.palette as string[];

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const t = setTimeout(() => setMemoryPhase('input'), sequence.length * 600 + 500);
          timeoutRefs.current.push(t);
          return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        if (memoryPhase === 'show') {
          return (
            <div className="text-center">
              <p className="pixel-text text-sm mb-4">Watch the sequence...</p>
              <div className="flex gap-2 justify-center">
                {sequence.map((color, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-lg animate-pulse"
                    style={{
                      backgroundColor: color,
                      animationDelay: `${i * 600}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="text-center">
            <p className="pixel-text text-sm mb-2">Repeat the sequence!</p>
            <div className="flex gap-1 justify-center mb-4">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded"
                  style={{
                    backgroundColor: memoryInput[i] || 'var(--color-surface)',
                    border: '2px solid var(--color-border)',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              {palette.map((color) => (
                <button
                  key={color}
                  className="w-14 h-14 rounded-lg transition-transform active:scale-90"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    const next = [...memoryInput, color];
                    setMemoryInput(next);
                    if (next.length === sequence.length) {
                      const correct = next.every((c, i) => c === sequence[i]);
                      if (correct) finish();
                      else finish(10000); // penalty
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );
      }

      // 10. Arrow tap
      case 'arrow-tap': {
        const arrows = state.data.arrows as string[];
        const arrowSymbol: Record<string, string> = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };
        const current = arrows[arrowIdx];

        if (arrowIdx >= arrows.length) {
          return <div className="text-center pixel-text" style={{ color: 'var(--color-accent)' }}>DONE!</div>;
        }

        return (
          <div className="text-center">
            <p className="text-6xl mb-6">{arrowSymbol[current]}</p>
            <div className="grid grid-cols-4 gap-3">
              {ARROW_DIRS.map((dir) => (
                <button
                  key={dir}
                  className="pixel-btn py-4 text-2xl"
                  onClick={() => {
                    if (dir === current) {
                      const next = arrowIdx + 1;
                      setArrowIdx(next);
                      if (next >= arrows.length) finish();
                    }
                  }}
                >
                  {arrowSymbol[dir]}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 11. Tap bugs
      case 'tap-bugs': {
        const bugs = (localData.bugs || state.data.bugs) as { id: number; x: number; y: number; squashed: boolean }[];
        const total = state.data.total as number;
        return (
          <div className="relative w-full h-64 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
            {bugs.map((bug) =>
              !bug.squashed ? (
                <button
                  key={bug.id}
                  className="absolute text-2xl transition-transform active:scale-75"
                  style={{ left: `${bug.x}%`, top: `${bug.y}%` }}
                  onClick={() => {
                    const updated = bugs.map((b) =>
                      b.id === bug.id ? { ...b, squashed: true } : b
                    );
                    setLocalData({ ...localData, bugs: updated });
                    const remaining = updated.filter((b) => !b.squashed).length;
                    if (remaining === 0) finish();
                  }}
                >
                  🐛
                </button>
              ) : (
                <span key={bug.id} className="absolute text-xl opacity-30" style={{ left: `${bug.x}%`, top: `${bug.y}%` }}>💀</span>
              )
            )}
            <p className="absolute bottom-2 right-3 text-xs mono-text" style={{ color: 'var(--color-text-muted)' }}>
              {bugs.filter((b: { squashed: boolean }) => b.squashed).length}/{total}
            </p>
          </div>
        );
      }

      // 12. Number compare
      case 'number-compare': {
        const a = state.data.a as number;
        const b = state.data.b as number;
        const answer = state.data.answer as number;
        return (
          <div className="flex gap-4 justify-center">
            {[a, b].map((n) => (
              <button
                key={n}
                className="pixel-btn text-2xl py-8 px-8"
                onClick={() => { if (n === answer) finish(); }}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        );
      }

      // 13. Speed tap
      case 'speed-tap': {
        const target = state.data.target as number;
        return (
          <div className="text-center">
            <p className="pixel-text text-4xl mb-4" style={{ color: 'var(--color-accent)' }}>
              {taps}/{target}
            </p>
            <button
              className="w-40 h-40 rounded-full pixel-btn text-xl transition-transform active:scale-95"
              style={{
                backgroundColor: taps >= target ? 'var(--color-accent)' : 'var(--color-surface)',
              }}
              onClick={() => {
                const next = taps + 1;
                setTaps(next);
                if (next >= target) finish();
              }}
            >
              TAP!
            </button>
          </div>
        );
      }

      // 14. Sort numbers
      case 'sort-numbers': {
        const nums = state.data.nums as number[];
        const sorted = state.data.sorted as number[];
        return (
          <div className="text-center">
            <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Selected: {selectedItems.map((i) => nums[i]).join(' → ') || 'none'}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {nums.map((n, i) => {
                const done = selectedItems.includes(i);
                return (
                  <button
                    key={i}
                    className="pixel-btn text-xl py-4"
                    style={{ opacity: done ? 0.3 : 1 }}
                    disabled={done}
                    onClick={() => {
                      const expected = sorted[selectedItems.length];
                      if (n === expected) {
                        const next = [...selectedItems, i];
                        setSelectedItems(next);
                        if (next.length === nums.length) finish();
                      } else {
                        // Wrong order - penalty time
                        setSelectedItems([]);
                      }
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 15. Hex color
      case 'hex-color': {
        const target = state.data.target as { hex: string; name: string };
        const choices = state.data.choices as { hex: string; name: string }[];
        return (
          <div className="text-center">
            <div
              className="w-24 h-24 rounded-lg mx-auto mb-4 border-2"
              style={{ backgroundColor: target.hex, borderColor: 'var(--color-border)' }}
            />
            <div className="grid grid-cols-2 gap-3">
              {choices.map((c, i) => (
                <button
                  key={i}
                  className="pixel-btn py-3 mono-text text-sm"
                  onClick={() => { if (c.hex === target.hex) finish(); }}
                >
                  {c.hex}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 16. Timer stop
      case 'timer-stop': {
        const targetTime = state.data.targetTime as number;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const interval = setInterval(() => {
            setTimerDisplay(Date.now() - startTimeRef.current);
          }, 10);
          return () => clearInterval(interval);
        }, []);

        return (
          <div className="text-center">
            <p className="mono-text text-5xl mb-6" style={{ color: 'var(--color-accent)' }}>
              {(timerDisplay / 1000).toFixed(2)}s
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Target: {(targetTime / 1000).toFixed(2)}s
            </p>
            <button
              className="pixel-btn text-xl py-4 px-8"
              onClick={() => {
                const diff = Math.abs(timerDisplay - targetTime);
                // Score is inverse of diff — closer = faster "time"
                finish(diff);
              }}
            >
              STOP!
            </button>
          </div>
        );
      }

      // 17. Find word
      case 'find-word': {
        const grid = state.data.grid as string[];
        const codeIdx = state.data.codeIdx as number;
        return (
          <div className="grid grid-cols-4 gap-2">
            {grid.map((cell, i) => (
              <button
                key={i}
                className="pixel-btn py-3 text-xs mono-text"
                onClick={() => { if (i === codeIdx) finish(); }}
              >
                {cell}
              </button>
            ))}
          </div>
        );
      }

      // 18. Memory match
      case 'memory-match': {
        const cards = (localData.cards || state.data.cards) as {
          id: number;
          emoji: string;
          flipped: boolean;
          matched: boolean;
        }[];

        return (
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card) => {
              const isFlipped = flippedCards.includes(card.id) || matchedCards.includes(card.id);
              return (
                <button
                  key={card.id}
                  className="h-16 rounded-lg text-2xl transition-transform active:scale-95"
                  style={{
                    backgroundColor: isFlipped ? 'var(--color-bg-card)' : 'var(--color-accent)',
                  }}
                  onClick={() => {
                    if (isFlipped || flippedCards.length >= 2) return;
                    const newFlipped = [...flippedCards, card.id];
                    setFlippedCards(newFlipped);

                    if (newFlipped.length === 2) {
                      const [id1, id2] = newFlipped;
                      const c1 = cards.find((c) => c.id === id1)!;
                      const c2 = cards.find((c) => c.id === id2)!;
                      if (c1.emoji === c2.emoji) {
                        const newMatched = [...matchedCards, id1, id2];
                        setMatchedCards(newMatched);
                        setFlippedCards([]);
                        if (newMatched.length === cards.length) finish();
                      } else {
                        setTimeout(() => setFlippedCards([]), 500);
                      }
                    }
                  }}
                >
                  {isFlipped ? card.emoji : '?'}
                </button>
              );
            })}
          </div>
        );
      }

      // 19. Primes
      case 'tap-primes': {
        const nums = state.data.nums as number[];
        const primeCount = state.data.primeCount as number;
        return (
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {selectedItems.length}/{primeCount} primes found
            </p>
            <div className="grid grid-cols-3 gap-3">
              {nums.map((n, i) => {
                const tapped = selectedItems.includes(i);
                return (
                  <button
                    key={i}
                    className="pixel-btn py-4 text-lg"
                    style={{
                      opacity: tapped ? 0.3 : 1,
                      borderColor: tapped ? 'var(--color-accent)' : 'var(--color-border)',
                    }}
                    disabled={tapped}
                    onClick={() => {
                      if (isPrime(n)) {
                        const next = [...selectedItems, i];
                        setSelectedItems(next);
                        if (next.length === primeCount) finish();
                      } else {
                        finish(10000); // wrong = penalty
                      }
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 20. Spinner stop
      case 'spinner-stop': {
        const zoneStart = state.data.zoneStart as number;
        const zoneSize = state.data.zoneSize as number;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          let angle = 0;
          const frame = () => {
            angle = (angle + 4) % 360;
            setSpinnerAngle(angle);
            animFrameRef.current = requestAnimationFrame(frame);
          };
          animFrameRef.current = requestAnimationFrame(frame);
          return () => cancelAnimationFrame(animFrameRef.current);
        }, []);

        const inZone = spinnerAngle >= zoneStart && spinnerAngle <= zoneStart + zoneSize;

        return (
          <div className="text-center">
            <div className="relative w-48 h-48 mx-auto mb-4">
              {/* Zone indicator */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                <path
                  d={describeArc(50, 50, 45, zoneStart, zoneStart + zoneSize)}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="8"
                />
                {/* Spinner needle */}
                <line
                  x1="50" y1="50"
                  x2={50 + 40 * Math.cos((spinnerAngle - 90) * Math.PI / 180)}
                  y2={50 + 40 * Math.sin((spinnerAngle - 90) * Math.PI / 180)}
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="4" fill="var(--color-accent)" />
              </svg>
            </div>
            <button
              className="pixel-btn text-lg py-3 px-8"
              onClick={() => {
                if (inZone) finish();
                else finish(10000);
              }}
            >
              STOP!
            </button>
          </div>
        );
      }

      // 21. Disappearing targets
      case 'disappearing-targets': {
        const totalTargets = state.data.totalTargets as number;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          const spawnTarget = () => {
            setCurrentTarget({
              x: rand(10, 80),
              y: rand(10, 80),
              visible: true,
            });
            const t = setTimeout(() => {
              setCurrentTarget((prev) => ({ ...prev, visible: false }));
            }, 1200);
            timeoutRefs.current.push(t);
          };
          spawnTarget();
        }, [targetsHit]);

        return (
          <div className="relative w-full h-64 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
            <p className="absolute top-2 right-3 text-xs mono-text" style={{ color: 'var(--color-text-muted)' }}>
              {targetsHit}/{totalTargets}
            </p>
            {currentTarget.visible && (
              <button
                className="absolute w-12 h-12 rounded-full transition-transform active:scale-75"
                style={{
                  left: `${currentTarget.x}%`,
                  top: `${currentTarget.y}%`,
                  backgroundColor: 'var(--color-red)',
                }}
                onClick={() => {
                  const next = targetsHit + 1;
                  setTargetsHit(next);
                  if (next >= totalTargets) finish();
                  else {
                    setCurrentTarget((prev) => ({ ...prev, visible: false }));
                  }
                }}
              />
            )}
          </div>
        );
      }

      // 22. Emoji equation
      case 'emoji-equation': {
        const expression = state.data.expression as string;
        const answer = state.data.answer as number;
        const choices = state.data.choices as number[];
        return (
          <div className="text-center">
            <p className="pixel-text text-lg mb-6" style={{ color: 'var(--color-accent)' }}>{expression}</p>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((c, i) => (
                <button key={i} className="pixel-btn text-xl py-4" onClick={() => { if (c === answer) finish(); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 23. Pattern match
      case 'pattern-match': {
        const pattern = state.data.pattern as number[];
        const choices = state.data.choices as { pattern: number[]; correct: boolean }[];
        return (
          <div className="text-center">
            <p className="pixel-text text-xs mb-2">Match this pattern:</p>
            <div className="flex gap-2 justify-center mb-6">
              {pattern.map((v, i) => (
                <div key={i} className="w-10 h-10 rounded" style={{ backgroundColor: v ? 'var(--color-accent)' : 'var(--color-surface)' }} />
              ))}
            </div>
            <div className="space-y-3">
              {choices.map((choice, i) => (
                <button
                  key={i}
                  className="flex gap-2 justify-center w-full py-2 rounded-lg transition-transform active:scale-95"
                  style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
                  onClick={() => { if (choice.correct) finish(); else finish(10000); }}
                >
                  {choice.pattern.map((v, j) => (
                    <div key={j} className="w-8 h-8 rounded" style={{ backgroundColor: v ? 'var(--color-accent)' : 'var(--color-surface)' }} />
                  ))}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 24. Moving target
      case 'moving-target': {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          let x = 50, y = 50, dx = 2, dy = 1.5;
          const frame = () => {
            x += dx;
            y += dy;
            if (x < 5 || x > 85) dx *= -1;
            if (y < 5 || y > 85) dy *= -1;
            setTargetPos({ x, y });
            animFrameRef.current = requestAnimationFrame(frame);
          };
          animFrameRef.current = requestAnimationFrame(frame);
          return () => cancelAnimationFrame(animFrameRef.current);
        }, []);

        return (
          <div className="relative w-full h-64 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
            <button
              className="absolute w-14 h-14 rounded-full transition-none active:scale-90"
              style={{
                left: `${targetPos.x}%`,
                top: `${targetPos.y}%`,
                backgroundColor: 'var(--color-accent)',
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => finish()}
            />
          </div>
        );
      }

      // 25. Reverse word
      case 'reverse-word': {
        const word = state.data.word as string;
        const answer = state.data.answer as string;
        return (
          <div className="text-center">
            <p className="pixel-text text-xl mb-2" style={{ color: 'var(--color-accent)' }}>{word}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Type it backwards!</p>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-center text-xl mono-text"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '2px solid var(--color-border)',
              }}
              value={inputVal}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setInputVal(v);
                if (v === answer) finish();
              }}
              placeholder="Type backwards..."
            />
          </div>
        );
      }

      // 26. Even numbers
      case 'tap-evens': {
        const nums = state.data.nums as number[];
        const evenCount = state.data.evenCount as number;
        return (
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {selectedItems.length}/{evenCount} evens found
            </p>
            <div className="grid grid-cols-3 gap-3">
              {nums.map((n, i) => {
                const tapped = selectedItems.includes(i);
                return (
                  <button
                    key={i}
                    className="pixel-btn py-4 text-lg"
                    style={{ opacity: tapped ? 0.3 : 1 }}
                    disabled={tapped}
                    onClick={() => {
                      if (n % 2 === 0) {
                        const next = [...selectedItems, i];
                        setSelectedItems(next);
                        if (next.length === evenCount) finish();
                      } else {
                        finish(10000);
                      }
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 27. Stroop test
      case 'stroop': {
        const textWord = state.data.textWord as string;
        const actualColor = state.data.actualColor as string;
        const actualHex = state.data.actualHex as string;
        const choices = state.data.choices as string[];
        const colorMap = state.data.colorMap as Record<string, string>;
        return (
          <div className="text-center">
            <p className="pixel-text text-3xl mb-6" style={{ color: actualHex }}>{textWord}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>What COLOR is the text?</p>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((name) => (
                <button
                  key={name}
                  className="pixel-btn py-3"
                  style={{ borderColor: colorMap[name] }}
                  onClick={() => { if (name === actualColor) finish(); else finish(10000); }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // 28. Simon says
      case 'simon-says': {
        const simon = state.data.simon as boolean;
        const text = state.data.text as string;
        const action = state.data.action as string;

        // If NOT simon says and they wait 3s, they win
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (!simon) {
            const t = setTimeout(() => {
              if (!simonTapped && !completedRef.current) finish();
            }, 3000);
            timeoutRefs.current.push(t);
            return () => clearTimeout(t);
          }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [simon]);

        return (
          <div className="text-center">
            <p className="pixel-text text-sm mb-6" style={{ color: 'var(--color-orange)' }}>{text}</p>
            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 h-48 mx-auto">
              {/* Top */}
              <div className="col-start-2 row-start-1">
                <button
                  className="w-full h-full rounded-lg pixel-btn text-xs"
                  onClick={() => {
                    setSimonTapped(true);
                    if (simon && action === 'TAP TOP') finish();
                    else if (!simon) finish(10000);
                    else finish(10000);
                  }}
                >
                  TOP
                </button>
              </div>
              {/* Left */}
              <div className="col-start-1 row-start-2">
                <button
                  className="w-full h-full rounded-lg pixel-btn text-xs"
                  onClick={() => {
                    setSimonTapped(true);
                    if (simon && action === 'TAP LEFT') finish();
                    else if (!simon) finish(10000);
                    else finish(10000);
                  }}
                >
                  LEFT
                </button>
              </div>
              {/* Right */}
              <div className="col-start-3 row-start-2">
                <button
                  className="w-full h-full rounded-lg pixel-btn text-xs"
                  onClick={() => {
                    setSimonTapped(true);
                    if (simon && action === 'TAP RIGHT') finish();
                    else if (!simon) finish(10000);
                    else finish(10000);
                  }}
                >
                  RIGHT
                </button>
              </div>
              {/* Bottom */}
              <div className="col-start-2 row-start-3">
                <button
                  className="w-full h-full rounded-lg pixel-btn text-xs"
                  onClick={() => {
                    setSimonTapped(true);
                    if (simon && action === 'TAP BOTTOM') finish();
                    else if (!simon) finish(10000);
                    else finish(10000);
                  }}
                >
                  BOTTOM
                </button>
              </div>
            </div>
            {!simon && (
              <p className="text-xs mt-4 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                Simon didn&apos;t say... wait it out!
              </p>
            )}
          </div>
        );
      }

      // 29. Longer string
      case 'longer-string': {
        const a = state.data.a as string;
        const b = state.data.b as string;
        const answer = state.data.answer as string;
        return (
          <div className="flex gap-4 justify-center">
            {[a, b].map((w) => (
              <button
                key={w}
                className="pixel-btn text-lg py-6 px-6"
                onClick={() => { if (w === answer) finish(); else finish(10000); }}
              >
                {w}
              </button>
            ))}
          </div>
        );
      }

      // 30. Double tap
      case 'double-tap': {
        const x = state.data.x as number;
        const y = state.data.y as number;
        return (
          <div className="relative w-full h-64 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
            <button
              className="absolute text-5xl transition-transform active:scale-75"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={() => {
                const now = Date.now();
                if (now - lastTapTime < 400 && lastTapTime > 0) {
                  finish();
                }
                setLastTapTime(now);
              }}
            >
              ⭐
            </button>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Double-tap the star quickly!
            </p>
          </div>
        );
      }

      // 31. Shade sort
      case 'shade-sort': {
        const shades = state.data.shades as { hsl: string; lightness: number }[];
        const sorted = state.data.sorted as { hsl: string; lightness: number }[];
        return (
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {shadeOrder.length}/{shades.length} picked
            </p>
            <div className="grid grid-cols-4 gap-3">
              {shades.map((shade, i) => {
                const done = shadeOrder.includes(i);
                return (
                  <button
                    key={i}
                    className="w-16 h-16 rounded-lg mx-auto transition-transform active:scale-90"
                    style={{
                      backgroundColor: shade.hsl,
                      opacity: done ? 0.3 : 1,
                      border: '2px solid var(--color-border)',
                    }}
                    disabled={done}
                    onClick={() => {
                      const expected = sorted[shadeOrder.length];
                      if (shade.lightness === expected.lightness) {
                        const next = [...shadeOrder, i];
                        setShadeOrder(next);
                        if (next.length === shades.length) finish();
                      } else {
                        setShadeOrder([]);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      }

      // 32. Binary convert
      case 'binary-convert': {
        const binary = state.data.binary as string;
        const decimal = state.data.decimal as number;
        const choices = state.data.choices as number[];
        return (
          <div className="text-center">
            <p className="pixel-text text-2xl mb-6 mono-text" style={{ color: 'var(--color-accent)' }}>{binary}</p>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((c, i) => (
                <button key={i} className="pixel-btn text-xl py-4" onClick={() => { if (c === decimal) finish(); else finish(10000); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        );
      }

      default:
        return <p>Unknown challenge type</p>;
    }
  };

  // SVG arc helper for spinner
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (!mounted) return null;

  // MENU
  if (phase === 'menu') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto text-center">
          <Link href="/games" className="text-sm transition-colors hover:opacity-80 inline-block mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            &larr; Back to Games
          </Link>

          <div className="mb-8">
            <span className="text-6xl block mb-4">⚡</span>
            <h1 className="pixel-text text-lg md:text-2xl mb-2" style={{ color: 'var(--color-accent)' }}>
              RETRO REFLEX DUEL
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Rapid-fire micro-challenges. Fastest fingers win.
            </p>
          </div>

          <div className="space-y-4">
            <button
              className="pixel-btn w-full py-4 text-sm"
              onClick={() => startSetup('pass')}
            >
              📱 PASS THE PHONE (2-8 players)
            </button>
            <button
              className="pixel-btn w-full py-4 text-sm"
              onClick={() => startSetup('split')}
            >
              🖥️ SPLIT SCREEN (2 players)
            </button>
          </div>

          <div className="mt-8 pixel-card rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <h3 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-orange)' }}>HOW TO PLAY</h3>
            <div className="text-left text-xs space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <p>• {CHALLENGES_PER_GAME} rapid micro-challenges per game</p>
              <p>• Each challenge: 3-10 seconds to complete</p>
              <p>• Fastest player wins 100 points per round</p>
              <p>• Win streaks earn bonus points!</p>
              <p>• 32 unique challenge types</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SETUP
  if (phase === 'setup') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <button
            className="text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={resetToMenu}
          >
            &larr; Back
          </button>

          <h2 className="pixel-text text-sm mb-6 text-center" style={{ color: 'var(--color-accent)' }}>
            {gameMode === 'pass' ? 'PASS THE PHONE' : 'SPLIT SCREEN'} SETUP
          </h2>

          <div className="mb-8 text-center">
            <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>HOW MANY PLAYERS?</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  className="w-12 h-12 rounded-lg text-sm font-bold transition-all"
                  style={{
                    backgroundColor: playerCount === n ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                    border: `2px solid ${playerCount === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                  onClick={() => {
                    setPlayerCount(n);
                    setPlayerNames(Array.from({ length: n }, (_, i) => `P${i + 1}`));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              Players will be P1, P2, P3...
            </p>
          </div>

          <button className="pixel-btn w-full py-4" onClick={startGame}>
            START GAME
          </button>
        </div>
      </div>
    );
  }

  // COUNTDOWN
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="pixel-text text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Challenge {currentChallengeIdx + 1}/{CHALLENGES_PER_GAME}
          </p>
          {countdown > 0 ? (
            <span
              className="pixel-text text-6xl animate-pixel-bounce"
              style={{ color: 'var(--color-accent)' }}
            >
              {countdown}
            </span>
          ) : (
            <span
              className="pixel-text text-4xl animate-scale-in"
              style={{ color: 'var(--color-orange)' }}
            >
              GO!
            </span>
          )}
        </div>
      </div>
    );
  }

  // PASS-READY
  if (phase === 'pass-ready') {
    const player = players[currentPlayerIdx];
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <span className="text-5xl block mb-4">📱</span>
          <p className="pixel-text text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Challenge {currentChallengeIdx + 1}/{CHALLENGES_PER_GAME}
          </p>
          <h2 className="pixel-text text-lg mb-2" style={{ color: PLAYER_COLORS[currentPlayerIdx % PLAYER_COLORS.length] }}>
            {player?.name || `Player ${currentPlayerIdx + 1}`}
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {challenges[currentChallengeIdx]?.label}
          </p>
          <p className="text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Hand the phone to this player. Others look away!
          </p>
          <button className="pixel-btn py-4 px-8 text-sm" onClick={launchPassChallenge}>
            I&apos;M READY!
          </button>
        </div>
      </div>
    );
  }

  // CHALLENGE (pass-the-phone mode)
  if (phase === 'challenge' && gameMode === 'pass' && challengeState) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="pixel-text text-xs" style={{ color: PLAYER_COLORS[currentPlayerIdx % PLAYER_COLORS.length] }}>
              {players[currentPlayerIdx]?.name}
            </span>
            <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {currentChallengeIdx + 1}/{CHALLENGES_PER_GAME}
            </span>
          </div>
          <h3 className="pixel-text text-xs mb-1 text-center" style={{ color: 'var(--color-accent)' }}>
            {challengeState.label}
          </h3>
          <p className="text-xs text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {challenges[currentChallengeIdx]?.instruction}
          </p>
          <ChallengeRenderer
            key={`${currentChallengeIdx}-${currentPlayerIdx}`}
            state={challengeState}
            onComplete={completePassChallenge}
            playerId={currentPlayerIdx}
          />
        </div>
      </div>
    );
  }

  // CHALLENGE (split-screen mode)
  if (phase === 'challenge' && gameMode === 'split' && splitStates[0] && splitStates[1]) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {[0, 1].map((pIdx) => {
          const pState = splitStates[pIdx as 0 | 1]!;
          const done = splitDone[pIdx as 0 | 1];
          return (
            <div
              key={pIdx}
              className="flex-1 p-4 flex flex-col"
              style={{
                borderRight: pIdx === 0 ? '2px solid var(--color-border)' : undefined,
                borderBottom: pIdx === 0 ? '2px solid var(--color-border)' : undefined,
                opacity: done ? 0.5 : 1,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="pixel-text text-xs" style={{ color: PLAYER_COLORS[pIdx] }}>
                  {players[pIdx]?.name}
                </span>
                {done && (
                  <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                    DONE!
                  </span>
                )}
              </div>
              <p className="text-xs text-center mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {challenges[currentChallengeIdx]?.instruction}
              </p>
              {!done ? (
                <ChallengeRenderer
                  key={`split-${currentChallengeIdx}-${pIdx}`}
                  state={pState}
                  onComplete={(t) => completeSplitChallenge(pIdx as 0 | 1, t)}
                  playerId={pIdx}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-4xl">✅</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ROUND RESULT
  if (phase === 'round-result') {
    const lastResult = results[results.length - 1];
    const winnerId = lastResult?.winnerId;
    const winner = winnerId !== null ? players[winnerId!] : null;

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-md w-full text-center">
          <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Challenge {currentChallengeIdx + 1}/{CHALLENGES_PER_GAME}: {lastResult?.label}
          </p>

          {winner ? (
            <>
              <span className="text-5xl block mb-2 animate-pixel-bounce">👑</span>
              <h2 className="pixel-text text-lg mb-1" style={{ color: PLAYER_COLORS[winnerId! % PLAYER_COLORS.length] }}>
                {winner.name} WINS!
              </h2>
              {winner.streak >= 3 && (
                <p className="text-xs mb-4 animate-glow-pulse" style={{ color: 'var(--color-orange)' }}>
                  🔥 {winner.streak} WIN STREAK! +{(winner.streak - 2) * 25} bonus
                </p>
              )}
            </>
          ) : (
            <>
              <span className="text-5xl block mb-2">🤝</span>
              <h2 className="pixel-text text-lg mb-1" style={{ color: 'var(--color-text)' }}>TIE!</h2>
            </>
          )}

          {/* Player times */}
          <div className="mt-6 space-y-2">
            {players
              .map((p) => ({ player: p, time: lastResult?.playerTimes[p.id] || 99999 }))
              .sort((a, b) => a.time - b.time)
              .map(({ player: p, time }, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: i === 0 && winnerId !== null ? 'var(--color-accent-glow)' : 'var(--color-bg-card)',
                    border: `1px solid ${i === 0 && winnerId !== null ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: PLAYER_COLORS[p.id % PLAYER_COLORS.length] }}>
                    {i === 0 && winnerId !== null ? '👑 ' : ''}{p.name}
                  </span>
                  <span className="mono-text text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatMs(time)}
                  </span>
                </div>
              ))}
          </div>

          {/* Scoreboard */}
          <div className="mt-6 mb-6">
            <h3 className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>STANDINGS</h3>
            <div className="flex gap-3 justify-center flex-wrap">
              {[...players].sort((a, b) => b.totalPoints - a.totalPoints).map((p) => (
                <div key={p.id} className="text-center px-3 py-1 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <span className="text-xs block" style={{ color: PLAYER_COLORS[p.id % PLAYER_COLORS.length] }}>
                    {p.name}
                  </span>
                  <span className="mono-text text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                    {p.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="pixel-btn py-3 px-8" onClick={gameMode === 'pass' ? nextRound : nextSplitRound}>
            {currentChallengeIdx + 1 >= CHALLENGES_PER_GAME ? 'SEE FINAL RESULTS' : 'NEXT CHALLENGE'}
          </button>
        </div>
      </div>
    );
  }

  // FINAL RESULTS
  if (phase === 'final') {
    const sorted = [...players].sort((a, b) => b.totalPoints - a.totalPoints);
    const podiumEmojis = ['🥇', '🥈', '🥉'];

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto text-center">
          <span className="text-6xl block mb-2 animate-pixel-bounce">🏆</span>
          <h1 className="pixel-text text-lg mb-1" style={{ color: 'var(--color-accent)' }}>GAME OVER!</h1>
          <p className="text-xs mb-8" style={{ color: 'var(--color-text-secondary)' }}>Final Results</p>

          {/* Podium */}
          <div className="space-y-3 mb-8">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg animate-fade-in-up"
                style={{
                  backgroundColor: i === 0 ? 'var(--color-accent-glow)' : 'var(--color-bg-card)',
                  border: `2px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  animationDelay: `${i * 150}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{podiumEmojis[i] || `#${i + 1}`}</span>
                  <div className="text-left">
                    <span className="font-bold text-sm" style={{ color: PLAYER_COLORS[p.id % PLAYER_COLORS.length] }}>
                      {p.name}
                    </span>
                    <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.scores.filter((s) => s > 0).length} wins | Best streak: {p.bestStreak}
                    </span>
                  </div>
                </div>
                <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
                  {p.totalPoints}
                </span>
              </div>
            ))}
          </div>

          {/* Challenge Breakdown */}
          <div className="pixel-card rounded-lg p-4 mb-8" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <h3 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-orange)' }}>CHALLENGE BREAKDOWN</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((r, i) => {
                const winner = r.winnerId !== null ? players[r.winnerId] : null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {i + 1}. {r.label}
                    </span>
                    <span style={{ color: winner ? PLAYER_COLORS[winner.id % PLAYER_COLORS.length] : 'var(--color-text-muted)' }}>
                      {winner ? `${winner.name} (${formatMs(r.playerTimes[winner.id])})` : 'Tie'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button className="pixel-btn py-3 px-6" onClick={startGame}>
              PLAY AGAIN
            </button>
            <button className="pixel-btn py-3 px-6" onClick={resetToMenu}>
              NEW GAME
            </button>
          </div>

          <Link href="/games" className="text-xs mt-6 inline-block transition-colors hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
            &larr; Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

// Player color palette
const PLAYER_COLORS = [
  '#00ff88', // green
  '#3b82f6', // blue
  '#f59e0b', // orange
  '#ec4899', // pink
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#22c55e', // lime
];
