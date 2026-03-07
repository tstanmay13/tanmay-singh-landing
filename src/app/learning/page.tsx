"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import CategoryTabs from "@/components/learning/CategoryTabs";
import LessonCard from "@/components/learning/LessonCard";
import DayNavigator from "@/components/learning/DayNavigator";
import StreakCounter from "@/components/learning/StreakCounter";
import type { LearningCategory, LearningLesson } from "@/lib/learning/types";

/* ============================================
   HELPERS
   ============================================ */

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayString(): string {
  return toLocalDateString(new Date());
}

function getThirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toLocalDateString(d);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

/* ============================================
   SUBCOMPONENTS
   ============================================ */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
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

export default function LearningPage() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [todayLessons, setTodayLessons] = useState<LearningLesson[]>([]);
  const [archiveLessons, setArchiveLessons] = useState<LearningLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setMounted(true);
    document.title = "Learn Something New | Tanmay Singh";
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    if (!mounted) return;
    async function fetchCategories() {
      try {
        const res = await fetch("/api/learning/categories");
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data.categories || []);
      } catch {
        // Silently fail
      }
    }
    fetchCategories();
  }, [mounted]);

  // Fetch today's lessons when date or category changes
  const fetchTodayLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        limit: "10",
      });
      if (categoryParam) params.set("category", categoryParam);

      const res = await fetch(`/api/learning/lessons?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const data = await res.json();
      setTodayLessons(data.lessons || []);
    } catch (error) {
      console.error("Error fetching today lessons:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, categoryParam]);

  useEffect(() => {
    if (mounted) fetchTodayLessons();
  }, [mounted, fetchTodayLessons]);

  // Fetch archive lessons
  const fetchArchiveLessons = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams({
        from: getThirtyDaysAgo(),
        to: getYesterday(),
        page: String(page),
        limit: "9",
      });
      if (categoryParam) params.set("category", categoryParam);

      const res = await fetch(`/api/learning/lessons?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch archive");
      const data = await res.json();
      setArchiveLessons(data.lessons || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching archive:", error);
    } finally {
      setArchiveLoading(false);
    }
  }, [page, categoryParam]);

  useEffect(() => {
    if (mounted) fetchArchiveLessons();
  }, [mounted, fetchArchiveLessons]);

  if (!mounted) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--color-bg)" }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-8">
            <h1
              className="pixel-text text-3xl sm:text-4xl mb-4 animate-glow-pulse inline-block"
              style={{
                color: "var(--color-accent)",
                textShadow:
                  "0 0 10px var(--color-accent-glow), 0 0 30px var(--color-accent-glow)",
              }}
            >
              LEARN SOMETHING NEW
            </h1>
            <p
              className="mono-text text-lg mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Daily lessons on AI, dev career, life skills &amp; random facts
            </p>
            <StreakCounter />
          </div>
        </ScrollReveal>

        {/* Category Tabs */}
        <ScrollReveal delay={100}>
          <div className="mb-6">
            <CategoryTabs
              categories={categories}
              activeCategory={categoryParam}
            />
          </div>
        </ScrollReveal>

        {/* Day Navigator */}
        <ScrollReveal delay={150}>
          <div className="mb-8">
            <DayNavigator
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        </ScrollReveal>

        {/* Today's Lessons */}
        <ScrollReveal delay={200}>
          <div className="mb-16">
            <h2
              className="pixel-text text-lg mb-6"
              style={{ color: "var(--color-text)" }}
            >
              {selectedDate === getTodayString()
                ? "TODAY'S LESSONS"
                : "LESSONS FOR THIS DAY"}
            </h2>

            {loading ? (
              <LoadingSkeleton />
            ) : todayLessons.length === 0 ? (
              <div
                className="pixel-border p-12 text-center"
                style={{ background: "var(--color-bg-card)" }}
              >
                <pre
                  className="mono-text text-xs mb-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
{`
    .---------.
    |  |   |  |
    |  | ? |  |
    |  |   |  |
    '---------'
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
                  {selectedDate === getTodayString()
                    ? "Today's lessons are being prepared..."
                    : "No lessons were published on this day."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {todayLessons.map((lesson, i) => (
                  <ScrollReveal key={lesson.id} delay={i * 80}>
                    <LessonCard lesson={lesson} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Archive: Past 30 Days */}
        <ScrollReveal delay={300}>
          <div>
            <h2
              className="pixel-text text-lg mb-6"
              style={{ color: "var(--color-text)" }}
            >
              PAST 30 DAYS
            </h2>

            {archiveLoading ? (
              <LoadingSkeleton />
            ) : archiveLessons.length === 0 ? (
              <div
                className="pixel-border p-8 text-center"
                style={{ background: "var(--color-bg-card)" }}
              >
                <p
                  className="pixel-text text-sm mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  NO ARCHIVE LESSONS
                </p>
                <p
                  className="mono-text text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Check back as more lessons get published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {archiveLessons.map((lesson, i) => (
                  <ScrollReveal key={lesson.id} delay={i * 60}>
                    <LessonCard lesson={lesson} />
                  </ScrollReveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
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
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
