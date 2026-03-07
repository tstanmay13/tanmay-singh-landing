'use client';

import { useState, useCallback } from 'react';
import GameLobby from './GameLobby';
import ConnectionStatus from './ConnectionStatus';
import RoomCodeDisplay from './RoomCodeDisplay';
import { useGameRoom } from '@/lib/multiplayer/useGameRoom';
import { useGameState } from '@/lib/multiplayer/useGameState';
import type { GameRoom, PublicPlayer, GameState } from '@/lib/multiplayer/types';
import type { useGameRoom as UseGameRoomType } from '@/lib/multiplayer/useGameRoom';
import type { useGameState as UseGameStateType } from '@/lib/multiplayer/useGameState';

type UseGameRoomReturn = ReturnType<typeof UseGameRoomType>;
type UseGameStateReturn<T> = ReturnType<typeof UseGameStateType<T>>;

interface GameWrapperProps {
  gameId: string;
  gameName: string;
  gameIcon: string;
  minPlayers: number;
  maxPlayers: number;
  allowPassThePhone?: boolean;
  renderSettings?: (
    settings: Record<string, unknown>,
    onChange: (settings: Record<string, unknown>) => void,
    isHost: boolean
  ) => React.ReactNode;
  parseState?: (raw: Record<string, unknown>) => Record<string, unknown>;
  children: (props: {
    room: GameRoom;
    players: PublicPlayer[];
    me: PublicPlayer;
    gameState: UseGameStateReturn<Record<string, unknown>>;
    roomControls: UseGameRoomReturn;
  }) => React.ReactNode;
}

type WrapperPhase = 'lobby' | 'playing' | 'results';

function ActiveGame({
  room,
  playerId,
  parseState,
  children,
}: {
  room: GameRoom;
  playerId: string;
  parseState: (raw: Record<string, unknown>) => Record<string, unknown>;
  children: GameWrapperProps['children'];
}) {
  const roomControls = useGameRoom(room.code, playerId);
  const gameState = useGameState<Record<string, unknown>>(room.code, playerId, {
    parseState,
  });

  if (!roomControls.me) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)' }}>
          RECONNECTING...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Top bar with room code and connection status */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <RoomCodeDisplay code={room.code} compact />
        <ConnectionStatus status={roomControls.connectionStatus} />
      </div>

      {/* Game content */}
      {children({
        room,
        players: roomControls.players,
        me: roomControls.me,
        gameState,
        roomControls,
      })}
    </div>
  );
}

export default function GameWrapper({
  gameId,
  gameName,
  gameIcon,
  minPlayers,
  maxPlayers,
  allowPassThePhone,
  renderSettings,
  parseState = (raw) => raw,
  children,
}: GameWrapperProps) {
  const [phase, setPhase] = useState<WrapperPhase>('lobby');
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string>('');

  const handleGameStart = useCallback(
    (room: GameRoom, _players: PublicPlayer[], _state: GameState) => {
      setActiveRoom(room);
      // Find our player ID from the existing state
      setPhase('playing');
    },
    []
  );

  // Lobby phase
  if (phase === 'lobby' || !activeRoom) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <GameLobby
          gameId={gameId}
          gameName={gameName}
          gameIcon={gameIcon}
          minPlayers={minPlayers}
          maxPlayers={maxPlayers}
          onGameStart={(room, _players, _state) => {
            setActiveRoom(room);
            // The player ID should have been set when creating/joining
            handleGameStart(room, _players, _state);
          }}
          renderSettings={renderSettings}
          allowPassThePhone={allowPassThePhone}
        />
      </div>
    );
  }

  // Playing phase
  if (phase === 'playing') {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <ActiveGame
          room={activeRoom}
          playerId={activePlayerId}
          parseState={parseState}
        >
          {children}
        </ActiveGame>
      </div>
    );
  }

  // Results phase
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="text-center p-6">
        <h2 className="pixel-text text-lg mb-4" style={{ color: 'var(--color-accent)' }}>
          GAME OVER
        </h2>
        <button
          onClick={() => {
            setPhase('lobby');
            setActiveRoom(null);
            setActivePlayerId('');
          }}
          className="pixel-btn"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
