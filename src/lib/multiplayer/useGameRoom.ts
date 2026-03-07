'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  GameRoom,
  PublicPlayer,
  GameState,
  RealtimeEvent,
  ConnectionStatus,
} from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameRoomOptions {
  onPlayerJoined?: (player: PublicPlayer) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onPlayerReconnected?: (playerId: string) => void;
  onGameStarted?: (state: GameState) => void;
  onKicked?: () => void;
  onHostChanged?: (newHostId: string) => void;
}

interface UseGameRoomReturn {
  room: GameRoom | null;
  players: PublicPlayer[];
  me: PublicPlayer | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendChat: (message: string) => void;
}

export function useGameRoom(
  roomCode: string,
  playerId: string,
  options?: UseGameRoomOptions
): UseGameRoomReturn {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [me, setMe] = useState<PublicPlayer | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Fetch initial room data
  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/rooms/${roomCode}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch room');
      }
      const data = await response.json();
      setRoom(data.room);
      setPlayers(data.players);
      setMe(data.players.find((p: PublicPlayer) => p.id === playerId) ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room');
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, playerId]);

  // Subscribe to realtime events
  useEffect(() => {
    fetchRoom();

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'room_event' }, ({ payload }) => {
        const event = payload as RealtimeEvent;

        switch (event.type) {
          case 'player_joined':
            setPlayers((prev) => {
              if (prev.find((p) => p.id === event.player.id)) return prev;
              return [...prev, event.player];
            });
            optionsRef.current?.onPlayerJoined?.(event.player);
            break;

          case 'player_left':
            setPlayers((prev) => prev.filter((p) => p.id !== event.player_id));
            if (event.player_id === playerId) {
              optionsRef.current?.onKicked?.();
            }
            optionsRef.current?.onPlayerLeft?.(event.player_id);
            break;

          case 'player_ready':
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === event.player_id ? { ...p, is_ready: event.is_ready } : p
              )
            );
            break;

          case 'player_disconnected':
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === event.player_id ? { ...p, is_connected: false } : p
              )
            );
            optionsRef.current?.onPlayerDisconnected?.(event.player_id);
            break;

          case 'player_reconnected':
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === event.player_id ? { ...p, is_connected: true } : p
              )
            );
            optionsRef.current?.onPlayerReconnected?.(event.player_id);
            break;

          case 'game_started':
            setRoom((prev) => (prev ? { ...prev, status: 'playing' } : prev));
            optionsRef.current?.onGameStarted?.(event.state);
            break;

          case 'player_kicked':
            setPlayers((prev) => prev.filter((p) => p.id !== event.player_id));
            if (event.player_id === playerId) {
              optionsRef.current?.onKicked?.();
            }
            break;

          case 'host_changed':
            setPlayers((prev) =>
              prev.map((p) => ({
                ...p,
                is_host: p.id === event.new_host_id,
              }))
            );
            setRoom((prev) =>
              prev ? { ...prev, host_player_id: event.new_host_id } : prev
            );
            optionsRef.current?.onHostChanged?.(event.new_host_id);
            break;

          case 'settings_changed':
            setRoom((prev) =>
              prev ? { ...prev, settings: event.settings } : prev
            );
            break;

          case 'game_finished':
            setRoom((prev) => (prev ? { ...prev, status: 'finished' } : prev));
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        }
      });

    // Track presence
    channel.track({
      player_id: playerId,
      online_at: new Date().toISOString(),
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode, playerId, fetchRoom]);

  const toggleReady = useCallback(async () => {
    if (!me) return;
    const newReady = !me.is_ready;
    setMe((prev) => (prev ? { ...prev, is_ready: newReady } : prev));
    setPlayers((prev) =>
      prev.map((p) => (p.id === me.id ? { ...p, is_ready: newReady } : p))
    );
    channelRef.current?.send({
      type: 'broadcast',
      event: 'room_event',
      payload: { type: 'player_ready', player_id: me.id, is_ready: newReady } satisfies RealtimeEvent,
    });
  }, [me]);

  const startGame = useCallback(async () => {
    const response = await fetch(`/api/games/rooms/${roomCode}/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to start game');
    }
    const data = await response.json();
    channelRef.current?.send({
      type: 'broadcast',
      event: 'room_event',
      payload: { type: 'game_started', state: data.state } satisfies RealtimeEvent,
    });
  }, [roomCode]);

  const kickPlayer = useCallback(
    async (targetPlayerId: string) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'room_event',
        payload: { type: 'player_kicked', player_id: targetPlayerId } satisfies RealtimeEvent,
      });
    },
    []
  );

  const updateSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'room_event',
        payload: { type: 'settings_changed', settings } satisfies RealtimeEvent,
      });
    },
    []
  );

  const leaveRoom = useCallback(async () => {
    await fetch(`/api/games/rooms/${roomCode}/leave`, {
      method: 'POST',
    });
    channelRef.current?.send({
      type: 'broadcast',
      event: 'room_event',
      payload: { type: 'player_left', player_id: playerId } satisfies RealtimeEvent,
    });
  }, [roomCode, playerId]);

  const sendChat = useCallback(
    (message: string) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'room_event',
        payload: {
          type: 'chat_message',
          player_id: playerId,
          message,
          timestamp: Date.now(),
        } satisfies RealtimeEvent,
      });
    },
    [playerId]
  );

  const isHost = me?.is_host ?? false;

  return {
    room,
    players,
    me,
    isHost,
    connectionStatus,
    isLoading,
    error,
    toggleReady,
    startGame,
    kickPlayer,
    updateSettings,
    leaveRoom,
    sendChat,
  };
}
