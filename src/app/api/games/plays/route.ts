import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("game_plays")
      .select("game_slug, play_count");

    if (error) {
      console.error("Failed to fetch play counts:", error);
      return NextResponse.json(
        { error: "Failed to fetch play counts" },
        { status: 500 }
      );
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.game_slug] = row.play_count;
    }

    return NextResponse.json(counts, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
