import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { LearningLesson, LearningCategory } from "@/lib/learning/types";
import LessonPageClient from "./LessonPageClient";

/* ============================================
   TYPES
   ============================================ */

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

/* ============================================
   DATA FETCHING
   ============================================ */

async function getLesson(slug: string) {
  const { data: lesson, error } = await supabase
    .from("learning_lessons")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !lesson) return null;

  // Fetch the category
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

  return {
    lesson: { ...lesson, category: category || null } as LearningLesson & {
      category: LearningCategory | null;
    },
    prevLesson: prevLesson as { slug: string; title: string } | null,
    nextLesson: nextLesson as { slug: string; title: string } | null,
  };
}

/* ============================================
   METADATA
   ============================================ */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLesson(slug);

  if (!data) {
    return { title: "Lesson Not Found | Learn | Tanmay Singh" };
  }

  return {
    title: `${data.lesson.title} | Learn | Tanmay Singh`,
    description: data.lesson.excerpt,
    openGraph: {
      title: data.lesson.title,
      description: data.lesson.excerpt,
      type: "article",
      publishedTime: data.lesson.published_date,
    },
  };
}

/* ============================================
   SERVER COMPONENT
   ============================================ */

export default async function LessonPage({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  const data = await getLesson(slug);

  if (!data) {
    notFound();
  }

  return (
    <LessonPageClient
      lesson={data.lesson}
      prevLesson={data.prevLesson}
      nextLesson={data.nextLesson}
      categorySlug={categorySlug}
    />
  );
}
