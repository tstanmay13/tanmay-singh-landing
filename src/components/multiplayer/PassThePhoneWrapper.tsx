'use client';

import { useState, useCallback } from 'react';
import PrivacyScreen from './PrivacyScreen';
import PlayerList from './PlayerList';
import { usePassThePhone } from '@/lib/multiplayer/usePassThePhone';
import { sanitizeDisplayName, generateAvatarSeed } from '@/lib/multiplayer/roomCode';
import type { PublicPlayer } from '@/lib/multiplayer/types';

interface PassThePhoneWrapperProps<TState> {
  gameName: string;
  gameIcon: string;
  minPlayers: number;
  maxPlayers: number;
  initialState: TState;
  children: (props: {
    currentPlayer: PublicPlayer;
    state: TState;
    endTurn: (newState: TState) => void;
    round: number;
  }) => React.ReactNode;
  renderRoundResults?: (state: TState, players: PublicPlayer[]) => React.ReactNode;
  isGameOver: (state: TState, round: number) => boolean;
  renderFinalResults?: (state: TState, players: PublicPlayer[]) => React.ReactNode;
}

type WrapperPhase = 'setup' | 'playing' | 'round-results' | 'final-results';

export default function PassThePhoneWrapper<TState>({
  gameName,
  gameIcon,
  minPlayers,
  maxPlayers,
  initialState,
  children,
  renderRoundResults,
  isGameOver,
  renderFinalResults,
}: PassThePhoneWrapperProps<TState>) {
  const [phase, setPhase] = useState<WrapperPhase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);

  const passThePhone = usePassThePhone<TState>(players, initialState);

  const addPlayer = useCallback(() => {
    if (playerNames.length >= maxPlayers) return;
    setPlayerNames((prev) => [...prev, '']);
  }, [playerNames.length, maxPlayers]);

  const removePlayer = useCallback((index: number) => {
    if (playerNames.length <= minPlayers) return;
    setPlayerNames((prev) => prev.filter((_, i) => i !== index));
  }, [playerNames.length, minPlayers]);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setPlayerNames((prev) => prev.map((n, i) => (i === index ? name : n)));
  }, []);

  const handleStart = useCallback(() => {
    const names = playerNames.map(sanitizeDisplayName).filter(Boolean);
    if (names.length < minPlayers) {
      setSetupError(`Need at least ${minPlayers} players`);
      return;
    }

    // Create PublicPlayer objects
    const gamePlayers: PublicPlayer[] = names.map((name, i) => ({
      id: crypto.randomUUID(),
      room_id: '',
      display_name: name,
      avatar_seed: generateAvatarSeed(),
      is_host: i === 0,
      is_ready: true,
      is_connected: true,
      player_order: i,
      score: 0,
      joined_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      disconnected_at: null,
    }));

    setPlayers(gamePlayers);
    setPhase('playing');
  }, [playerNames, minPlayers]);

  const handleEndTurn = useCallback(
    (newState: TState) => {
      passThePhone.endTurn(newState);

      // Check if round is complete after this turn
      if (passThePhone.currentPlayerIndex + 1 >= players.length) {
        // Last player of the round
        if (isGameOver(newState, passThePhone.currentRound)) {
          setPhase('final-results');
        } else if (renderRoundResults) {
          setPhase('round-results');
        }
      }
    },
    [passThePhone, players.length, isGameOver, renderRoundResults]
  );

  const handleNextRound = useCallback(() => {
    passThePhone.nextRound();
    setPhase('playing');
  }, [passThePhone]);

  // =============================================
  // Setup Phase: Enter player names
  // =============================================
  if (phase === 'setup') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3">{gameIcon}</span>
            <h2 className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>
              {gameName}
            </h2>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Pass the Phone Mode
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="pixel-text text-xs w-6 text-right flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updatePlayerName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  maxLength={16}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-border)',
                    outline: 'none',
                  }}
                />
                {playerNames.length > minPlayers && (
                  <button
                    onClick={() => removePlayer(i)}
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ color: 'var(--color-red)' }}
                  >
                    &#10005;
                  </button>
                )}
              </div>
            ))}
          </div>

          {playerNames.length < maxPlayers && (
            <button
              onClick={addPlayer}
              className="w-full py-2 rounded border text-sm mb-6 transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                borderStyle: 'dashed',
              }}
            >
              + Add Player
            </button>
          )}

          {setupError && (
            <p className="text-xs text-center mb-4" style={{ color: 'var(--color-red)' }}>
              {setupError}
            </p>
          )}

          <button
            onClick={handleStart}
            className="pixel-btn w-full py-3 text-sm"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // Playing Phase
  // =============================================
  if (phase === 'playing') {
    // Show privacy screen
    if (passThePhone.isPrivacyScreen) {
      return (
        <PrivacyScreen
          nextPlayerName={passThePhone.currentPlayer.display_name}
          onReady={passThePhone.confirmReady}
        />
      );
    }

    // Show the game for the current player
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Round {passThePhone.currentRound}
          </span>
          <PlayerList players={players} currentTurnPlayerId={passThePhone.currentPlayer.id} layout="horizontal" />
        </div>

        {/* Game content */}
        {children({
          currentPlayer: passThePhone.currentPlayer,
          state: passThePhone.state,
          endTurn: handleEndTurn,
          round: passThePhone.currentRound,
        })}
      </div>
    );
  }

  // =============================================
  // Round Results
  // =============================================
  if (phase === 'round-results' && renderRoundResults) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full text-center">
          <h2 className="pixel-text text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
            ROUND {passThePhone.currentRound} RESULTS
          </h2>
          {renderRoundResults(passThePhone.state, players)}
          <button onClick={handleNextRound} className="pixel-btn mt-6">
            NEXT ROUND
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // Final Results
  // =============================================
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="max-w-md w-full text-center">
        <h2 className="pixel-text text-lg mb-6" style={{ color: 'var(--color-accent)' }}>
          GAME OVER
        </h2>
        {renderFinalResults?.(passThePhone.state, players)}
        <button
          onClick={() => {
            setPhase('setup');
            setPlayers([]);
          }}
          className="pixel-btn mt-6"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
