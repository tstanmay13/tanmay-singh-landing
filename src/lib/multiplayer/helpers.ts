import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase';
import type { GamePlayer, GameRoom, PublicPlayer } from './types';

const SESSION_COOKIE = 'game_session';

/**
 * Strip session_token from a player record for client-safe responses.
 */
export function toPublicPlayer(player: GamePlayer): PublicPlayer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session_token, ...publicFields } = player;
  return publicFields;
}

/**
 * Get session token from cookies. Returns null if not set.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Set the session cookie with the given token.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Identify the current player from the session cookie in a given room.
 * Returns null if not found.
 */
export async function identifyPlayer(roomId: string): Promise<GamePlayer | null> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('game_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('session_token', sessionToken)
    .single();

  return data as GamePlayer | null;
}

/**
 * Check if a room has expired and mark it if so.
 * Returns true if the room is expired.
 */
export async function checkRoomExpiry(room: GameRoom): Promise<boolean> {
  if (new Date(room.expires_at) < new Date()) {
    const admin = createAdminClient();
    await admin
      .from('game_rooms')
      .update({ status: 'expired' })
      .eq('id', room.id);
    return true;
  }
  return false;
}
