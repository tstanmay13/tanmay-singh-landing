'use client';

import { useState, useCallback } from 'react';
import RoomCodeDisplay from './RoomCodeDisplay';
import PlayerList from './PlayerList';
import ConnectionStatus from './ConnectionStatus';
import { useGameRoom } from '@/lib/multiplayer/useGameRoom';
import { normalizeRoomCode, sanitizeDisplayName } from '@/lib/multiplayer/roomCode';
import type { GameRoom, PublicPlayer, GameState } from '@/lib/multiplayer/types';

interface GameLobbyProps {
  gameId: string;
  gameName: string;
  gameIcon: string;
  minPlayers: number;
  maxPlayers: number;
  onGameStart: (room: GameRoom, players: PublicPlayer[], state: GameState) => void;
  renderSettings?: (
    settings: Record<string, unknown>,
    onChange: (settings: Record<string, unknown>) => void,
    isHost: boolean
  ) => React.ReactNode;
  allowPassThePhone?: boolean;
}

type LobbyPhase = 'choice' | 'create' | 'join' | 'lobby';

export default function GameLobby({
  gameId,
  gameName,
  gameIcon,
  minPlayers,
  maxPlayers,
  onGameStart,
  renderSettings,
  allowPassThePhone = false,
}: GameLobbyProps) {
  const [phase, setPhase] = useState<LobbyPhase>('choice');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<'online' | 'pass-the-phone'>('online');

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
    leaveRoom,
  } = useGameRoom(roomCode, playerId, {
    onGameStarted: (state) => {
      if (room) {
        onGameStart(room, players, state);
      }
    },
  });

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
          game_id: gameId,
          display_name: name,
          mode,
          max_players: maxPlayers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create room');
      }

      const data = await response.json();
      setRoomCode(data.room.code);
      setPlayerId(data.player.id);
      setPhase('lobby');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, gameId, mode, maxPlayers]);

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
      setRoomCode(data.room.code);
      setPlayerId(data.player.id);
      setPhase('lobby');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, joinCode]);

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

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    setPhase('choice');
    setRoomCode('');
    setPlayerId('');
  }, [leaveRoom]);

  const canStart = players.length >= minPlayers && players.every((p) => p.is_ready || p.is_host);
  const error = formError || roomError;

  // =============================================
  // Choice Phase: Create or Join
  // =============================================
  if (phase === 'choice') {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-3">{gameIcon}</span>
          <h2 className="pixel-text text-sm md:text-base" style={{ color: 'var(--color-accent)' }}>
            {gameName}
          </h2>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {minPlayers}-{maxPlayers} players
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

  // =============================================
  // Create / Join Phase: Name + Code Entry
  // =============================================
  if (phase === 'create' || phase === 'join') {
    return (
      <div className="max-w-md mx-auto p-6">
        <button
          onClick={() => { setPhase('choice'); setFormError(null); }}
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
          {/* Display name input */}
          <div>
            <label className="pixel-text text-xs block mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}>
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

          {/* Room code input (join only) */}
          {phase === 'join' && (
            <div>
              <label className="pixel-text text-xs block mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}>
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

          {/* Mode toggle (create only) */}
          {phase === 'create' && allowPassThePhone && (
            <div>
              <label className="pixel-text text-xs block mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}>
                MODE
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('online')}
                  className="flex-1 py-2 rounded text-xs transition-all"
                  style={{
                    backgroundColor: mode === 'online' ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                    color: mode === 'online' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: `2px solid ${mode === 'online' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  Online
                </button>
                <button
                  onClick={() => setMode('pass-the-phone')}
                  className="flex-1 py-2 rounded text-xs transition-all"
                  style={{
                    backgroundColor: mode === 'pass-the-phone' ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                    color: mode === 'pass-the-phone' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: `2px solid ${mode === 'pass-the-phone' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  Pass the Phone
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--color-red)' }}>
              {error}
            </p>
          )}

          {/* Submit button */}
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

  // =============================================
  // Lobby Phase: Waiting for players / Start
  // =============================================
  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeave}
          className="text-sm transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &#8592; Leave
        </button>
        <ConnectionStatus status={connectionStatus} />
      </div>

      {/* Room code */}
      <div className="mb-8">
        <RoomCodeDisplay code={roomCode} />
      </div>

      {/* Game info */}
      <div className="text-center mb-6">
        <span className="text-2xl">{gameIcon}</span>
        <h3
          className="pixel-text text-xs mt-2"
          style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
        >
          {gameName}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {players.length}/{room?.max_players ?? maxPlayers} players
        </p>
      </div>

      {/* Player list */}
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

      {/* Settings (if provided) */}
      {renderSettings && room && (
        <div
          className="pixel-card rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
        >
          <h4
            className="pixel-text text-xs mb-3"
            style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
          >
            SETTINGS
          </h4>
          {renderSettings(room.settings, () => {}, isHost)}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-center mb-4" style={{ color: 'var(--color-red)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
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
                : `WAITING FOR PLAYERS (${players.length}/${minPlayers} min)`}
          </button>
        )}
      </div>
    </div>
  );
}
