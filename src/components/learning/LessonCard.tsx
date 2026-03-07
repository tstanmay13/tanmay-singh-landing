import Link from "next/link";
import type { LearningLesson, LearningCategory } from "@/lib/learning/types";
import FormatBadge from "./FormatBadge";
import { getCategoryColor } from "@/lib/learning/utils";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface LessonCardProps {
  lesson: LearningLesson & { category?: LearningCategory };
}

export default function LessonCard({ lesson }: LessonCardProps) {
  const categorySlug = lesson.category?.slug || "";
  const color = getCategoryColor(categorySlug);
  const href = `/learning/${categorySlug}/${lesson.slug}`;

  return (
    <Link href={href} className="block group">
      <div
        className="pixel-card relative overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg"
        style={{
          borderLeft: `4px solid ${color}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${color}30`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        <div className="p-4 sm:p-5">
          <h3
            className="text-base sm:text-lg font-bold mb-2 line-clamp-2 transition-colors duration-200"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text)",
            }}
          >
            {lesson.title}
          </h3>

          <p
            className="text-sm mb-3 line-clamp-2 leading-relaxed"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-secondary)",
            }}
          >
            {lesson.excerpt}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <FormatBadge format={lesson.format} />
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-muted)",
              }}
            >
              {lesson.reading_time_minutes} min read
            </span>
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-muted)",
              }}
            >
              {formatDate(lesson.published_date)}
            </span>
            {lesson.category && (
              <span
                className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{
                  fontFamily: "var(--font-body)",
                  color: color,
                  background: `color-mix(in srgb, ${color} 10%, transparent)`,
                  border: `1px solid ${color}40`,
                }}
              >
                {lesson.category.icon} {lesson.category.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
