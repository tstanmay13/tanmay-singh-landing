import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function verifyAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const adminToken = process.env.BLOG_ADMIN_TOKEN;
  if (!adminToken || !token) return false;
  return token === adminToken;
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, excerpt, tags, cover_image_url, is_published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "title, slug, and content are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const postData: Record<string, unknown> = {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      tags: tags || null,
      cover_image_url: cover_image_url || null,
      is_published: is_published || false,
    };

    if (is_published) {
      postData.published_at = new Date().toISOString();
    }

    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
