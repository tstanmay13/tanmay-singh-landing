import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid slug" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("increment_play_count", {
      slug_param: slug,
    });

    if (error) {
      console.error("Failed to increment play count:", error);
      return NextResponse.json(
        { error: "Failed to record play" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
