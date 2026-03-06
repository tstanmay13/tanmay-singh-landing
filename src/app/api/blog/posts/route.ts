import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("posts")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: posts, count, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      posts: posts || [],
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
