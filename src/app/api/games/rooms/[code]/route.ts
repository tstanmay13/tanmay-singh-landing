import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAdminClient } from '@/lib/supabase';
import { toPublicPlayer } from '@/lib/multiplayer/helpers';
import type { GameRoom, GamePlayer, GameState, RoomInfoResponse } from '@/lib/multiplayer/types';

/**
 * GET /api/games/rooms/[code] — Get room info + players + state
 * Uses the public (anon) client since RLS allows SELECT on non-expired rooms.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Use public client — RLS policy filters out expired rooms on SELECT
    const db = supabase;

    // Fetch room
    const { data: room, error: roomError } = await db
      .from('game_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const typedRoom = room as GameRoom;

    // Check expiry (mark expired if past expires_at)
    if (new Date(typedRoom.expires_at) < new Date()) {
      // Need admin client to write the expiry update
      try {
        const admin = createAdminClient();
        await admin
          .from('game_rooms')
          .update({ status: 'expired' })
          .eq('id', typedRoom.id);
      } catch {
        // If admin client unavailable, still report the room as expired
      }
      return NextResponse.json(
        { error: 'Room has expired' },
        { status: 410 }
      );
    }

    // Fetch players
    const { data: players } = await db
      .from('game_players')
      .select('*')
      .eq('room_id', typedRoom.id)
      .order('player_order', { ascending: true });

    // Fetch state
    const { data: state } = await db
      .from('game_state')
      .select('*')
      .eq('room_id', typedRoom.id)
      .single();

    const response: RoomInfoResponse = {
      room: typedRoom,
      players: ((players ?? []) as GamePlayer[]).map(toPublicPlayer),
      state: (state as GameState) ?? null,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
