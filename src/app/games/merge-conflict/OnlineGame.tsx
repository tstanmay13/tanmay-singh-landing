'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import RoomCodeDisplay from '@/components/multiplayer/RoomCodeDisplay';
import PlayerList from '@/components/multiplayer/PlayerList';
import ConnectionStatus from '@/components/multiplayer/ConnectionStatus';
import { useGameRoom } from '@/lib/multiplayer/useGameRoom';
import type { GameRoom, PublicPlayer, ConnectionStatus as ConnectionStatusType } from '@/lib/multiplayer/types';

/* ================================================================
   TYPES
   ================================================================ */

interface MergedLine {
  lineNum: number;
  text: string;
  author: 'A' | 'B';
}

type Vote = 'ship' | 'revert' | 'review';

interface FunctionSpec {
  text: string;
  category: 'real' | 'absurd' | 'workplace';
}

interface PairDef {
  playerAId: string;
  playerBId: string;
}

interface PairResult {
  playerAName: string;
  playerBName: string;
  spec: FunctionSpec;
  merged: MergedLine[];
  votes: Record<Vote, number>;
  mergeStatus: 'CONFLICT' | 'CLEAN MERGE' | 'FORCE PUSH';
}

type OnlinePhase =
  | 'lobby'
  | 'spec-reveal'
  | 'writing'
  | 'merge-reveal'
  | 'voting'
  | 'pair-results'
  | 'final-results';

/* ================================================================
   BROADCAST EVENT TYPES
   ================================================================ */

interface BroadcastPhaseChange {
  type: 'phase_change';
  phase: OnlinePhase;
  spec?: FunctionSpec;
  currentPairIndex?: number;
  pairs?: PairDef[];
  scores?: Record<string, number>;
}

interface BroadcastLinesSubmitted {
  type: 'lines_submitted';
  playerId: string;
  lines: string[];
}

interface BroadcastMergeReveal {
  type: 'merge_reveal';
  merged: MergedLine[];
  mergeStatus: 'CONFLICT' | 'CLEAN MERGE' | 'FORCE PUSH';
}

interface BroadcastVoteCast {
  type: 'vote_cast';
  playerId: string;
  vote: Vote;
}

interface BroadcastPairResult {
  type: 'pair_result';
  result: PairResult;
  scores: Record<string, number>;
}

interface BroadcastFinalResults {
  type: 'final_results';
  pairResults: PairResult[];
  scores: Record<string, number>;
}

type BroadcastEvent =
  | BroadcastPhaseChange
  | BroadcastLinesSubmitted
  | BroadcastMergeReveal
  | BroadcastVoteCast
  | BroadcastPairResult
  | BroadcastFinalResults;

/* ================================================================
   CONSTANTS
   ================================================================ */

const LINES_PER_PLAYER = 4;
const WRITING_TIME = 60;

const FUNCTION_SPECS: FunctionSpec[] = [
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

function interleaveLines(a: string[], b: string[]): MergedLine[] {
  const merged: MergedLine[] = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) merged.push({ lineNum: merged.length + 1, text: a[i], author: 'A' });
    if (i < b.length) merged.push({ lineNum: merged.length + 1, text: b[i], author: 'B' });
  }
  return merged;
}

/* ================================================================
   COMPONENT
   ================================================================ */

interface OnlineGameProps {
  onBack: () => void;
}

export default function OnlineGame({ onBack }: OnlineGameProps) {
  /* ── Lobby state ── */
  const [lobbyPhase, setLobbyPhase] = useState<'choice' | 'create' | 'join' | 'waiting'>('choice');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Game room hook ── */
  const onGameStartRef = useRef<(room: GameRoom, players: PublicPlayer[], pid: string) => void>(() => {});
  const playerIdRef = useRef('');
  playerIdRef.current = playerId;

  const {
    room,
    players: lobbyPlayers,
    me,
    isHost: lobbyIsHost,
    connectionStatus: lobbyConnectionStatus,
    error: roomError,
    toggleReady,
    startGame,
    kickPlayer,
  } = useGameRoom(roomCode, playerId, {});

  /* Watch for room status -> playing */
  const prevStatusRef = useRef(room?.status);
  useEffect(() => {
    if (prevStatusRef.current !== 'playing' && room?.status === 'playing' && lobbyPlayers.length > 0) {
      onGameStartRef.current(room, lobbyPlayers, playerIdRef.current);
    }
    prevStatusRef.current = room?.status;
  }, [room, lobbyPlayers]);

  /* ── Game state ── */
  const [inGame, setInGame] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<PublicPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);

  const [phase, setPhase] = useState<OnlinePhase>('lobby');
  const [currentSpec, setCurrentSpec] = useState<FunctionSpec | null>(null);
  const [pairs, setPairs] = useState<PairDef[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const usedSpecsRef = useRef<Set<string>>(new Set());

  /* ── Writing state ── */
  const [myLines, setMyLines] = useState<string[]>([]);
  const [currentLineInput, setCurrentLineInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(WRITING_TIME);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submittedLinesRef = useRef<Record<string, string[]>>({});

  /* ── Merge reveal ── */
  const [mergedLines, setMergedLines] = useState<MergedLine[]>([]);
  const [mergeStatus, setMergeStatus] = useState<'CONFLICT' | 'CLEAN MERGE' | 'FORCE PUSH'>('CONFLICT');
  const [revealedLineCount, setRevealedLineCount] = useState(0);

  /* ── Voting ── */
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [votes, setVotes] = useState<Record<string, Vote>>({});

  /* ── Scores & results ── */
  const [scores, setScores] = useState<Record<string, number>>({});
  const [pairResults, setPairResults] = useState<PairResult[]>([]);

  /* ── Refs ── */
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [gameConnectionStatus, setGameConnectionStatus] = useState<ConnectionStatusType>('connecting');

  /* ── Derived ── */
  const currentPair = pairs[currentPairIndex] ?? null;
  const amPlayerA = currentPair?.playerAId === myPlayerId;
  const amPlayerB = currentPair?.playerBId === myPlayerId;
  const amInCurrentPair = amPlayerA || amPlayerB;
  const playerAData = onlinePlayers.find((p) => p.id === currentPair?.playerAId) ?? null;
  const playerBData = onlinePlayers.find((p) => p.id === currentPair?.playerBId) ?? null;
  const myRole = amPlayerA ? 'A' : amPlayerB ? 'B' : null;

  /* ================================================================
     BROADCAST CHANNEL
     ================================================================ */

  const setupChannel = useCallback((code: string) => {
    if (channelRef.current) channelRef.current.unsubscribe();

    const channel = supabase.channel(`room:${code}:merge`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'merge_event' }, ({ payload }) => {
        handleBroadcastEvent(payload as BroadcastEvent);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setGameConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setGameConnectionStatus('error');
        else if (status === 'TIMED_OUT') setGameConnectionStatus('disconnected');
      });

    channelRef.current = channel;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const broadcast = useCallback((event: BroadcastEvent) => {
    channelRef.current?.send({ type: 'broadcast', event: 'merge_event', payload: event });
  }, []);

  /* ================================================================
     HANDLE BROADCAST EVENTS
     ================================================================ */

  const handleBroadcastEvent = useCallback((event: BroadcastEvent) => {
    switch (event.type) {
      case 'phase_change': {
        setPhase(event.phase);
        if (event.spec) setCurrentSpec(event.spec);
        if (event.currentPairIndex !== undefined) setCurrentPairIndex(event.currentPairIndex);
        if (event.pairs) setPairs(event.pairs);
        if (event.scores) setScores(event.scores);
        // Reset writing state for new phases
        if (event.phase === 'writing' || event.phase === 'spec-reveal') {
          setMyLines([]);
          setCurrentLineInput('');
          setTimeLeft(WRITING_TIME);
          setHasSubmitted(false);
          setMyVote(null);
          setVotes({});
          setMergedLines([]);
          setRevealedLineCount(0);
          submittedLinesRef.current = {};
        }
        break;
      }
      case 'lines_submitted':
        submittedLinesRef.current[event.playerId] = event.lines;
        break;
      case 'merge_reveal':
        setMergedLines(event.merged);
        setMergeStatus(event.mergeStatus);
        setRevealedLineCount(0);
        setPhase('merge-reveal');
        break;
      case 'vote_cast':
        setVotes((prev) => ({ ...prev, [event.playerId]: event.vote }));
        break;
      case 'pair_result':
        setPairResults((prev) => [...prev, event.result]);
        setScores(event.scores);
        setPhase('pair-results');
        break;
      case 'final_results':
        setPairResults(event.pairResults);
        setScores(event.scores);
        setPhase('final-results');
        break;
    }
  }, []);

  /* ================================================================
     GAME START (from lobby)
     ================================================================ */

  const handleGameStart = useCallback(
    (gameRm: GameRoom, players: PublicPlayer[], pid: string) => {
      setGameRoom(gameRm);
      setOnlinePlayers(players);
      setMyPlayerId(pid);
      setInGame(true);

      const mePlayer = players.find((p) => p.id === pid);
      setIsHost(mePlayer?.is_host ?? false);

      const initialScores: Record<string, number> = {};
      players.forEach((p) => { initialScores[p.id] = 0; });
      setScores(initialScores);
      setPairResults([]);

      setupChannel(gameRm.code);

      // Host generates pairs and starts
      if (mePlayer?.is_host) {
        const shuffled = shuffle(players);
        const newPairs: PairDef[] = [];
        for (let i = 0; i < shuffled.length - 1; i += 2) {
          newPairs.push({ playerAId: shuffled[i].id, playerBId: shuffled[i + 1].id });
        }
        if (shuffled.length % 2 !== 0) {
          newPairs.push({ playerAId: shuffled[shuffled.length - 1].id, playerBId: shuffled[0].id });
        }

        const spec = pickSpec(usedSpecsRef.current);
        usedSpecsRef.current.add(spec.text);

        setTimeout(() => {
          broadcast({
            type: 'phase_change',
            phase: 'spec-reveal',
            spec,
            currentPairIndex: 0,
            pairs: newPairs,
            scores: initialScores,
          });
        }, 500);
      }
    },
    [setupChannel, broadcast]
  );

  onGameStartRef.current = handleGameStart;

  /* ================================================================
     LOBBY API CALLS
     ================================================================ */

  const handleCreateRoom = useCallback(async () => {
    const name = displayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    if (!name) { setFormError('Please enter a name'); return; }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/games/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: 'merge-conflict', display_name: name, mode: 'online', max_players: 8 }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to create room'); }
      const data = await response.json();
      setRoomCode(data.room.code);
      setPlayerId(data.player.id);
      setLobbyPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName]);

  const handleJoinRoom = useCallback(async () => {
    const name = displayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    const code = joinCode.trim().toUpperCase();
    if (!name) { setFormError('Please enter a name'); return; }
    if (code.length !== 6) { setFormError('Room code must be 6 characters'); return; }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/games/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to join room'); }
      const data = await response.json();
      setRoomCode(data.room.code);
      setPlayerId(data.player.id);
      setLobbyPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, joinCode]);

  const handleStartGame = useCallback(async () => {
    setIsSubmitting(true);
    try { await startGame(); } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start game');
    } finally { setIsSubmitting(false); }
  }, [startGame]);

  /* ================================================================
     GAME LOGIC
     ================================================================ */

  /* Timer */
  useEffect(() => {
    if (phase !== 'writing') return;
    setTimeLeft(WRITING_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentPairIndex]);

  /* Auto-submit on timer expire */
  useEffect(() => {
    if (timeLeft === 0 && phase === 'writing' && !hasSubmitted && amInCurrentPair) {
      doAutoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /* Focus input */
  useEffect(() => {
    if (phase === 'writing' && inputRef.current && amInCurrentPair && !hasSubmitted) {
      inputRef.current.focus();
    }
  }, [phase, myLines.length, amInCurrentPair, hasSubmitted]);

  /* Merge reveal animation */
  useEffect(() => {
    if (phase === 'merge-reveal' && revealedLineCount < mergedLines.length) {
      const timer = setTimeout(() => setRevealedLineCount((c) => c + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [phase, revealedLineCount, mergedLines.length]);

  /* Host: poll for both submissions */
  useEffect(() => {
    if (!isHost || phase !== 'writing' || !currentPair) return;
    const check = setInterval(() => {
      const subA = submittedLinesRef.current[currentPair.playerAId];
      const subB = submittedLinesRef.current[currentPair.playerBId];
      if (subA && subB) {
        clearInterval(check);
        const merged = interleaveLines(subA, subB);
        const status = determineMergeStatus(subA, subB);
        broadcast({ type: 'merge_reveal', merged, mergeStatus: status });
      }
    }, 500);
    return () => clearInterval(check);
  }, [isHost, phase, currentPair, broadcast]);

  /* Host: tally votes when all in */
  useEffect(() => {
    if (!isHost || phase !== 'voting') return;
    const voteCount = Object.keys(votes).length;
    if (voteCount < onlinePlayers.length) return;

    const tally: Record<Vote, number> = { ship: 0, review: 0, revert: 0 };
    Object.values(votes).forEach((v) => { tally[v]++; });
    const pairScore = tally.ship * 3 + tally.review * 1;
    const newScores = { ...scores };
    if (currentPair) {
      newScores[currentPair.playerAId] = (newScores[currentPair.playerAId] ?? 0) + pairScore;
      newScores[currentPair.playerBId] = (newScores[currentPair.playerBId] ?? 0) + pairScore;
    }

    const result: PairResult = {
      playerAName: playerAData?.display_name ?? '?',
      playerBName: playerBData?.display_name ?? '?',
      spec: currentSpec!,
      merged: mergedLines,
      votes: tally,
      mergeStatus,
    };

    broadcast({ type: 'pair_result', result, scores: newScores });
  }, [votes, isHost, phase, onlinePlayers.length, scores, currentPair, playerAData, playerBData, currentSpec, mergedLines, mergeStatus, broadcast]);

  /* ── Actions ── */

  const submitLine = () => {
    if (hasSubmitted || !amInCurrentPair) return;
    const text = currentLineInput.trim() || '// ...';
    const newLines = [...myLines, text];
    setMyLines(newLines);
    setCurrentLineInput('');
    if (newLines.length >= LINES_PER_PLAYER) {
      setHasSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      broadcast({ type: 'lines_submitted', playerId: myPlayerId, lines: newLines });
    }
  };

  const doAutoSubmit = () => {
    if (hasSubmitted || !amInCurrentPair) return;
    const padded = [...myLines];
    while (padded.length < LINES_PER_PLAYER) padded.push('// ...');
    setMyLines(padded);
    setHasSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    broadcast({ type: 'lines_submitted', playerId: myPlayerId, lines: padded });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitLine(); }
  };

  const hostStartWriting = () => {
    if (!isHost) return;
    submittedLinesRef.current = {};
    broadcast({ type: 'phase_change', phase: 'writing' });
  };

  const hostStartVoting = () => {
    if (!isHost) return;
    setVotes({});
    setMyVote(null);
    broadcast({ type: 'phase_change', phase: 'voting' });
  };

  const submitVote = (vote: Vote) => {
    if (myVote) return;
    setMyVote(vote);
    broadcast({ type: 'vote_cast', playerId: myPlayerId, vote });
  };

  const hostNextPairOrFinish = () => {
    if (!isHost) return;
    if (currentPairIndex < pairs.length - 1) {
      const nextIdx = currentPairIndex + 1;
      const spec = pickSpec(usedSpecsRef.current);
      usedSpecsRef.current.add(spec.text);
      broadcast({ type: 'phase_change', phase: 'spec-reveal', spec, currentPairIndex: nextIdx, scores });
    } else {
      broadcast({ type: 'final_results', pairResults, scores });
    }
  };

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

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
  const linesWritten = myLines.length;
  const canStart = lobbyPlayers.length >= 2 && lobbyPlayers.every((p) => p.is_ready || p.is_host);
  const error = formError || roomError;

  /* ================================================================
     RENDER — LOBBY
     ================================================================ */

  if (!inGame) {
    /* Choice: Create or Join */
    if (lobbyPhase === 'choice') {
      return (
        <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="pixel-text" style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>
              MERGE CONFLICT
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Online Mode &middot; 2-8 players
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => setLobbyPhase('create')} className="pixel-btn" style={{ padding: '0.75rem', fontSize: '0.8rem', width: '100%' }}>
              CREATE ROOM
            </button>
            <button
              onClick={() => setLobbyPhase('join')}
              style={{
                padding: '0.75rem',
                fontSize: '0.8rem',
                width: '100%',
                borderRadius: '4px',
                border: '2px solid var(--color-border)',
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
              }}
            >
              JOIN ROOM
            </button>
            <button
              onClick={onBack}
              style={{
                padding: '0.5rem',
                fontSize: '0.7rem',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              &#8592; Back to mode select
            </button>
          </div>
        </div>
      );
    }

    /* Create or Join form */
    if (lobbyPhase === 'create' || lobbyPhase === 'join') {
      return (
        <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '1.5rem' }}>
          <button
            onClick={() => { setLobbyPhase('choice'); setFormError(null); }}
            style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem' }}
          >
            &#8592; Back
          </button>

          <h2 className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textAlign: 'center', marginBottom: '1.5rem' }}>
            {lobbyPhase === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="pixel-text" style={{ fontSize: '0.5rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                YOUR NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={16}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-border)',
                  outline: 'none',
                }}
              />
            </div>

            {lobbyPhase === 'join' && (
              <div>
                <label className="pixel-text" style={{ fontSize: '0.5rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  ROOM CODE
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="pixel-text"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    textAlign: 'center',
                    letterSpacing: '0.25em',
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-accent)',
                    border: '2px solid var(--color-border)',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {error && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-red)', textAlign: 'center' }}>{error}</p>
            )}

            <button
              onClick={lobbyPhase === 'create' ? handleCreateRoom : handleJoinRoom}
              disabled={isSubmitting}
              className="pixel-btn"
              style={{ padding: '0.75rem', fontSize: '0.8rem', width: '100%', opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? 'LOADING...' : lobbyPhase === 'create' ? 'CREATE' : 'JOIN'}
            </button>
          </div>
        </div>
      );
    }

    /* Waiting room */
    return (
      <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => { setLobbyPhase('choice'); setRoomCode(''); setPlayerId(''); }}
            style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            &#8592; Leave
          </button>
          <ConnectionStatus status={lobbyConnectionStatus} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <RoomCodeDisplay code={roomCode} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3 className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)' }}>
            MERGE CONFLICT
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {lobbyPlayers.length}/{room?.max_players ?? 8} players
          </p>
        </div>

        <div className="pixel-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <h4 className="pixel-text" style={{ fontSize: '0.5rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
            PLAYERS
          </h4>
          <PlayerList
            players={lobbyPlayers}
            currentPlayerId={me?.id}
            showReadyStatus
            showKickButton={lobbyIsHost}
            onKick={kickPlayer}
          />
        </div>

        {error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-red)', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!lobbyIsHost && me && (
            <button
              onClick={toggleReady}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                border: `2px solid ${me.is_ready ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: me.is_ready ? 'var(--color-accent-glow)' : 'transparent',
                color: me.is_ready ? 'var(--color-accent)' : 'var(--color-text)',
                transition: 'all 0.15s',
              }}
            >
              {me.is_ready ? 'READY' : 'TAP WHEN READY'}
            </button>
          )}

          {lobbyIsHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart || isSubmitting}
              className="pixel-btn"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.8rem',
                opacity: canStart && !isSubmitting ? 1 : 0.4,
                cursor: canStart && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting
                ? 'STARTING...'
                : canStart
                  ? 'START GAME'
                  : `WAITING FOR PLAYERS (${lobbyPlayers.length}/2 min)`}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER — GAME PHASES
     ================================================================ */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Connection + Room info bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {gameRoom && <RoomCodeDisplay code={gameRoom.code} compact />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {onlinePlayers.length} players
          </span>
          <ConnectionStatus status={gameConnectionStatus} />
        </div>
      </div>

      {/* SPEC REVEAL */}
      {phase === 'spec-reveal' && currentSpec && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            PAIR {currentPairIndex + 1} / {pairs.length}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--color-cyan)' }}>
              {playerAData?.display_name ?? '?'}
            </span>
            <span className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-red)' }}>VS</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--color-purple)' }}>
              {playerBData?.display_name ?? '?'}
            </span>
          </div>

          {amInCurrentPair && (
            <div
              className="pixel-text"
              style={{
                fontSize: '0.6rem',
                padding: '0.4rem 0.75rem',
                background: amPlayerA ? 'var(--color-cyan)' : 'var(--color-purple)',
                color: 'var(--color-bg)',
                borderRadius: '4px',
              }}
            >
              YOU ARE DEV {myRole} ({myRole === 'A' ? 'ODD LINES' : 'EVEN LINES'})
            </div>
          )}

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
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-mono)' }}>
              {currentSpec.text}
            </p>
          </div>

          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', maxWidth: '28rem' }}>
            {amInCurrentPair
              ? `You write the ${myRole === 'A' ? 'ODD' : 'EVEN'} lines. Your partner writes the other half simultaneously -- neither can see the other's code.`
              : 'Watch as this pair writes code blind!'}
          </div>

          {isHost ? (
            <button
              onClick={hostStartWriting}
              className="pixel-btn"
              style={{ padding: '0.75rem 2rem', fontSize: '0.8rem', background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none' }}
            >
              START WRITING PHASE
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Waiting for host to start...
            </div>
          )}
        </div>
      )}

      {/* WRITING PHASE */}
      {phase === 'writing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {amInCurrentPair ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '1rem', color: amPlayerA ? 'var(--color-cyan)' : 'var(--color-purple)' }}>
                    DEV {myRole}
                  </span>
                  <span className="pixel-text" style={{ fontSize: '0.55rem', marginLeft: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {myRole === 'A' ? 'ODD LINES' : 'EVEN LINES'}
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

              {hasSubmitted ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                    CODE SUBMITTED
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Waiting for your partner to finish writing...
                  </div>
                  <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {myLines.map((line, i) => (
                      <div key={i} style={{ opacity: 0.6 }}>
                        <span style={{ color: amPlayerA ? 'var(--color-cyan)' : 'var(--color-purple)', marginRight: '0.5rem' }}>
                          {amPlayerA ? i * 2 + 1 : i * 2 + 2}
                        </span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="pixel-card"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      border: `2px solid ${amPlayerA ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                    }}
                  >
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

                    <div style={{ padding: '0.5rem 0' }}>
                      {myLines.map((line, i) => {
                        const lineNum = amPlayerA ? i * 2 + 1 : i * 2 + 2;
                        return (
                          <div key={i} style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.8 }}>
                            <span style={{ width: '3rem', textAlign: 'right', paddingRight: '0.75rem', color: 'var(--color-text-muted)', userSelect: 'none', flexShrink: 0 }}>
                              {lineNum}
                            </span>
                            <span style={{ color: 'var(--color-text)', opacity: 0.7 }}>{line}</span>
                          </div>
                        );
                      })}

                      {linesWritten < LINES_PER_PLAYER && (
                        <div style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.8 }}>
                          <span
                            style={{
                              width: '3rem',
                              textAlign: 'right',
                              paddingRight: '0.75rem',
                              color: amPlayerA ? 'var(--color-cyan)' : 'var(--color-purple)',
                              userSelect: 'none',
                              flexShrink: 0,
                            }}
                          >
                            {amPlayerA ? myLines.length * 2 + 1 : myLines.length * 2 + 2}
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Line {linesWritten + 1} / {LINES_PER_PLAYER}
                    </span>
                    {linesWritten < LINES_PER_PLAYER && (
                      <button onClick={submitLine} className="pixel-btn" style={{ padding: '0.5rem 1.5rem', fontSize: '0.7rem' }}>
                        ENTER LINE ({LINES_PER_PLAYER - linesWritten} left)
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--color-orange)', marginBottom: '1rem' }}>
                PAIR IN PROGRESS
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--color-cyan)' }}>{playerAData?.display_name}</span>
                <span className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>VS</span>
                <span style={{ color: 'var(--color-purple)' }}>{playerBData?.display_name}</span>
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Both devs are writing code simultaneously...
              </div>
              <div className="pixel-text" style={{ fontSize: '0.8rem', color: timeLeft <= 10 ? 'var(--color-red)' : 'var(--color-orange)', marginTop: '1rem' }}>
                {timeLeft}s remaining
              </div>
            </div>
          )}
        </div>
      )}

      {/* MERGE REVEAL */}
      {phase === 'merge-reveal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
              {'git merge --no-ff'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Merging branches...</div>
          </div>

          <div className="pixel-card" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)', display: 'inline-block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-orange)', display: 'inline-block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                <span style={{ marginLeft: '0.5rem' }}>merged-output.ts</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6rem' }}>
                <span style={{ color: 'var(--color-cyan)' }}>{playerAData?.display_name}</span>
                <span style={{ color: 'var(--color-purple)' }}>{playerBData?.display_name}</span>
              </div>
            </div>

            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {specComment(currentSpec?.text)}
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              {mergedLines.slice(0, revealedLineCount).map((line, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    lineHeight: 1.8,
                    background: line.author === 'A' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(168, 85, 247, 0.08)',
                    borderLeft: `3px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                    animation: 'fade-in-up 0.3s ease-out',
                  }}
                >
                  <span style={{ width: '3rem', textAlign: 'right', paddingRight: '0.75rem', color: line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)', userSelect: 'none', flexShrink: 0, opacity: 0.7 }}>
                    {line.lineNum}
                  </span>
                  <span style={{ color: 'var(--color-text)', paddingRight: '0.5rem', wordBreak: 'break-word' }}>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {revealedLineCount >= mergedLines.length && (
            isHost ? (
              <button
                onClick={hostStartVoting}
                className="pixel-btn"
                style={{ padding: '0.75rem', fontSize: '0.8rem', width: '100%', background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none' }}
              >
                START VOTING
              </button>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Waiting for host to start voting...
              </div>
            )
          )}
        </div>
      )}

      {/* VOTING */}
      {phase === 'voting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}>
            CAST YOUR VOTE
          </div>

          <div
            className="pixel-card"
            style={{ padding: '0.75rem', width: '100%', maxWidth: '36rem', maxHeight: '12rem', overflow: 'auto', border: '1px solid var(--color-border)' }}
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

          {myVote ? (
            <div style={{ textAlign: 'center' }}>
              <div className="pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                VOTE CAST: {myVote.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {Object.keys(votes).length} / {onlinePlayers.length} votes in
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => submitVote('ship')} className="pixel-btn" style={{ padding: '0.75rem 1.25rem', fontSize: '0.7rem', background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', minWidth: '8rem' }}>
                WOULD SHIP
              </button>
              <button onClick={() => submitVote('review')} className="pixel-btn" style={{ padding: '0.75rem 1.25rem', fontSize: '0.7rem', background: 'var(--color-orange)', color: 'var(--color-bg)', border: 'none', minWidth: '8rem' }}>
                NEEDS REVIEW
              </button>
              <button onClick={() => submitVote('revert')} className="pixel-btn" style={{ padding: '0.75rem 1.25rem', fontSize: '0.7rem', background: 'var(--color-red)', color: 'var(--color-bg)', border: 'none', minWidth: '8rem' }}>
                REVERT NOW
              </button>
            </div>
          )}
        </div>
      )}

      {/* PAIR RESULTS */}
      {phase === 'pair-results' && pairResults.length > 0 && (() => {
        const result = pairResults[pairResults.length - 1];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div className="pixel-text" style={{ fontSize: '1rem', color: getStatusColor(result.mergeStatus), animation: 'glow-pulse 2s infinite' }}>
              {result.mergeStatus}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ color: 'var(--color-cyan)' }}>{result.playerAName}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>&amp;</span>
              <span style={{ color: 'var(--color-purple)' }}>{result.playerBName}</span>
            </div>

            <div className="pixel-card" style={{ padding: 0, width: '100%', overflow: 'hidden', border: '2px solid var(--color-border)' }}>
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
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
                      background: line.author === 'A' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(168, 85, 247, 0.08)',
                      borderLeft: `3px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`,
                    }}
                  >
                    <span style={{ width: '2.5rem', textAlign: 'right', paddingRight: '0.5rem', color: line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)', opacity: 0.6, flexShrink: 0 }}>
                      {line.lineNum}
                    </span>
                    <span style={{ color: 'var(--color-text)', wordBreak: 'break-word', paddingRight: '0.5rem' }}>
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>{result.votes.ship}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>SHIP</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-orange)' }}>{result.votes.review}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>REVIEW</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="pixel-text" style={{ fontSize: '1.2rem', color: 'var(--color-red)' }}>{result.votes.revert}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>REVERT</div>
              </div>
            </div>

            <div className="pixel-card" style={{ padding: '1rem', width: '100%' }}>
              <h3 className="pixel-text" style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>SCORES</h3>
              {[...onlinePlayers]
                .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
                .map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                    <span>{p.display_name}</span>
                    <span className="pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-accent)' }}>{scores[p.id] ?? 0} pts</span>
                  </div>
                ))}
            </div>

            {isHost ? (
              <button onClick={hostNextPairOrFinish} className="pixel-btn" style={{ padding: '0.75rem 2rem', fontSize: '0.8rem', width: '100%', maxWidth: '20rem' }}>
                {currentPairIndex < pairs.length - 1 ? 'NEXT PAIR' : 'SEE FINAL RESULTS'}
              </button>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Waiting for host...</div>
            )}
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
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>All branches merged.</div>
          </div>

          <div className="pixel-card" style={{ padding: '1.25rem' }}>
            <h2 className="pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-text)', marginBottom: '1rem' }}>LEADERBOARD</h2>
            {[...onlinePlayers]
              .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
              .map((p, i) => (
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
                    {i === 0 ? '\u{1F3C6}' : `#${i + 1}`} {p.display_name}
                  </span>
                  <span className="pixel-text" style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}>
                    {scores[p.id] ?? 0} pts
                  </span>
                </div>
              ))}
          </div>

          {pairResults.length > 0 && (() => {
            const best = [...pairResults].sort((a, b) => b.votes.ship - a.votes.ship)[0];
            const worst = [...pairResults].sort((a, b) => b.votes.revert - a.votes.revert)[0];
            return (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="pixel-card" style={{ flex: 1, minWidth: '14rem', padding: '1rem', textAlign: 'center' }}>
                  <div className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>BEST MERGE</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{best.playerAName} &amp; {best.playerBName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{best.votes.ship} ships</div>
                </div>
                <div className="pixel-card" style={{ flex: 1, minWidth: '14rem', padding: '1rem', textAlign: 'center' }}>
                  <div className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-red)', marginBottom: '0.5rem' }}>WORST MERGE</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{worst.playerAName} &amp; {worst.playerBName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{worst.votes.revert} reverts</div>
                </div>
              </div>
            );
          })()}

          <div className="pixel-card" style={{ padding: '1.25rem' }}>
            <h2 className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>ALL MERGES</h2>
            {pairResults.map((r, i) => (
              <div key={i} style={{ padding: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>{r.playerAName} &amp; {r.playerBName}</span>
                  <span className="pixel-text" style={{ fontSize: '0.5rem', padding: '0.15rem 0.4rem', background: getStatusColor(r.mergeStatus), color: 'var(--color-bg)', borderRadius: '2px' }}>
                    {r.mergeStatus}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                  {specComment(r.spec.text)}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  {r.merged.map((line, j) => (
                    <div key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', lineHeight: 1.5, color: 'var(--color-text)', borderLeft: `2px solid ${line.author === 'A' ? 'var(--color-cyan)' : 'var(--color-purple)'}`, paddingLeft: '0.4rem', marginBottom: '0.1rem' }}>
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={onBack} className="pixel-btn" style={{ padding: '0.75rem', fontSize: '0.8rem', width: '100%' }}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
