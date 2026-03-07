'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ================================================================
   TYPES
   ================================================================ */

interface Player {
  id: number;
  name: string;
  team: 1 | 2;
}

interface TeamState {
  score: number;
  players: Player[];
}

type GamePhase =
  | 'setup'
  | 'psychic-view'
  | 'team-guess'
  | 'reveal'
  | 'game-over';

interface SpectrumPair {
  left: string;
  right: string;
  category: 'general' | 'dev' | 'culture' | 'food' | 'philosophical';
}

/* ================================================================
   SPECTRUM PAIRS (130)
   ================================================================ */

const SPECTRUM_PAIRS: SpectrumPair[] = [
  // ── General (40) ──
  { left: 'Hot', right: 'Cold', category: 'general' },
  { left: 'Overrated', right: 'Underrated', category: 'general' },
  { left: 'Mainstream', right: 'Niche', category: 'general' },
  { left: 'Easy', right: 'Hard', category: 'general' },
  { left: 'Old', right: 'New', category: 'general' },
  { left: 'Healthy', right: 'Unhealthy', category: 'general' },
  { left: 'Scary', right: 'Cute', category: 'general' },
  { left: 'Smart', right: 'Dumb', category: 'general' },
  { left: 'Expensive', right: 'Cheap', category: 'general' },
  { left: 'Fast', right: 'Slow', category: 'general' },
  { left: 'Loud', right: 'Quiet', category: 'general' },
  { left: 'Famous', right: 'Obscure', category: 'general' },
  { left: 'Beautiful', right: 'Ugly', category: 'general' },
  { left: 'Useful', right: 'Useless', category: 'general' },
  { left: 'Dangerous', right: 'Safe', category: 'general' },
  { left: 'Boring', right: 'Exciting', category: 'general' },
  { left: 'Relaxing', right: 'Stressful', category: 'general' },
  { left: 'Simple', right: 'Complex', category: 'general' },
  { left: 'Strong', right: 'Weak', category: 'general' },
  { left: 'Lucky', right: 'Unlucky', category: 'general' },
  { left: 'Clean', right: 'Dirty', category: 'general' },
  { left: 'Wet', right: 'Dry', category: 'general' },
  { left: 'Light', right: 'Heavy', category: 'general' },
  { left: 'Long', right: 'Short', category: 'general' },
  { left: 'Wide', right: 'Narrow', category: 'general' },
  { left: 'Soft', right: 'Hard', category: 'general' },
  { left: 'Smooth', right: 'Rough', category: 'general' },
  { left: 'Sweet', right: 'Sour', category: 'general' },
  { left: 'Bright', right: 'Dark', category: 'general' },
  { left: 'Tall', right: 'Short', category: 'general' },
  { left: 'Round', right: 'Pointy', category: 'general' },
  { left: 'Full', right: 'Empty', category: 'general' },
  { left: 'Tight', right: 'Loose', category: 'general' },
  { left: 'Natural', right: 'Artificial', category: 'general' },
  { left: 'Modern', right: 'Ancient', category: 'general' },
  { left: 'Common', right: 'Rare', category: 'general' },
  { left: 'Legal', right: 'Illegal', category: 'general' },
  { left: 'Polite', right: 'Rude', category: 'general' },
  { left: 'Brave', right: 'Cowardly', category: 'general' },
  { left: 'Generous', right: 'Greedy', category: 'general' },

  // ── Dev-Themed (35) ──
  { left: 'Frontend', right: 'Backend', category: 'dev' },
  { left: 'Tabs', right: 'Spaces', category: 'dev' },
  { left: 'Monolith', right: 'Microservices', category: 'dev' },
  { left: 'Junior', right: 'Senior', category: 'dev' },
  { left: 'Feature', right: 'Bug', category: 'dev' },
  { left: 'Over-engineered', right: 'Under-engineered', category: 'dev' },
  { left: 'Vim', right: 'VS Code', category: 'dev' },
  { left: 'Strongly Typed', right: 'Dynamically Typed', category: 'dev' },
  { left: 'Open Source', right: 'Proprietary', category: 'dev' },
  { left: 'Agile', right: 'Waterfall', category: 'dev' },
  { left: 'SQL', right: 'NoSQL', category: 'dev' },
  { left: 'OOP', right: 'Functional', category: 'dev' },
  { left: 'MVP', right: 'Polished', category: 'dev' },
  { left: 'DRY', right: 'WET', category: 'dev' },
  { left: 'Readable', right: 'Performant', category: 'dev' },
  { left: 'Startup', right: 'Enterprise', category: 'dev' },
  { left: 'Self-hosted', right: 'Cloud', category: 'dev' },
  { left: 'Linux', right: 'Windows', category: 'dev' },
  { left: 'Dark Mode', right: 'Light Mode', category: 'dev' },
  { left: 'REST', right: 'GraphQL', category: 'dev' },
  { left: 'Merge Commit', right: 'Rebase', category: 'dev' },
  { left: 'Docs', right: 'Stack Overflow', category: 'dev' },
  { left: 'Ship Fast', right: 'Ship Safe', category: 'dev' },
  { left: 'Tests First', right: 'Tests Never', category: 'dev' },
  { left: 'npm', right: 'yarn', category: 'dev' },
  { left: 'Copilot', right: 'Manual', category: 'dev' },
  { left: 'Framework', right: 'Vanilla', category: 'dev' },
  { left: 'SSR', right: 'SPA', category: 'dev' },
  { left: 'Cache It', right: 'Fetch Fresh', category: 'dev' },
  { left: 'Slack', right: 'Email', category: 'dev' },
  { left: 'Standup', right: 'Async Update', category: 'dev' },
  { left: 'Pair Programming', right: 'Solo Coding', category: 'dev' },
  { left: 'Code Review', right: 'YOLO Merge', category: 'dev' },
  { left: 'Kubernetes', right: 'Bare Metal', category: 'dev' },
  { left: 'TypeScript', right: 'JavaScript', category: 'dev' },

  // ── Culture & Lifestyle (25) ──
  { left: 'Introvert', right: 'Extrovert', category: 'culture' },
  { left: 'Morning Person', right: 'Night Owl', category: 'culture' },
  { left: 'City', right: 'Countryside', category: 'culture' },
  { left: 'Dog Person', right: 'Cat Person', category: 'culture' },
  { left: 'Book', right: 'Movie', category: 'culture' },
  { left: 'Trendsetter', right: 'Follower', category: 'culture' },
  { left: 'Planner', right: 'Spontaneous', category: 'culture' },
  { left: 'Minimalist', right: 'Maximalist', category: 'culture' },
  { left: 'Optimist', right: 'Pessimist', category: 'culture' },
  { left: 'Leader', right: 'Team Player', category: 'culture' },
  { left: 'Traveler', right: 'Homebody', category: 'culture' },
  { left: 'Texter', right: 'Caller', category: 'culture' },
  { left: 'Casual', right: 'Formal', category: 'culture' },
  { left: 'Vintage', right: 'Contemporary', category: 'culture' },
  { left: 'Quality', right: 'Quantity', category: 'culture' },
  { left: 'Online', right: 'In Person', category: 'culture' },
  { left: 'Reality TV', right: 'Documentary', category: 'culture' },
  { left: 'Pop Music', right: 'Indie Music', category: 'culture' },
  { left: 'Comedy', right: 'Drama', category: 'culture' },
  { left: 'Fiction', right: 'Non-Fiction', category: 'culture' },
  { left: 'Road Trip', right: 'Fly There', category: 'culture' },
  { left: 'Early Adopter', right: 'Late Adopter', category: 'culture' },
  { left: 'Risk Taker', right: 'Play It Safe', category: 'culture' },
  { left: 'DIY', right: 'Hire Someone', category: 'culture' },
  { left: 'Gym Rat', right: 'Couch Potato', category: 'culture' },

  // ── Food & Drink (15) ──
  { left: 'Sweet', right: 'Savory', category: 'food' },
  { left: 'Coffee', right: 'Tea', category: 'food' },
  { left: 'Pizza', right: 'Sushi', category: 'food' },
  { left: 'Fine Dining', right: 'Street Food', category: 'food' },
  { left: 'Spicy', right: 'Mild', category: 'food' },
  { left: 'Cook at Home', right: 'Order Delivery', category: 'food' },
  { left: 'Breakfast Food', right: 'Dinner Food', category: 'food' },
  { left: 'Healthy Snack', right: 'Junk Food', category: 'food' },
  { left: 'Beer', right: 'Wine', category: 'food' },
  { left: 'Crunchy', right: 'Chewy', category: 'food' },
  { left: 'Portion Size: Huge', right: 'Portion Size: Tiny', category: 'food' },
  { left: 'Comfort Food', right: 'Adventurous Cuisine', category: 'food' },
  { left: 'Fresh Juice', right: 'Soda', category: 'food' },
  { left: 'Buffet', right: 'Tasting Menu', category: 'food' },
  { left: 'Frozen', right: 'Fresh', category: 'food' },

  // ── Philosophical (15) ──
  { left: 'Nature', right: 'Nurture', category: 'philosophical' },
  { left: 'Freedom', right: 'Security', category: 'philosophical' },
  { left: 'Logic', right: 'Emotion', category: 'philosophical' },
  { left: 'Journey', right: 'Destination', category: 'philosophical' },
  { left: 'Tradition', right: 'Innovation', category: 'philosophical' },
  { left: 'Knowledge', right: 'Wisdom', category: 'philosophical' },
  { left: 'Individual', right: 'Community', category: 'philosophical' },
  { left: 'Past', right: 'Future', category: 'philosophical' },
  { left: 'Head', right: 'Heart', category: 'philosophical' },
  { left: 'Chaos', right: 'Order', category: 'philosophical' },
  { left: 'Art', right: 'Science', category: 'philosophical' },
  { left: 'Talent', right: 'Hard Work', category: 'philosophical' },
  { left: 'Privacy', right: 'Transparency', category: 'philosophical' },
  { left: 'Depth', right: 'Breadth', category: 'philosophical' },
  { left: 'Theory', right: 'Practice', category: 'philosophical' },
];

/* ================================================================
   HELPERS
   ================================================================ */

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const TEAM_COLORS: Record<1 | 2, string> = {
  1: 'var(--color-cyan)',
  2: 'var(--color-orange)',
};

const TEAM_NAMES: Record<1 | 2, string> = {
  1: 'TEAM CYAN',
  2: 'TEAM ORANGE',
};

const WINNING_SCORE = 10;

const CATEGORY_EMOJI: Record<string, string> = {
  general: '~',
  dev: '</>',
  culture: '#',
  food: '*',
  philosophical: '?',
};

/* ================================================================
   COMPONENT
   ================================================================ */

export default function WavelengthPage() {
  const [mounted, setMounted] = useState(false);

  // Setup
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [setupError, setSetupError] = useState('');
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    new Set(['general', 'dev', 'culture', 'food', 'philosophical'])
  );

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [team1, setTeam1] = useState<TeamState>({ score: 0, players: [] });
  const [team2, setTeam2] = useState<TeamState>({ score: 0, players: [] });
  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1);
  const [psychicIndex, setPsychicIndex] = useState<Record<1 | 2, number>>({ 1: 0, 2: 0 });

  // Round state
  const [spectrumPairs, setSpectrumPairs] = useState<SpectrumPair[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState(50);
  const [guessPosition, setGuessPosition] = useState(50);
  const [clue, setClue] = useState('');
  const [roundScore, setRoundScore] = useState(0);
  const [showTarget, setShowTarget] = useState(false);

  // Slider interaction
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Setup Helpers ── */

  const addPlayerSlot = () => {
    if (playerNames.length < 12) {
      setPlayerNames((prev) => [...prev, '']);
    }
  };

  const removePlayerSlot = (index: number) => {
    if (playerNames.length > 4) {
      setPlayerNames((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames((prev) => {
      const copy = [...prev];
      copy[index] = name;
      return copy;
    });
  };

  const toggleCategory = (cat: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size <= 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const startGame = () => {
    const names = playerNames.map((n) => n.trim()).filter((n) => n.length > 0);
    if (names.length < 4) {
      setSetupError('Need at least 4 players');
      return;
    }
    if (new Set(names).size !== names.length) {
      setSetupError('Player names must be unique');
      return;
    }

    const allPlayers: Player[] = names.map((name, i) => ({
      id: i,
      name,
      team: ((i % 2) + 1) as 1 | 2,
    }));

    const t1Players = allPlayers.filter((p) => p.team === 1);
    const t2Players = allPlayers.filter((p) => p.team === 2);

    setTeam1({ score: 0, players: t1Players });
    setTeam2({ score: 0, players: t2Players });

    const filtered = SPECTRUM_PAIRS.filter((p) => enabledCategories.has(p.category));
    setSpectrumPairs(shuffleArray(filtered));
    setRoundIndex(0);
    setCurrentTeam(1);
    setPsychicIndex({ 1: 0, 2: 0 });

    setTargetPosition(Math.floor(Math.random() * 80) + 10);
    setGuessPosition(50);
    setClue('');
    setShowTarget(false);
    setPhase('psychic-view');
  };

  /* ── Game Logic ── */

  const getCurrentPsychic = useCallback((): Player | null => {
    const teamState = currentTeam === 1 ? team1 : team2;
    const idx = psychicIndex[currentTeam];
    return teamState.players[idx % teamState.players.length] || null;
  }, [currentTeam, team1, team2, psychicIndex]);

  const submitClue = () => {
    if (clue.trim().length === 0) return;
    const word = clue.trim();
    if (word.includes(' ')) return;
    setClue(word);
    setGuessPosition(50);
    setPhase('team-guess');
  };

  const calculateScore = useCallback((target: number, guess: number): number => {
    const diff = Math.abs(target - guess);
    if (diff <= 5) return 4;
    if (diff <= 15) return 3;
    if (diff <= 25) return 2;
    return 0;
  }, []);

  const submitGuess = () => {
    const score = calculateScore(targetPosition, guessPosition);
    setRoundScore(score);
    setShowTarget(true);

    if (currentTeam === 1) {
      setTeam1((prev) => ({ ...prev, score: prev.score + score }));
    } else {
      setTeam2((prev) => ({ ...prev, score: prev.score + score }));
    }

    setTimeout(() => {
      setPhase('reveal');
    }, 800);
  };

  const nextRound = () => {
    const t1Score = team1.score;
    const t2Score = team2.score;

    if (t1Score >= WINNING_SCORE || t2Score >= WINNING_SCORE) {
      setPhase('game-over');
      return;
    }

    const nextTeam: 1 | 2 = currentTeam === 1 ? 2 : 1;
    setPsychicIndex((prev) => ({
      ...prev,
      [currentTeam]: prev[currentTeam] + 1,
    }));
    setCurrentTeam(nextTeam);

    const nextIdx = roundIndex + 1;
    if (nextIdx >= spectrumPairs.length) {
      const filtered = SPECTRUM_PAIRS.filter((p) => enabledCategories.has(p.category));
      setSpectrumPairs(shuffleArray(filtered));
      setRoundIndex(0);
    } else {
      setRoundIndex(nextIdx);
    }

    setTargetPosition(Math.floor(Math.random() * 80) + 10);
    setGuessPosition(50);
    setClue('');
    setShowTarget(false);
    setRoundScore(0);
    setPhase('psychic-view');
  };

  const resetGame = () => {
    setPhase('setup');
    setTeam1({ score: 0, players: [] });
    setTeam2({ score: 0, players: [] });
    setClue('');
    setShowTarget(false);
    setRoundScore(0);
    setGuessPosition(50);
  };

  /* ── Slider Logic ── */

  const updateSliderFromEvent = useCallback(
    (clientX: number) => {
      if (!sliderRef.current || phase !== 'team-guess') return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setGuessPosition(Math.round(pct));
    },
    [phase]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      updateSliderFromEvent(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [updateSliderFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateSliderFromEvent(e.clientX);
    },
    [isDragging, updateSliderFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /* ── Current spectrum pair ── */
  const currentPair = spectrumPairs[roundIndex] || spectrumPairs[0];
  const psychic = getCurrentPsychic();

  /* ── Render guard ── */
  if (!mounted) return null;

  /* ================================================================
     SETUP SCREEN
     ================================================================ */
  if (phase === 'setup') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          <div className="text-center mb-8">
            <h1
              className="pixel-text text-lg md:text-2xl mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              WAVELENGTH
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              How well do you really know each other?
            </p>
          </div>

          {/* How to Play */}
          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-purple)' }}
            >
              HOW TO PLAY
            </h2>
            <ol
              className="text-sm space-y-2 list-decimal list-inside"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <li>A spectrum appears with two opposing concepts</li>
              <li>The psychic sees a hidden target on the spectrum</li>
              <li>The psychic gives a ONE-WORD clue</li>
              <li>Their team places a guess on the spectrum</li>
              <li>Closer guess = more points. First to {WINNING_SCORE} wins!</li>
            </ol>
            <div
              className="mt-3 pt-3 border-t text-xs space-y-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <p>Bulls-eye (within 5%): 4 pts | Close (within 15%): 3 pts</p>
              <p>Warm (within 25%): 2 pts | Miss: 0 pts</p>
            </div>
          </div>

          {/* Category Toggles */}
          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-accent)' }}
            >
              CATEGORIES
            </h2>
            <div className="flex flex-wrap gap-2">
              {['general', 'dev', 'culture', 'food', 'philosophical'].map((cat) => {
                const active = enabledCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="px-3 py-1.5 rounded border text-xs transition-all"
                    style={{
                      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor: active ? 'var(--color-accent-glow)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {CATEGORY_EMOJI[cat]} {cat.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Names */}
          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xs mb-1"
              style={{ color: 'var(--color-accent)' }}
            >
              PLAYERS ({playerNames.length})
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              4-12 players. Odd slots join {TEAM_NAMES[1]}, even slots join {TEAM_NAMES[2]}.
            </p>

            <div className="space-y-2">
              {playerNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor:
                        (i % 2) === 0
                          ? 'rgba(6,182,212,0.15)'
                          : 'rgba(245,158,11,0.15)',
                      color: (i % 2) === 0 ? TEAM_COLORS[1] : TEAM_COLORS[2],
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Player ${i + 1}`}
                    value={name}
                    onChange={(e) => updatePlayerName(i, e.target.value)}
                    maxLength={16}
                    className="flex-1 px-3 py-2 rounded text-sm border outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = 'var(--color-accent)')
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = 'var(--color-border)')
                    }
                  />
                  {playerNames.length > 4 && (
                    <button
                      onClick={() => removePlayerSlot(i)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: 'var(--color-red)' }}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>

            {playerNames.length < 12 && (
              <button
                onClick={addPlayerSlot}
                className="mt-3 text-xs px-3 py-1.5 rounded border transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                + Add Player
              </button>
            )}
          </div>

          {setupError && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: 'var(--color-red)' }}
            >
              {setupError}
            </p>
          )}

          <div className="text-center">
            <button onClick={startGame} className="pixel-btn text-sm">
              START GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     SCOREBOARD (shared across game phases)
     ================================================================ */
  const scoreboard = (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[1] }}>
          {TEAM_NAMES[1]}
        </span>
        <span className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[1] }}>
          {team1.score}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>vs</span>
      <div className="flex items-center gap-2">
        <span className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[2] }}>
          {team2.score}
        </span>
        <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[2] }}>
          {TEAM_NAMES[2]}
        </span>
      </div>
    </div>
  );

  /* ================================================================
     SPECTRUM BAR (shared renderer)
     ================================================================ */
  const spectrumBar = (interactive: boolean) => (
    <div className="mb-6">
      {/* Labels */}
      <div className="flex justify-between mb-2">
        <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[1] }}>
          {currentPair?.left}
        </span>
        <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[2] }}>
          {currentPair?.right}
        </span>
      </div>

      {/* Spectrum slider */}
      <div
        ref={sliderRef}
        className="relative h-12 md:h-14 rounded-lg overflow-hidden select-none"
        style={{
          background: `linear-gradient(to right, ${TEAM_COLORS[1]}, var(--color-purple), ${TEAM_COLORS[2]})`,
          cursor: interactive ? 'pointer' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? handlePointerUp : undefined}
      >
        {/* Target zones (visible after reveal or for psychic) */}
        {showTarget && (
          <>
            {/* Close zone background */}
            <div
              className="absolute top-0 h-full transition-all duration-700"
              style={{
                left: `${Math.max(0, targetPosition - 15)}%`,
                width: `${Math.min(30, 100 - Math.max(0, targetPosition - 15))}%`,
                backgroundColor: 'rgba(0,255,136,0.15)',
              }}
            />
            {/* Bulls-eye zone */}
            <div
              className="absolute top-0 h-full transition-all duration-700"
              style={{
                left: `${Math.max(0, targetPosition - 5)}%`,
                width: `${Math.min(10, 100 - Math.max(0, targetPosition - 5))}%`,
                backgroundColor: 'rgba(0,255,136,0.4)',
                borderLeft: '2px solid var(--color-accent)',
                borderRight: '2px solid var(--color-accent)',
              }}
            />
            {/* Target line */}
            <div
              className="absolute top-0 h-full w-1 transition-all duration-500"
              style={{
                left: `${targetPosition}%`,
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 0 12px var(--color-accent), 0 0 24px var(--color-accent)',
                zIndex: 10,
              }}
            />
          </>
        )}

        {/* Guess marker */}
        {(phase === 'team-guess' || phase === 'reveal') && (
          <div
            className="absolute top-0 h-full flex items-center justify-center transition-all"
            style={{
              left: `${guessPosition}%`,
              transform: 'translateX(-50%)',
              zIndex: 20,
              transitionDuration: isDragging ? '0ms' : '150ms',
            }}
          >
            <div
              className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-bg)',
                borderWidth: '3px',
                borderStyle: 'solid',
                borderColor: 'var(--color-text)',
                boxShadow: '0 0 8px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                style={{ backgroundColor: TEAM_COLORS[currentTeam] }}
              />
            </div>
          </div>
        )}

        {/* Psychic target indicator */}
        {phase === 'psychic-view' && (
          <div
            className="absolute top-0 h-full flex items-center justify-center"
            style={{
              left: `${targetPosition}%`,
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
          >
            <div
              className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center animate-glow-pulse"
              style={{
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 0 16px var(--color-accent)',
              }}
            >
              <span className="text-sm md:text-base font-bold" style={{ color: 'var(--color-bg)' }}>
                X
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Percentage labels */}
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>0%</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>50%</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>100%</span>
      </div>
    </div>
  );

  /* ================================================================
     PSYCHIC VIEW
     ================================================================ */
  if (phase === 'psychic-view') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          {scoreboard}

          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              ROUND {roundIndex + 1} | {TEAM_NAMES[currentTeam]}&apos;s TURN
            </p>
            <h2
              className="pixel-text text-sm md:text-base mb-1"
              style={{ color: TEAM_COLORS[currentTeam] }}
            >
              PSYCHIC: {psychic?.name}
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Only the psychic should look! Others look away.
            </p>

            {currentPair && (
              <span
                className="inline-block px-2 py-0.5 rounded text-xs mb-3"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {CATEGORY_EMOJI[currentPair.category]} {currentPair.category}
              </span>
            )}
          </div>

          {spectrumBar(false)}

          <div
            className="pixel-card rounded-lg p-4 md:p-6 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Give a ONE-WORD clue to help your team find the target
            </p>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <input
                type="text"
                placeholder="Your clue..."
                value={clue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s/g, '');
                  setClue(val);
                }}
                maxLength={24}
                className="flex-1 px-4 py-3 rounded text-center text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = 'var(--color-accent)')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = 'var(--color-border)')
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitClue();
                }}
              />
            </div>
            <button
              onClick={submitClue}
              disabled={clue.trim().length === 0}
              className="pixel-btn text-xs mt-4"
              style={{
                opacity: clue.trim().length === 0 ? 0.4 : 1,
                cursor: clue.trim().length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              LOCK IN CLUE
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     TEAM GUESS
     ================================================================ */
  if (phase === 'team-guess') {
    const teamPlayers = currentTeam === 1 ? team1.players : team2.players;
    const guessers = teamPlayers.filter((p) => p.id !== psychic?.id);

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          {scoreboard}

          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {TEAM_NAMES[currentTeam]} GUESSING
            </p>
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {psychic?.name}&apos;s clue:
            </p>
            <h2
              className="pixel-text text-lg md:text-2xl mb-2 animate-fade-in-up"
              style={{ color: 'var(--color-accent)' }}
            >
              &quot;{clue}&quot;
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {guessers.map((p) => p.name).join(', ')} — discuss and drag the marker!
            </p>
          </div>

          {spectrumBar(true)}

          <div className="text-center">
            <p className="mono-text text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Position: {Math.round(guessPosition)}%
            </p>
            <button onClick={submitGuess} className="pixel-btn text-sm">
              LOCK IN GUESS
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     REVEAL
     ================================================================ */
  if (phase === 'reveal') {
    const diff = Math.abs(targetPosition - guessPosition);
    const scoreLabel =
      roundScore === 4
        ? "BULLS-EYE!"
        : roundScore === 3
        ? 'CLOSE!'
        : roundScore === 2
        ? 'WARM'
        : 'MISS...';

    const scoreColor =
      roundScore === 4
        ? 'var(--color-accent)'
        : roundScore === 3
        ? 'var(--color-cyan)'
        : roundScore === 2
        ? 'var(--color-orange)'
        : 'var(--color-red)';

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          {scoreboard}

          {spectrumBar(false)}

          <div
            className="pixel-card rounded-lg p-6 md:p-8 text-center animate-scale-in"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xl md:text-3xl mb-2"
              style={{ color: scoreColor }}
            >
              {scoreLabel}
            </h2>
            <p
              className="mono-text text-3xl md:text-5xl font-bold mb-3"
              style={{ color: scoreColor }}
            >
              +{roundScore}
            </p>
            <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>Target: {Math.round(targetPosition)}% | Guess: {Math.round(guessPosition)}%</p>
              <p>Off by {Math.round(diff)}%</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Clue: &quot;{clue}&quot; by {psychic?.name}
              </p>
            </div>

            <button onClick={nextRound} className="pixel-btn text-sm mt-6">
              NEXT ROUND
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     GAME OVER
     ================================================================ */
  if (phase === 'game-over') {
    const winner: 1 | 2 = team1.score >= WINNING_SCORE ? 1 : 2;
    const loserScore = winner === 1 ? team2.score : team1.score;
    const winnerScore = winner === 1 ? team1.score : team2.score;

    return (
      <div
        className="min-h-screen p-4 md:p-8 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg w-full text-center">
          <div className="animate-scale-in">
            <p
              className="pixel-text text-xs mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              GAME OVER
            </p>
            <h1
              className="pixel-text text-xl md:text-3xl mb-4"
              style={{ color: TEAM_COLORS[winner] }}
            >
              {TEAM_NAMES[winner]} WINS!
            </h1>

            <div
              className="pixel-card rounded-lg p-6 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="flex justify-center items-end gap-8 mb-6">
                <div className="text-center">
                  <p className="pixel-text text-xs mb-1" style={{ color: TEAM_COLORS[winner] }}>
                    {TEAM_NAMES[winner]}
                  </p>
                  <p className="mono-text text-4xl font-bold" style={{ color: TEAM_COLORS[winner] }}>
                    {winnerScore}
                  </p>
                </div>
                <span className="text-2xl mb-2" style={{ color: 'var(--color-text-muted)' }}>-</span>
                <div className="text-center">
                  <p className="pixel-text text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {TEAM_NAMES[winner === 1 ? 2 : 1]}
                  </p>
                  <p className="mono-text text-4xl font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {loserScore}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  WINNING TEAM
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(winner === 1 ? team1 : team2).players.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        color: TEAM_COLORS[winner],
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={resetGame} className="pixel-btn text-xs">
                NEW GAME
              </button>
              <Link
                href="/games"
                className="pixel-btn text-xs"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                BACK TO ARCADE
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
