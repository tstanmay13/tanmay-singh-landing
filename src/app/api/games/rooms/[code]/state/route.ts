import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { identifyPlayer } from '@/lib/multiplayer/helpers';
import type { GameRoom, GameState, UpdateStateRequest } from '@/lib/multiplayer/types';

/**
 * GET /api/games/rooms/[code]/state — Get current game state
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const admin = createAdminClient();

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

    const { data: state } = await admin
      .from('game_state')
      .select('*')
      .eq('room_id', room.id)
      .single();

    if (!state) {
      return NextResponse.json(
        { error: 'Game state not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ state: state as GameState });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/games/rooms/[code]/state — Update game state with optimistic concurrency
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = (await request.json()) as UpdateStateRequest;

    if (!body.state_data || body.expected_version === undefined) {
      return NextResponse.json(
        { error: 'state_data and expected_version are required' },
        { status: 400 }
      );
    }

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

    // Verify player is in this room
    const player = await identifyPlayer(typedRoom.id);
    if (!player) {
      return NextResponse.json(
        { error: 'You are not in this room' },
        { status: 403 }
      );
    }

    // Optimistic concurrency: update only if version matches
    const { data: updatedState, error: updateError } = await admin
      .from('game_state')
      .update({ state_data: body.state_data })
      .eq('room_id', typedRoom.id)
      .eq('version', body.expected_version)
      .select()
      .single();

    if (updateError || !updatedState) {
      return NextResponse.json(
        { error: 'State version conflict, refresh and retry' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      state: updatedState as GameState,
      version: (updatedState as GameState).version,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
