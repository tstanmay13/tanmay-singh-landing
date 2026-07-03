import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Writing — Tanmay Singh",
  description:
    "Long-form engineering writing. Few pieces, real systems, no filler.",
};

// One entry per essay. This is a hand-maintained list on purpose:
// the old database-backed blog died with its database (see CLAUDE.md),
// and a static page cannot be idle-deleted.
const ESSAYS = [
  {
    slug: "regeneration-is-a-rebase",
    title: "REGENERATION IS A REBASE",
    blurb:
      "What building a merge engine for generated code taught me about trusting git history.",
    date: "July 2026",
  },
];

export default function WritingIndex() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1
          className="pixel-text text-xl sm:text-2xl mb-4"
          style={{ color: "var(--color-accent)" }}
        >
          {"//"} WRITING
        </h1>
        <p
          className="mono-text text-sm mb-10"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Long-form pieces about systems I built. Few of them, on purpose.
        </p>

        <div className="flex flex-col gap-5">
          {ESSAYS.map((essay) => (
            <Link
              key={essay.slug}
              href={`/writing/${essay.slug}`}
              className="pixel-card block p-6"
            >
              <h2
                className="pixel-text text-sm mb-3"
                style={{ color: "var(--color-text)" }}
              >
                {essay.title}
              </h2>
              <p
                className="text-sm leading-relaxed mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {essay.blurb}
              </p>
              <span
                className="mono-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {essay.date}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
