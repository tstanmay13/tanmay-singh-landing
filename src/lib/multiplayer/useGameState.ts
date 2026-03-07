'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameState, RealtimeEvent } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameStateOptions<TState> {
  /** Parse raw state_data into typed state */
  parseState: (raw: Record<string, unknown>) => TState;
  /** Called on every state update */
  onStateUpdate?: (state: TState) => void;
  /** Called when turn changes to current player */
  onMyTurn?: () => void;
  /** Called when game ends */
  onGameOver?: (scores: Record<string, number>) => void;
}

interface UseGameStateReturn<TState> {
  /** Current game state (null before game starts) */
  state: TState | null;
  /** Current state version for optimistic concurrency */
  version: number;
  /** Whose turn is it (null for simultaneous) */
  currentTurnPlayerId: string | null;
  /** Is it my turn? */
  isMyTurn: boolean;
  /** Current round number */
  currentRound: number;
  /** Update state via API with optimistic concurrency */
  updateState: (stateData: Record<string, unknown>) => Promise<void>;
  /** Send ephemeral data (no DB persistence, direct broadcast) */
  sendEphemeral: (data: Record<string, unknown>) => void;
  /** Subscribe to ephemeral data from other players */
  onEphemeral: (callback: (data: Record<string, unknown>, playerId: string) => void) => () => void;
}

export function useGameState<TState>(
  roomCode: string,
  playerId: string,
  options: UseGameStateOptions<TState>
): UseGameStateReturn<TState> {
  const [state, setState] = useState<TState | null>(null);
  const [version, setVersion] = useState(0);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(1);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const ephemeralCallbacksRef = useRef<Set<(data: Record<string, unknown>, playerId: string) => void>>(new Set());

  // Fetch initial state
  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/rooms/${roomCode}/state`);
      if (!response.ok) return;
      const data = await response.json();
      const gameState = data.state as GameState;
      setState(optionsRef.current.parseState(gameState.state_data));
      setVersion(gameState.version);
      setCurrentTurnPlayerId(gameState.current_turn);
      setCurrentRound(gameState.current_round);
    } catch {
      // State may not exist yet if game hasn't started
    }
  }, [roomCode]);

  // Subscribe to state updates via the room channel
  useEffect(() => {
    fetchState();

    const channel = supabase.channel(`room:${roomCode}:state`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'state_update' }, ({ payload }) => {
        const event = payload as RealtimeEvent;
        if (event.type === 'state_update') {
          const gameState = event.state;
          const parsed = optionsRef.current.parseState(gameState.state_data);
          setState(parsed);
          setVersion(gameState.version);
          setCurrentTurnPlayerId(gameState.current_turn);
          setCurrentRound(gameState.current_round);
          optionsRef.current.onStateUpdate?.(parsed);

          if (gameState.current_turn === playerId) {
            optionsRef.current.onMyTurn?.();
          }
        } else if (event.type === 'game_finished') {
          optionsRef.current.onGameOver?.(event.final_scores);
        }
      })
      .on('broadcast', { event: 'ephemeral' }, ({ payload }) => {
        const { data, sender_id } = payload as { data: Record<string, unknown>; sender_id: string };
        if (sender_id !== playerId) {
          ephemeralCallbacksRef.current.forEach((cb) => cb(data, sender_id));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode, playerId, fetchState]);

  const updateState = useCallback(
    async (stateData: Record<string, unknown>) => {
      const response = await fetch(`/api/games/rooms/${roomCode}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_data: stateData, expected_version: version }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update state');
      }

      const data = await response.json();
      const gameState = data.state as GameState;
      const parsed = optionsRef.current.parseState(gameState.state_data);
      setState(parsed);
      setVersion(gameState.version);

      // Broadcast the update to other players
      channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { type: 'state_update', state: gameState } satisfies RealtimeEvent,
      });
    },
    [roomCode, version]
  );

  const sendEphemeral = useCallback(
    (data: Record<string, unknown>) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'ephemeral',
        payload: { data, sender_id: playerId },
      });
    },
    [playerId]
  );

  const onEphemeral = useCallback(
    (callback: (data: Record<string, unknown>, senderId: string) => void) => {
      ephemeralCallbacksRef.current.add(callback);
      return () => {
        ephemeralCallbacksRef.current.delete(callback);
      };
    },
    []
  );

  const isMyTurn = currentTurnPlayerId === playerId;

  return {
    state,
    version,
    currentTurnPlayerId,
    isMyTurn,
    currentRound,
    updateState,
    sendEphemeral,
    onEphemeral,
  };
}
