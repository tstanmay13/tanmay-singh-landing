'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import GamePlayCounter from '@/components/GamePlayCounter';

/* ================================================================
   TYPES
   ================================================================ */

interface Player {
  id: number;
  name: string;
  score: number;
  avatar: string;
}

interface MergedLine {
  lineNum: number;
  text: string;
  author: 'A' | 'B';
}

type Vote = 'ship' | 'revert' | 'review';

interface PairResult {
  playerA: Player;
  playerB: Player;
  spec: FunctionSpec;
  merged: MergedLine[];
  votes: Record<Vote, number>;
  mergeStatus: 'CONFLICT' | 'CLEAN MERGE' | 'FORCE PUSH';
}

type GamePhase =
  | 'setup'
  | 'spec-reveal'
  | 'writing-a'
  | 'pass-phone'
  | 'writing-b'
  | 'merge-reveal'
  | 'voting'
  | 'pair-results'
  | 'final-results';

interface FunctionSpec {
  text: string;
  category: 'real' | 'absurd' | 'workplace';
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const LINES_PER_PLAYER = 4;
const WRITING_TIME = 60;
const AVATARS = [
  '\u{1F468}\u200D\u{1F4BB}', '\u{1F469}\u200D\u{1F4BB}',
  '\u{1F9D1}\u200D\u{1F4BB}', '\u{1F47E}', '\u{1F916}', '\u{1F47B}',
];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

/* ================================================================
   FUNCTION SPECS (64)
   ================================================================ */

const FUNCTION_SPECS: FunctionSpec[] = [
  // Real coding tasks (20)
  { text: 'Write a function that greets a user by name', category: 'real' },
  { text: 'Write a function that calculates a tip at a restaurant', category: 'real' },
  { text: 'Write a function that checks if a string is a palindrome', category: 'real' },
  { text: 'Write a function that sorts an array of numbers', category: 'real' },
  { text: 'Write a function that validates an email address', category: 'real' },
  { text: 'Write a function that converts Celsius to Fahrenheit', category: 'real' },
  { text: 'Write a function that counts the vowels in a string', category: 'real' },
  { text: 'Write a function that reverses a linked list', category: 'real' },
  { text: 'Write a function that finds the largest number in an array', category: 'real' },
  { text: 'Write a function that removes duplicates from an array', category: 'real' },
  { text: 'Write a function that calculates the factorial of a number', category: 'real' },
  { text: 'Write a function that checks if a number is prime', category: 'real' },
  { text: 'Write a function that flattens a nested array', category: 'real' },
  { text: 'Write a function that debounces another function', category: 'real' },
  { text: 'Write a function that generates a random hex color', category: 'real' },
  { text: 'Write a function that parses a URL into its parts', category: 'real' },
  { text: 'Write a function that implements binary search', category: 'real' },
  { text: 'Write a function that deep clones an object', category: 'real' },
  { text: 'Write a function that throttles API requests', category: 'real' },
  { text: 'Write a function that formats a date as "3 days ago"', category: 'real' },

  // Absurd tasks (22)
  { text: 'Write a function that decides what to have for lunch', category: 'absurd' },
  { text: 'Write a function that automates your morning routine', category: 'absurd' },
  { text: 'Write a function that predicts if your crush likes you back', category: 'absurd' },
  { text: 'Write a function that calculates how many cats you should own', category: 'absurd' },
  { text: 'Write a function that determines if a hotdog is a sandwich', category: 'absurd' },
  { text: 'Write a function that translates baby talk into English', category: 'absurd' },
  { text: 'Write a function that rates your outfit from 1 to 10', category: 'absurd' },
  { text: 'Write a function that picks the best Netflix show to fall asleep to', category: 'absurd' },
  { text: 'Write a function that calculates your chance of surviving a zombie apocalypse', category: 'absurd' },
  { text: 'Write a function that determines if you need a therapist', category: 'absurd' },
  { text: 'Write a function that generates a conspiracy theory', category: 'absurd' },
  { text: 'Write a function that orders pizza based on your mood', category: 'absurd' },
  { text: 'Write a function that writes your Tinder bio', category: 'absurd' },
  { text: 'Write a function that decides if you should text your ex', category: 'absurd' },
  { text: 'Write a function that calculates your spirit animal', category: 'absurd' },
  { text: 'Write a function that computes the meaning of life', category: 'absurd' },
  { text: 'Write a function that simulates an argument between two AIs', category: 'absurd' },
  { text: 'Write a function that generates a valid excuse for any situation', category: 'absurd' },
  { text: 'Write a function that predicts the next trendy food', category: 'absurd' },
  { text: 'Write a function that determines your villain origin story', category: 'absurd' },
  { text: 'Write a function that converts any song into an elevator music version', category: 'absurd' },
  { text: 'Write a function that names your houseplants based on personality', category: 'absurd' },

  // Workplace humor (22)
  { text: 'Write a function that explains why the code is not working', category: 'workplace' },
  { text: 'Write a function that convinces your manager to let you use a new framework', category: 'workplace' },
  { text: 'Write a function that generates excuses for being late to standup', category: 'workplace' },
  { text: 'Write a function that automatically declines meetings', category: 'workplace' },
  { text: 'Write a function that translates manager-speak into English', category: 'workplace' },
  { text: 'Write a function that estimates the real deadline from a PM deadline', category: 'workplace' },
  { text: 'Write a function that writes your self-review', category: 'workplace' },
  { text: 'Write a function that blames the right person in a post-mortem', category: 'workplace' },
  { text: 'Write a function that detects if a meeting could have been an email', category: 'workplace' },
  { text: 'Write a function that auto-generates Jira tickets', category: 'workplace' },
  { text: 'Write a function that calculates how much coffee you need to survive the day', category: 'workplace' },
  { text: 'Write a function that predicts which microservice will go down next', category: 'workplace' },
  { text: 'Write a function that crafts the perfect "per my last email" response', category: 'workplace' },
  { text: 'Write a function that generates a convincing-sounding sprint retro comment', category: 'workplace' },
  { text: 'Write a function that determines who broke prod', category: 'workplace' },
  { text: 'Write a function that converts a simple task into an enterprise architecture', category: 'workplace' },
  { text: 'Write a function that writes commit messages that sound impressive', category: 'workplace' },
  { text: 'Write a function that calculates your actual productive hours per day', category: 'workplace' },
  { text: 'Write a function that detects if your PR reviewer actually read the code', category: 'workplace' },
  { text: 'Write a function that generates filler for a design document', category: 'workplace' },
  { text: 'Write a function that translates "quick sync" into actual meeting length', category: 'workplace' },
  { text: 'Write a function that diplomatically says "I told you so" in code review', category: 'workplace' },
];

/* ================================================================
   HELPERS
   ================================================================ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickSpec(used: Set<string>): FunctionSpec {
  const available = FUNCTION_SPECS.filter((s) => !used.has(s.text));
  if (available.length === 0) return shuffle(FUNCTION_SPECS)[0];
  return shuffle(available)[0];
}

function determineMergeStatus(linesA: string[], linesB: string[]): 'CONFLICT' | 'CLEAN MERGE' | 'FORCE PUSH' {
  const allText = [...linesA, ...linesB].join(' ').toLowerCase();
  const codeKeywords = ['function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', '(', ')', '{', '}', '=>', ';'];
  const codeScore = codeKeywords.filter((kw) => allText.includes(kw)).length;

  if (codeScore >= 6) return 'CLEAN MERGE';
  if (codeScore >= 3) return 'CONFLICT';
  return 'FORCE PUSH';
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function MergeConflictPage() {
  const [mounted, setMounted] = useState(false);

  // Setup
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(4);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [usedSpecs, setUsedSpecs] = useState<Set<string>>(new Set());

  // Current pair
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [currentSpec, setCurrentSpec] = useState<FunctionSpec | null>(null);

  // Writing
  const [linesA, setLinesA] = useState<string[]>([]);
  const [linesB, setLinesB] = useState<string[]>([]);
  const [currentLineInput, setCurrentLineInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(WRITING_TIME);

  // Merge reveal
  const [mergedLines, setMergedLines] = useState<MergedLine[]>([]);
  const [revealedLineCount, setRevealedLineCount] = useState(0);

  // Voting
  const [currentVoter, setCurrentVoter] = useState(0);
  const [votes, setVotes] = useState<Record<Vote, number>>({ ship: 0, revert: 0, review: 0 });

  // Results
  const [pairResults, setPairResults] = useState<PairResult[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Timer */
  useEffect(() => {
    if (phase !== 'writing-a' && phase !== 'writing-b') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentPairIndex]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && (phase === 'writing-a' || phase === 'writing-b')) {
      handleAutoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /* Focus input */
  useEffect(() => {
    if ((phase === 'writing-a' || phase === 'writing-b') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, linesA.length, linesB.length]);

  /* Merge reveal animation */
  useEffect(() => {
    if (phase === 'merge-reveal' && revealedLineCount < mergedLines.length) {
      const timer = setTimeout(() => {
        setRevealedLineCount((c) => c + 1);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, revealedLineCount, mergedLines.length]);

  /* ================================================================
     GAME LOGIC
     ================================================================ */

  const generatePairs = useCallback((playerList: Player[]): [number, number][] => {
    const shuffled = shuffle(playerList);
    const result: [number, number][] = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      result.push([shuffled[i].id, shuffled[i + 1].id]);
    }
    // If odd number of players, last player pairs with first
    if (shuffled.length % 2 !== 0) {
      result.push([shuffled[shuffled.length - 1].id, shuffled[0].id]);
    }
    return result;
  }, []);

  const startGame = useCallback(() => {
    if (players.length < MIN_PLAYERS) return;
    const newPairs = generatePairs(players);
    setPairs(newPairs);
    setCurrentPairIndex(0);
    setPairResults([]);

    const spec = pickSpec(usedSpecs);
    setUsedSpecs((prev) => new Set(prev).add(spec.text));
    setCurrentSpec(spec);
    setPhase('spec-reveal');
  }, [players, generatePairs, usedSpecs]);

  const startWritingA = () => {
    setLinesA([]);
    setLinesB([]);
    setCurrentLineInput('');
    setTimeLeft(WRITING_TIME);
    setPhase('writing-a');
  };

  const submitLine = () => {
    const text = currentLineInput.trim() || '// ...';

    if (phase === 'writing-a') {
      const newLines = [...linesA, text];
      setLinesA(newLines);
      setCurrentLineInput('');
      if (newLines.length >= LINES_PER_PLAYER) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('pass-phone');
      }
    } else if (phase === 'writing-b') {
      const newLines = [...linesB, text];
      setLinesB(newLines);
      setCurrentLineInput('');
      if (newLines.length >= LINES_PER_PLAYER) {
        if (timerRef.current) clearInterval(timerRef.current);
        performMerge(linesA, newLines);
      }
    }
  };

  const handleAutoSubmit = () => {
    if (phase === 'writing-a') {
      const padded = [...linesA];
      while (padded.length < LINES_PER_PLAYER) padded.push('// ...');
      setLinesA(padded);
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('pass-phone');
    } else if (phase === 'writing-b') {
      const padded = [...linesB];
      while (padded.length < LINES_PER_PLAYER) padded.push('// ...');
      setLinesB(padded);
      if (timerRef.current) clearInterval(timerRef.current);
      performMerge(linesA, padded);
    }
  };

  const startWritingB = () => {
    setCurrentLineInput('');
    setTimeLeft(WRITING_TIME);
    setPhase('writing-b');
  };

  const performMerge = (a: string[], b: string[]) => {
    // Interleave: A writes odd lines (1,3,5,7), B writes even lines (2,4,6,8)
    const merged: MergedLine[] = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < a.length) {
        merged.push({ lineNum: merged.length + 1, text: a[i], author: 'A' });
      }
      if (i < b.length) {
        merged.push({ lineNum: merged.length + 1, text: b[i], author: 'B' });
      }
    }
    setMergedLines(merged);
    setRevealedLineCount(0);
    setPhase('merge-reveal');
  };

  const startVoting = () => {
    setVotes({ ship: 0, revert: 0, review: 0 });
    setCurrentVoter(0);
    setPhase('voting');
  };

  const submitVote = (vote: Vote) => {
    const newVotes = { ...votes, [vote]: votes[vote] + 1 };
    setVotes(newVotes);

    if (currentVoter < players.length - 1) {
      setCurrentVoter((v) => v + 1);
    } else {
      // All voted
      const pair = pairs[currentPairIndex];
      const pA = players.find((p) => p.id === pair[0])!;
      const pB = players.find((p) => p.id === pair[1])!;
      const status = determineMergeStatus(linesA, linesB);

      // Points: ship=3, review=1, revert=0
      const pairScore = newVotes.ship * 3 + newVotes.review * 1;

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === pA.id || p.id === pB.id) {
            return { ...p, score: p.score + pairScore };
          }
          return p;
        })
      );

      const result: PairResult = {
        playerA: pA,
        playerB: pB,
        spec: currentSpec!,
        merged: mergedLines,
        votes: newVotes,
        mergeStatus: status,
      };

      setPairResults((prev) => [...prev, result]);
      setPhase('pair-results');
    }
  };

  const nextPairOrFinish = () => {
    if (currentPairIndex < pairs.length - 1) {
      const nextIdx = currentPairIndex + 1;
      setCurrentPairIndex(nextIdx);
      const spec = pickSpec(usedSpecs);
      setUsedSpecs((prev) => new Set(prev).add(spec.text));
      setCurrentSpec(spec);
      setPhase('spec-reveal');
    } else {
      setPhase('final-results');
    }
  };

  const resetGame = () => {
    setPhase('setup');
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setPairResults([]);
    setCurrentPairIndex(0);
    setUsedSpecs(new Set());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase === 'writing-a' || phase === 'writing-b') {
        submitLine();
      }
    }
  };

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

  const currentPair = pairs[currentPairIndex];
  const playerA = currentPair ? players.find((p) => p.id === currentPair[0]) : null;
  const playerB = currentPair ? players.find((p) => p.id === currentPair[1]) : null;
  const currentWriter = phase === 'writing-a' ? playerA : playerB;
  const linesWritten = phase === 'writing-a' ? linesA.length : linesB.length;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'real': return { label: 'REAL CODE', color: 'var(--color-accent)' };
      case 'absurd': return { label: 'ABSURD', color: 'var(--color-purple)' };
      case 'workplace': return { label: 'WORKPLACE', color: 'var(--color-orange)' };
      default: return { label: cat.toUpperCase(), color: 'var(--color-text-secondary)' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLEAN MERGE': return 'var(--color-accent)';
      case 'CONFLICT': return 'var(--color-orange)';
      case 'FORCE PUSH': return 'var(--color-red)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const specComment = (text: string | undefined) => `// ${text ?? ''}`;

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p className="pixel-text" style={{ color: 'var(--color-accent)', fontSize: '0.75rem' }}>
          LOADING...
        </p>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: '1.5rem',
        paddingTop: '6rem',
        paddingBottom: '4rem',
      }}
    >
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Link
            href="/games"
            className="pixel-btn"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.65rem',
              textDecoration: 'none',
            }}
          >
            &lt; BACK
          </Link>
          <div style={{ flex: 1 }}>
            <h1
              className="pixel-text"
              style={{
                fontSize: 'clamp(0.8rem, 3vw, 1.3rem)',
                color: 'var(--color-accent)',
                margin: 0,
              }}
            >
              MERGE CONFLICT
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              Two devs. One function. Zero communication.
            </p>
          </div>
          <GamePlayCounter slug="merge-conflict" />
        </div>

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* How to play */}
            <div className="pixel-card" style={{ padding: '1.25rem' }}>
              <h2 className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
                HOW TO PLAY
              </h2>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 0.5rem' }}>1. Players are paired up and given a function spec</p>
                <p style={{ margin: '0 0 0.5rem' }}>2. Player A writes the ODD lines (1, 3, 5, 7)</p>
                <p style={{ margin: '0 0 0.5rem' }}>3. Player B writes the EVEN lines (2, 4, 6, 8) -- without seeing A&apos;s code</p>
                <p style={{ margin: '0 0 0.5rem' }}>4. Lines are merged and revealed git-diff style</p>
                <p style={{ margin: '0' }}>5. Everyone votes: Would Ship / Revert / Needs Review</p>
              </div>
            </div>

            {/* Player count picker */}
            <div className="pixel-card" style={{ padding: '1.25rem' }}>
              <h2 className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-text)', marginBottom: '0.75rem', textAlign: 'center' }}>
                HOW MANY DEVS?
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      background: playerCount === n ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                      border: `2px solid ${playerCount === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Paired as Dev A &amp; Dev B, Dev C &amp; Dev D...
              </p>
            </div>

            {/* Start button */}
            <button
              onClick={() => {
                const generatedPlayers = Array.from({ length: playerCount }, (_, i) => ({
                  id: i,
                  name: `P${i + 1}`,
                  score: 0,
                  avatar: AVATARS[i % AVATARS.length],
                }));
                setPlayers(generatedPlayers);
                // Need to start game after setting players - use direct call
                const newPairs = generatePairs(generatedPlayers);
                setPairs(newPairs);
                setCurrentPairIndex(0);
                setPairResults([]);
                const spec = pickSpec(usedSpecs);
                setUsedSpecs((prev) => new Set(prev).add(spec.text));
                setCurrentSpec(spec);
                setPhase('spec-reveal');
              }}
              className="pixel-btn"
              style={{
                padding: '1rem',
                fontSize: '0.85rem',
                width: '100%',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                border: 'none',
              }}
            >
              {'git merge --no-ff'} ({Math.ceil(playerCount / 2)} pairs)
            </button>
          </div>
        )}

        {/* SPEC REVEAL */}
        {phase === 'spec-reveal' && currentSpec && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              PAIR {currentPairIndex + 1} / {pairs.length}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-cyan)' }}>
                {playerA?.avatar} {playerA?.name}
              </span>
              <span className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-red)' }}>
                VS
              </span>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-purple)' }}>
                {playerB?.avatar} {playerB?.name}
              </span>
            </div>

            <div className="pixel-card" style={{ padding: '1.5rem', maxWidth: '36rem', width: '100%' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span
                  className="pixel-text"
                  style={{
                    fontSize: '0.55rem',
                    padding: '0.25rem 0.5rem',
                    background: getCategoryBadge(currentSpec.category).color,
                    color: 'var(--color-bg)',
                    borderRadius: '2px',
                  }}
                >
                  {getCategoryBadge(currentSpec.category).label}
                </span>
              </div>
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'var(--color-text)',
                  lineHeight: 1.5,
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {currentSpec.text}
              </p>
            </div>

            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', maxWidth: '28rem' }}>
              Both players see this spec. Player A writes lines 1, 3, 5, 7.
              Player B writes lines 2, 4, 6, 8 -- without seeing A&apos;s code.
            </div>

            <button
              onClick={startWritingA}
              className="pixel-btn"
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.8rem',
                background: 'var(--color-cyan)',
                color: 'var(--color-bg)',
                border: 'none',
              }}
            >
              {playerA?.name}: START WRITING
            </button>
          </div>
        )}

        {/* WRITING PHASE (A or B) */}
        {(phase === 'writing-a' || phase === 'writing-b') && currentWriter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '1rem',
                    color: phase === 'writing-a' ? 'var(--color-cyan)' : 'var(--color-purple)',
                  }}
                >
                  {currentWriter.avatar} {currentWriter.name}
                </span>
                <span
                  className="pixel-text"
                  style={{
                    fontSize: '0.55rem',
                    marginLeft: '0.75rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {phase === 'writing-a' ? 'ODD LINES' : 'EVEN LINES'}
                </span>
              </div>
              <div
                className="pixel-text"
                style={{
                  fontSize: '0.8rem',
                  color: timeLeft <= 10 ? 'var(--color-red)' : 'var(--color-orange)',
                  animation: timeLeft <= 10 ? 'flicker 0.5s infinite' : 'none',
                }}
              >
                {timeLeft}s
              </div>
            </div>

            {/* Spec reminder */}
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {specComment(currentSpec?.text)}
            </div>

            {/* Code editor */}
            <div
              className="pixel-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: `2px solid ${phase === 'writing-a' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
              }}
            >
              {/* Editor header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-bg-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)', display: 'inline-block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-orange)', display: 'inline-block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                <span style={{ marginLeft: '0.5rem' }}>merge.ts</span>
              </div>

              {/* Written lines */}
              <div style={{ padding: '0.5rem 0' }}>
                {(phase === 'writing-a' ? linesA : linesB).map((line, i) => {
                  const lineNum = phase === 'writing-a' ? i * 2 + 1 : i * 2 + 2;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        lineHeight: 1.8,
                      }}
                    >
                      <span
                        style={{
                          width: '3rem',
                          textAlign: 'right',
                          paddingRight: '0.75rem',
                          color: 'var(--color-text-muted)',
                          userSelect: 'none',
                          flexShrink: 0,
                        }}
                      >
                        {lineNum}
                      </span>
                      <span style={{ color: 'var(--color-text)', opacity: 0.7 }}>
                        {line}
                      </span>
                    </div>
                  );
                })}

                {/* Current input line */}
                {linesWritten < LINES_PER_PLAYER && (
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      lineHeight: 1.8,
                    }}
                  >
                    <span
                      style={{
                        width: '3rem',
                        textAlign: 'right',
                        paddingRight: '0.75rem',
                        color: phase === 'writing-a' ? 'var(--color-cyan)' : 'var(--color-purple)',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {phase === 'writing-a' ? linesA.length * 2 + 1 : linesB.length * 2 + 2}
                    </span>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea
                        ref={inputRef}
                        value={currentLineInput}
                        onChange={(e) => setCurrentLineInput(e.target.value.replace(/\n/g, ''))}
                        onKeyDown={handleKeyDown}
                        placeholder="type your code here..."
                        rows={1}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text)',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                          resize: 'none',
                          lineHeight: 1.8,
                          padding: 0,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress + submit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Line {linesWritten + 1} / {LINES_PER_PLAYER}
              </span>
              {linesWritten < LINES_PER_PLAYER && (
                <button
                  onClick={submitLine}
                  className="pixel-btn"
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.7rem' }}
                >
                  ENTER LINE ({LINES_PER_PLAYER - linesWritten} left)
                </button>
              )}
            </div>
          </div>
        )}

        {/* PASS THE PHONE */}
        {phase === 'pass-phone' && playerB && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', paddingTop: '3rem' }}>
            <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-orange)', animation: 'glow-pulse 2s infinite' }}>
              PASS THE PHONE
            </div>
            <div style={{ fontSize: '3rem' }}>{playerB.avatar}</div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Hand the device to <strong style={{ color: 'var(--color-purple)' }}>{playerB.name}</strong>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              They will write the EVEN lines without seeing what was written.
            </p>
            <button
              onClick={startWritingB}
              className="pixel-btn"
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.8rem',
                background: 'var(--color-purple)',
                color: 'var(--color-bg)',
                border: 'none',
                marginTop: '1rem',
              }}
            >
              {playerB.name}: I&apos;M READY
            </button>
          </div>
        )}

        {/* MERGE REVEAL */}
        {phase === 'merge-reveal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
                {'git merge --no-ff'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Merging branches...
              </div>
            </div>

            {/* Merged code view */}
            <div
              className="pixel-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '2px solid var(--color-border)',
              }}
            >
              {/* Editor header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-bg-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-orange)', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                  <span style={{ marginLeft: '0.5rem' }}>merged-output.ts</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6rem' }}>
                  <span style={{ color: 'var(--color-cyan)' }}>{playerA?.name}</span>
                  <span style={{ color: 'var(--color-purple)' }}>{playerB?.name}</span>
                </div>
              </div>

              {/* Spec comment */}
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                {specComment(currentSpec?.text)}
              </div>

              {/* Merged lines */}
              <div style={{ padding: '0.5rem 0' }}>
                {mergedLines.slice(0, revealedLineCount).map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      lineHeight: 1.8,
                      background: line.author === 'A'
                        ? 'rgba(6, 182, 212, 0.08)'
                        : 'rgba(168, 85, 247, 0.08)',
                      borderLeft: `3px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                      animation: 'fade-in-up 0.3s ease-out',
                    }}
                  >
                    <span
                      style={{
                        width: '3rem',
                        textAlign: 'right',
                        paddingRight: '0.75rem',
                        color: line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)',
                        userSelect: 'none',
                        flexShrink: 0,
                        opacity: 0.7,
                      }}
                    >
                      {line.lineNum}
                    </span>
                    <span
                      style={{
                        color: 'var(--color-text)',
                        paddingRight: '0.5rem',
                        wordBreak: 'break-word',
                      }}
                    >
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proceed to voting once fully revealed */}
            {revealedLineCount >= mergedLines.length && (
              <button
                onClick={startVoting}
                className="pixel-btn"
                style={{
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  width: '100%',
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
              >
                VOTE ON THIS MERGE
              </button>
            )}
          </div>
        )}

        {/* VOTING */}
        {phase === 'voting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div className="pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              VOTER {currentVoter + 1} / {players.length}
            </div>
            <div style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>
              {players[currentVoter]?.avatar} {players[currentVoter]?.name}&apos;s verdict
            </div>

            {/* Compact merged code reference */}
            <div
              className="pixel-card"
              style={{
                padding: '0.75rem',
                width: '100%',
                maxWidth: '36rem',
                maxHeight: '12rem',
                overflow: 'auto',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                {specComment(currentSpec?.text)}
              </div>
              {mergedLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    borderLeft: `2px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                    paddingLeft: '0.5rem',
                    marginBottom: '0.15rem',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>{line.lineNum}</span>
                  {line.text}
                </div>
              ))}
            </div>

            {/* Vote buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => submitVote('ship')}
                className="pixel-btn"
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.7rem',
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  minWidth: '8rem',
                }}
              >
                WOULD SHIP
              </button>
              <button
                onClick={() => submitVote('review')}
                className="pixel-btn"
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.7rem',
                  background: 'var(--color-orange)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  minWidth: '8rem',
                }}
              >
                NEEDS REVIEW
              </button>
              <button
                onClick={() => submitVote('revert')}
                className="pixel-btn"
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.7rem',
                  background: 'var(--color-red)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  minWidth: '8rem',
                }}
              >
                REVERT NOW
              </button>
            </div>
          </div>
        )}

        {/* PAIR RESULTS */}
        {phase === 'pair-results' && pairResults.length > 0 && (() => {
          const result = pairResults[pairResults.length - 1];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              {/* Merge status badge */}
              <div
                className="pixel-text"
                style={{
                  fontSize: '1rem',
                  color: getStatusColor(result.mergeStatus),
                  animation: 'glow-pulse 2s infinite',
                }}
              >
                {result.mergeStatus}
              </div>

              {/* Pair names */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-cyan)' }}>{result.playerA.avatar} {result.playerA.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>&amp;</span>
                <span style={{ color: 'var(--color-purple)' }}>{result.playerB.avatar} {result.playerB.name}</span>
              </div>

              {/* Merged code */}
              <div
                className="pixel-card"
                style={{
                  padding: 0,
                  width: '100%',
                  overflow: 'hidden',
                  border: '2px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {specComment(result.spec.text)}
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                  {result.merged.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        lineHeight: 1.7,
                        background: line.author === 'A'
                          ? 'rgba(6, 182, 212, 0.08)'
                          : 'rgba(168, 85, 247, 0.08)',
                        borderLeft: `3px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                      }}
                    >
                      <span
                        style={{
                          width: '2.5rem',
                          textAlign: 'right',
                          paddingRight: '0.5rem',
                          color: line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)',
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      >
                        {line.lineNum}
                      </span>
                      <span style={{ color: 'var(--color-text)', wordBreak: 'break-word', paddingRight: '0.5rem' }}>
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vote breakdown */}
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>
                    {result.votes.ship}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>SHIP</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-orange)' }}>
                    {result.votes.review}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>REVIEW</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-red)' }}>
                    {result.votes.revert}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>REVERT</div>
                </div>
              </div>

              <button
                onClick={nextPairOrFinish}
                className="pixel-btn"
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '0.8rem',
                  width: '100%',
                  maxWidth: '20rem',
                }}
              >
                {currentPairIndex < pairs.length - 1 ? 'NEXT PAIR' : 'SEE FINAL RESULTS'}
              </button>
            </div>
          );
        })()}

        {/* FINAL RESULTS */}
        {phase === 'final-results' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="pixel-text" style={{ fontSize: '1rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                MERGE COMPLETE
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                All branches merged. Here are the results.
              </div>
            </div>

            {/* Leaderboard */}
            <div className="pixel-card" style={{ padding: '1.25rem' }}>
              <h2 className="pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-text)', marginBottom: '1rem' }}>
                LEADERBOARD
              </h2>
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: i === 0 ? 'var(--color-accent-glow)' : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>
                    {i === 0 ? '\u{1F3C6}' : `#${i + 1}`} {p.avatar} {p.name}
                  </span>
                  <span className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}>
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Awards */}
            {pairResults.length > 0 && (() => {
              const best = [...pairResults].sort((a, b) => b.votes.ship - a.votes.ship)[0];
              const worst = [...pairResults].sort((a, b) => b.votes.revert - a.votes.revert)[0];
              return (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="pixel-card" style={{ flex: 1, minWidth: '14rem', padding: '1rem', textAlign: 'center' }}>
                    <div className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                      BEST MERGE
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                      {best.playerA.name} &amp; {best.playerB.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      {best.votes.ship} ships
                    </div>
                  </div>
                  <div className="pixel-card" style={{ flex: 1, minWidth: '14rem', padding: '1rem', textAlign: 'center' }}>
                    <div className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-red)', marginBottom: '0.5rem' }}>
                      WORST MERGE
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                      {worst.playerA.name} &amp; {worst.playerB.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      {worst.votes.revert} reverts
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Round review */}
            <div className="pixel-card" style={{ padding: '1.25rem' }}>
              <h2 className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
                ALL MERGES
              </h2>
              {pairResults.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>
                      {r.playerA.name} &amp; {r.playerB.name}
                    </span>
                    <span
                      className="pixel-text"
                      style={{
                        fontSize: '0.5rem',
                        padding: '0.15rem 0.4rem',
                        background: getStatusColor(r.mergeStatus),
                        color: 'var(--color-bg)',
                        borderRadius: '2px',
                      }}
                    >
                      {r.mergeStatus}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                    {specComment(r.spec.text)}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {r.merged.map((line, j) => (
                      <div
                        key={j}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          lineHeight: 1.5,
                          color: 'var(--color-text)',
                          borderLeft: `2px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                          paddingLeft: '0.4rem',
                          marginBottom: '0.1rem',
                        }}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Play again */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={resetGame}
                className="pixel-btn"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.8rem' }}
              >
                PLAY AGAIN
              </button>
              <Link
                href="/games"
                className="pixel-btn"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'block',
                }}
              >
                BACK TO ARCADE
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
