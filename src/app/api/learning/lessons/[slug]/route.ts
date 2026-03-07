import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const { data: lesson, error } = await supabase
      .from("learning_lessons")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Fetch the category for this lesson
    const { data: category } = await supabase
      .from("learning_categories")
      .select("*")
      .eq("id", lesson.category_id)
      .single();

    // Fetch previous lesson (closest earlier published_date in same category)
    const { data: prevLesson } = await supabase
      .from("learning_lessons")
      .select("slug, title")
      .eq("category_id", lesson.category_id)
      .eq("is_published", true)
      .lt("published_date", lesson.published_date)
      .order("published_date", { ascending: false })
      .limit(1)
      .single();

    // Fetch next lesson (closest later published_date in same category)
    const { data: nextLesson } = await supabase
      .from("learning_lessons")
      .select("slug, title")
      .eq("category_id", lesson.category_id)
      .eq("is_published", true)
      .gt("published_date", lesson.published_date)
      .order("published_date", { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      lesson: { ...lesson, category: category || null },
      prevLesson: prevLesson || null,
      nextLesson: nextLesson || null,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
