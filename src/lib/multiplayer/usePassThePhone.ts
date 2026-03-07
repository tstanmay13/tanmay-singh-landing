'use client';

import { useState, useCallback, useMemo } from 'react';
import type { PublicPlayer } from './types';

interface UsePassThePhoneReturn<TState> {
  /** Current player whose turn it is */
  currentPlayer: PublicPlayer;
  /** Index in rotation */
  currentPlayerIndex: number;
  /** Whether the privacy screen is showing */
  isPrivacyScreen: boolean;
  /** Current round */
  currentRound: number;
  /** Local game state (managed entirely client-side) */
  state: TState;
  /** Advance to next player (shows privacy screen) */
  endTurn: (updatedState: TState) => void;
  /** Dismiss privacy screen (called by next player) */
  confirmReady: () => void;
  /** Check if all players have had their turn this round */
  isRoundComplete: boolean;
  /** Advance to next round (resets turn index to 0) */
  nextRound: () => void;
  /** All players in order */
  allPlayers: PublicPlayer[];
}

export function usePassThePhone<TState>(
  players: PublicPlayer[],
  initialState: TState
): UsePassThePhoneReturn<TState> {
  const [state, setState] = useState<TState>(initialState);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isPrivacyScreen, setIsPrivacyScreen] = useState(true); // start with privacy screen for first player
  const [currentRound, setCurrentRound] = useState(1);
  const [turnsTakenThisRound, setTurnsTakenThisRound] = useState(0);

  const currentPlayer = useMemo(
    () => players[currentPlayerIndex],
    [players, currentPlayerIndex]
  );

  const isRoundComplete = turnsTakenThisRound >= players.length;

  const endTurn = useCallback(
    (updatedState: TState) => {
      setState(updatedState);
      setTurnsTakenThisRound((prev) => prev + 1);

      // Move to next player (wrap around)
      const nextIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextIndex);
      setIsPrivacyScreen(true);
    },
    [currentPlayerIndex, players.length]
  );

  const confirmReady = useCallback(() => {
    setIsPrivacyScreen(false);
  }, []);

  const nextRound = useCallback(() => {
    setCurrentRound((prev) => prev + 1);
    setTurnsTakenThisRound(0);
    setCurrentPlayerIndex(0);
    setIsPrivacyScreen(true);
  }, []);

  return {
    currentPlayer,
    currentPlayerIndex,
    isPrivacyScreen,
    currentRound,
    state,
    endTurn,
    confirmReady,
    isRoundComplete,
    nextRound,
    allPlayers: players,
  };
}
