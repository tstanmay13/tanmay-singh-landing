import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { identifyPlayer } from '@/lib/multiplayer/helpers';
import type { GameRoom, GameState } from '@/lib/multiplayer/types';

/**
 * POST /api/games/rooms/[code]/start — Start the game (host only)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const admin = createAdminClient();

    // Fetch room
    const { data: room } = await admin
      .from('game_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const typedRoom = room as GameRoom;

    if (typedRoom.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game has already started or finished' },
        { status: 400 }
      );
    }

    // Verify caller is the host
    const player = await identifyPlayer(typedRoom.id);
    if (!player || !player.is_host) {
      return NextResponse.json(
        { error: 'Only the host can start the game' },
        { status: 403 }
      );
    }

    // Get all players
    const { data: players } = await admin
      .from('game_players')
      .select('*')
      .eq('room_id', typedRoom.id);

    if (!players || players.length < 2) {
      return NextResponse.json(
        { error: 'Not enough players (minimum 2)' },
        { status: 400 }
      );
    }

    // Randomize player order
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await admin
        .from('game_players')
        .update({ player_order: i })
        .eq('id', shuffled[i].id);
    }

    // Set room status to playing
    await admin
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', typedRoom.id);

    // Initialize game state with first player's turn
    const { data: state } = await admin
      .from('game_state')
      .update({
        state_data: {},
        current_round: 1,
        current_turn: shuffled[0].id,
        turn_started_at: new Date().toISOString(),
      })
      .eq('room_id', typedRoom.id)
      .select()
      .single();

    return NextResponse.json({ state: state as GameState });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
