'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { WORD_CATEGORIES, getRandomPair, getTotalPairCount } from './words';
import type { WordPair } from './words';

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase =
  | 'mode-select'
  | 'lobby'
  | 'category-select'
  | 'role-reveal'
  | 'clue-round'
  | 'discussion'
  | 'vote'
  | 'reveal'
  | 'scoreboard'
  | 'final-results';

interface Player {
  id: number;
  name: string;
  score: number;
}

interface RoundState {
  pair: WordPair;
  category: string;
  impostorId: number;
  clues: Record<number, string>;
  votes: Record<number, number>;
  impostorGuess: string;
  impostorGuessedCorrectly: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const DISCUSSION_SECONDS = 90;
const TOTAL_ROUNDS_DEFAULT = 3;
const SETTINGS_KEY = 'pixel-impostor-settings';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PixelImpostorPage() {
  const [mounted, setMounted] = useState(false);

  // Game config
  const [players, setPlayers] = useState<Player[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [totalRounds, setTotalRounds] = useState(TOTAL_ROUNDS_DEFAULT);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('mode-select');
  const [currentRound, setCurrentRound] = useState(0);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [turnOrder, setTurnOrder] = useState<number[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);

  // Privacy screen for pass-the-phone
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyCallback, setPrivacyCallback] = useState<(() => void) | null>(null);

  // Discussion timer
  const [discussionTime, setDiscussionTime] = useState(DISCUSSION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vote state
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);

  // Impostor guess phase
  const [showImpostorGuess, setShowImpostorGuess] = useState(false);
  const [impostorGuessInput, setImpostorGuessInput] = useState('');

  // Card flip animation
  const [cardFlipped, setCardFlipped] = useState(false);

  // Clue input
  const [clueInput, setClueInput] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.totalRounds) setTotalRounds(parsed.totalRounds);
        if (parsed.selectedCategories) setSelectedCategories(parsed.selectedCategories);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ totalRounds, selectedCategories })
      );
    } catch {
      /* ignore */
    }
  }, [totalRounds, selectedCategories, mounted]);

  // Discussion timer
  useEffect(() => {
    if (phase === 'discussion') {
      setDiscussionTime(DISCUSSION_SECONDS);
      timerRef.current = setInterval(() => {
        setDiscussionTime((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ─── Player Management ──────────────────────────────────────────────────

  const addPlayer = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || players.length >= MAX_PLAYERS) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    setPlayers((prev) => [
      ...prev,
      { id: prev.length + 1, name: trimmed, score: 0 },
    ]);
    setNameInput('');
  };

  const removePlayer = (id: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  // ─── Category Management ────────────────────────────────────────────────

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  // ─── Round Management ───────────────────────────────────────────────────

  const startNewRound = useCallback(() => {
    const cats = selectedCategories.length > 0 ? selectedCategories : undefined;
    const { pair, category } = getRandomPair(cats);
    const impostorId =
      players[Math.floor(Math.random() * players.length)].id;
    const order = shuffleArray(players.map((p) => p.id));

    setRoundState({
      pair,
      category,
      impostorId,
      clues: {},
      votes: {},
      impostorGuess: '',
      impostorGuessedCorrectly: false,
    });
    setTurnOrder(order);
    setCurrentTurnIndex(0);
    setCurrentRevealIndex(0);
    setCurrentVoterIndex(0);
    setShowImpostorGuess(false);
    setImpostorGuessInput('');
    setCardFlipped(false);
    setClueInput('');
    setCurrentRound((r) => r + 1);
    setPhase('role-reveal');
    setShowPrivacy(true);
    setPrivacyCallback(null);
  }, [players, selectedCategories]);

  // ─── Privacy Screen ─────────────────────────────────────────────────────

  const dismissPrivacy = () => {
    setShowPrivacy(false);
    setCardFlipped(false);
    if (privacyCallback) {
      privacyCallback();
      setPrivacyCallback(null);
    }
  };

  // ─── Role Reveal ────────────────────────────────────────────────────────

  const currentRevealPlayer = players.find(
    (p) => p.id === turnOrder[currentRevealIndex]
  );

  const flipCard = () => {
    setCardFlipped(true);
  };

  const nextReveal = () => {
    if (currentRevealIndex < turnOrder.length - 1) {
      setCurrentRevealIndex((i) => i + 1);
      setCardFlipped(false);
      setShowPrivacy(true);
    } else {
      setCurrentTurnIndex(0);
      setClueInput('');
      setPhase('clue-round');
      setShowPrivacy(true);
    }
  };

  // ─── Clue Round ─────────────────────────────────────────────────────────

  const currentCluePlayer = players.find(
    (p) => p.id === turnOrder[currentTurnIndex]
  );

  const submitClue = () => {
    const trimmed = clueInput.trim();
    if (!trimmed || !roundState) return;
    if (trimmed.includes(' ')) return;

    setRoundState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clues: { ...prev.clues, [turnOrder[currentTurnIndex]]: trimmed },
      };
    });

    if (currentTurnIndex < turnOrder.length - 1) {
      setCurrentTurnIndex((i) => i + 1);
      setClueInput('');
      setShowPrivacy(true);
    } else {
      setPhase('discussion');
    }
  };

  // ─── Voting ─────────────────────────────────────────────────────────────

  const startVoting = () => {
    setCurrentVoterIndex(0);
    setPhase('vote');
    setShowPrivacy(true);
  };

  const currentVoter = players.find(
    (p) => p.id === turnOrder[currentVoterIndex]
  );

  const submitVote = (votedForId: number) => {
    if (!roundState) return;
    setRoundState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        votes: { ...prev.votes, [turnOrder[currentVoterIndex]]: votedForId },
      };
    });

    if (currentVoterIndex < turnOrder.length - 1) {
      setCurrentVoterIndex((i) => i + 1);
      setShowPrivacy(true);
    } else {
      setPhase('reveal');
    }
  };

  // ─── Reveal & Scoring ──────────────────────────────────────────────────

  const getVoteCounts = useCallback((): Record<number, number> => {
    if (!roundState) return {};
    const counts: Record<number, number> = {};
    Object.values(roundState.votes).forEach((votedId) => {
      counts[votedId] = (counts[votedId] || 0) + 1;
    });
    return counts;
  }, [roundState]);

  const getMostVotedId = useCallback((): number | null => {
    const counts = getVoteCounts();
    let maxVotes = 0;
    let maxId: number | null = null;
    Object.entries(counts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        maxId = Number(id);
      }
    });
    return maxId;
  }, [getVoteCounts]);

  const impostorWasCaught = getMostVotedId() === roundState?.impostorId;

  const applyScores = useCallback(
    (impostorGuessedRight: boolean) => {
      if (!roundState) return;
      const impostorId = roundState.impostorId;
      const caught = getMostVotedId() === impostorId;

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === impostorId) {
            if (!caught) return { ...p, score: p.score + 3 };
            if (impostorGuessedRight) return { ...p, score: p.score + 3 };
            return p;
          }
          const votedFor = roundState.votes[p.id];
          if (votedFor === impostorId) return { ...p, score: p.score + 1 };
          return p;
        })
      );
    },
    [roundState, getMostVotedId]
  );

  const handleImpostorGuess = () => {
    if (!roundState) return;
    const correct =
      impostorGuessInput.trim().toLowerCase() ===
      roundState.pair.real.toLowerCase();
    setRoundState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        impostorGuess: impostorGuessInput.trim(),
        impostorGuessedCorrectly: correct,
      };
    });
    setShowImpostorGuess(false);
    applyScores(correct);
    setPhase('scoreboard');
  };

  const skipImpostorGuess = () => {
    if (!roundState) return;
    setRoundState((prev) => {
      if (!prev) return prev;
      return { ...prev, impostorGuess: '', impostorGuessedCorrectly: false };
    });
    setShowImpostorGuess(false);
    applyScores(false);
    setPhase('scoreboard');
  };

  const goToRevealPhase = () => {
    if (impostorWasCaught) {
      setShowImpostorGuess(true);
    } else {
      applyScores(false);
      setPhase('scoreboard');
    }
  };

  const nextRoundOrEnd = () => {
    if (currentRound >= totalRounds) {
      setPhase('final-results');
    } else {
      startNewRound();
    }
  };

  const resetGame = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setCurrentRound(0);
    setRoundState(null);
    setPhase('lobby');
  };

  const fullReset = () => {
    setPlayers([]);
    setCurrentRound(0);
    setRoundState(null);
    setPhase('mode-select');
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const playerName = (id: number) =>
    players.find((p) => p.id === id)?.name || 'Unknown';

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);

  if (!mounted) return null;

  // ─── Privacy Screen Overlay ─────────────────────────────────────────────

  const renderPrivacyScreen = () => {
    if (!showPrivacy) return null;

    let label = '';
    if (phase === 'role-reveal' && currentRevealPlayer) {
      label = currentRevealPlayer.name;
    } else if (phase === 'clue-round' && currentCluePlayer) {
      label = currentCluePlayer.name;
    } else if (phase === 'vote' && currentVoter) {
      label = currentVoter.name;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-pixel-bounce">{'\uD83D\uDD12'}</div>
          <h2
            className="pixel-text text-lg md:text-xl mb-4"
            style={{ color: 'var(--color-accent)' }}
          >
            PASS THE PHONE
          </h2>
          {label && (
            <p className="pixel-text text-sm mb-6" style={{ color: 'var(--color-purple)' }}>
              Hand the phone to {label}
            </p>
          )}
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Make sure only {label || 'the next player'} can see the screen
          </p>
          <button
            onClick={dismissPrivacy}
            className="pixel-btn px-6 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            {"I'M READY"}
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Mode Select ────────────────────────────────────────────────────────

  if (phase === 'mode-select') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: 'var(--color-text-secondary)' }}>
            {'\u2190'} Back to Arcade
          </Link>

          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{'\uD83D\uDD75\uFE0F'}</div>
            <h1 className="pixel-text text-xl md:text-2xl mb-2" style={{ color: 'var(--color-accent)' }}>PIXEL IMPOSTOR</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>One word. One liar. Everyone suspects everyone.</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => setPhase('lobby')} className="pixel-card w-full p-6 rounded-lg text-left transition-all hover:scale-[1.02]" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-border)' }}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">{'\uD83D\uDCF1'}</span>
                <div>
                  <h3 className="pixel-text text-sm mb-1" style={{ color: 'var(--color-accent)' }}>PASS THE PHONE</h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Share one device. Perfect for in-person play.</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>HOW TO PLAY</p>
            <div className="pixel-card rounded-lg p-4 text-left text-xs space-y-2" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              <p><span style={{ color: 'var(--color-accent)' }}>1.</span> Everyone gets a secret word except the Impostor, who gets a similar decoy</p>
              <p><span style={{ color: 'var(--color-accent)' }}>2.</span> Take turns saying a ONE-WORD clue proving you know the real word</p>
              <p><span style={{ color: 'var(--color-accent)' }}>3.</span> Discuss and vote on who you think is the Impostor</p>
              <p><span style={{ color: 'var(--color-accent)' }}>4.</span> If caught, the Impostor gets one chance to guess the real word</p>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              {getTotalPairCount()} word pairs across {WORD_CATEGORIES.length} categories
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Lobby ──────────────────────────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <button onClick={fullReset} className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: 'var(--color-text-secondary)' }}>
            {'\u2190'} Back
          </button>

          <h2 className="pixel-text text-lg md:text-xl text-center mb-6" style={{ color: 'var(--color-accent)' }}>ADD PLAYERS</h2>

          <div className="flex gap-2 mb-4">
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Enter player name..." maxLength={15} className="flex-1 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', border: '2px solid var(--color-border)', outline: 'none' }} />
            <button onClick={addPlayer} disabled={!nameInput.trim() || players.length >= MAX_PLAYERS} className="pixel-btn px-4 py-3 text-sm" style={{ backgroundColor: nameInput.trim() && players.length < MAX_PLAYERS ? 'var(--color-accent)' : 'var(--color-border)', color: 'var(--color-bg)' }}>ADD</button>
          </div>

          <div className="space-y-2 mb-6">
            {players.map((p, i) => (
              <div key={p.id} className="pixel-card flex items-center justify-between px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="pixel-text text-xs w-6 text-center" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                  <span className="text-sm">{p.name}</span>
                </div>
                <button onClick={() => removePlayer(p.id)} className="text-sm px-2 py-1 rounded hover:opacity-80" style={{ color: 'var(--color-red)' }}>{'\u2715'}</button>
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'var(--color-text-muted)' }}>Add {MIN_PLAYERS}-{MAX_PLAYERS} players to start</p>
            )}
          </div>

          <div className="pixel-card rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <p className="pixel-text text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>ROUNDS</p>
            <div className="flex gap-2">
              {[2, 3, 5, 7].map((n) => (
                <button key={n} onClick={() => setTotalRounds(n)} className="pixel-btn flex-1 py-2 text-xs rounded" style={{ backgroundColor: totalRounds === n ? 'var(--color-accent)' : 'var(--color-surface)', color: totalRounds === n ? 'var(--color-bg)' : 'var(--color-text-secondary)', border: `1px solid ${totalRounds === n ? 'var(--color-accent)' : 'var(--color-border)'}` }}>{n}</button>
              ))}
            </div>
          </div>

          <button onClick={() => setPhase('category-select')} disabled={players.length < MIN_PLAYERS} className="pixel-btn w-full py-4 text-sm rounded-lg transition-all" style={{ backgroundColor: players.length >= MIN_PLAYERS ? 'var(--color-accent)' : 'var(--color-border)', color: 'var(--color-bg)' }}>
            {players.length < MIN_PLAYERS ? `NEED ${MIN_PLAYERS - players.length} MORE PLAYER${MIN_PLAYERS - players.length > 1 ? 'S' : ''}` : `START GAME (${players.length} PLAYERS)`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Category Select ────────────────────────────────────────────────────

  if (phase === 'category-select') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase('lobby')} className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: 'var(--color-text-secondary)' }}>{'\u2190'} Back</button>

          <h2 className="pixel-text text-lg md:text-xl text-center mb-2" style={{ color: 'var(--color-accent)' }}>PICK CATEGORIES</h2>
          <p className="text-center text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>Select categories or leave empty for all</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {WORD_CATEGORIES.map((cat: { name: string; icon: string; pairs: WordPair[] }) => {
              const active = selectedCategories.includes(cat.name);
              return (
                <button key={cat.name} onClick={() => toggleCategory(cat.name)} className="pixel-card p-4 rounded-lg text-center transition-all hover:scale-[1.03]" style={{ backgroundColor: active ? 'var(--color-accent-glow)' : 'var(--color-bg-card)', border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <p className="pixel-text text-[10px]" style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>{cat.name.toUpperCase()}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{cat.pairs.length} pairs</p>
                </button>
              );
            })}
          </div>

          <button onClick={() => startNewRound()} className="pixel-btn w-full py-4 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}>
            {selectedCategories.length === 0 ? 'START WITH ALL CATEGORIES' : `START WITH ${selectedCategories.length} ${selectedCategories.length === 1 ? 'CATEGORY' : 'CATEGORIES'}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Role Reveal ────────────────────────────────────────────────────────

  if (phase === 'role-reveal' && roundState && currentRevealPlayer) {
    const isImpostor = currentRevealPlayer.id === roundState.impostorId;
    const word = isImpostor ? roundState.pair.decoy : roundState.pair.real;

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {renderPrivacyScreen()}
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            ROUND {currentRound}/{totalRounds} {'\u2022'} {roundState.category.toUpperCase()}
          </p>
          <p className="pixel-text text-sm mb-8" style={{ color: 'var(--color-purple)' }}>
            {currentRevealPlayer.name}&apos;s SECRET
          </p>

          <div className="relative w-64 h-80 mb-8" style={{ perspective: '1000px' }}>
            <div className="w-full h-full transition-transform duration-700 relative" style={{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0)' }}>
              {/* Card back */}
              <div className="absolute inset-0 pixel-card rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ backfaceVisibility: 'hidden', backgroundColor: 'var(--color-bg-card)', border: '3px solid var(--color-accent)', boxShadow: '0 0 30px var(--color-accent-glow)' }} onClick={flipCard}>
                <div className="text-5xl mb-4">{'\u2753'}</div>
                <p className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>TAP TO REVEAL</p>
              </div>

              {/* Card front */}
              <div className="absolute inset-0 pixel-card rounded-xl flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: 'var(--color-bg-card)', border: `3px solid ${isImpostor ? 'var(--color-red)' : 'var(--color-accent)'}`, boxShadow: `0 0 30px ${isImpostor ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-accent-glow)'}` }}>
                {isImpostor && (
                  <div className="pixel-text text-[10px] px-3 py-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-red)', border: '1px solid var(--color-red)' }}>
                    YOU ARE THE IMPOSTOR
                  </div>
                )}
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Your word is</p>
                <p className="pixel-text text-xl md:text-2xl text-center px-4" style={{ color: isImpostor ? 'var(--color-red)' : 'var(--color-accent)' }}>{word}</p>
                <p className="text-[10px] mt-4 px-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  {isImpostor ? "Blend in! Give a clue that sounds right but don't reveal you have a different word." : "Give a clue that proves you know this word without making it too obvious for the Impostor."}
                </p>
              </div>
            </div>
          </div>

          {cardFlipped && (
            <button onClick={nextReveal} className="pixel-btn px-8 py-3 text-sm rounded-lg animate-fade-in-up" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}>
              {currentRevealIndex < turnOrder.length - 1 ? 'NEXT PLAYER' : 'START CLUES'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Clue Round ─────────────────────────────────────────────────────────

  if (phase === 'clue-round' && roundState && currentCluePlayer) {
    const submittedClues = Object.entries(roundState.clues);

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {renderPrivacyScreen()}
        <div className="max-w-lg mx-auto">
          <p className="pixel-text text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>
            ROUND {currentRound}/{totalRounds} {'\u2022'} CLUE {currentTurnIndex + 1}/{turnOrder.length}
          </p>
          <h2 className="pixel-text text-lg text-center mb-6" style={{ color: 'var(--color-purple)' }}>
            {currentCluePlayer.name}&apos;s TURN
          </h2>

          {submittedClues.length > 0 && (
            <div className="pixel-card rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <p className="pixel-text text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>CLUE BOARD</p>
              <div className="space-y-2">
                {submittedClues.map(([id, clue]) => (
                  <div key={id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{playerName(Number(id))}</span>
                    <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>{clue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Enter your ONE-WORD clue</p>
            <input type="text" value={clueInput} onChange={(e) => setClueInput(e.target.value.replace(/\s/g, ''))} onKeyDown={(e) => e.key === 'Enter' && submitClue()} placeholder="Type a single word..." maxLength={30} className="w-full px-4 py-4 rounded-lg text-center text-lg mb-4" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', border: '2px solid var(--color-border)', outline: 'none' }} autoFocus />
            <button onClick={submitClue} disabled={!clueInput.trim()} className="pixel-btn px-8 py-3 text-sm rounded-lg" style={{ backgroundColor: clueInput.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: 'var(--color-bg)' }}>SUBMIT CLUE</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Discussion ─────────────────────────────────────────────────────────

  if (phase === 'discussion' && roundState) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <p className="pixel-text text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>ROUND {currentRound}/{totalRounds}</p>
          <h2 className="pixel-text text-lg text-center mb-4" style={{ color: 'var(--color-orange)' }}>DISCUSSION TIME</h2>

          <div className="text-center mb-6">
            <div className="pixel-text text-3xl inline-block px-6 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: `2px solid ${discussionTime <= 10 ? 'var(--color-red)' : 'var(--color-border)'}`, color: discussionTime <= 10 ? 'var(--color-red)' : 'var(--color-text)', animation: discussionTime <= 10 ? 'pulse 1s infinite' : undefined }}>
              {Math.floor(discussionTime / 60)}:{String(discussionTime % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="pixel-card rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <p className="pixel-text text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>ALL CLUES</p>
            <div className="space-y-3">
              {turnOrder.map((id) => (
                <div key={id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <span className="text-sm">{playerName(id)}</span>
                  <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>{roundState.clues[id] || '...'}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>Discuss verbally who you think is the Impostor!</p>

          <button onClick={startVoting} className="pixel-btn w-full py-4 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-purple)', color: 'white' }}>START VOTING</button>
        </div>
      </div>
    );
  }

  // ─── Vote ───────────────────────────────────────────────────────────────

  if (phase === 'vote' && roundState && currentVoter) {
    const otherPlayers = players.filter((p) => p.id !== currentVoter.id);

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {renderPrivacyScreen()}
        <div className="max-w-lg mx-auto">
          <p className="pixel-text text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>VOTE {currentVoterIndex + 1}/{turnOrder.length}</p>
          <h2 className="pixel-text text-lg text-center mb-2" style={{ color: 'var(--color-purple)' }}>{currentVoter.name}</h2>
          <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Who do you think is the Impostor?</p>

          <div className="pixel-card rounded-lg p-3 mb-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <p className="pixel-text text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>CLUE BOARD</p>
            <div className="space-y-1">
              {turnOrder.map((id) => (
                <div key={id} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{playerName(id)}</span>
                  <span style={{ color: 'var(--color-accent)' }}>{roundState.clues[id]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {otherPlayers.map((p) => (
              <button key={p.id} onClick={() => submitVote(p.id)} className="pixel-card p-4 rounded-lg text-center transition-all hover:scale-[1.03] active:scale-95" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-border)' }}>
                <div className="text-2xl mb-2">{'\uD83D\uDE10'}</div>
                <p className="pixel-text text-xs" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Clue: {roundState.clues[p.id] || 'none'}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Reveal ─────────────────────────────────────────────────────────────

  if (phase === 'reveal' && roundState) {
    const voteCounts = getVoteCounts();
    const mostVotedId = getMostVotedId();
    const caught = mostVotedId === roundState.impostorId;
    const impostorPlayer = players.find((p) => p.id === roundState.impostorId);

    if (showImpostorGuess) {
      return (
        <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-5xl mb-4">{'\uD83D\uDE08'}</div>
            <h2 className="pixel-text text-lg text-center mb-2" style={{ color: 'var(--color-red)' }}>CAUGHT!</h2>
            <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>{impostorPlayer?.name}, you have one chance to guess the real word!</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Your word was: <span style={{ color: 'var(--color-red)' }}>{roundState.pair.decoy}</span></p>
            <input type="text" value={impostorGuessInput} onChange={(e) => setImpostorGuessInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleImpostorGuess()} placeholder="Guess the real word..." maxLength={30} className="w-full max-w-xs px-4 py-4 rounded-lg text-center text-lg mb-4" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', border: '2px solid var(--color-red)', outline: 'none' }} autoFocus />
            <div className="flex gap-3">
              <button onClick={handleImpostorGuess} disabled={!impostorGuessInput.trim()} className="pixel-btn px-6 py-3 text-sm rounded-lg" style={{ backgroundColor: impostorGuessInput.trim() ? 'var(--color-red)' : 'var(--color-border)', color: 'white' }}>GUESS</button>
              <button onClick={skipImpostorGuess} className="pixel-btn px-6 py-3 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>SKIP</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <p className="pixel-text text-xs text-center mb-4" style={{ color: 'var(--color-text-muted)' }}>ROUND {currentRound}/{totalRounds}</p>
          <h2 className="pixel-text text-lg text-center mb-6" style={{ color: 'var(--color-orange)' }}>VOTE RESULTS</h2>

          <div className="space-y-2 mb-6">
            {players.slice().sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0)).map((p) => {
              const votes = voteCounts[p.id] || 0;
              const isImpostor = p.id === roundState.impostorId;
              const isMostVoted = p.id === mostVotedId;
              return (
                <div key={p.id} className="pixel-card flex items-center justify-between px-4 py-3 rounded-lg" style={{ backgroundColor: isMostVoted ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-card)', border: `2px solid ${isMostVoted ? 'var(--color-red)' : 'var(--color-border)'}` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{p.name}</span>
                    {isImpostor && <span className="pixel-text text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-red)' }}>IMPOSTOR</span>}
                  </div>
                  <span className="pixel-text text-sm" style={{ color: isMostVoted ? 'var(--color-red)' : 'var(--color-text-secondary)' }}>{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                </div>
              );
            })}
          </div>

          <div className="pixel-card rounded-lg p-6 text-center mb-6 animate-fade-in-up" style={{ backgroundColor: 'var(--color-bg-card)', border: `2px solid ${caught ? 'var(--color-accent)' : 'var(--color-red)'}`, boxShadow: `0 0 30px ${caught ? 'var(--color-accent-glow)' : 'rgba(239, 68, 68, 0.15)'}` }}>
            <div className="text-4xl mb-3">{caught ? '\uD83C\uDF89' : '\uD83D\uDE08'}</div>
            <p className="pixel-text text-sm mb-2" style={{ color: caught ? 'var(--color-accent)' : 'var(--color-red)' }}>{caught ? 'IMPOSTOR CAUGHT!' : 'IMPOSTOR ESCAPED!'}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{impostorPlayer?.name} was the Impostor</p>
            <div className="mt-3 flex justify-center gap-4 text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>Real: <span style={{ color: 'var(--color-accent)' }}>{roundState.pair.real}</span></span>
              <span style={{ color: 'var(--color-text-muted)' }}>Decoy: <span style={{ color: 'var(--color-red)' }}>{roundState.pair.decoy}</span></span>
            </div>
          </div>

          <button onClick={goToRevealPhase} className="pixel-btn w-full py-4 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}>
            {caught ? 'IMPOSTOR LAST CHANCE' : 'SEE SCORES'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Scoreboard ─────────────────────────────────────────────────────────

  if (phase === 'scoreboard' && roundState) {
    const impostorPlayer = players.find((p) => p.id === roundState.impostorId);
    const caught = getMostVotedId() === roundState.impostorId;

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto">
          <p className="pixel-text text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>ROUND {currentRound}/{totalRounds} RESULTS</p>

          {caught && roundState.impostorGuess && (
            <div className="pixel-card rounded-lg p-4 text-center mb-4" style={{ backgroundColor: roundState.impostorGuessedCorrectly ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-accent-glow)', border: `2px solid ${roundState.impostorGuessedCorrectly ? 'var(--color-red)' : 'var(--color-accent)'}` }}>
              <p className="text-sm">{impostorPlayer?.name} guessed &quot;<span className="pixel-text" style={{ color: roundState.impostorGuessedCorrectly ? 'var(--color-red)' : 'var(--color-text)' }}>{roundState.impostorGuess}</span>&quot;</p>
              <p className="pixel-text text-xs mt-1" style={{ color: roundState.impostorGuessedCorrectly ? 'var(--color-red)' : 'var(--color-accent)' }}>
                {roundState.impostorGuessedCorrectly ? 'CORRECT! IMPOSTOR STEALS THE WIN!' : 'WRONG! TEAM WINS!'}
              </p>
            </div>
          )}

          <h2 className="pixel-text text-lg text-center mb-6" style={{ color: 'var(--color-accent)' }}>SCOREBOARD</h2>

          <div className="space-y-2 mb-8">
            {sortedByScore.map((p, i) => (
              <div key={p.id} className="pixel-card flex items-center justify-between px-4 py-3 rounded-lg" style={{ backgroundColor: i === 0 ? 'var(--color-accent-glow)' : 'var(--color-bg-card)', border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                <div className="flex items-center gap-3">
                  <span className="pixel-text text-xs w-6 text-center" style={{ color: i === 0 ? 'var(--color-accent)' : i === 1 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>#{i + 1}</span>
                  <span className="text-sm">{p.name}</span>
                  {p.id === roundState.impostorId && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-red)' }}>SPY</span>}
                </div>
                <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>{p.score} pts</span>
              </div>
            ))}
          </div>

          <button onClick={nextRoundOrEnd} className="pixel-btn w-full py-4 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}>
            {currentRound >= totalRounds ? 'FINAL RESULTS' : `ROUND ${currentRound + 1}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Final Results ──────────────────────────────────────────────────────

  if (phase === 'final-results') {
    const winner = sortedByScore[0];

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-6xl mb-4 animate-pixel-bounce">{'\uD83C\uDFC6'}</div>
          <h2 className="pixel-text text-xl md:text-2xl text-center mb-2" style={{ color: 'var(--color-accent)' }}>GAME OVER</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>{totalRounds} rounds completed</p>

          <div className="pixel-card rounded-xl p-6 text-center mb-6 w-full max-w-sm animate-fade-in-up" style={{ backgroundColor: 'var(--color-bg-card)', border: '3px solid var(--color-accent)', boxShadow: '0 0 40px var(--color-accent-glow)' }}>
            <p className="pixel-text text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>WINNER</p>
            <p className="pixel-text text-xl mb-1" style={{ color: 'var(--color-accent)' }}>{winner?.name}</p>
            <p className="pixel-text text-2xl" style={{ color: 'var(--color-orange)' }}>{winner?.score} PTS</p>
          </div>

          <div className="w-full max-w-sm space-y-2 mb-8">
            {sortedByScore.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                <div className="flex items-center gap-3">
                  <span className="pixel-text text-xs" style={{ color: i === 0 ? 'var(--color-accent)' : i === 1 ? 'var(--color-orange)' : i === 2 ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}>
                    {i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `#${i + 1}`}
                  </span>
                  <span className="text-sm">{p.name}</span>
                </div>
                <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>{p.score}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={resetGame} className="pixel-btn px-6 py-3 text-sm rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}>PLAY AGAIN</button>
            <Link href="/games" className="pixel-btn px-6 py-3 text-sm rounded-lg inline-flex items-center" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>ARCADE</Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
