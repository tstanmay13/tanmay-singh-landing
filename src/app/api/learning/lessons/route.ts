import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10") || 10));
    const category = searchParams.get("category");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const offset = (page - 1) * limit;

    // If filtering by category slug, look up the category_id first
    let categoryId: string | null = null;
    if (category) {
      const { data: cat, error: catError } = await supabase
        .from("learning_categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (catError || !cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      categoryId = cat.id;
    }

    let query = supabase
      .from("learning_lessons")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("published_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (date) {
      query = query.eq("published_date", date);
    }

    if (from) {
      query = query.gte("published_date", from);
    }

    if (to) {
      query = query.lte("published_date", to);
    }

    const { data: lessons, count, error } = await query;

    if (error) {
      console.error("Error fetching lessons:", error);
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
    }

    // Fetch all categories to map onto lessons
    const categoryIds = [...new Set((lessons || []).map((l) => l.category_id))];
    let categoriesMap: Record<string, unknown> = {};

    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from("learning_categories")
        .select("*")
        .in("id", categoryIds);

      if (categories) {
        categoriesMap = Object.fromEntries(categories.map((c) => [c.id, c]));
      }
    }

    const lessonsWithCategory = (lessons || []).map((lesson) => ({
      ...lesson,
      category: categoriesMap[lesson.category_id] || null,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      lessons: lessonsWithCategory,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
