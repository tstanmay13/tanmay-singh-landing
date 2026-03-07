'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { WORD_CATEGORIES, getRandomPair } from './words';
import type { WordPair } from './words';
import type { RealtimeChannel } from '@supabase/supabase-js';
import RoomCodeDisplay from '@/components/multiplayer/RoomCodeDisplay';
import PlayerList from '@/components/multiplayer/PlayerList';
import ConnectionStatus from '@/components/multiplayer/ConnectionStatus';
import { useGameRoom } from '@/lib/multiplayer/useGameRoom';
import type { GameRoom, PublicPlayer, GameState } from '@/lib/multiplayer/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type OnlinePhase =
  | 'lobby'
  | 'category-select'
  | 'role-reveal'
  | 'clue-round'
  | 'discussion'
  | 'vote'
  | 'vote-waiting'
  | 'reveal'
  | 'impostor-guess'
  | 'scoreboard'
  | 'final-results';

interface OnlineRoundData {
  wordReal: string;
  wordDecoy: string;
  category: string;
  impostorPlayerId: string;
  turnOrder: string[];
  clues: Record<string, string>;
  votes: Record<string, string>;
  currentTurnIndex: number;
  phase: OnlinePhase;
  currentRound: number;
  totalRounds: number;
  selectedCategories: string[];
  discussionEndTime: number;
  impostorGuess: string;
  impostorGuessedCorrectly: boolean;
  scores: Record<string, number>;
}

// ─── Broadcast event types ───────────────────────────────────────────────────

interface BroadcastClueSubmitted {
  type: 'clue_submitted';
  playerId: string;
  clue: string;
  nextTurnIndex: number;
}

interface BroadcastVoteCast {
  type: 'vote_cast';
  voterId: string;
  votedForId: string;
}

interface BroadcastPhaseChange {
  type: 'phase_change';
  phase: OnlinePhase;
  roundData?: Partial<OnlineRoundData>;
}

interface BroadcastGameStateUpdate {
  type: 'game_state_update';
  roundData: OnlineRoundData;
}

type BroadcastEvent =
  | BroadcastClueSubmitted
  | BroadcastVoteCast
  | BroadcastPhaseChange
  | BroadcastGameStateUpdate;

// ─── Constants ───────────────────────────────────────────────────────────────

const DISCUSSION_SECONDS = 90;
const TOTAL_ROUNDS_DEFAULT = 3;

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

interface OnlineGameProps {
  onBack: () => void;
}

export default function OnlineGame({ onBack }: OnlineGameProps) {
  // Lobby state
  const [inLobby, setInLobby] = useState(true);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PublicPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  // Game state
  const [phase, setPhase] = useState<OnlinePhase>('lobby');
  const [roundData, setRoundData] = useState<OnlineRoundData | null>(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [impostorGuessInput, setImpostorGuessInput] = useState('');

  // Category selection (host only, before first round)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [totalRounds, setTotalRounds] = useState(TOTAL_ROUNDS_DEFAULT);

  // Discussion timer
  const [discussionTime, setDiscussionTime] = useState(DISCUSSION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Track room code for channel
  const roomCodeRef = useRef<string>('');

  // ─── Subscribe to Supabase Realtime ────────────────────────────────────────

  const setupChannel = useCallback((roomCode: string) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    roomCodeRef.current = roomCode;
    const channel = supabase.channel(`room:${roomCode}:impostor`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'impostor_event' }, ({ payload }) => {
        const event = payload as BroadcastEvent;
        handleBroadcastEvent(event);
      })
      .subscribe();

    channelRef.current = channel;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle broadcast events
  const handleBroadcastEvent = useCallback((event: BroadcastEvent) => {
    switch (event.type) {
      case 'clue_submitted':
        setRoundData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            clues: { ...prev.clues, [event.playerId]: event.clue },
            currentTurnIndex: event.nextTurnIndex,
          };
        });
        break;

      case 'vote_cast':
        setRoundData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votes: { ...prev.votes, [event.voterId]: event.votedForId },
          };
        });
        break;

      case 'phase_change':
        setPhase(event.phase);
        if (event.roundData) {
          setRoundData((prev) => {
            if (!prev) return event.roundData as OnlineRoundData;
            return { ...prev, ...event.roundData, phase: event.phase };
          });
        }
        // Reset UI states on phase change
        setCardFlipped(false);
        setClueInput('');
        setImpostorGuessInput('');
        break;

      case 'game_state_update':
        setRoundData(event.roundData);
        setPhase(event.roundData.phase);
        setCardFlipped(false);
        setClueInput('');
        setImpostorGuessInput('');
        break;
    }
  }, []);

  // Discussion timer effect
  useEffect(() => {
    if (phase === 'discussion' && roundData) {
      const endTime = roundData.discussionEndTime;
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setDiscussionTime(remaining);
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, roundData]);

  // ─── Broadcast helper ──────────────────────────────────────────────────────

  const broadcast = useCallback((event: BroadcastEvent) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'impostor_event',
      payload: event,
    });
  }, []);

  // ─── Game Start (from lobby) ───────────────────────────────────────────────

  const handleLobbyGameStart = useCallback(
    (gameRoom: GameRoom, players: PublicPlayer[], pid: string) => {
      setRoom(gameRoom);
      setOnlinePlayers(players);
      setMyPlayerId(pid);
      setInLobby(false);

      const me = players.find((p) => p.id === pid);
      setIsHost(me?.is_host ?? false);

      setupChannel(gameRoom.code);
      setPhase('category-select');
    },
    [setupChannel]
  );

  // ─── Host: Start New Round ─────────────────────────────────────────────────

  const startNewRound = useCallback(() => {
    if (!isHost) return;

    const cats = selectedCategories.length > 0 ? selectedCategories : undefined;
    const { pair, category } = getRandomPair(cats);
    const order = shuffleArray(onlinePlayers.map((p) => p.id));
    const impostorPlayerId = order[Math.floor(Math.random() * order.length)];

    const currentRound = (roundData?.currentRound ?? 0) + 1;

    const newRoundData: OnlineRoundData = {
      wordReal: pair.real,
      wordDecoy: pair.decoy,
      category,
      impostorPlayerId,
      turnOrder: order,
      clues: {},
      votes: {},
      currentTurnIndex: 0,
      phase: 'role-reveal',
      currentRound,
      totalRounds,
      selectedCategories,
      discussionEndTime: 0,
      impostorGuess: '',
      impostorGuessedCorrectly: false,
      scores: roundData?.scores ?? Object.fromEntries(onlinePlayers.map((p) => [p.id, 0])),
    };

    setRoundData(newRoundData);
    setPhase('role-reveal');
    setCardFlipped(false);

    broadcast({
      type: 'game_state_update',
      roundData: newRoundData,
    });
  }, [isHost, selectedCategories, onlinePlayers, roundData, totalRounds, broadcast]);

  // ─── Category Selection ────────────────────────────────────────────────────

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleStartFromCategories = () => {
    startNewRound();
  };

  // ─── Role Reveal ───────────────────────────────────────────────────────────

  const myWord = roundData
    ? myPlayerId === roundData.impostorPlayerId
      ? roundData.wordDecoy
      : roundData.wordReal
    : '';

  const amImpostor = roundData ? myPlayerId === roundData.impostorPlayerId : false;

  const handleRevealDone = () => {
    if (!isHost || !roundData) return;
    const updated: OnlineRoundData = {
      ...roundData,
      phase: 'clue-round',
      currentTurnIndex: 0,
    };
    setRoundData(updated);
    setPhase('clue-round');
    broadcast({ type: 'phase_change', phase: 'clue-round', roundData: { currentTurnIndex: 0 } });
  };

  // ─── Clue Round ────────────────────────────────────────────────────────────

  const isMyTurn =
    roundData && phase === 'clue-round'
      ? roundData.turnOrder[roundData.currentTurnIndex] === myPlayerId
      : false;

  const currentTurnPlayer = roundData
    ? onlinePlayers.find((p) => p.id === roundData.turnOrder[roundData.currentTurnIndex])
    : null;

  const submitClue = () => {
    if (!roundData || !isMyTurn) return;
    const trimmed = clueInput.trim().replace(/\s/g, '');
    if (!trimmed) return;

    const nextIndex = roundData.currentTurnIndex + 1;
    const allDone = nextIndex >= roundData.turnOrder.length;

    broadcast({
      type: 'clue_submitted',
      playerId: myPlayerId,
      clue: trimmed,
      nextTurnIndex: allDone ? roundData.turnOrder.length : nextIndex,
    });

    setClueInput('');

    // If all clues in, host transitions to discussion
    if (allDone && isHost) {
      setTimeout(() => {
        const endTime = Date.now() + DISCUSSION_SECONDS * 1000;
        broadcast({
          type: 'phase_change',
          phase: 'discussion',
          roundData: { discussionEndTime: endTime },
        });
      }, 500);
    }
  };

  // ─── Discussion ────────────────────────────────────────────────────────────

  const startVoting = () => {
    if (!isHost) return;
    broadcast({ type: 'phase_change', phase: 'vote' });
  };

  // ─── Voting ────────────────────────────────────────────────────────────────

  const myVote = roundData?.votes[myPlayerId];
  const allVotesIn = roundData
    ? Object.keys(roundData.votes).length === onlinePlayers.length
    : false;

  const submitVote = (votedForId: string) => {
    if (!roundData || myVote) return;

    broadcast({
      type: 'vote_cast',
      voterId: myPlayerId,
      votedForId,
    });
  };

  // Check if all votes are in and reveal
  useEffect(() => {
    if (phase === 'vote' && allVotesIn && isHost && roundData) {
      // Small delay so everyone sees the "all votes in" state
      const timer = setTimeout(() => {
        broadcast({ type: 'phase_change', phase: 'reveal' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, allVotesIn, isHost, roundData, broadcast]);

  // ─── Reveal & Scoring ─────────────────────────────────────────────────────

  const getVoteCounts = useCallback((): Record<string, number> => {
    if (!roundData) return {};
    const counts: Record<string, number> = {};
    Object.values(roundData.votes).forEach((votedId) => {
      counts[votedId] = (counts[votedId] || 0) + 1;
    });
    return counts;
  }, [roundData]);

  const getMostVotedId = useCallback((): string | null => {
    const counts = getVoteCounts();
    let maxVotes = 0;
    let maxId: string | null = null;
    Object.entries(counts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        maxId = id;
      }
    });
    return maxId;
  }, [getVoteCounts]);

  const impostorWasCaught = getMostVotedId() === roundData?.impostorPlayerId;

  const computeScores = useCallback(
    (impostorGuessedRight: boolean): Record<string, number> => {
      if (!roundData) return {};
      const scores = { ...roundData.scores };
      const impostorId = roundData.impostorPlayerId;
      const caught = getMostVotedId() === impostorId;

      for (const p of onlinePlayers) {
        if (p.id === impostorId) {
          if (!caught) scores[p.id] = (scores[p.id] || 0) + 3;
          else if (impostorGuessedRight) scores[p.id] = (scores[p.id] || 0) + 3;
        } else {
          const votedFor = roundData.votes[p.id];
          if (votedFor === impostorId) scores[p.id] = (scores[p.id] || 0) + 1;
        }
      }
      return scores;
    },
    [roundData, getMostVotedId, onlinePlayers]
  );

  const goToImpostorGuessOrScore = () => {
    if (!isHost || !roundData) return;
    if (impostorWasCaught) {
      broadcast({ type: 'phase_change', phase: 'impostor-guess' });
    } else {
      const scores = computeScores(false);
      broadcast({
        type: 'phase_change',
        phase: 'scoreboard',
        roundData: { scores, impostorGuess: '', impostorGuessedCorrectly: false },
      });
    }
  };

  const handleImpostorGuess = () => {
    if (!roundData || myPlayerId !== roundData.impostorPlayerId) return;
    const guess = impostorGuessInput.trim();
    const correct = guess.toLowerCase() === roundData.wordReal.toLowerCase();

    // Broadcast the guess result - let the host compute scores
    broadcast({
      type: 'phase_change',
      phase: 'scoreboard',
      roundData: {
        impostorGuess: guess,
        impostorGuessedCorrectly: correct,
        scores: computeScores(correct),
      },
    });
  };

  const skipImpostorGuess = () => {
    if (!roundData || myPlayerId !== roundData.impostorPlayerId) return;
    broadcast({
      type: 'phase_change',
      phase: 'scoreboard',
      roundData: {
        impostorGuess: '',
        impostorGuessedCorrectly: false,
        scores: computeScores(false),
      },
    });
  };

  const nextRoundOrEnd = () => {
    if (!isHost || !roundData) return;
    if (roundData.currentRound >= roundData.totalRounds) {
      broadcast({ type: 'phase_change', phase: 'final-results' });
    } else {
      startNewRound();
    }
  };

  const resetToLobby = () => {
    setInLobby(true);
    setPhase('lobby');
    setRoundData(null);
    setCardFlipped(false);
  };

  // ─── Name Lookup ───────────────────────────────────────────────────────────

  const playerName = (id: string) =>
    onlinePlayers.find((p) => p.id === id)?.display_name || 'Unknown';

  const sortedByScore = roundData
    ? [...onlinePlayers].sort(
        (a, b) => (roundData.scores[b.id] || 0) - (roundData.scores[a.id] || 0)
      )
    : onlinePlayers;

  // ─── Lobby Phase ───────────────────────────────────────────────────────────

  if (inLobby) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {'\u2190'} Back
          </button>

          <ImpostorLobby
            onGameStart={handleLobbyGameStart}
            onPlayerIdKnown={(id) => setMyPlayerId(id)}
          />
        </div>
      </div>
    );
  }

  // ─── Category Select (host picks, others wait) ────────────────────────────

  if (phase === 'category-select') {
    if (!isHost) {
      return (
        <div
          className="min-h-screen p-4 md:p-8 flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pixel-bounce">{'\u23F3'}</div>
            <p className="pixel-text text-sm mb-2" style={{ color: 'var(--color-accent)' }}>
              WAITING FOR HOST
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              The host is picking categories...
            </p>
            {room && (
              <div className="mt-6">
                <RoomCodeDisplay code={room.code} compact />
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <h2
            className="pixel-text text-lg md:text-xl text-center mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            PICK CATEGORIES
          </h2>
          <p
            className="text-center text-xs mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Select categories or leave empty for all
          </p>

          {/* Rounds selector */}
          <div
            className="pixel-card rounded-lg p-4 mb-4"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p className="pixel-text text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              ROUNDS
            </p>
            <div className="flex gap-2">
              {[2, 3, 5, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalRounds(n)}
                  className="pixel-btn flex-1 py-2 text-xs rounded"
                  style={{
                    backgroundColor:
                      totalRounds === n ? 'var(--color-accent)' : 'var(--color-surface)',
                    color:
                      totalRounds === n ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                    border: `1px solid ${totalRounds === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {WORD_CATEGORIES.map((cat: { name: string; icon: string; pairs: WordPair[] }) => {
              const active = selectedCategories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className="pixel-card p-4 rounded-lg text-center transition-all hover:scale-[1.03]"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-accent-glow)'
                      : 'var(--color-bg-card)',
                    border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <p
                    className="pixel-text text-[10px]"
                    style={{
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {cat.name.toUpperCase()}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {cat.pairs.length} pairs
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleStartFromCategories}
            className="pixel-btn w-full py-4 text-sm rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            {selectedCategories.length === 0
              ? 'START WITH ALL CATEGORIES'
              : `START WITH ${selectedCategories.length} ${selectedCategories.length === 1 ? 'CATEGORY' : 'CATEGORIES'}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Role Reveal ───────────────────────────────────────────────────────────

  if (phase === 'role-reveal' && roundData) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <p
            className="pixel-text text-xs mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ROUND {roundData.currentRound}/{roundData.totalRounds} {'\u2022'}{' '}
            {roundData.category.toUpperCase()}
          </p>
          <p className="pixel-text text-sm mb-8" style={{ color: 'var(--color-purple)' }}>
            YOUR SECRET ROLE
          </p>

          <div className="relative w-64 h-80 mb-8" style={{ perspective: '1000px' }}>
            <div
              className="w-full h-full transition-transform duration-700 relative"
              style={{
                transformStyle: 'preserve-3d',
                transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
              }}
            >
              {/* Card back */}
              <div
                className="absolute inset-0 pixel-card rounded-xl flex flex-col items-center justify-center cursor-pointer"
                style={{
                  backfaceVisibility: 'hidden',
                  backgroundColor: 'var(--color-bg-card)',
                  border: '3px solid var(--color-accent)',
                  boxShadow: '0 0 30px var(--color-accent-glow)',
                }}
                onClick={() => setCardFlipped(true)}
              >
                <div className="text-5xl mb-4">{'\u2753'}</div>
                <p className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                  TAP TO REVEAL
                </p>
              </div>

              {/* Card front */}
              <div
                className="absolute inset-0 pixel-card rounded-xl flex flex-col items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  backgroundColor: 'var(--color-bg-card)',
                  border: `3px solid ${amImpostor ? 'var(--color-red)' : 'var(--color-accent)'}`,
                  boxShadow: `0 0 30px ${amImpostor ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-accent-glow)'}`,
                }}
              >
                {amImpostor && (
                  <div
                    className="pixel-text text-[10px] px-3 py-1 rounded-full mb-4"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--color-red)',
                      border: '1px solid var(--color-red)',
                    }}
                  >
                    YOU ARE THE IMPOSTOR
                  </div>
                )}
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Your word is
                </p>
                <p
                  className="pixel-text text-xl md:text-2xl text-center px-4"
                  style={{ color: amImpostor ? 'var(--color-red)' : 'var(--color-accent)' }}
                >
                  {myWord}
                </p>
                <p
                  className="text-[10px] mt-4 px-4 text-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {amImpostor
                    ? "Blend in! Give a clue that sounds right but don't reveal you have a different word."
                    : 'Give a clue that proves you know this word without making it too obvious for the Impostor.'}
                </p>
              </div>
            </div>
          </div>

          {cardFlipped && isHost && (
            <button
              onClick={handleRevealDone}
              className="pixel-btn px-8 py-3 text-sm rounded-lg animate-fade-in-up"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              START CLUES
            </button>
          )}
          {cardFlipped && !isHost && (
            <p
              className="pixel-text text-xs animate-fade-in-up"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Waiting for host to start clues...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Clue Round ────────────────────────────────────────────────────────────

  if (phase === 'clue-round' && roundData) {
    const submittedClues = Object.entries(roundData.clues);
    const allCluesDone = roundData.currentTurnIndex >= roundData.turnOrder.length;

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="pixel-text text-xs text-center mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ROUND {roundData.currentRound}/{roundData.totalRounds} {'\u2022'} CLUE{' '}
            {Math.min(roundData.currentTurnIndex + 1, roundData.turnOrder.length)}/
            {roundData.turnOrder.length}
          </p>

          {!allCluesDone && currentTurnPlayer && (
            <h2
              className="pixel-text text-lg text-center mb-6"
              style={{ color: 'var(--color-purple)' }}
            >
              {isMyTurn ? "YOUR TURN" : `${currentTurnPlayer.display_name}'s TURN`}
            </h2>
          )}

          {allCluesDone && (
            <h2
              className="pixel-text text-lg text-center mb-6"
              style={{ color: 'var(--color-accent)' }}
            >
              ALL CLUES IN
            </h2>
          )}

          {/* Clue board */}
          {submittedClues.length > 0 && (
            <div
              className="pixel-card rounded-lg p-4 mb-6"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="pixel-text text-[10px] mb-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                CLUE BOARD
              </p>
              <div className="space-y-2">
                {submittedClues.map(([id, clue]) => (
                  <div key={id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {playerName(id)}
                    </span>
                    <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                      {clue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input for current player */}
          {isMyTurn && !allCluesDone && (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Enter your ONE-WORD clue
              </p>
              <input
                type="text"
                value={clueInput}
                onChange={(e) => setClueInput(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submitClue()}
                placeholder="Type a single word..."
                maxLength={30}
                className="w-full px-4 py-4 rounded-lg text-center text-lg mb-4"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-border)',
                  outline: 'none',
                }}
                autoFocus
              />
              <button
                onClick={submitClue}
                disabled={!clueInput.trim()}
                className="pixel-btn px-8 py-3 text-sm rounded-lg"
                style={{
                  backgroundColor: clueInput.trim()
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  color: 'var(--color-bg)',
                }}
              >
                SUBMIT CLUE
              </button>
            </div>
          )}

          {/* Waiting message */}
          {!isMyTurn && !allCluesDone && (
            <div className="text-center">
              <div className="text-3xl mb-4 animate-pixel-bounce">{'\u23F3'}</div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Waiting for {currentTurnPlayer?.display_name} to submit their clue...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Discussion ────────────────────────────────────────────────────────────

  if (phase === 'discussion' && roundData) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="pixel-text text-xs text-center mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ROUND {roundData.currentRound}/{roundData.totalRounds}
          </p>
          <h2
            className="pixel-text text-lg text-center mb-4"
            style={{ color: 'var(--color-orange)' }}
          >
            DISCUSSION TIME
          </h2>

          <div className="text-center mb-6">
            <div
              className="pixel-text text-3xl inline-block px-6 py-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: `2px solid ${discussionTime <= 10 ? 'var(--color-red)' : 'var(--color-border)'}`,
                color: discussionTime <= 10 ? 'var(--color-red)' : 'var(--color-text)',
                animation: discussionTime <= 10 ? 'pulse 1s infinite' : undefined,
              }}
            >
              {Math.floor(discussionTime / 60)}:
              {String(discussionTime % 60).padStart(2, '0')}
            </div>
          </div>

          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ALL CLUES
            </p>
            <div className="space-y-3">
              {roundData.turnOrder.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <span className="text-sm">{playerName(id)}</span>
                  <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
                    {roundData.clues[id] || '...'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p
            className="text-center text-xs mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Discuss verbally who you think is the Impostor!
          </p>

          {isHost && (
            <button
              onClick={startVoting}
              className="pixel-btn w-full py-4 text-sm rounded-lg"
              style={{ backgroundColor: 'var(--color-purple)', color: 'white' }}
            >
              START VOTING
            </button>
          )}
          {!isHost && (
            <p
              className="text-center pixel-text text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Host will start voting when ready
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Vote ──────────────────────────────────────────────────────────────────

  if (phase === 'vote' && roundData) {
    const otherPlayers = onlinePlayers.filter((p) => p.id !== myPlayerId);
    const voteCount = Object.keys(roundData.votes).length;
    const hasVoted = !!myVote;

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="pixel-text text-xs text-center mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            VOTES: {voteCount}/{onlinePlayers.length}
          </p>

          {!hasVoted ? (
            <>
              <h2
                className="pixel-text text-lg text-center mb-2"
                style={{ color: 'var(--color-purple)' }}
              >
                CAST YOUR VOTE
              </h2>
              <p
                className="text-center text-sm mb-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Who do you think is the Impostor?
              </p>

              {/* Clue board reference */}
              <div
                className="pixel-card rounded-lg p-3 mb-6"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  className="pixel-text text-[10px] mb-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  CLUE BOARD
                </p>
                <div className="space-y-1">
                  {roundData.turnOrder.map((id) => (
                    <div key={id} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {playerName(id)}
                      </span>
                      <span style={{ color: 'var(--color-accent)' }}>
                        {roundData.clues[id]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => submitVote(p.id)}
                    className="pixel-card p-4 rounded-lg text-center transition-all hover:scale-[1.03] active:scale-95"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '2px solid var(--color-border)',
                    }}
                  >
                    <div className="text-2xl mb-2">{'\uD83D\uDE10'}</div>
                    <p className="pixel-text text-xs" style={{ color: 'var(--color-text)' }}>
                      {p.display_name}
                    </p>
                    <p
                      className="text-[10px] mt-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Clue: {roundData.clues[p.id] || 'none'}
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center mt-12">
              <div className="text-4xl mb-4">{'\u2705'}</div>
              <h2
                className="pixel-text text-lg mb-2"
                style={{ color: 'var(--color-accent)' }}
              >
                VOTE SUBMITTED
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Waiting for other players... ({voteCount}/{onlinePlayers.length})
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Reveal ────────────────────────────────────────────────────────────────

  if (phase === 'reveal' && roundData) {
    const voteCounts = getVoteCounts();
    const mostVotedId = getMostVotedId();
    const caught = mostVotedId === roundData.impostorPlayerId;
    const impostorPlayer = onlinePlayers.find((p) => p.id === roundData.impostorPlayerId);

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="pixel-text text-xs text-center mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ROUND {roundData.currentRound}/{roundData.totalRounds}
          </p>
          <h2
            className="pixel-text text-lg text-center mb-6"
            style={{ color: 'var(--color-orange)' }}
          >
            VOTE RESULTS
          </h2>

          <div className="space-y-2 mb-6">
            {[...onlinePlayers]
              .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
              .map((p) => {
                const votes = voteCounts[p.id] || 0;
                const isImpostor = p.id === roundData.impostorPlayerId;
                const isMostVoted = p.id === mostVotedId;
                return (
                  <div
                    key={p.id}
                    className="pixel-card flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{
                      backgroundColor: isMostVoted
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--color-bg-card)',
                      border: `2px solid ${isMostVoted ? 'var(--color-red)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{p.display_name}</span>
                      {isImpostor && (
                        <span
                          className="pixel-text text-[9px] px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--color-red)',
                          }}
                        >
                          IMPOSTOR
                        </span>
                      )}
                    </div>
                    <span
                      className="pixel-text text-sm"
                      style={{
                        color: isMostVoted ? 'var(--color-red)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {votes} {votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                );
              })}
          </div>

          <div
            className="pixel-card rounded-lg p-6 text-center mb-6 animate-fade-in-up"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: `2px solid ${caught ? 'var(--color-accent)' : 'var(--color-red)'}`,
              boxShadow: `0 0 30px ${caught ? 'var(--color-accent-glow)' : 'rgba(239, 68, 68, 0.15)'}`,
            }}
          >
            <div className="text-4xl mb-3">{caught ? '\uD83C\uDF89' : '\uD83D\uDE08'}</div>
            <p
              className="pixel-text text-sm mb-2"
              style={{ color: caught ? 'var(--color-accent)' : 'var(--color-red)' }}
            >
              {caught ? 'IMPOSTOR CAUGHT!' : 'IMPOSTOR ESCAPED!'}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {impostorPlayer?.display_name} was the Impostor
            </p>
            <div className="mt-3 flex justify-center gap-4 text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>
                Real:{' '}
                <span style={{ color: 'var(--color-accent)' }}>{roundData.wordReal}</span>
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Decoy:{' '}
                <span style={{ color: 'var(--color-red)' }}>{roundData.wordDecoy}</span>
              </span>
            </div>
          </div>

          {isHost && (
            <button
              onClick={goToImpostorGuessOrScore}
              className="pixel-btn w-full py-4 text-sm rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              {caught ? 'IMPOSTOR LAST CHANCE' : 'SEE SCORES'}
            </button>
          )}
          {!isHost && (
            <p
              className="text-center pixel-text text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Waiting for host...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Impostor Guess ────────────────────────────────────────────────────────

  if (phase === 'impostor-guess' && roundData) {
    const impostorPlayer = onlinePlayers.find((p) => p.id === roundData.impostorPlayerId);
    const isImpostorMe = myPlayerId === roundData.impostorPlayerId;

    if (isImpostorMe) {
      return (
        <div
          className="min-h-screen p-4 md:p-8"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-5xl mb-4">{'\uD83D\uDE08'}</div>
            <h2
              className="pixel-text text-lg text-center mb-2"
              style={{ color: 'var(--color-red)' }}
            >
              CAUGHT!
            </h2>
            <p
              className="text-center text-sm mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              You have one chance to guess the real word!
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Your word was:{' '}
              <span style={{ color: 'var(--color-red)' }}>{roundData.wordDecoy}</span>
            </p>
            <input
              type="text"
              value={impostorGuessInput}
              onChange={(e) => setImpostorGuessInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImpostorGuess()}
              placeholder="Guess the real word..."
              maxLength={30}
              className="w-full max-w-xs px-4 py-4 rounded-lg text-center text-lg mb-4"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                border: '2px solid var(--color-red)',
                outline: 'none',
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleImpostorGuess}
                disabled={!impostorGuessInput.trim()}
                className="pixel-btn px-6 py-3 text-sm rounded-lg"
                style={{
                  backgroundColor: impostorGuessInput.trim()
                    ? 'var(--color-red)'
                    : 'var(--color-border)',
                  color: 'white',
                }}
              >
                GUESS
              </button>
              <button
                onClick={skipImpostorGuess}
                className="pixel-btn px-6 py-3 text-sm rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                SKIP
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Other players wait
    return (
      <div
        className="min-h-screen p-4 md:p-8 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pixel-bounce">{'\uD83D\uDE08'}</div>
          <h2 className="pixel-text text-sm mb-2" style={{ color: 'var(--color-red)' }}>
            IMPOSTOR CAUGHT!
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {impostorPlayer?.display_name} is guessing the real word...
          </p>
        </div>
      </div>
    );
  }

  // ─── Scoreboard ────────────────────────────────────────────────────────────

  if (phase === 'scoreboard' && roundData) {
    const impostorPlayer = onlinePlayers.find((p) => p.id === roundData.impostorPlayerId);
    const caught = getMostVotedId() === roundData.impostorPlayerId;

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="pixel-text text-xs text-center mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ROUND {roundData.currentRound}/{roundData.totalRounds} RESULTS
          </p>

          {caught && roundData.impostorGuess && (
            <div
              className="pixel-card rounded-lg p-4 text-center mb-4"
              style={{
                backgroundColor: roundData.impostorGuessedCorrectly
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'var(--color-accent-glow)',
                border: `2px solid ${roundData.impostorGuessedCorrectly ? 'var(--color-red)' : 'var(--color-accent)'}`,
              }}
            >
              <p className="text-sm">
                {impostorPlayer?.display_name} guessed &quot;
                <span
                  className="pixel-text"
                  style={{
                    color: roundData.impostorGuessedCorrectly
                      ? 'var(--color-red)'
                      : 'var(--color-text)',
                  }}
                >
                  {roundData.impostorGuess}
                </span>
                &quot;
              </p>
              <p
                className="pixel-text text-xs mt-1"
                style={{
                  color: roundData.impostorGuessedCorrectly
                    ? 'var(--color-red)'
                    : 'var(--color-accent)',
                }}
              >
                {roundData.impostorGuessedCorrectly
                  ? 'CORRECT! IMPOSTOR STEALS THE WIN!'
                  : 'WRONG! TEAM WINS!'}
              </p>
            </div>
          )}

          <h2
            className="pixel-text text-lg text-center mb-6"
            style={{ color: 'var(--color-accent)' }}
          >
            SCOREBOARD
          </h2>

          <div className="space-y-2 mb-8">
            {sortedByScore.map((p, i) => (
              <div
                key={p.id}
                className="pixel-card flex items-center justify-between px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: i === 0 ? 'var(--color-accent-glow)' : 'var(--color-bg-card)',
                  border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="pixel-text text-xs w-6 text-center"
                    style={{
                      color:
                        i === 0
                          ? 'var(--color-accent)'
                          : i === 1
                            ? 'var(--color-orange)'
                            : 'var(--color-text-muted)',
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span className="text-sm">{p.display_name}</span>
                  {p.id === roundData.impostorPlayerId && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--color-red)',
                      }}
                    >
                      SPY
                    </span>
                  )}
                </div>
                <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
                  {roundData.scores[p.id] || 0} pts
                </span>
              </div>
            ))}
          </div>

          {isHost && (
            <button
              onClick={nextRoundOrEnd}
              className="pixel-btn w-full py-4 text-sm rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              {roundData.currentRound >= roundData.totalRounds
                ? 'FINAL RESULTS'
                : `ROUND ${roundData.currentRound + 1}`}
            </button>
          )}
          {!isHost && (
            <p
              className="text-center pixel-text text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Waiting for host to continue...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Final Results ─────────────────────────────────────────────────────────

  if (phase === 'final-results' && roundData) {
    const winner = sortedByScore[0];

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-6xl mb-4 animate-pixel-bounce">{'\uD83C\uDFC6'}</div>
          <h2
            className="pixel-text text-xl md:text-2xl text-center mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            GAME OVER
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            {roundData.totalRounds} rounds completed
          </p>

          <div
            className="pixel-card rounded-xl p-6 text-center mb-6 w-full max-w-sm animate-fade-in-up"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '3px solid var(--color-accent)',
              boxShadow: '0 0 40px var(--color-accent-glow)',
            }}
          >
            <p className="pixel-text text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              WINNER
            </p>
            <p className="pixel-text text-xl mb-1" style={{ color: 'var(--color-accent)' }}>
              {winner?.display_name}
            </p>
            <p className="pixel-text text-2xl" style={{ color: 'var(--color-orange)' }}>
              {roundData.scores[winner?.id] || 0} PTS
            </p>
          </div>

          <div className="w-full max-w-sm space-y-2 mb-8">
            {sortedByScore.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="pixel-text text-xs"
                    style={{
                      color:
                        i === 0
                          ? 'var(--color-accent)'
                          : i === 1
                            ? 'var(--color-orange)'
                            : i === 2
                              ? 'var(--color-cyan)'
                              : 'var(--color-text-muted)',
                    }}
                  >
                    {i === 0
                      ? '\uD83E\uDD47'
                      : i === 1
                        ? '\uD83E\uDD48'
                        : i === 2
                          ? '\uD83E\uDD49'
                          : `#${i + 1}`}
                  </span>
                  <span className="text-sm">{p.display_name}</span>
                </div>
                <span className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
                  {roundData.scores[p.id] || 0}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetToLobby}
              className="pixel-btn px-6 py-3 text-sm rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              PLAY AGAIN
            </button>
            <Link
              href="/games"
              className="pixel-btn px-6 py-3 text-sm rounded-lg inline-flex items-center"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              ARCADE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Impostor Lobby ──────────────────────────────────────────────────────────
// Custom lobby that captures player ID and manages room creation/joining + waiting room

interface ImpostorLobbyProps {
  onGameStart: (room: GameRoom, players: PublicPlayer[], myPlayerId: string) => void;
  onPlayerIdKnown: (id: string) => void;
}

function ImpostorLobby({ onGameStart, onPlayerIdKnown }: ImpostorLobbyProps) {
  const [phase, setPhase] = useState<'choice' | 'create' | 'join' | 'waiting'>('choice');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Refs to capture latest values for callbacks
  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  // useGameRoom for the waiting room phase
  const {
    room,
    players,
    me,
    isHost,
    connectionStatus,
    error: roomError,
    toggleReady,
    startGame,
    kickPlayer,
  } = useGameRoom(roomCode, playerId, {
    onGameStarted: () => {
      // We need to re-fetch room to get latest players since the hook state
      // may not have updated yet. Use a small delay to let state settle.
      setTimeout(() => {
        // This is called from within the hook, so room/players should be current via refs
      }, 0);
    },
  });

  // Watch for room status change to 'playing' and fire game start
  const prevStatusRef = useRef(room?.status);
  useEffect(() => {
    if (prevStatusRef.current !== 'playing' && room?.status === 'playing' && players.length > 0) {
      onGameStartRef.current(room, players, playerIdRef.current);
    }
    prevStatusRef.current = room?.status;
  }, [room, players]);

  const handleCreateRoom = useCallback(async () => {
    const name = displayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    if (!name) {
      setFormError('Please enter a name');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/games/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: 'pixel-impostor',
          display_name: name,
          mode: 'online',
          max_players: 10,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create room');
      }

      const data = await response.json();
      const code = data.room.code;
      const pid = data.player.id;

      localStorage.setItem(`impostor_player_${code}`, pid);
      setRoomCode(code);
      setPlayerId(pid);
      onPlayerIdKnown(pid);
      setPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, onPlayerIdKnown]);

  const handleJoinRoom = useCallback(async () => {
    const name = displayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    const code = joinCode.trim().toUpperCase();

    if (!name) {
      setFormError('Please enter a name');
      return;
    }
    if (code.length !== 6) {
      setFormError('Room code must be 6 characters');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/games/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join room');
      }

      const data = await response.json();
      const pid = data.player.id;

      localStorage.setItem(`impostor_player_${data.room.code}`, pid);
      setRoomCode(data.room.code);
      setPlayerId(pid);
      onPlayerIdKnown(pid);
      setPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, joinCode, onPlayerIdKnown]);

  const handleStartGame = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await startGame();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsSubmitting(false);
    }
  }, [startGame]);

  const canStart = players.length >= 3 && players.every((p) => p.is_ready || p.is_host);
  const error = formError || roomError;

  // ─── Waiting room ─────────────────────────────────────────────────────────

  if (phase === 'waiting' && roomCode) {
    return (
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              setPhase('choice');
              setRoomCode('');
              setPlayerId('');
            }}
            className="text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &#8592; Leave
          </button>
          <ConnectionStatus status={connectionStatus} />
        </div>

        <div className="mb-8">
          <RoomCodeDisplay code={roomCode} />
        </div>

        <div className="text-center mb-6">
          <span className="text-2xl">{'\uD83D\uDD75\uFE0F'}</span>
          <h3
            className="pixel-text text-xs mt-2"
            style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
          >
            PIXEL IMPOSTOR
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {players.length}/{room?.max_players ?? 10} players
          </p>
        </div>

        <div
          className="pixel-card rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
        >
          <h4
            className="pixel-text text-xs mb-3"
            style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
          >
            PLAYERS
          </h4>
          <PlayerList
            players={players}
            currentPlayerId={me?.id}
            showReadyStatus
            showKickButton={isHost}
            onKick={kickPlayer}
          />
        </div>

        {error && (
          <p className="text-xs text-center mb-4" style={{ color: 'var(--color-red)' }}>
            {error}
          </p>
        )}

        <div className="space-y-3">
          {!isHost && me && (
            <button
              onClick={toggleReady}
              className="w-full py-3 rounded text-sm transition-all border"
              style={{
                backgroundColor: me.is_ready ? 'var(--color-accent-glow)' : 'transparent',
                color: me.is_ready ? 'var(--color-accent)' : 'var(--color-text)',
                borderColor: me.is_ready ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              {me.is_ready ? 'READY' : 'TAP WHEN READY'}
            </button>
          )}

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart || isSubmitting}
              className="pixel-btn w-full py-3 text-sm"
              style={{
                opacity: canStart && !isSubmitting ? 1 : 0.4,
                cursor: canStart && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting
                ? 'STARTING...'
                : canStart
                  ? 'START GAME'
                  : `WAITING FOR PLAYERS (${players.length}/3 min)`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Choice phase ──────────────────────────────────────────────────────────

  if (phase === 'choice') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-3">{'\uD83D\uDD75\uFE0F'}</span>
          <h2
            className="pixel-text text-sm md:text-base"
            style={{ color: 'var(--color-accent)' }}
          >
            ONLINE MODE
          </h2>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            3-10 players on separate devices
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPhase('create')}
            className="pixel-btn w-full py-3 text-sm"
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setPhase('join')}
            className="w-full py-3 text-sm rounded border transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg-card)',
            }}
          >
            JOIN ROOM
          </button>
        </div>
      </div>
    );
  }

  // ─── Create / Join phase ───────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={() => {
          setPhase('choice');
          setFormError(null);
        }}
        className="text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &#8592; Back
      </button>

      <h2
        className="pixel-text text-sm mb-6 text-center"
        style={{ color: 'var(--color-accent)' }}
      >
        {phase === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
      </h2>

      <div className="space-y-4">
        {/* Display name */}
        <div>
          <label
            className="pixel-text text-xs block mb-2"
            style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
          >
            YOUR NAME
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={16}
            className="w-full px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              border: '2px solid var(--color-border)',
              outline: 'none',
            }}
          />
        </div>

        {/* Room code (join only) */}
        {phase === 'join' && (
          <div>
            <label
              className="pixel-text text-xs block mb-2"
              style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
            >
              ROOM CODE
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg text-center pixel-text text-lg tracking-widest"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-accent)',
                border: '2px solid var(--color-border)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--color-red)' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={phase === 'create' ? handleCreateRoom : handleJoinRoom}
          disabled={isSubmitting}
          className="pixel-btn w-full py-3 text-sm"
          style={{ opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? 'LOADING...' : phase === 'create' ? 'CREATE' : 'JOIN'}
        </button>
      </div>
    </div>
  );
}
