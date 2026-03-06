import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function verifyAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const adminToken = process.env.BLOG_ADMIN_TOKEN;
  if (!adminToken || !token) return false;
  return token === adminToken;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabaseAdmin = createAdminClient();

    // If toggling to published and no published_at exists, set it
    if (body.is_published === true) {
      const { data: existing } = await supabaseAdmin
        .from("posts")
        .select("published_at")
        .eq("id", id)
        .single();

      if (existing && !existing.published_at) {
        body.published_at = new Date().toISOString();
      }
    }

    body.updated_at = new Date().toISOString();

    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting post:", error);
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
