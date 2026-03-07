import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { identifyPlayer } from '@/lib/multiplayer/helpers';
import type { GameRoom } from '@/lib/multiplayer/types';

/**
 * POST /api/games/rooms/[code]/leave — Leave a room (player identified by session cookie)
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

    // Identify player from session cookie
    const player = await identifyPlayer(typedRoom.id);
    if (!player) {
      return NextResponse.json(
        { error: 'You are not in this room' },
        { status: 403 }
      );
    }

    // Delete the player
    await admin
      .from('game_players')
      .delete()
      .eq('id', player.id);

    // If player was host, transfer host to the oldest remaining player
    if (player.is_host) {
      const { data: remainingPlayers } = await admin
        .from('game_players')
        .select('*')
        .eq('room_id', typedRoom.id)
        .order('joined_at', { ascending: true })
        .limit(1);

      if (remainingPlayers && remainingPlayers.length > 0) {
        const newHost = remainingPlayers[0];
        await admin
          .from('game_players')
          .update({ is_host: true })
          .eq('id', newHost.id);

        await admin
          .from('game_rooms')
          .update({ host_player_id: newHost.id })
          .eq('id', typedRoom.id);
      } else {
        // No players left — expire the room
        await admin
          .from('game_rooms')
          .update({ status: 'expired' })
          .eq('id', typedRoom.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
