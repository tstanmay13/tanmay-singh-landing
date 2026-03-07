"use client";

import Link from "next/link";
import FormatBadge from "@/components/learning/FormatBadge";
import LessonContent from "@/components/learning/LessonContent";
import ReadingProgress from "@/components/learning/ReadingProgress";
import { getCategoryColor } from "@/lib/learning/utils";
import type { LearningLesson, LearningCategory } from "@/lib/learning/types";

/* ============================================
   HELPERS
   ============================================ */

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ============================================
   MAIN CLIENT COMPONENT
   ============================================ */

interface LessonPageClientProps {
  lesson: LearningLesson & { category: LearningCategory | null };
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
  categorySlug: string;
}

export default function LessonPageClient({
  lesson,
  prevLesson,
  nextLesson,
  categorySlug,
}: LessonPageClientProps) {
  const color = getCategoryColor(categorySlug);

  return (
    <div className="min-h-screen">
      <ReadingProgress color={color} />

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        {/* Back link */}
        <Link
          href={`/learning/${categorySlug}`}
          className="inline-flex items-center gap-2 mb-8 pixel-text transition-colors duration-200"
          style={{ fontSize: "0.55rem", color: "var(--color-accent)" }}
        >
          &larr; BACK TO {lesson.category?.name?.toUpperCase() || "CATEGORY"}
        </Link>

        {/* Lesson Header */}
        <header className="mb-10">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {lesson.category && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  fontFamily: "var(--font-body)",
                  color,
                  background: `color-mix(in srgb, ${color} 10%, transparent)`,
                  border: `1px solid ${color}40`,
                }}
              >
                {lesson.category.icon} {lesson.category.name}
              </span>
            )}
            <FormatBadge format={lesson.format} />
            <span
              className="mono-text text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {lesson.reading_time_minutes} min read
            </span>
            <span
              className="mono-text text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {formatDate(lesson.published_date)}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text)",
            }}
          >
            {lesson.title}
          </h1>

          {/* Excerpt */}
          {lesson.excerpt && (
            <p
              className="text-lg leading-relaxed"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-text-secondary)",
              }}
            >
              {lesson.excerpt}
            </p>
          )}
        </header>

        {/* Divider */}
        <hr className="mb-10" style={{ borderColor: "var(--color-border)" }} />

        {/* Lesson Content */}
        <article className="prose-custom">
          <LessonContent content={lesson.content} format={lesson.format} />
        </article>

        {/* Sources */}
        {lesson.sources && lesson.sources.length > 0 && (
          <>
            <hr className="my-10" style={{ borderColor: "var(--color-border)" }} />
            <div className="mb-10">
              <h3
                className="pixel-text text-sm mb-4"
                style={{ color: "var(--color-text)" }}
              >
                SOURCES
              </h3>
              <ul
                className="space-y-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {lesson.sources.map((source, i) => (
                  <li key={i} className="text-sm">
                    {source.startsWith("http") ? (
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline mono-text transition-colors duration-200 break-all"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {source}
                      </a>
                    ) : (
                      <span
                        className="mono-text"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {source}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Tags */}
        {lesson.tags && lesson.tags.length > 0 && (
          <>
            <hr className="my-10" style={{ borderColor: "var(--color-border)" }} />
            <div className="flex flex-wrap gap-2 mb-10">
              {lesson.tags.map((tag) => (
                <span
                  key={tag}
                  className="pixel-text px-2 py-0.5"
                  style={{
                    fontSize: "0.4rem",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Bottom divider */}
        <hr className="my-10" style={{ borderColor: "var(--color-border)" }} />

        {/* Previous / Next Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prevLesson ? (
            <Link
              href={`/learning/${categorySlug}/${prevLesson.slug}`}
              className="pixel-card p-4 block"
            >
              <span
                className="pixel-text block mb-2"
                style={{ fontSize: "0.45rem", color: "var(--color-text-muted)" }}
              >
                &larr; PREVIOUS
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {prevLesson.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextLesson ? (
            <Link
              href={`/learning/${categorySlug}/${nextLesson.slug}`}
              className="pixel-card p-4 block text-right"
            >
              <span
                className="pixel-text block mb-2"
                style={{ fontSize: "0.45rem", color: "var(--color-text-muted)" }}
              >
                NEXT &rarr;
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {nextLesson.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
