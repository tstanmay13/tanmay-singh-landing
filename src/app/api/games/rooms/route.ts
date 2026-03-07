import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { generateRoomCode, sanitizeDisplayName, generateAvatarSeed } from '@/lib/multiplayer/roomCode';
import { toPublicPlayer, setSessionCookie } from '@/lib/multiplayer/helpers';
import type { CreateRoomRequest, CreateRoomResponse, GameRoom, GamePlayer } from '@/lib/multiplayer/types';

/**
 * POST /api/games/rooms — Create a new game room
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRoomRequest;

    // Validate required fields
    if (!body.game_id || !body.display_name) {
      return NextResponse.json(
        { error: 'game_id and display_name are required' },
        { status: 400 }
      );
    }

    const displayName = sanitizeDisplayName(body.display_name);
    if (displayName.length === 0) {
      return NextResponse.json(
        { error: 'display_name must contain at least one alphanumeric character' },
        { status: 400 }
      );
    }

    const maxPlayers = Math.min(Math.max(body.max_players ?? 8, 2), 15);
    const mode = body.mode === 'pass-the-phone' ? 'pass-the-phone' : 'online';

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }
    const sessionToken = crypto.randomUUID();

    // Generate a unique room code (retry on collision)
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      const { data: existing } = await admin
        .from('game_rooms')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique room code, please try again' },
        { status: 500 }
      );
    }

    // Create the host player first (we need the ID for host_player_id)
    // We'll use a temporary room_id and update it, but actually we need room first.
    // So create room with a placeholder host_player_id, then create player, then update.

    // Step 1: Create room with a placeholder UUID for host_player_id
    const placeholderHostId = crypto.randomUUID();
    const { data: room, error: roomError } = await admin
      .from('game_rooms')
      .insert({
        code,
        game_id: body.game_id,
        host_player_id: placeholderHostId,
        status: 'waiting',
        mode,
        settings: body.settings ?? {},
        max_players: maxPlayers,
      })
      .select()
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: 500 }
      );
    }

    // Step 2: Create the host player
    const { data: player, error: playerError } = await admin
      .from('game_players')
      .insert({
        room_id: room.id,
        display_name: displayName,
        avatar_seed: generateAvatarSeed(),
        is_host: true,
        is_ready: true,
        player_order: 0,
        session_token: sessionToken,
      })
      .select()
      .single();

    if (playerError || !player) {
      // Clean up the room if player creation fails
      await admin.from('game_rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: 'Failed to create player' },
        { status: 500 }
      );
    }

    // Step 3: Update room with the actual host_player_id
    await admin
      .from('game_rooms')
      .update({ host_player_id: player.id })
      .eq('id', room.id);

    // Step 4: Create empty game state row
    await admin.from('game_state').insert({
      room_id: room.id,
      state_data: {},
    });

    // Step 5: Set session cookie
    await setSessionCookie(sessionToken);

    // Fetch the updated room
    const { data: updatedRoom } = await admin
      .from('game_rooms')
      .select()
      .eq('id', room.id)
      .single();

    const response: CreateRoomResponse = {
      room: (updatedRoom ?? room) as GameRoom,
      player: toPublicPlayer(player as GamePlayer),
      session_token: sessionToken,
    };

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
