"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RepoData {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  url: string;
  homepage: string | null;
  isPrivate?: boolean;
  archived?: boolean;
}

interface CommitData {
  message: string;
  repo: string;
  sha: string;
  date: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PINNED_REPOS = ["tanmay-singh-landing"];

type SortOption = "stars" | "updated" | "name";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Most Stars", value: "stars" },
  { label: "Recently Updated", value: "updated" },
  { label: "Name A-Z", value: "name" },
];

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Ruby: "#701516",
  "C++": "#f34b7d",
  C: "#555555",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  PHP: "#4F5D95",
  Lua: "#000080",
  Jupyter: "#F37626",
  "Jupyter Notebook": "#DA5B0B",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="pixel-card rounded-lg p-6 animate-pulse">
      <div
        className="h-4 w-2/3 rounded mb-4"
        style={{ backgroundColor: "var(--color-surface)" }}
      />
      <div
        className="h-3 w-full rounded mb-2"
        style={{ backgroundColor: "var(--color-surface)" }}
      />
      <div
        className="h-3 w-4/5 rounded mb-6"
        style={{ backgroundColor: "var(--color-surface)" }}
      />
      <div className="flex gap-2 mb-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-5 w-14 rounded"
            style={{ backgroundColor: "var(--color-surface)" }}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <div
          className="h-3 w-8 rounded"
          style={{ backgroundColor: "var(--color-surface)" }}
        />
        <div
          className="h-3 w-8 rounded"
          style={{ backgroundColor: "var(--color-surface)" }}
        />
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div
        className="w-2 h-2 rounded-full mt-2 shrink-0"
        style={{ backgroundColor: "var(--color-surface)" }}
      />
      <div className="flex-1">
        <div
          className="h-3 w-3/4 rounded mb-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        />
        <div
          className="h-2 w-1/3 rounded"
          style={{ backgroundColor: "var(--color-surface)" }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LanguageDot({ language }: { language: string }) {
  const color = LANGUAGE_COLORS[language] || "var(--color-text-muted)";
  return (
    <span
      className="inline-block w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function StatsBar({ repos }: { repos: RepoData[] }) {
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);

  const langCount: Record<string, number> = {};
  for (const r of repos) {
    if (r.language) {
      langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
  }
  const topLanguage =
    Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const stats = [
    { label: "Repos", value: repos.length },
    { label: "Stars", value: totalStars },
    { label: "Top Lang", value: topLanguage },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-5 mb-10">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="pixel-card rounded-lg px-4 py-5 text-center"
        >
          <p
            className="pixel-text text-lg md:text-2xl mb-1"
            style={{ color: "var(--color-accent)" }}
          >
            {stat.value}
          </p>
          <p
            className="pixel-text text-[8px] md:text-[10px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function RepoCard({
  repo,
  featured = false,
}: {
  repo: RepoData;
  featured?: boolean;
}) {
  return (
    <div
      className={`pixel-card rounded-lg p-6 h-full flex flex-col ${
        featured ? "pixel-border-accent" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <h3
          className="pixel-text text-xs md:text-sm flex-1 mr-2"
          style={{ color: "var(--color-text)" }}
        >
          {repo.isPrivate && (
            <span title="Private repo" className="mr-1">&#128274;</span>
          )}
          {repo.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.isPrivate && (
            <span
              className="pixel-text text-[8px] px-2 py-1 rounded-sm border"
              style={{
                color: "var(--color-purple)",
                backgroundColor: "rgba(168, 85, 247, 0.1)",
                borderColor: "var(--color-purple)",
              }}
            >
              PRIVATE
            </span>
          )}
          {featured && (
            <span
              className="pixel-text text-[8px] px-2 py-1 rounded-sm border"
              style={{
                color: "var(--color-accent)",
                backgroundColor: "rgba(0, 255, 136, 0.1)",
                borderColor: "var(--color-accent)",
              }}
            >
              PINNED
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        className="text-sm leading-relaxed mb-4 flex-grow"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {repo.description || "No description"}
      </p>

      {/* Language + Stats row */}
      <div className="flex items-center flex-wrap gap-4 mb-4">
        {repo.language && (
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <LanguageDot language={repo.language} />
            {repo.language}
          </span>
        )}
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>&#9733;</span> {repo.stars}
        </span>
        {repo.forks > 0 && (
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>&#9906;</span> {repo.forks}
          </span>
        )}
        <span
          className="text-xs ml-auto"
          style={{ color: "var(--color-text-muted)" }}
        >
          {relativeTime(repo.updatedAt)}
        </span>
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {repo.topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="mono-text text-[10px] px-2 py-0.5 rounded-sm"
              style={{
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex gap-3 mt-auto">
        {!repo.isPrivate && (
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-text text-[9px] px-3 py-2 border-2 transition-all duration-200"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-text)";
              e.currentTarget.style.color = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            GitHub
          </a>
        )}
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-text text-[9px] px-3 py-2 border-2 transition-all duration-200"
            style={{
              borderColor: "var(--color-accent)",
              color: "var(--color-accent)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-accent)";
              e.currentTarget.style.color = "var(--color-bg)";
              e.currentTarget.style.boxShadow =
                "0 0 15px var(--color-accent-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-accent)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Live
          </a>
        )}
      </div>
    </div>
  );
}

function ActivityFeed({ commits }: { commits: CommitData[] }) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div
        className="absolute left-[5px] top-2 bottom-2 w-[2px]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, var(--color-accent) 0px, var(--color-accent) 4px, transparent 4px, transparent 8px)",
        }}
      />

      <div className="flex flex-col gap-4">
        {commits.map((commit, i) => (
          <a
            key={`${commit.sha}-${i}`}
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 group pl-0 transition-colors duration-200"
          >
            {/* Dot */}
            <div
              className="w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 transition-all duration-200 z-10"
              style={{
                borderColor: "var(--color-accent)",
                backgroundColor: "var(--color-bg-card)",
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="mono-text text-xs leading-relaxed transition-colors duration-200"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span
                  className="group-hover:underline"
                  style={{ color: "var(--color-text)" }}
                >
                  {truncate(commit.message.split("\n")[0], 60)}
                </span>
              </p>
              <p
                className="mono-text text-[10px] mt-0.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                {commit.repo} &middot; {relativeTime(commit.date)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [reposFallback, setReposFallback] = useState(false);
  const [activityFallback, setActivityFallback] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortOption>("stars");

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch repos
  useEffect(() => {
    fetch("/api/portfolio/repos")
      .then((r) => r.json())
      .then((data) => {
        setRepos(data.repos);
        setReposFallback(data.fallback);
      })
      .catch(() => setReposFallback(true))
      .finally(() => setReposLoading(false));
  }, []);

  // Fetch activity
  useEffect(() => {
    fetch("/api/portfolio/activity")
      .then((r) => r.json())
      .then((data) => {
        setCommits(data.commits);
        setActivityFallback(data.fallback);
      })
      .catch(() => setActivityFallback(true))
      .finally(() => setActivityLoading(false));
  }, []);

  // Derived data
  const languages = useMemo(() => {
    const langs = new Set<string>();
    for (const r of repos) {
      if (r.language) langs.add(r.language);
    }
    return Array.from(langs).sort();
  }, [repos]);

  const pinnedRepos = useMemo(
    () => repos.filter((r) => PINNED_REPOS.includes(r.name)),
    [repos]
  );

  const filteredAndSorted = useMemo(() => {
    let result = repos.filter((r) => !PINNED_REPOS.includes(r.name));

    if (languageFilter !== "All") {
      result = result.filter((r) => r.language === languageFilter);
    }

    switch (sortBy) {
      case "stars":
        result.sort((a, b) => b.stars - a.stars);
        break;
      case "updated":
        result.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [repos, languageFilter, sortBy]);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <p
          className="pixel-text text-sm animate-flicker"
          style={{ color: "var(--color-accent)" }}
        >
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Background pattern */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 md:py-16">
        {/* Back link */}
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 pixel-text text-xs mb-10 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            <span>&lt;-</span>
            <span>HOME</span>
          </Link>
        </ScrollReveal>

        {/* Header */}
        <ScrollReveal delay={100}>
          <header className="text-center mb-12 md:mb-16">
            <h1
              className="pixel-text text-3xl md:text-5xl mb-4 animate-flicker"
              style={{
                color: "var(--color-accent)",
                textShadow:
                  "0 0 20px var(--color-accent-glow), 0 0 40px var(--color-accent-glow)",
              }}
            >
              PORTFOLIO
            </h1>
            <p
              className="text-lg md:text-xl"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Projects &amp; Creations
            </p>
            <div
              className="mx-auto mt-6 h-[2px] w-24"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
              }}
            />
          </header>
        </ScrollReveal>

        {/* Stats Bar */}
        {!reposLoading && repos.length > 0 && (
          <ScrollReveal delay={150}>
            <StatsBar repos={repos} />
          </ScrollReveal>
        )}

        {/* Fallback notice */}
        {reposFallback && !reposLoading && (
          <div
            className="pixel-card rounded-lg px-4 py-3 mb-6 text-center"
            style={{ borderColor: "var(--color-orange)" }}
          >
            <p
              className="mono-text text-xs"
              style={{ color: "var(--color-orange)" }}
            >
              Could not reach GitHub API. Showing cached data.
            </p>
          </div>
        )}

        {/* Pinned / Featured */}
        {!reposLoading && pinnedRepos.length > 0 && (
          <ScrollReveal delay={200}>
            <section className="mb-10">
              <h2
                className="pixel-text text-xs mb-5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {"// PINNED"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pinnedRepos.map((repo) => (
                  <RepoCard key={repo.name} repo={repo} featured />
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* Filters + Sort */}
        <ScrollReveal delay={250}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            {/* Language filter pills */}
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setLanguageFilter("All")}
                className="pixel-text text-[10px] px-3 py-1.5 transition-all duration-200 border-2"
                style={{
                  borderColor:
                    languageFilter === "All"
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                  backgroundColor:
                    languageFilter === "All"
                      ? "var(--color-accent)"
                      : "transparent",
                  color:
                    languageFilter === "All"
                      ? "var(--color-bg)"
                      : "var(--color-text-secondary)",
                }}
              >
                All
              </button>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguageFilter(lang)}
                  className="pixel-text text-[10px] px-3 py-1.5 transition-all duration-200 border-2 flex items-center gap-1.5"
                  style={{
                    borderColor:
                      languageFilter === lang
                        ? "var(--color-accent)"
                        : "var(--color-border)",
                    backgroundColor:
                      languageFilter === lang
                        ? "var(--color-accent)"
                        : "transparent",
                    color:
                      languageFilter === lang
                        ? "var(--color-bg)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  <LanguageDot language={lang} />
                  {lang}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <span
                className="pixel-text text-[9px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                SORT:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pixel-text text-[10px] px-3 py-1.5 border-2 bg-transparent cursor-pointer"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-bg-card)",
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* Projects Grid */}
        <section className="mb-16">
          <h2
            className="pixel-text text-xs mb-5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {"// ALL PROJECTS"}
          </h2>

          {reposLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-16">
              <p
                className="pixel-text text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                No projects match this filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndSorted.map((repo, index) => (
                <ScrollReveal key={repo.name} delay={80 + index * 50}>
                  <RepoCard repo={repo} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <ScrollReveal delay={200}>
          <section className="mb-16">
            <h2
              className="pixel-text text-xs mb-5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {"// RECENT ACTIVITY"}
            </h2>

            {activityFallback && !activityLoading && (
              <div
                className="pixel-card rounded-lg px-4 py-3 mb-4 text-center"
                style={{ borderColor: "var(--color-orange)" }}
              >
                <p
                  className="mono-text text-xs"
                  style={{ color: "var(--color-orange)" }}
                >
                  Could not load recent activity.
                </p>
              </div>
            )}

            <div
              className="pixel-card rounded-lg p-6 max-h-[400px] overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
              }}
            >
              {activityLoading ? (
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <ActivitySkeleton key={i} />
                  ))}
                </div>
              ) : commits.length === 0 ? (
                <p
                  className="pixel-text text-xs text-center py-6"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No recent activity.
                </p>
              ) : (
                <ActivityFeed commits={commits} />
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* Bottom CTA */}
        <ScrollReveal delay={300}>
          <div className="text-center mt-16 md:mt-20">
            <div className="inline-block pixel-card rounded-lg px-8 py-8 md:px-12">
              <p
                className="pixel-text text-sm md:text-base mb-6"
                style={{ color: "var(--color-text)" }}
              >
                Want to collaborate?
              </p>
              <Link href="/contact" className="pixel-btn inline-block">
                Get in Touch
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer spacer */}
        <div className="h-10" />
      </div>
    </div>
  );
}
