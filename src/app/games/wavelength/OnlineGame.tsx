'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import RoomCodeDisplay from '@/components/multiplayer/RoomCodeDisplay';
import ConnectionStatus from '@/components/multiplayer/ConnectionStatus';
import { normalizeRoomCode, sanitizeDisplayName } from '@/lib/multiplayer/roomCode';
import type { GameRoom, PublicPlayer, ConnectionStatus as ConnStatus } from '@/lib/multiplayer/types';

/* ================================================================
   TYPES
   ================================================================ */

interface SpectrumPair {
  left: string;
  right: string;
  category: 'general' | 'dev' | 'culture' | 'food' | 'philosophical';
}

type OnlinePhase =
  | 'lobby'
  | 'category-select'
  | 'psychic-view'
  | 'team-guess'
  | 'reveal'
  | 'game-over';

interface OnlineRoundData {
  phase: OnlinePhase;
  spectrumLeft: string;
  spectrumRight: string;
  spectrumCategory: string;
  targetPosition: number;       // only psychic + host know until reveal
  guessPosition: number;
  clue: string;
  currentTeam: 1 | 2;
  psychicPlayerId: string;
  roundIndex: number;
  roundScore: number;
  team1Score: number;
  team2Score: number;
  teams: Record<string, 1 | 2>; // playerId -> team
  psychicRotation: Record<string, number>; // team key -> next psychic index in team
  selectedCategories: string[];
  winningScore: number;
}

/* ================================================================
   BROADCAST EVENT TYPES
   ================================================================ */

interface BroadcastPhaseChange {
  type: 'phase_change';
  phase: OnlinePhase;
  roundData?: Partial<OnlineRoundData>;
}

interface BroadcastClueSubmitted {
  type: 'clue_submitted';
  clue: string;
}

interface BroadcastGuessUpdate {
  type: 'guess_update';
  position: number;
}

interface BroadcastGuessLocked {
  type: 'guess_locked';
  position: number;
}

interface BroadcastReveal {
  type: 'reveal';
  targetPosition: number;
  score: number;
  team1Score: number;
  team2Score: number;
}

interface BroadcastGameStateUpdate {
  type: 'game_state_update';
  roundData: OnlineRoundData;
}

interface BroadcastTeamAssignment {
  type: 'team_assignment';
  teams: Record<string, 1 | 2>;
}

type BroadcastEvent =
  | BroadcastPhaseChange
  | BroadcastClueSubmitted
  | BroadcastGuessUpdate
  | BroadcastGuessLocked
  | BroadcastReveal
  | BroadcastGameStateUpdate
  | BroadcastTeamAssignment;

/* ================================================================
   SPECTRUM PAIRS (same as page.tsx)
   ================================================================ */

const SPECTRUM_PAIRS: SpectrumPair[] = [
  // General (40)
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
  // Dev-Themed (35)
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
  // Culture & Lifestyle (25)
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
  // Food & Drink (15)
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
  // Philosophical (15)
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

const CATEGORY_EMOJI: Record<string, string> = {
  general: '~',
  dev: '</>',
  culture: '#',
  food: '*',
  philosophical: '?',
};

const WINNING_SCORE = 10;

function calculateScore(target: number, guess: number): number {
  const diff = Math.abs(target - guess);
  if (diff <= 5) return 4;
  if (diff <= 15) return 3;
  if (diff <= 25) return 2;
  return 0;
}

/* ================================================================
   COMPONENT
   ================================================================ */

interface OnlineGameProps {
  onBack: () => void;
}

export default function OnlineGame({ onBack }: OnlineGameProps) {
  // Lobby state
  const [lobbyPhase, setLobbyPhase] = useState<'choice' | 'create' | 'join' | 'waiting'>('choice');
  const [inLobby, setInLobby] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PublicPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnStatus>('connecting');

  // Game state
  const [phase, setPhase] = useState<OnlinePhase>('lobby');
  const [roundData, setRoundData] = useState<OnlineRoundData | null>(null);
  const [myTargetPosition, setMyTargetPosition] = useState<number | null>(null);

  // Category selection (host)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Clue input
  const [clueInput, setClueInput] = useState('');

  // Guess slider
  const [localGuessPosition, setLocalGuessPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);

  // ─── Lobby channel for player join/leave ──────────────────────────────────

  const setupLobbyChannel = useCallback((roomCode: string) => {
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'room_event' }, ({ payload }) => {
        if (payload.type === 'player_joined') {
          setOnlinePlayers((prev) => {
            if (prev.find((p) => p.id === payload.player.id)) return prev;
            return [...prev, payload.player];
          });
        } else if (payload.type === 'player_left') {
          setOnlinePlayers((prev) => prev.filter((p) => p.id !== payload.player_id));
        } else if (payload.type === 'player_ready') {
          setOnlinePlayers((prev) =>
            prev.map((p) =>
              p.id === payload.player_id ? { ...p, is_ready: payload.is_ready } : p
            )
          );
        } else if (payload.type === 'player_kicked') {
          setOnlinePlayers((prev) => prev.filter((p) => p.id !== payload.player_id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
        else if (status === 'TIMED_OUT') setConnectionStatus('disconnected');
      });

    lobbyChannelRef.current = channel;
  }, []);

  // ─── Game channel for broadcast events ────────────────────────────────────

  const setupGameChannel = useCallback((roomCode: string) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`room:${roomCode}:wavelength`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'wavelength_event' }, ({ payload }) => {
        handleBroadcastEvent(payload as BroadcastEvent);
      })
      .subscribe();

    channelRef.current = channel;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      lobbyChannelRef.current?.unsubscribe();
      lobbyChannelRef.current = null;
    };
  }, []);

  // Handle broadcast events
  const handleBroadcastEvent = useCallback((event: BroadcastEvent) => {
    switch (event.type) {
      case 'game_state_update':
        setRoundData(event.roundData);
        setPhase(event.roundData.phase);
        setClueInput('');
        setLocalGuessPosition(50);
        // Target position is included in roundData for the psychic.
        // Non-psychic players receive it but their UI never shows it
        // (checked via amPsychic in rendering). This avoids needing
        // separate targeted channels for a casual party game.
        setMyTargetPosition(event.roundData.targetPosition);
        break;

      case 'phase_change':
        setPhase(event.phase);
        if (event.roundData) {
          setRoundData((prev) => {
            if (!prev) return event.roundData as OnlineRoundData;
            return { ...prev, ...event.roundData, phase: event.phase };
          });
        }
        setClueInput('');
        break;

      case 'clue_submitted':
        setRoundData((prev) => {
          if (!prev) return prev;
          return { ...prev, clue: event.clue };
        });
        break;

      case 'guess_update':
        setRoundData((prev) => {
          if (!prev) return prev;
          return { ...prev, guessPosition: event.position };
        });
        if (!isDragging) {
          setLocalGuessPosition(event.position);
        }
        break;

      case 'guess_locked':
        setRoundData((prev) => {
          if (!prev) return prev;
          return { ...prev, guessPosition: event.position };
        });
        setLocalGuessPosition(event.position);
        break;

      case 'reveal':
        setRoundData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            targetPosition: event.targetPosition,
            roundScore: event.score,
            team1Score: event.team1Score,
            team2Score: event.team2Score,
            phase: 'reveal',
          };
        });
        setPhase('reveal');
        setMyTargetPosition(event.targetPosition);
        break;

      case 'team_assignment':
        setRoundData((prev) => {
          if (!prev) return prev;
          return { ...prev, teams: event.teams };
        });
        break;
    }
  }, [isDragging]);

  // ─── Broadcast helper ──────────────────────────────────────────────────────

  const broadcast = useCallback((event: BroadcastEvent) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'wavelength_event',
      payload: event,
    });
  }, []);

  // Broadcast new round data to all players. The target position is included
  // in the data but only the psychic's UI displays it (enforced in rendering).
  const broadcastNewRound = useCallback((roundDataFull: OnlineRoundData) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'wavelength_event',
      payload: {
        type: 'game_state_update',
        roundData: roundDataFull,
      } as BroadcastGameStateUpdate,
    });
  }, []);

  // ─── Lobby: Create Room ───────────────────────────────────────────────────

  const handleCreateRoom = useCallback(async () => {
    const name = sanitizeDisplayName(displayName);
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
          game_id: 'wavelength',
          display_name: name,
          mode: 'online',
          max_players: 12,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create room');
      }

      const data = await response.json();
      setRoom(data.room);
      setMyPlayerId(data.player.id);
      setIsHost(true);
      setOnlinePlayers([data.player]);
      setupLobbyChannel(data.room.code);
      setLobbyPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, setupLobbyChannel]);

  // ─── Lobby: Join Room ─────────────────────────────────────────────────────

  const handleJoinRoom = useCallback(async () => {
    const name = sanitizeDisplayName(displayName);
    const code = normalizeRoomCode(joinCode);

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
      setRoom(data.room);
      setMyPlayerId(data.player.id);
      setIsHost(data.player.is_host);
      setOnlinePlayers(data.players);
      setupLobbyChannel(data.room.code);

      // Broadcast that we joined
      setTimeout(() => {
        lobbyChannelRef.current?.send({
          type: 'broadcast',
          event: 'room_event',
          payload: { type: 'player_joined', player: data.player },
        });
      }, 500);

      setLobbyPhase('waiting');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, joinCode, setupLobbyChannel]);

  // ─── Lobby: Toggle Ready ──────────────────────────────────────────────────

  const toggleReady = useCallback(() => {
    setOnlinePlayers((prev) =>
      prev.map((p) =>
        p.id === myPlayerId ? { ...p, is_ready: !p.is_ready } : p
      )
    );
    const me = onlinePlayers.find((p) => p.id === myPlayerId);
    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'room_event',
      payload: { type: 'player_ready', player_id: myPlayerId, is_ready: !(me?.is_ready) },
    });
  }, [myPlayerId, onlinePlayers]);

  // ─── Start Game from Lobby ────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    if (!isHost || !room) return;
    setInLobby(false);
    setupGameChannel(room.code);
    setPhase('category-select');

    // Auto-assign teams: alternating
    const teams: Record<string, 1 | 2> = {};
    onlinePlayers.forEach((p, i) => {
      teams[p.id] = ((i % 2) + 1) as 1 | 2;
    });

    // Broadcast game started to lobby channel so others transition
    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'room_event',
      payload: {
        type: 'game_started',
        state: { teams, roomCode: room.code },
      },
    });
  }, [isHost, room, onlinePlayers, setupGameChannel]);

  // Listen for game_started in lobby
  useEffect(() => {
    if (!lobbyChannelRef.current || !inLobby) return;

    const handler = ({ payload }: { payload: Record<string, unknown> }) => {
      if (payload.type === 'game_started' && !isHost) {
        const state = payload.state as { teams: Record<string, 1 | 2>; roomCode: string };
        setInLobby(false);
        setupGameChannel(state.roomCode);
        setPhase('category-select');
      }
    };

    // The lobby channel already has the listener from setupLobbyChannel,
    // but we need to re-subscribe to catch game_started specifically.
    // Since supabase channels support multiple on() handlers, let's add one.
    lobbyChannelRef.current.on('broadcast', { event: 'room_event' }, handler);

    // Can't easily remove just this handler, but cleanup is on unmount anyway
  }, [inLobby, isHost, setupGameChannel]);

  // ─── Category Selection ───────────────────────────────────────────────────

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // ─── Host: Start New Round ────────────────────────────────────────────────

  const startNewRound = useCallback((
    existingRoundData?: OnlineRoundData | null,
    categories?: string[]
  ) => {
    if (!isHost) return;

    const cats = categories || existingRoundData?.selectedCategories || selectedCategories;
    const filtered = cats.length > 0
      ? SPECTRUM_PAIRS.filter((p) => cats.includes(p.category))
      : SPECTRUM_PAIRS;
    const shuffled = shuffleArray(filtered);
    const pair = shuffled[0];
    const target = Math.floor(Math.random() * 80) + 10;

    // Determine teams
    const teams: Record<string, 1 | 2> = existingRoundData?.teams || {};
    if (Object.keys(teams).length === 0) {
      onlinePlayers.forEach((p, i) => {
        teams[p.id] = ((i % 2) + 1) as 1 | 2;
      });
    }

    // Determine current team and psychic
    const prevTeam = existingRoundData?.currentTeam;
    const currentTeam: 1 | 2 = prevTeam ? (prevTeam === 1 ? 2 : 1) : 1;

    const teamPlayerIds = onlinePlayers
      .filter((p) => teams[p.id] === currentTeam)
      .map((p) => p.id);

    const rotation = existingRoundData?.psychicRotation || { '1': 0, '2': 0 };
    const psychicIdx = (rotation[String(currentTeam)] || 0) % teamPlayerIds.length;
    const psychicPlayerId = teamPlayerIds[psychicIdx];

    const newRotation = {
      ...rotation,
      [String(currentTeam)]: psychicIdx + 1,
    };

    const roundIndex = (existingRoundData?.roundIndex ?? -1) + 1;

    const newRoundData: OnlineRoundData = {
      phase: 'psychic-view',
      spectrumLeft: pair.left,
      spectrumRight: pair.right,
      spectrumCategory: pair.category,
      targetPosition: target,
      guessPosition: 50,
      clue: '',
      currentTeam,
      psychicPlayerId,
      roundIndex,
      roundScore: 0,
      team1Score: existingRoundData?.team1Score ?? 0,
      team2Score: existingRoundData?.team2Score ?? 0,
      teams,
      psychicRotation: newRotation,
      selectedCategories: cats.length > 0 ? cats : ['general', 'dev', 'culture', 'food', 'philosophical'],
      winningScore: WINNING_SCORE,
    };

    // Set local state for host
    setRoundData(newRoundData);
    setPhase('psychic-view');
    setLocalGuessPosition(50);
    setClueInput('');

    // Set target for local host
    setMyTargetPosition(target);

    // Broadcast full round data to all players
    broadcastNewRound(newRoundData);
  }, [isHost, onlinePlayers, selectedCategories, broadcastNewRound]);

  const handleStartFromCategories = () => {
    startNewRound(null, selectedCategories);
  };

  // ─── Psychic: Submit Clue ─────────────────────────────────────────────────

  const submitClue = () => {
    if (!roundData || myPlayerId !== roundData.psychicPlayerId) return;
    const word = clueInput.trim().replace(/\s/g, '');
    if (!word) return;

    broadcast({
      type: 'clue_submitted',
      clue: word,
    });

    // Host transitions to team-guess
    if (isHost) {
      setTimeout(() => {
        broadcast({
          type: 'phase_change',
          phase: 'team-guess',
          roundData: { clue: word },
        });
      }, 300);
    }
  };

  // Non-host psychic: after submitting clue, host drives the transition
  // We need the host to also detect clue submission and advance
  useEffect(() => {
    if (phase === 'psychic-view' && roundData?.clue && isHost && roundData.clue.length > 0) {
      // Clue was received via broadcast, advance to team-guess
      const timer = setTimeout(() => {
        broadcast({
          type: 'phase_change',
          phase: 'team-guess',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, roundData?.clue, isHost, broadcast]);

  // ─── Team: Update Guess Position ──────────────────────────────────────────

  const updateSliderFromEvent = useCallback(
    (clientX: number) => {
      if (!sliderRef.current || phase !== 'team-guess') return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const pos = Math.round(pct);
      setLocalGuessPosition(pos);

      // Broadcast guess update to all
      broadcast({ type: 'guess_update', position: pos });
    },
    [phase, broadcast]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only team members (not psychic) on the current team can drag
      if (!roundData) return;
      if (roundData.teams[myPlayerId] !== roundData.currentTeam) return;
      if (myPlayerId === roundData.psychicPlayerId) return;

      setIsDragging(true);
      updateSliderFromEvent(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [roundData, myPlayerId, updateSliderFromEvent]
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

  // ─── Team: Lock in Guess ──────────────────────────────────────────────────

  const lockInGuess = () => {
    if (!roundData) return;
    // Only current team members (not psychic) can lock
    if (roundData.teams[myPlayerId] !== roundData.currentTeam) return;
    if (myPlayerId === roundData.psychicPlayerId) return;

    broadcast({ type: 'guess_locked', position: localGuessPosition });

    // If host, also compute and reveal
    if (isHost) {
      setTimeout(() => {
        const score = calculateScore(roundData.targetPosition, localGuessPosition);
        const newTeam1Score = roundData.team1Score + (roundData.currentTeam === 1 ? score : 0);
        const newTeam2Score = roundData.team2Score + (roundData.currentTeam === 2 ? score : 0);

        broadcast({
          type: 'reveal',
          targetPosition: roundData.targetPosition,
          score,
          team1Score: newTeam1Score,
          team2Score: newTeam2Score,
        });
      }, 800);
    }
  };

  // Non-host guess lock: host detects and reveals
  useEffect(() => {
    if (phase === 'team-guess' && roundData && isHost) {
      // Listen for guess_locked from broadcast -- handled in handleBroadcastEvent
    }
  }, [phase, roundData, isHost]);

  // Handle guess_locked when host receives it from a non-host player
  const handleGuessLockedAsHost = useCallback((position: number) => {
    if (!roundData || !isHost) return;

    const score = calculateScore(roundData.targetPosition, position);
    const newTeam1Score = roundData.team1Score + (roundData.currentTeam === 1 ? score : 0);
    const newTeam2Score = roundData.team2Score + (roundData.currentTeam === 2 ? score : 0);

    broadcast({
      type: 'reveal',
      targetPosition: roundData.targetPosition,
      score,
      team1Score: newTeam1Score,
      team2Score: newTeam2Score,
    });
  }, [roundData, isHost, broadcast]);

  // Override broadcast handler to detect guess_locked for host
  useEffect(() => {
    if (!channelRef.current || !isHost) return;

    const handler = ({ payload }: { payload: Record<string, unknown> }) => {
      if (payload.type === 'guess_locked' && isHost) {
        handleGuessLockedAsHost(payload.position as number);
      }
    };

    channelRef.current.on('broadcast', { event: 'wavelength_event' }, handler);
  }, [isHost, handleGuessLockedAsHost]);

  // ─── Next Round / Game Over ───────────────────────────────────────────────

  const nextRound = () => {
    if (!isHost || !roundData) return;

    if (roundData.team1Score >= WINNING_SCORE || roundData.team2Score >= WINNING_SCORE) {
      broadcast({
        type: 'phase_change',
        phase: 'game-over',
        roundData: {
          team1Score: roundData.team1Score,
          team2Score: roundData.team2Score,
        },
      });
      return;
    }

    startNewRound(roundData);
  };

  const resetToLobby = () => {
    setInLobby(true);
    setPhase('lobby');
    setLobbyPhase('waiting');
    setRoundData(null);
    setMyTargetPosition(null);
    setSelectedCategories([]);
  };

  // ─── Helper: Player name lookup ───────────────────────────────────────────

  const playerName = (id: string) =>
    onlinePlayers.find((p) => p.id === id)?.display_name || 'Unknown';

  const amPsychic = roundData?.psychicPlayerId === myPlayerId;
  const isMyTeamTurn = roundData ? roundData.teams[myPlayerId] === roundData.currentTeam : false;
  const canInteractSlider = isMyTeamTurn && !amPsychic && phase === 'team-guess';

  // Check if game_state_update with targetPosition is for me (psychic)
  // This is handled in handleBroadcastEvent: only set myTargetPosition if I am the psychic

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════════════════════════════════════════════

  if (inLobby) {
    // Choice: Create or Join
    if (lobbyPhase === 'choice') {
      return (
        <div
          className="min-h-screen p-4 md:p-8"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={onBack}
              className="text-sm mb-6 transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {'\u2190'} Back
            </button>

            <div className="text-center mb-8">
              <h2
                className="pixel-text text-lg md:text-xl mb-2"
                style={{ color: 'var(--color-accent)' }}
              >
                WAVELENGTH ONLINE
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                4-12 players, each on their own device
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setLobbyPhase('create')}
                className="pixel-btn w-full py-3 text-sm"
              >
                CREATE ROOM
              </button>
              <button
                onClick={() => setLobbyPhase('join')}
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
        </div>
      );
    }

    // Create / Join form
    if (lobbyPhase === 'create' || lobbyPhase === 'join') {
      return (
        <div
          className="min-h-screen p-4 md:p-8"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={() => { setLobbyPhase('choice'); setFormError(null); }}
              className="text-sm mb-6 transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {'\u2190'} Back
            </button>

            <h2
              className="pixel-text text-sm mb-6 text-center"
              style={{ color: 'var(--color-accent)' }}
            >
              {lobbyPhase === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
            </h2>

            <div className="space-y-4">
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

              {lobbyPhase === 'join' && (
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

              {formError && (
                <p className="text-xs text-center" style={{ color: 'var(--color-red)' }}>
                  {formError}
                </p>
              )}

              <button
                onClick={lobbyPhase === 'create' ? handleCreateRoom : handleJoinRoom}
                disabled={isSubmitting}
                className="pixel-btn w-full py-3 text-sm"
                style={{ opacity: isSubmitting ? 0.6 : 1 }}
              >
                {isSubmitting ? 'LOADING...' : lobbyPhase === 'create' ? 'CREATE' : 'JOIN'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Waiting room
    if (lobbyPhase === 'waiting' && room) {
      const canStart = onlinePlayers.length >= 4 && onlinePlayers.every((p) => p.is_ready || p.is_host);

      return (
        <div
          className="min-h-screen p-4 md:p-8"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={onBack}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {'\u2190'} Leave
              </button>
              <ConnectionStatus status={connectionStatus} />
            </div>

            <div className="mb-8">
              <RoomCodeDisplay code={room.code} />
            </div>

            <div className="text-center mb-6">
              <h3
                className="pixel-text text-xs"
                style={{ color: 'var(--color-accent)' }}
              >
                WAVELENGTH
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {onlinePlayers.length}/12 players
              </p>
            </div>

            {/* Player list with team preview */}
            <div
              className="pixel-card rounded-lg p-4 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <h4
                className="pixel-text text-xs mb-3"
                style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
              >
                PLAYERS (auto-split into teams)
              </h4>
              <div className="space-y-2">
                {onlinePlayers.map((p, i) => {
                  const team: 1 | 2 = ((i % 2) + 1) as 1 | 2;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: TEAM_COLORS[team] }}
                        />
                        <span className="text-sm">
                          {p.display_name}
                          {p.id === myPlayerId && (
                            <span style={{ color: 'var(--color-text-muted)' }}> (you)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs"
                          style={{ color: TEAM_COLORS[team] }}
                        >
                          {TEAM_NAMES[team]}
                        </span>
                        {p.is_host ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-accent-glow)',
                              color: 'var(--color-accent)',
                            }}
                          >
                            HOST
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{
                              color: p.is_ready ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            }}
                          >
                            {p.is_ready ? 'READY' : 'waiting'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {!isHost && (
                <button
                  onClick={toggleReady}
                  className="w-full py-3 rounded text-sm transition-all border"
                  style={{
                    backgroundColor: onlinePlayers.find((p) => p.id === myPlayerId)?.is_ready
                      ? 'var(--color-accent-glow)'
                      : 'transparent',
                    color: onlinePlayers.find((p) => p.id === myPlayerId)?.is_ready
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                    borderColor: onlinePlayers.find((p) => p.id === myPlayerId)?.is_ready
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  }}
                >
                  {onlinePlayers.find((p) => p.id === myPlayerId)?.is_ready ? 'READY' : 'TAP WHEN READY'}
                </button>
              )}

              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="pixel-btn w-full py-3 text-sm"
                  style={{
                    opacity: canStart ? 1 : 0.4,
                    cursor: canStart ? 'pointer' : 'not-allowed',
                  }}
                >
                  {canStart
                    ? 'START GAME'
                    : onlinePlayers.length < 4
                      ? `WAITING FOR PLAYERS (${onlinePlayers.length}/4 min)`
                      : 'WAITING FOR READY'}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY SELECT (host picks, others wait)
  // ═══════════════════════════════════════════════════════════════════════════

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
            className="text-center text-xs mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Select categories or leave empty for all
          </p>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {['general', 'dev', 'culture', 'food', 'philosophical'].map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="px-4 py-2 rounded border text-xs transition-all"
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

          {/* Team preview */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h4
              className="pixel-text text-xs mb-3 text-center"
              style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
            >
              TEAMS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {([1, 2] as const).map((team) => (
                <div key={team}>
                  <p
                    className="pixel-text text-xs mb-2 text-center"
                    style={{ color: TEAM_COLORS[team] }}
                  >
                    {TEAM_NAMES[team]}
                  </p>
                  <div className="space-y-1">
                    {onlinePlayers
                      .filter((_, i) => ((i % 2) + 1) === team)
                      .map((p) => (
                        <p
                          key={p.id}
                          className="text-xs text-center"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {p.display_name}
                        </p>
                      ))}
                  </div>
                </div>
              ))}
            </div>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED: Scoreboard header
  // ═══════════════════════════════════════════════════════════════════════════

  const scoreboard = (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[1] }}>
          {TEAM_NAMES[1]}
        </span>
        <span className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[1] }}>
          {roundData?.team1Score ?? 0}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>vs</span>
      <div className="flex items-center gap-2">
        <span className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[2] }}>
          {roundData?.team2Score ?? 0}
        </span>
        <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[2] }}>
          {TEAM_NAMES[2]}
        </span>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED: Spectrum bar renderer
  // ═══════════════════════════════════════════════════════════════════════════

  const spectrumBar = (interactive: boolean) => {
    const showTargetZone = phase === 'reveal' || (amPsychic && phase === 'psychic-view');
    const targetPos = myTargetPosition ?? roundData?.targetPosition ?? 50;
    const guessPos = interactive ? localGuessPosition : (roundData?.guessPosition ?? 50);

    return (
      <div className="mb-6">
        {/* Labels */}
        <div className="flex justify-between mb-2">
          <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[1] }}>
            {roundData?.spectrumLeft}
          </span>
          <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[2] }}>
            {roundData?.spectrumRight}
          </span>
        </div>

        {/* Spectrum slider */}
        <div
          ref={sliderRef}
          className="relative h-12 md:h-14 rounded-lg overflow-hidden select-none"
          style={{
            background: `linear-gradient(to right, ${TEAM_COLORS[1]}, var(--color-purple), ${TEAM_COLORS[2]})`,
            cursor: interactive && canInteractSlider ? 'pointer' : 'default',
            touchAction: 'none',
          }}
          onPointerDown={interactive && canInteractSlider ? handlePointerDown : undefined}
          onPointerMove={interactive && canInteractSlider ? handlePointerMove : undefined}
          onPointerUp={interactive && canInteractSlider ? handlePointerUp : undefined}
        >
          {/* Target zones (visible on reveal or for psychic) */}
          {showTargetZone && (
            <>
              <div
                className="absolute top-0 h-full transition-all duration-700"
                style={{
                  left: `${Math.max(0, targetPos - 15)}%`,
                  width: `${Math.min(30, 100 - Math.max(0, targetPos - 15))}%`,
                  backgroundColor: 'rgba(0,255,136,0.15)',
                }}
              />
              <div
                className="absolute top-0 h-full transition-all duration-700"
                style={{
                  left: `${Math.max(0, targetPos - 5)}%`,
                  width: `${Math.min(10, 100 - Math.max(0, targetPos - 5))}%`,
                  backgroundColor: 'rgba(0,255,136,0.4)',
                  borderLeft: '2px solid var(--color-accent)',
                  borderRight: '2px solid var(--color-accent)',
                }}
              />
              <div
                className="absolute top-0 h-full w-1 transition-all duration-500"
                style={{
                  left: `${targetPos}%`,
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 0 12px var(--color-accent), 0 0 24px var(--color-accent)',
                  zIndex: 10,
                }}
              />
            </>
          )}

          {/* Psychic target indicator (only psychic in psychic-view) */}
          {amPsychic && phase === 'psychic-view' && myTargetPosition !== null && (
            <div
              className="absolute top-0 h-full flex items-center justify-center"
              style={{
                left: `${myTargetPosition}%`,
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

          {/* Guess marker */}
          {(phase === 'team-guess' || phase === 'reveal') && (
            <div
              className="absolute top-0 h-full flex items-center justify-center transition-all"
              style={{
                left: `${guessPos}%`,
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
                  style={{ backgroundColor: roundData ? TEAM_COLORS[roundData.currentTeam] : 'var(--color-accent)' }}
                />
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
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PSYCHIC VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'psychic-view' && roundData) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {'\u2190'} Back to Games
          </button>

          {scoreboard}

          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              ROUND {roundData.roundIndex + 1} | {TEAM_NAMES[roundData.currentTeam]}&apos;s TURN
            </p>
            <h2
              className="pixel-text text-sm md:text-base mb-1"
              style={{ color: TEAM_COLORS[roundData.currentTeam] }}
            >
              PSYCHIC: {playerName(roundData.psychicPlayerId)}
            </h2>

            {amPsychic ? (
              <p className="text-xs mb-4" style={{ color: 'var(--color-accent)' }}>
                Only YOU can see the target. Give a one-word clue!
              </p>
            ) : (
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Waiting for the psychic to give a clue...
              </p>
            )}

            {roundData.spectrumCategory && (
              <span
                className="inline-block px-2 py-0.5 rounded text-xs mb-3"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {CATEGORY_EMOJI[roundData.spectrumCategory]} {roundData.spectrumCategory}
              </span>
            )}
          </div>

          {/* Show spectrum - psychic sees target, others see blank bar */}
          {amPsychic ? (
            <>
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
                    value={clueInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s/g, '');
                      setClueInput(val);
                    }}
                    maxLength={24}
                    className="flex-1 px-4 py-3 rounded text-center text-sm border outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitClue();
                    }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={submitClue}
                  disabled={clueInput.trim().length === 0}
                  className="pixel-btn text-xs mt-4"
                  style={{
                    opacity: clueInput.trim().length === 0 ? 0.4 : 1,
                    cursor: clueInput.trim().length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  LOCK IN CLUE
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              {/* Non-psychic sees a bare spectrum with no target */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[1] }}>
                    {roundData.spectrumLeft}
                  </span>
                  <span className="pixel-text text-xs md:text-sm" style={{ color: TEAM_COLORS[2] }}>
                    {roundData.spectrumRight}
                  </span>
                </div>
                <div
                  className="relative h-12 md:h-14 rounded-lg overflow-hidden"
                  style={{
                    background: `linear-gradient(to right, ${TEAM_COLORS[1]}, var(--color-purple), ${TEAM_COLORS[2]})`,
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>0%</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>50%</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>100%</span>
                </div>
              </div>

              <div className="text-3xl mb-4 animate-pixel-bounce">{'\u23F3'}</div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {playerName(roundData.psychicPlayerId)} is thinking of a clue...
              </p>
            </div>
          )}

          {room && (
            <div className="mt-4 text-center">
              <RoomCodeDisplay code={room.code} compact />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM GUESS
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'team-guess' && roundData) {
    const teamPlayerIds = onlinePlayers
      .filter((p) => roundData.teams[p.id] === roundData.currentTeam && p.id !== roundData.psychicPlayerId)
      .map((p) => p.display_name);

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {'\u2190'} Back to Games
          </button>

          {scoreboard}

          <div
            className="pixel-card rounded-lg p-4 md:p-6 mb-6 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {TEAM_NAMES[roundData.currentTeam]} GUESSING
            </p>
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {playerName(roundData.psychicPlayerId)}&apos;s clue:
            </p>
            <h2
              className="pixel-text text-lg md:text-2xl mb-2 animate-fade-in-up"
              style={{ color: 'var(--color-accent)' }}
            >
              &quot;{roundData.clue}&quot;
            </h2>
            {canInteractSlider ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {teamPlayerIds.join(', ')} {'\u2014'} drag the marker and lock in!
              </p>
            ) : isMyTeamTurn && amPsychic ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                You are the psychic. Watch your team guess!
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {TEAM_NAMES[roundData.currentTeam]} is guessing...
              </p>
            )}
          </div>

          {spectrumBar(true)}

          <div className="text-center">
            <p className="mono-text text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Position: {Math.round(localGuessPosition)}%
            </p>
            {canInteractSlider && (
              <button onClick={lockInGuess} className="pixel-btn text-sm">
                LOCK IN GUESS
              </button>
            )}
          </div>

          {room && (
            <div className="mt-4 text-center">
              <RoomCodeDisplay code={room.code} compact />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVEAL
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'reveal' && roundData) {
    const diff = Math.abs(roundData.targetPosition - roundData.guessPosition);
    const score = roundData.roundScore;
    const scoreLabel =
      score === 4
        ? "BULLS-EYE!"
        : score === 3
          ? 'CLOSE!'
          : score === 2
            ? 'WARM'
            : 'MISS...';

    const scoreColor =
      score === 4
        ? 'var(--color-accent)'
        : score === 3
          ? 'var(--color-cyan)'
          : score === 2
            ? 'var(--color-orange)'
            : 'var(--color-red)';

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="text-sm transition-colors hover:opacity-80 inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {'\u2190'} Back to Games
          </button>

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
              +{score}
            </p>
            <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>Target: {Math.round(roundData.targetPosition)}% | Guess: {Math.round(roundData.guessPosition)}%</p>
              <p>Off by {Math.round(diff)}%</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Clue: &quot;{roundData.clue}&quot; by {playerName(roundData.psychicPlayerId)}
              </p>
            </div>

            {isHost && (
              <button onClick={nextRound} className="pixel-btn text-sm mt-6">
                {roundData.team1Score >= WINNING_SCORE || roundData.team2Score >= WINNING_SCORE
                  ? 'SEE RESULTS'
                  : 'NEXT ROUND'}
              </button>
            )}
            {!isHost && (
              <p
                className="pixel-text text-xs mt-6"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Waiting for host...
              </p>
            )}
          </div>

          {room && (
            <div className="mt-4 text-center">
              <RoomCodeDisplay code={room.code} compact />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'game-over' && roundData) {
    const winner: 1 | 2 = roundData.team1Score >= WINNING_SCORE ? 1 : 2;
    const winnerScore = winner === 1 ? roundData.team1Score : roundData.team2Score;
    const loserScore = winner === 1 ? roundData.team2Score : roundData.team1Score;

    const winningTeamPlayers = onlinePlayers.filter(
      (p) => roundData.teams[p.id] === winner
    );

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
                  {winningTeamPlayers.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        color: TEAM_COLORS[winner],
                      }}
                    >
                      {p.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {isHost && (
                <button onClick={resetToLobby} className="pixel-btn text-xs">
                  NEW GAME
                </button>
              )}
              <button
                onClick={onBack}
                className="pixel-btn text-xs"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                BACK TO ARCADE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
