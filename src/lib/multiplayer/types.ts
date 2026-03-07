// ============================================
// Multiplayer Game Infrastructure - Type Definitions
// ============================================

// ============================================
// Constants
// ============================================

/** Unambiguous uppercase characters for room codes (excludes 0/O, 1/I/L, S/5) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
export const ROOM_CODE_LENGTH = 6;

// ============================================
// Database row types
// ============================================

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'expired';
export type GameMode = 'online' | 'pass-the-phone';

export interface GameRoom {
  id: string;
  code: string;
  game_id: string;
  host_player_id: string;
  status: RoomStatus;
  mode: GameMode;
  settings: Record<string, unknown>;
  max_players: number;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  display_name: string;
  avatar_seed: string;
  is_host: boolean;
  is_ready: boolean;
  is_connected: boolean;
  player_order: number | null;
  session_token: string;
  score: number;
  joined_at: string;
  last_seen: string;
  disconnected_at: string | null;
}

/** Client-safe player (no session_token exposed) */
export type PublicPlayer = Omit<GamePlayer, 'session_token'>;

export interface GameState {
  id: string;
  room_id: string;
  current_round: number;
  current_turn: string | null;
  turn_started_at: string | null;
  state_data: Record<string, unknown>;
  version: number;
  updated_at: string;
}

// ============================================
// API request / response types
// ============================================

export interface CreateRoomRequest {
  game_id: string;
  display_name: string;
  mode?: GameMode;
  settings?: Record<string, unknown>;
  max_players?: number;
}

export interface CreateRoomResponse {
  room: GameRoom;
  player: PublicPlayer;
  session_token: string;
}

export interface JoinRoomRequest {
  display_name: string;
}

export interface JoinRoomResponse {
  room: GameRoom;
  player: PublicPlayer;
  players: PublicPlayer[];
  session_token: string;
}

export interface RoomInfoResponse {
  room: GameRoom;
  players: PublicPlayer[];
  state: GameState | null;
}

export interface UpdateStateRequest {
  state_data: Record<string, unknown>;
  expected_version: number;
}

export interface GameAction {
  type: string;
  payload: Record<string, unknown>;
  player_id: string;
  timestamp: number;
}

// ============================================
// Realtime event types (Supabase Broadcast)
// ============================================

export type RealtimeEvent =
  | { type: 'player_joined'; player: PublicPlayer }
  | { type: 'player_left'; player_id: string }
  | { type: 'player_ready'; player_id: string; is_ready: boolean }
  | { type: 'player_disconnected'; player_id: string }
  | { type: 'player_reconnected'; player_id: string }
  | { type: 'game_started'; state: GameState }
  | { type: 'game_action'; action: GameAction }
  | { type: 'state_update'; state: GameState }
  | { type: 'turn_changed'; player_id: string; round: number }
  | { type: 'game_finished'; final_scores: Record<string, number> }
  | { type: 'player_kicked'; player_id: string }
  | { type: 'host_changed'; new_host_id: string }
  | { type: 'settings_changed'; settings: Record<string, unknown> }
  | { type: 'chat_message'; player_id: string; message: string; timestamp: number };

// ============================================
// Game phase (generic for per-game customization)
// ============================================

export type GamePhase<T extends string = string> = T;

// ============================================
// Game configuration interface
// ============================================

export interface MultiplayerGameConfig {
  game_id: string;
  display_name: string;
  description: string;
  min_players: number;
  max_players: number;
  supports_online: boolean;
  supports_pass_the_phone: boolean;
  default_settings: Record<string, unknown>;
}

// ============================================
// Game adapter interface (each multiplayer game implements this)
// ============================================

export interface MultiplayerGameAdapter<TState = Record<string, unknown>> {
  /** Unique game identifier matching games array */
  gameId: string;

  /** Default game settings */
  defaultSettings: Record<string, unknown>;

  /** Min/max players for this game */
  minPlayers: number;
  maxPlayers: number;

  /** Create initial state when game starts */
  createInitialState(players: PublicPlayer[], settings: Record<string, unknown>): TState;

  /** Validate and apply a game action, return new state or throw */
  applyAction(state: TState, action: GameAction, players: PublicPlayer[]): TState;

  /** Check if the game is over */
  isGameOver(state: TState): boolean;

  /** Get final scores from finished state */
  getFinalScores(state: TState, players: PublicPlayer[]): Record<string, number>;

  /** Get whose turn it is (null for simultaneous games) */
  getCurrentTurn(state: TState, players: PublicPlayer[]): string | null;
}

// ============================================
// Hook return types
// ============================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
