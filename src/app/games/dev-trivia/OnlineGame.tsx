'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import GameLobby from '@/components/multiplayer/GameLobby';
import ConnectionStatus from '@/components/multiplayer/ConnectionStatus';
import RoomCodeDisplay from '@/components/multiplayer/RoomCodeDisplay';
import type { GameRoom, PublicPlayer, GameState, ConnectionStatus as ConnStatus } from '@/lib/multiplayer/types';

// ─── Reuse types/constants from the main game ───────────────────────────────

type Category = 'Languages' | 'Frameworks' | 'History' | 'Algorithms' | 'DevOps' | 'Databases' | 'Security' | 'General';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface TriviaQuestion {
  question: string;
  answers: string[];
  correct: number;
  category: Category;
  difficulty: Difficulty;
}

type OnlinePhase =
  | 'lobby'
  | 'category-pick'
  | 'wager'
  | 'question'
  | 'reveal'
  | 'rapid-intro'
  | 'rapid-question'
  | 'rapid-reveal'
  | 'game-over';

interface OnlineRoundData {
  phase: OnlinePhase;
  scores: [number, number];
  currentTeam: 0 | 1;
  round: number;
  currentQuestion: TriviaQuestion | null;
  selectedCategory: Category | null;
  wager: 1 | 2 | 3;
  selectedAnswer: number | null;
  showCorrect: boolean | null;
  timeLeft: number;
  rapidIndex: number;
  rapidQuestions: TriviaQuestion[];
  rapidBuzzer: 0 | 1 | null;
  rapidScores: [number, number];
  usedQuestionIndices: number[];
  teams: Record<string, 0 | 1>; // playerId -> team
  teamCaptains: [string, string]; // [alpha captain id, beta captain id]
  buzzerPlayerId: string | null;
  answererPlayerId: string | null;
}

// ─── Broadcast event types ──────────────────────────────────────────────────

interface BroadcastPhaseChange {
  type: 'phase_change';
  roundData: OnlineRoundData;
}

interface BroadcastCategoryPicked {
  type: 'category_picked';
  category: Category;
  question: TriviaQuestion;
  questionIndex: number;
}

interface BroadcastWagerSet {
  type: 'wager_set';
  wager: 1 | 2 | 3;
}

interface BroadcastAnswerSubmitted {
  type: 'answer_submitted';
  answerIdx: number;
  playerId: string;
}

interface BroadcastBuzzerPressed {
  type: 'buzzer_pressed';
  team: 0 | 1;
  playerId: string;
}

interface BroadcastScoreUpdate {
  type: 'score_update';
  scores: [number, number];
  rapidScores: [number, number];
}

interface BroadcastTimerSync {
  type: 'timer_sync';
  timeLeft: number;
}

interface BroadcastNextRound {
  type: 'next_round';
  roundData: OnlineRoundData;
}

interface BroadcastRapidAnswer {
  type: 'rapid_answer';
  answerIdx: number;
  playerId: string;
}

type BroadcastEvent =
  | BroadcastPhaseChange
  | BroadcastCategoryPicked
  | BroadcastWagerSet
  | BroadcastAnswerSubmitted
  | BroadcastBuzzerPressed
  | BroadcastScoreUpdate
  | BroadcastTimerSync
  | BroadcastNextRound
  | BroadcastRapidAnswer;

// ─── Question Bank (imported inline to keep in same dir) ────────────────────
// We import the QUESTIONS array. Since it is huge and defined in page.tsx,
// we extract it to a shared module. For now, we duplicate the reference by
// re-exporting. Actually, to keep edits only in dev-trivia/, we will import
// from a shared questions file we create.
import { QUESTIONS, CATEGORY_META, ALL_CATEGORIES, TEAM_NAMES, TEAM_COLORS } from './questions';

// ─── Constants ──────────────────────────────────────────────────────────────

const QUESTIONS_PER_GAME = 10;
const RAPID_FIRE_COUNT = 8;
const QUESTION_TIME = 15;
const RAPID_FIRE_TIME = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultyPoints(d: Difficulty): number {
  return d === 'Easy' ? 100 : d === 'Medium' ? 200 : 300;
}

function pickQuestion(category: Category, usedIndices: number[]): { question: TriviaQuestion; index: number } | null {
  const usedSet = new Set(usedIndices);
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => q.category === category && !usedSet.has(i));
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { question: pick.q, index: pick.i };
}

function pickRapidFireQuestions(usedIndices: number[], count: number): { questions: TriviaQuestion[]; indices: number[] } {
  const usedSet = new Set(usedIndices);
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !usedSet.has(i));
  const shuffled = shuffle(candidates);
  const picked = shuffled.slice(0, count);
  return {
    questions: picked.map(({ q }) => q),
    indices: picked.map(({ i }) => i),
  };
}

function createInitialRoundData(
  players: PublicPlayer[],
  myId: string,
): OnlineRoundData {
  // Assign teams alternating by join order (player_order)
  const sorted = [...players].sort((a, b) => (a.player_order ?? 0) - (b.player_order ?? 0));
  const teams: Record<string, 0 | 1> = {};
  sorted.forEach((p, i) => {
    teams[p.id] = (i % 2) as 0 | 1;
  });

  // Captains = first player on each team
  const alphaCaptain = sorted.find(p => teams[p.id] === 0)?.id ?? '';
  const betaCaptain = sorted.find(p => teams[p.id] === 1)?.id ?? '';

  return {
    phase: 'category-pick',
    scores: [0, 0],
    currentTeam: 0,
    round: 0,
    currentQuestion: null,
    selectedCategory: null,
    wager: 1,
    selectedAnswer: null,
    showCorrect: null,
    timeLeft: QUESTION_TIME,
    rapidIndex: 0,
    rapidQuestions: [],
    rapidBuzzer: null,
    rapidScores: [0, 0],
    usedQuestionIndices: [],
    teams,
    teamCaptains: [alphaCaptain, betaCaptain],
    buzzerPlayerId: null,
    answererPlayerId: null,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface OnlineGameProps {
  onBack: () => void;
}

export default function OnlineGame({ onBack }: OnlineGameProps) {
  const [inLobby, setInLobby] = useState(true);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PublicPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  // Game state synced via broadcast
  const [roundData, setRoundData] = useState<OnlineRoundData | null>(null);
  const [lockedIn, setLockedIn] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDataRef = useRef<OnlineRoundData | null>(null);

  // Keep ref in sync
  useEffect(() => {
    roundDataRef.current = roundData;
  }, [roundData]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────

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

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  const broadcast = useCallback((event: BroadcastEvent) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'trivia_event',
      payload: event,
    });
  }, []);

  // ─── Handle broadcast events ──────────────────────────────────────────────

  const handleBroadcastEvent = useCallback((event: BroadcastEvent) => {
    switch (event.type) {
      case 'phase_change':
        setRoundData(event.roundData);
        setLockedIn(false);
        break;

      case 'category_picked':
        setRoundData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            selectedCategory: event.category,
            currentQuestion: event.question,
            usedQuestionIndices: [...prev.usedQuestionIndices, event.questionIndex],
            wager: 1,
            selectedAnswer: null,
            showCorrect: null,
            phase: 'wager',
          };
        });
        setLockedIn(false);
        break;

      case 'wager_set':
        setRoundData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            wager: event.wager,
            phase: 'question',
            timeLeft: QUESTION_TIME,
            selectedAnswer: null,
            showCorrect: null,
          };
        });
        setLockedIn(false);
        break;

      case 'answer_submitted':
        setRoundData(prev => {
          if (!prev || !prev.currentQuestion) return prev;
          const correct = event.answerIdx === prev.currentQuestion.correct;
          const newScores: [number, number] = [...prev.scores];
          if (correct) {
            newScores[prev.currentTeam] += difficultyPoints(prev.currentQuestion.difficulty) * prev.wager;
          }
          return {
            ...prev,
            selectedAnswer: event.answerIdx,
            showCorrect: correct,
            answererPlayerId: event.playerId,
            scores: newScores,
            phase: 'reveal',
          };
        });
        setLockedIn(true);
        break;

      case 'timer_sync':
        setRoundData(prev => {
          if (!prev) return prev;
          return { ...prev, timeLeft: event.timeLeft };
        });
        break;

      case 'next_round':
        setRoundData(event.roundData);
        setLockedIn(false);
        break;

      case 'buzzer_pressed':
        setRoundData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            rapidBuzzer: event.team,
            buzzerPlayerId: event.playerId,
          };
        });
        break;

      case 'rapid_answer':
        setRoundData(prev => {
          if (!prev) return prev;
          const q = prev.rapidQuestions[prev.rapidIndex];
          if (!q) return prev;
          const correct = event.answerIdx === q.correct;
          const newScores: [number, number] = [...prev.scores];
          const newRapidScores: [number, number] = [...prev.rapidScores];
          if (correct && prev.rapidBuzzer !== null) {
            newScores[prev.rapidBuzzer] += 150;
            newRapidScores[prev.rapidBuzzer] += 150;
          }
          return {
            ...prev,
            selectedAnswer: event.answerIdx,
            showCorrect: correct,
            answererPlayerId: event.playerId,
            scores: newScores,
            rapidScores: newRapidScores,
            phase: 'rapid-reveal',
          };
        });
        setLockedIn(true);
        break;

      case 'score_update':
        setRoundData(prev => {
          if (!prev) return prev;
          return { ...prev, scores: event.scores, rapidScores: event.rapidScores };
        });
        break;
    }
  }, []);

  // ─── Setup channel ────────────────────────────────────────────────────────

  const setupChannel = useCallback((roomCode: string) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`room:${roomCode}:trivia`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'trivia_event' }, ({ payload }) => {
        handleBroadcastEvent(payload as BroadcastEvent);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnStatus('error');
        else if (status === 'TIMED_OUT') setConnStatus('disconnected');
      });

    channelRef.current = channel;
  }, [handleBroadcastEvent]);

  // ─── Game start from lobby ────────────────────────────────────────────────

  const handleGameStart = useCallback((
    gameRoom: GameRoom,
    players: PublicPlayer[],
    _state: GameState,
  ) => {
    setRoom(gameRoom);
    setOnlinePlayers(players);
    const me = players.find(p => p.id === myPlayerId) ?? players[0];
    setIsHost(me?.is_host ?? false);
    setInLobby(false);

    setupChannel(gameRoom.code);

    // Host creates initial state and broadcasts
    if (me?.is_host) {
      const initial = createInitialRoundData(players, myPlayerId);
      // Small delay to let channel subscribe
      setTimeout(() => {
        broadcast({ type: 'phase_change', roundData: initial });
      }, 500);
    }
  }, [myPlayerId, setupChannel, broadcast]);

  // ─── Host timer management ────────────────────────────────────────────────

  const startHostTimer = useCallback((seconds: number, onExpire: () => void) => {
    if (!isHost) return;
    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = seconds;
    broadcast({ type: 'timer_sync', timeLeft: remaining });

    timerRef.current = setInterval(() => {
      remaining -= 1;
      broadcast({ type: 'timer_sync', timeLeft: remaining });
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onExpire();
      }
    }, 1000);
  }, [isHost, broadcast]);

  const stopHostTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start timer when entering question phase (host only)
  useEffect(() => {
    if (!isHost || !roundData) return;

    if (roundData.phase === 'question') {
      startHostTimer(QUESTION_TIME, () => {
        // Time expired - submit -1 as answer
        broadcast({
          type: 'answer_submitted',
          answerIdx: -1,
          playerId: 'timeout',
        });
      });
    } else if (roundData.phase === 'rapid-question') {
      startHostTimer(RAPID_FIRE_TIME, () => {
        // Time expired
        const rd = roundDataRef.current;
        if (!rd) return;
        broadcast({
          type: 'phase_change',
          roundData: { ...rd, phase: 'rapid-reveal', selectedAnswer: null, showCorrect: null },
        });
      });
    } else {
      stopHostTimer();
    }

    return () => {};
  }, [roundData?.phase, isHost, startHostTimer, stopHostTimer, broadcast]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const myTeam = roundData?.teams[myPlayerId] ?? null;
  const isCaptain = roundData
    ? roundData.teamCaptains[roundData.currentTeam] === myPlayerId
    : false;
  const isActiveTeam = roundData ? myTeam === roundData.currentTeam : false;

  // Player name helper
  const getPlayerName = useCallback((pid: string) => {
    return onlinePlayers.find(p => p.id === pid)?.display_name ?? 'Unknown';
  }, [onlinePlayers]);

  // Get team members
  const getTeamPlayers = useCallback((team: 0 | 1) => {
    if (!roundData) return [];
    return onlinePlayers.filter(p => roundData.teams[p.id] === team);
  }, [roundData, onlinePlayers]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onPickCategory = useCallback((cat: Category) => {
    if (!roundData || !isCaptain) return;
    const result = pickQuestion(cat, roundData.usedQuestionIndices);
    if (!result) return;
    broadcast({
      type: 'category_picked',
      category: cat,
      question: result.question,
      questionIndex: result.index,
    });
  }, [roundData, isCaptain, broadcast]);

  const onSetWager = useCallback((w: 1 | 2 | 3) => {
    if (!isCaptain) return;
    broadcast({ type: 'wager_set', wager: w });
  }, [isCaptain, broadcast]);

  const onAnswer = useCallback((answerIdx: number) => {
    if (lockedIn || !isActiveTeam) return;
    stopHostTimer();
    setLockedIn(true);
    broadcast({
      type: 'answer_submitted',
      answerIdx,
      playerId: myPlayerId,
    });
  }, [lockedIn, isActiveTeam, myPlayerId, broadcast, stopHostTimer]);

  const onNextRound = useCallback(() => {
    if (!isHost || !roundData) return;
    const nextRound = roundData.round + 1;

    if (nextRound >= QUESTIONS_PER_GAME) {
      // Start rapid fire
      const { questions, indices } = pickRapidFireQuestions(
        roundData.usedQuestionIndices,
        RAPID_FIRE_COUNT,
      );
      const newData: OnlineRoundData = {
        ...roundData,
        phase: 'rapid-intro',
        round: nextRound,
        rapidQuestions: questions,
        rapidIndex: 0,
        rapidScores: [0, 0],
        rapidBuzzer: null,
        buzzerPlayerId: null,
        usedQuestionIndices: [...roundData.usedQuestionIndices, ...indices],
      };
      broadcast({ type: 'next_round', roundData: newData });
      return;
    }

    const newData: OnlineRoundData = {
      ...roundData,
      phase: 'category-pick',
      round: nextRound,
      currentTeam: (roundData.currentTeam === 0 ? 1 : 0) as 0 | 1,
      currentQuestion: null,
      selectedCategory: null,
      wager: 1,
      selectedAnswer: null,
      showCorrect: null,
      answererPlayerId: null,
    };
    broadcast({ type: 'next_round', roundData: newData });
  }, [isHost, roundData, broadcast]);

  const onStartRapidFire = useCallback(() => {
    if (!isHost || !roundData) return;
    const newData: OnlineRoundData = {
      ...roundData,
      phase: 'rapid-question',
      rapidBuzzer: null,
      buzzerPlayerId: null,
      selectedAnswer: null,
      showCorrect: null,
      timeLeft: RAPID_FIRE_TIME,
    };
    broadcast({ type: 'phase_change', roundData: newData });
  }, [isHost, roundData, broadcast]);

  const onRapidBuzz = useCallback((team: 0 | 1) => {
    if (!roundData || roundData.rapidBuzzer !== null) return;
    if (roundData.teams[myPlayerId] !== team) return;
    broadcast({
      type: 'buzzer_pressed',
      team,
      playerId: myPlayerId,
    });
  }, [roundData, myPlayerId, broadcast]);

  const onRapidAnswer = useCallback((answerIdx: number) => {
    if (lockedIn || !roundData) return;
    // Only the team that buzzed can answer
    if (roundData.rapidBuzzer === null) return;
    if (roundData.teams[myPlayerId] !== roundData.rapidBuzzer) return;
    stopHostTimer();
    setLockedIn(true);
    broadcast({
      type: 'rapid_answer',
      answerIdx,
      playerId: myPlayerId,
    });
  }, [lockedIn, roundData, myPlayerId, broadcast, stopHostTimer]);

  const onNextRapidQuestion = useCallback(() => {
    if (!isHost || !roundData) return;
    const next = roundData.rapidIndex + 1;
    if (next >= roundData.rapidQuestions.length) {
      broadcast({
        type: 'phase_change',
        roundData: { ...roundData, phase: 'game-over' },
      });
      return;
    }
    const newData: OnlineRoundData = {
      ...roundData,
      phase: 'rapid-question',
      rapidIndex: next,
      rapidBuzzer: null,
      buzzerPlayerId: null,
      selectedAnswer: null,
      showCorrect: null,
      timeLeft: RAPID_FIRE_TIME,
    };
    broadcast({ type: 'phase_change', roundData: newData });
  }, [isHost, roundData, broadcast]);

  const onPlayAgain = useCallback(() => {
    if (!isHost || !roundData) return;
    const initial = createInitialRoundData(onlinePlayers, myPlayerId);
    broadcast({ type: 'phase_change', roundData: initial });
  }, [isHost, roundData, onlinePlayers, myPlayerId, broadcast]);

  // ─── Lobby ────────────────────────────────────────────────────────────────

  if (inLobby) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="pixel-text text-xs hover:underline mb-4 block"
            style={{ color: 'var(--color-accent)' }}
          >
            &lt; BACK
          </button>
          <GameLobby
            gameId="dev-trivia"
            gameName="DEV TRIVIA SHOWDOWN"
            gameIcon="[?]"
            minPlayers={2}
            maxPlayers={12}
            onGameStart={(gameRoom, players, state) => {
              const me = players.find(p =>
                p.id === myPlayerId || p.is_host
              );
              if (me) {
                setMyPlayerId(me.id);
              }
              handleGameStart(gameRoom, players, state);
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Waiting for data ─────────────────────────────────────────────────────

  if (!roundData) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="text-center">
          <div className="pixel-text text-sm mb-4" style={{ color: 'var(--color-accent)' }}>
            SYNCING GAME...
          </div>
          <ConnectionStatus status={connStatus} />
        </div>
      </div>
    );
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const { phase, scores, currentTeam, round, currentQuestion, wager, selectedAnswer, showCorrect, timeLeft, rapidIndex, rapidQuestions: rqs, rapidBuzzer } = roundData;
  const winner: 0 | 1 | -1 = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;

  const usedSet = new Set(roundData.usedQuestionIndices);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="pixel-text text-xs hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              &lt; BACK
            </button>
            {room && (
              <div className="hidden md:block">
                <RoomCodeDisplay code={room.code} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus status={connStatus} />
            {phase !== 'game-over' && (
              <div className="flex gap-4 items-center">
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
        </div>

        {/* Team info bar */}
        {myTeam !== null && phase !== 'game-over' && (
          <div
            className="text-center mb-4 py-2 px-3 rounded-lg text-xs"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: `2px solid ${TEAM_COLORS[myTeam]}`,
            }}
          >
            <span style={{ color: TEAM_COLORS[myTeam] }}>
              You are on TEAM {TEAM_NAMES[myTeam]}
            </span>
            {isCaptain && (
              <span className="ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: TEAM_COLORS[myTeam], color: 'var(--color-bg)' }}>
                CAPTAIN
              </span>
            )}
          </div>
        )}

        {/* ═══ CATEGORY PICK ═══ */}
        {phase === 'category-pick' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="pixel-text text-xs mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                TEAM {TEAM_NAMES[currentTeam]}&apos;S TURN
              </div>
              {isCaptain ? (
                <h2 className="pixel-text text-base md:text-lg mb-1">PICK A CATEGORY</h2>
              ) : isActiveTeam ? (
                <h2 className="pixel-text text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  YOUR CAPTAIN IS PICKING...
                </h2>
              ) : (
                <h2 className="pixel-text text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  WAITING FOR {TEAM_NAMES[currentTeam]}...
                </h2>
              )}
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Round {round + 1} of {QUESTIONS_PER_GAME}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ALL_CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                const remaining = QUESTIONS.filter((q, i) => q.category === cat && !usedSet.has(i)).length;
                const disabled = remaining === 0 || !isCaptain;
                return (
                  <button
                    key={cat}
                    className="pixel-card rounded-lg p-4 text-center transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: disabled ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)',
                      borderColor: meta.color,
                      opacity: remaining === 0 ? 0.3 : !isCaptain ? 0.6 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    disabled={disabled}
                    onClick={() => onPickCategory(cat)}
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
              {isCaptain ? (
                <h2 className="pixel-text text-sm md:text-base mb-2">PLACE YOUR WAGER</h2>
              ) : (
                <h2 className="pixel-text text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {isActiveTeam ? 'CAPTAIN IS WAGERING...' : `WAITING FOR ${TEAM_NAMES[currentTeam]}...`}
                </h2>
              )}
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
                  className="pixel-card rounded-lg p-4 md:p-6 text-center transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    minWidth: '90px',
                    opacity: isCaptain ? 1 : 0.6,
                    cursor: isCaptain ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => onSetWager(w)}
                  disabled={!isCaptain}
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

            {/* Active team answers, other team watches */}
            {isActiveTeam ? (
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
                      onClick={() => onAnswer(i)}
                      disabled={lockedIn}
                    >
                      <span className="pixel-text text-[10px] mr-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                        {labels[i]}.
                      </span>
                      <span className="text-sm">{ans}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="pixel-text text-sm mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                  TEAM {TEAM_NAMES[currentTeam]} IS ANSWERING...
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Watch and wait for the reveal!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ REVEAL ═══ */}
        {phase === 'reveal' && currentQuestion && (
          <div className="animate-fade-in-up text-center">
            <div
              className="pixel-text text-2xl md:text-3xl mb-4"
              style={{ color: showCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
            >
              {showCorrect ? 'CORRECT!' : selectedAnswer === -1 ? "TIME'S UP!" : 'WRONG!'}
            </div>

            {roundData.answererPlayerId && roundData.answererPlayerId !== 'timeout' && (
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                Answered by {getPlayerName(roundData.answererPlayerId)}
              </p>
            )}

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

            {isHost && (
              <button className="pixel-btn text-sm px-8 py-3" onClick={onNextRound}>
                {round + 1 >= QUESTIONS_PER_GAME ? 'RAPID FIRE ROUND!' : 'NEXT QUESTION'}
              </button>
            )}
            {!isHost && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Waiting for host to continue...
              </p>
            )}
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
              Any player can buzz in! First to buzz gets to answer for their team.
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
            {isHost ? (
              <button className="pixel-btn text-sm px-8 py-3" onClick={onStartRapidFire}>
                START RAPID FIRE
              </button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Waiting for host...
              </p>
            )}
          </div>
        )}

        {/* ═══ RAPID FIRE QUESTION ═══ */}
        {phase === 'rapid-question' && rqs[rapidIndex] && (
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
                    {rqs[rapidIndex].question}
                  </h3>
                </div>
                <div className="text-center mb-4">
                  <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    BUZZ IN!
                  </p>
                  <div className="flex justify-center gap-6">
                    {myTeam !== null && (
                      <button
                        className="pixel-btn text-sm px-8 py-4 animate-pixel-bounce"
                        style={{
                          borderColor: TEAM_COLORS[myTeam],
                          backgroundColor: 'var(--color-bg-card)',
                        }}
                        onClick={() => onRapidBuzz(myTeam)}
                      >
                        BUZZ! ({TEAM_NAMES[myTeam]})
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                    {TEAM_NAMES[rapidBuzzer]} BUZZED IN!
                    {roundData.buzzerPlayerId && (
                      <span className="ml-1">({getPlayerName(roundData.buzzerPlayerId)})</span>
                    )}
                  </div>
                </div>
                <div
                  className="pixel-card rounded-lg p-5 mb-6"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <h3 className="text-base md:text-lg font-semibold leading-relaxed mb-4">
                    {rqs[rapidIndex].question}
                  </h3>
                </div>
                {myTeam === rapidBuzzer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rqs[rapidIndex].answers.map((ans, i) => {
                      const labels = ['A', 'B', 'C', 'D'];
                      return (
                        <button
                          key={i}
                          className="pixel-card rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: 'var(--color-bg-card)',
                            borderColor: 'var(--color-border)',
                          }}
                          onClick={() => onRapidAnswer(i)}
                          disabled={lockedIn}
                        >
                          <span className="pixel-text text-[10px] mr-2" style={{ color: 'var(--color-orange)' }}>
                            {labels[i]}.
                          </span>
                          <span className="text-sm">{ans}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {TEAM_NAMES[rapidBuzzer]} is answering...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ RAPID FIRE REVEAL ═══ */}
        {phase === 'rapid-reveal' && rqs[rapidIndex] && (
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
              <p className="text-sm mb-3">{rqs[rapidIndex].question}</p>
              <div
                className="px-3 py-2 rounded text-sm mb-2"
                style={{
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>[OK]</span>{' '}
                {rqs[rapidIndex].answers[rqs[rapidIndex].correct]}
              </div>
              {showCorrect && rapidBuzzer !== null && (
                <div className="mt-3 pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                  +150 PTS FOR {TEAM_NAMES[rapidBuzzer]}
                </div>
              )}
            </div>

            {isHost ? (
              <button className="pixel-btn text-sm px-8 py-3" onClick={onNextRapidQuestion}>
                {rapidIndex + 1 >= rqs.length ? 'FINAL RESULTS' : 'NEXT QUESTION'}
              </button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Waiting for host...
              </p>
            )}
          </div>
        )}

        {/* ═══ GAME OVER ═══ */}
        {phase === 'game-over' && (
          <div className="animate-fade-in-up text-center py-8">
            <div className="pixel-text text-2xl md:text-3xl mb-2" style={{ color: 'var(--color-accent)' }}>
              GAME OVER
            </div>

            {winner >= 0 ? (
              <div className="mb-6">
                <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: TEAM_COLORS[winner as 0 | 1] }}>
                  {TEAM_NAMES[winner as 0 | 1]} WINS!
                </div>
                <div className="text-6xl my-4">
                  {winner === 0 ? '[ A ]' : '[ B ]'}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: 'var(--color-orange)' }}>
                  IT&apos;S A TIE!
                </div>
                <div className="text-4xl my-4">[ = ]</div>
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

            {/* Team rosters */}
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
                    {getTeamPlayers(t as 0 | 1).map((p) => (
                      <div key={p.id} className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.display_name}
                        {roundData.teamCaptains[t] === p.id && (
                          <span className="ml-1 pixel-text text-[8px]" style={{ color: TEAM_COLORS[t] }}>[C]</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              {isHost ? (
                <>
                  <button className="pixel-btn text-sm px-6 py-3" onClick={onPlayAgain}>
                    REMATCH
                  </button>
                  <button
                    className="pixel-btn text-sm px-6 py-3"
                    onClick={onBack}
                    style={{ borderColor: 'var(--color-text-muted)' }}
                  >
                    LEAVE
                  </button>
                </>
              ) : (
                <button
                  className="pixel-btn text-sm px-6 py-3"
                  onClick={onBack}
                  style={{ borderColor: 'var(--color-text-muted)' }}
                >
                  LEAVE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
