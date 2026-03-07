import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { sanitizeDisplayName, generateAvatarSeed } from '@/lib/multiplayer/roomCode';
import { toPublicPlayer, setSessionCookie, getSessionToken, checkRoomExpiry } from '@/lib/multiplayer/helpers';
import type { JoinRoomRequest, JoinRoomResponse, GameRoom, GamePlayer } from '@/lib/multiplayer/types';

/**
 * POST /api/games/rooms/[code]/join — Join an existing room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = (await request.json()) as JoinRoomRequest;

    if (!body.display_name) {
      return NextResponse.json(
        { error: 'display_name is required' },
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

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }

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

    // Check room is in waiting state
    if (typedRoom.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game already in progress' },
        { status: 409 }
      );
    }

    // Check if player is already in room (rejoin via session cookie)
    const existingSessionToken = await getSessionToken();
    if (existingSessionToken) {
      const { data: existingPlayer } = await admin
        .from('game_players')
        .select('*')
        .eq('room_id', typedRoom.id)
        .eq('session_token', existingSessionToken)
        .single();

      if (existingPlayer) {
        // Rejoin: mark as connected
        await admin
          .from('game_players')
          .update({ is_connected: true, disconnected_at: null, last_seen: new Date().toISOString() })
          .eq('id', existingPlayer.id);

        const { data: allPlayers } = await admin
          .from('game_players')
          .select('*')
          .eq('room_id', typedRoom.id)
          .order('player_order', { ascending: true });

        const response: JoinRoomResponse = {
          room: typedRoom,
          player: toPublicPlayer(existingPlayer as GamePlayer),
          players: ((allPlayers ?? []) as GamePlayer[]).map(toPublicPlayer),
          session_token: existingSessionToken,
        };

        return NextResponse.json(response);
      }
    }

    // Check room is not full
    const { count } = await admin
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', typedRoom.id);

    if ((count ?? 0) >= typedRoom.max_players) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 409 }
      );
    }

    // Create new player
    const sessionToken = crypto.randomUUID();
    const { data: player, error: playerError } = await admin
      .from('game_players')
      .insert({
        room_id: typedRoom.id,
        display_name: displayName,
        avatar_seed: generateAvatarSeed(),
        is_host: false,
        player_order: (count ?? 0),
        session_token: sessionToken,
      })
      .select()
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500 }
      );
    }

    // Set session cookie
    await setSessionCookie(sessionToken);

    // Fetch all players
    const { data: allPlayers } = await admin
      .from('game_players')
      .select('*')
      .eq('room_id', typedRoom.id)
      .order('player_order', { ascending: true });

    const response: JoinRoomResponse = {
      room: typedRoom,
      player: toPublicPlayer(player as GamePlayer),
      players: ((allPlayers ?? []) as GamePlayer[]).map(toPublicPlayer),
      session_token: sessionToken,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
