"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import type { Post } from "@/lib/supabase";

/* ============================================
   HELPERS
   ============================================ */

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ============================================
   SUBCOMPONENTS
   ============================================ */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="pixel-card p-6 animate-pulse"
        >
          <div
            className="h-4 w-3/4 mb-4"
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
              className="h-5 w-16"
              style={{ background: "var(--color-bg-secondary)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TagPill({
  tag,
  active,
  onClick,
}: {
  tag: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pixel-text px-3 py-1.5 transition-all duration-200"
      style={{
        fontSize: "0.5rem",
        color: active ? "var(--color-bg)" : "var(--color-accent)",
        background: active ? "var(--color-accent)" : "transparent",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      {tag}
    </button>
  );
}

function PostCard({ post }: { post: Post }) {
  const readingTime = estimateReadingTime(post.content);

  return (
    <Link href={`/blog/${post.slug}`} className="pixel-card block p-6 h-full">
      <div className="flex items-center justify-between mb-3">
        <span
          className="pixel-text"
          style={{ fontSize: "0.45rem", color: "var(--color-text-muted)" }}
        >
          {post.published_at ? formatDate(post.published_at) : "Draft"}
        </span>
        <span
          className="mono-text text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {readingTime} min read
        </span>
      </div>

      <h3
        className="pixel-text text-sm mb-3 leading-relaxed"
        style={{ color: "var(--color-text)" }}
      >
        {post.title}
      </h3>

      {post.excerpt && (
        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {post.excerpt}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(post.tags || []).map((tag) => (
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

      <span
        className="pixel-btn inline-block"
        style={{ fontSize: "0.5rem", padding: "0.5rem 1rem" }}
      >
        READ MORE &rarr;
      </span>
    </Link>
  );
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (activeTag) params.set("tag", activeTag);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/blog/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();

      setPosts(data.posts);
      setTotalPages(data.totalPages);

      // Extract unique tags from returned posts for filter pills
      const tags = new Set<string>();
      data.posts.forEach((p: Post) => {
        (p.tags || []).forEach((t: string) => tags.add(t));
      });
      // Only update allTags on first load or when no filter active
      if (!activeTag && page === 1) {
        setAllTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, [page, activeTag, search]);

  useEffect(() => {
    if (mounted) {
      fetchPosts();
    }
  }, [mounted, fetchPosts]);

  // Also fetch all tags on mount for filter pills
  useEffect(() => {
    if (!mounted) return;
    const fetchAllTags = async () => {
      try {
        const res = await fetch("/api/blog/posts?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        const tags = new Set<string>();
        data.posts.forEach((p: Post) => {
          (p.tags || []).forEach((t: string) => tags.add(t));
        });
        setAllTags(Array.from(tags).sort());
      } catch {
        // Silently fail - tags are optional
      }
    };
    fetchAllTags();
  }, [mounted]);

  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

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
          <div className="text-center mb-12">
            <h1
              className="pixel-text text-3xl sm:text-4xl mb-4 animate-glow-pulse inline-block"
              style={{
                color: "var(--color-accent)",
                textShadow:
                  "0 0 10px var(--color-accent-glow), 0 0 30px var(--color-accent-glow)",
              }}
            >
              BLOG
            </h1>
            <p
              className="mono-text text-lg"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Thoughts, Tutorials &amp; Tales
            </p>
          </div>
        </ScrollReveal>

        {/* Search */}
        <ScrollReveal delay={100}>
          <form onSubmit={handleSearchSubmit} className="mb-6">
            <div
              className="pixel-border flex items-center"
              style={{ background: "var(--color-bg-card)" }}
            >
              <span
                className="px-4 mono-text text-sm"
                style={{ color: "var(--color-accent)" }}
              >
                &gt;
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="flex-1 py-3 px-2 bg-transparent outline-none mono-text text-sm"
                style={{ color: "var(--color-text)" }}
              />
              <button
                type="submit"
                className="px-4 py-3 pixel-text transition-colors duration-200 hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)]"
                style={{
                  fontSize: "0.55rem",
                  color: "var(--color-accent)",
                  borderLeft: "2px solid var(--color-border)",
                }}
              >
                SEARCH
              </button>
            </div>
          </form>
        </ScrollReveal>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <ScrollReveal delay={150}>
            <div className="flex flex-wrap gap-2 mb-8">
              <TagPill
                tag="ALL"
                active={activeTag === null}
                onClick={() => {
                  setActiveTag(null);
                  setPage(1);
                }}
              />
              {allTags.map((tag) => (
                <TagPill
                  key={tag}
                  tag={tag.toUpperCase()}
                  active={activeTag === tag}
                  onClick={() => handleTagClick(tag)}
                />
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Posts Grid */}
        {loading ? (
          <LoadingSkeleton />
        ) : posts.length === 0 ? (
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
    |  404  |
    | ? ? ? |
    '-------'
`}
              </pre>
              <p
                className="pixel-text text-sm mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                NO POSTS FOUND
              </p>
              <p
                className="mono-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {search || activeTag
                  ? "Try adjusting your search or filters."
                  : "Check back soon for new content."}
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post, i) => (
              <ScrollReveal key={post.id} delay={i * 80}>
                <PostCard post={post} />
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
                  color: page <= 1 ? "var(--color-text-muted)" : "var(--color-accent)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                &lt; PREV
              </button>
              <span
                className="pixel-text"
                style={{ fontSize: "0.5rem", color: "var(--color-text-secondary)" }}
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
