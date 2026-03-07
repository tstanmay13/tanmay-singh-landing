"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import LessonCard from "@/components/learning/LessonCard";
import type { LearningCategory, LearningLesson } from "@/lib/learning/types";
import { getCategoryColor } from "@/lib/learning/utils";

/* ============================================
   SUBCOMPONENTS
   ============================================ */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="pixel-card p-5 animate-pulse">
          <div
            className="h-5 w-3/4 mb-3"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-3 w-full mb-2"
            style={{ background: "var(--color-bg-secondary)" }}
          />
          <div
            className="h-3 w-2/3 mb-4"
            style={{ background: "var(--color-bg-secondary)" }}
          />
          <div className="flex gap-2">
            <div
              className="h-5 w-16"
              style={{ background: "var(--color-bg-secondary)" }}
            />
            <div
              className="h-5 w-20"
              style={{ background: "var(--color-bg-secondary)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function CategoryArchivePage() {
  const params = useParams();
  const categorySlug = params.category as string;

  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<LearningCategory | null>(null);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch the category details
  useEffect(() => {
    if (!mounted) return;
    async function fetchCategory() {
      try {
        const res = await fetch("/api/learning/categories");
        if (!res.ok) return;
        const data = await res.json();
        const found = (data.categories || []).find(
          (c: LearningCategory) => c.slug === categorySlug
        );
        if (found) {
          setCategory(found);
          document.title = `${found.name} | Learn | Tanmay Singh`;
        }
      } catch {
        // Silently fail
      }
    }
    fetchCategory();
  }, [mounted, categorySlug]);

  // Fetch lessons for this category
  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categorySlug,
        page: String(page),
        limit: "10",
      });

      const res = await fetch(`/api/learning/lessons?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const data = await res.json();
      setLessons(data.lessons || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, page]);

  useEffect(() => {
    if (mounted) fetchLessons();
  }, [mounted, fetchLessons]);

  if (!mounted) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--color-bg)" }}
      />
    );
  }

  const color = getCategoryColor(categorySlug);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
        {/* Breadcrumb */}
        <ScrollReveal>
          <nav className="flex items-center gap-2 mb-8">
            <Link
              href="/learning"
              className="pixel-text transition-colors duration-200"
              style={{ fontSize: "0.55rem", color: "var(--color-accent)" }}
            >
              LEARNING
            </Link>
            <span
              className="pixel-text"
              style={{ fontSize: "0.55rem", color: "var(--color-text-muted)" }}
            >
              &gt;
            </span>
            <span
              className="pixel-text"
              style={{ fontSize: "0.55rem", color: "var(--color-text-secondary)" }}
            >
              {category?.name?.toUpperCase() || categorySlug.toUpperCase()}
            </span>
          </nav>
        </ScrollReveal>

        {/* Category Header */}
        <ScrollReveal delay={100}>
          <div
            className="pixel-border p-8 mb-10"
            style={{
              background: "var(--color-bg-card)",
              borderLeft: `4px solid ${color}`,
            }}
          >
            <div className="flex items-center gap-4 mb-3">
              {category && (
                <span style={{ fontSize: "2.5rem" }}>{category.icon}</span>
              )}
              <h1
                className="pixel-text text-2xl sm:text-3xl"
                style={{ color }}
              >
                {category?.name || categorySlug}
              </h1>
            </div>
            {category?.description && (
              <p
                className="mono-text text-base leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {category.description}
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Lessons */}
        {loading ? (
          <LoadingSkeleton />
        ) : lessons.length === 0 ? (
          <ScrollReveal>
            <div
              className="pixel-border p-12 text-center"
              style={{ background: "var(--color-bg-card)" }}
            >
              <pre
                className="mono-text text-xs mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
{`
    .-------.
    | ? ? ? |
    |  ---  |
    | ? ? ? |
    '-------'
`}
              </pre>
              <p
                className="pixel-text text-sm mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                NO LESSONS YET
              </p>
              <p
                className="mono-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Lessons for this category are coming soon.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons.map((lesson, i) => (
              <ScrollReveal key={lesson.id} delay={i * 80}>
                <LessonCard lesson={lesson} />
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <ScrollReveal delay={200}>
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="pixel-text text-sm transition-colors duration-200"
                style={{
                  fontSize: "0.6rem",
                  color:
                    page <= 1
                      ? "var(--color-text-muted)"
                      : "var(--color-accent)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                &lt; PREV
              </button>
              <span
                className="pixel-text"
                style={{
                  fontSize: "0.5rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                PAGE {page} OF {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="pixel-text text-sm transition-colors duration-200"
                style={{
                  fontSize: "0.6rem",
                  color:
                    page >= totalPages
                      ? "var(--color-text-muted)"
                      : "var(--color-accent)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                NEXT &gt;
              </button>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
