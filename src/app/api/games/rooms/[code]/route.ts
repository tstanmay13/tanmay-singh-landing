import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { toPublicPlayer, checkRoomExpiry } from '@/lib/multiplayer/helpers';
import type { GameRoom, GamePlayer, GameState, RoomInfoResponse } from '@/lib/multiplayer/types';

/**
 * GET /api/games/rooms/[code] — Get room info + players + state
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const admin = createAdminClient();

    // Fetch room
    const { data: room, error: roomError } = await admin
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

    // Check expiry
    if (typedRoom.status === 'expired' || (await checkRoomExpiry(typedRoom))) {
      return NextResponse.json(
        { error: 'Room has expired' },
        { status: 410 }
      );
    }

    // Fetch players
    const { data: players } = await admin
      .from('game_players')
      .select('*')
      .eq('room_id', typedRoom.id)
      .order('player_order', { ascending: true });

    // Fetch state
    const { data: state } = await admin
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
