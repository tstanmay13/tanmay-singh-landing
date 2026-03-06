"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Post } from "@/lib/supabase";
import type { Components } from "react-markdown";

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
    month: "long",
    day: "numeric",
  });
}

/* ============================================
   MARKDOWN COMPONENTS
   ============================================ */

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1
      className="pixel-text text-xl sm:text-2xl mt-10 mb-4"
      style={{ color: "var(--color-text)" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="pixel-text text-lg sm:text-xl mt-8 mb-3"
      style={{ color: "var(--color-text)" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="text-lg font-bold mt-6 mb-2"
      style={{ color: "var(--color-text)" }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      className="text-base font-bold mt-4 mb-2"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p
      className="text-base leading-relaxed mb-4"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline transition-colors duration-200"
      style={{ color: "var(--color-accent)" }}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className || ""} mono-text text-sm`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="mono-text text-sm px-1.5 py-0.5 rounded"
        style={{
          background: "var(--color-accent-glow)",
          color: "var(--color-accent)",
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="pixel-border p-4 mb-4 overflow-x-auto mono-text text-sm"
      style={{
        background: "var(--color-bg-secondary)",
        color: "var(--color-text)",
      }}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="pl-4 mb-4 italic"
      style={{
        borderLeft: "3px solid var(--color-accent)",
        color: "var(--color-text-secondary)",
      }}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul
      className="list-disc pl-6 mb-4 space-y-1"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className="list-decimal pl-6 mb-4 space-y-1"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-relaxed">{children}</li>
  ),
  img: ({ src, alt }) => (
    <figure className="mb-6">
      <div className="pixel-border overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || ""}
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {alt && (
        <figcaption
          className="text-center text-xs mt-2 italic"
          style={{ color: "var(--color-text-muted)" }}
        >
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table
        className="w-full pixel-border"
        style={{ background: "var(--color-bg-card)" }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead
      style={{
        background: "var(--color-bg-secondary)",
        borderBottom: "2px solid var(--color-border)",
      }}
    >
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th
      className="px-4 py-2 text-left text-sm font-bold"
      style={{
        color: "var(--color-text)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-4 py-2 text-sm"
      style={{
        color: "var(--color-text-secondary)",
        borderRight: "1px solid var(--color-border)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {children}
    </td>
  ),
  hr: () => (
    <hr
      className="my-8"
      style={{ borderColor: "var(--color-border)" }}
    />
  ),
};

/* ============================================
   SHARE BUTTONS
   ============================================ */

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://tanmay-singh.com/blog/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-3">
      <span
        className="pixel-text"
        style={{ fontSize: "0.5rem", color: "var(--color-text-muted)" }}
      >
        SHARE:
      </span>
      <button
        onClick={copyLink}
        className="pixel-text px-3 py-1.5 transition-all duration-200"
        style={{
          fontSize: "0.5rem",
          color: copied ? "var(--color-bg)" : "var(--color-accent)",
          background: copied ? "var(--color-accent)" : "transparent",
          border: "1px solid var(--color-accent)",
        }}
      >
        {copied ? "COPIED!" : "COPY LINK"}
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pixel-text px-3 py-1.5 transition-all duration-200"
        style={{
          fontSize: "0.5rem",
          color: "var(--color-accent)",
          border: "1px solid var(--color-border)",
        }}
      >
        TWITTER/X
      </a>
    </div>
  );
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<Post | null>(null);
  const [prevPost, setPrevPost] = useState<{ slug: string; title: string } | null>(null);
  const [nextPost, setNextPost] = useState<{ slug: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/blog/posts/${slug}`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setPost(data.post);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Fetch prev/next posts for navigation
  const fetchAdjacentPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/posts?limit=50");
      if (!res.ok) return;
      const data = await res.json();
      const posts: Post[] = data.posts;
      const currentIndex = posts.findIndex((p) => p.slug === slug);
      if (currentIndex === -1) return;

      if (currentIndex > 0) {
        const next = posts[currentIndex - 1];
        setNextPost({ slug: next.slug, title: next.title });
      }
      if (currentIndex < posts.length - 1) {
        const prev = posts[currentIndex + 1];
        setPrevPost({ slug: prev.slug, title: prev.title });
      }
    } catch {
      // Silently fail - navigation is optional
    }
  }, [slug]);

  useEffect(() => {
    fetchPost();
    fetchAdjacentPosts();
  }, [fetchPost, fetchAdjacentPosts]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
          <div className="animate-pulse">
            <div
              className="h-8 w-3/4 mb-6"
              style={{ background: "var(--color-border)" }}
            />
            <div
              className="h-4 w-1/3 mb-8"
              style={{ background: "var(--color-bg-secondary)" }}
            />
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-4"
                  style={{
                    background: "var(--color-bg-secondary)",
                    width: `${70 + Math.random() * 30}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 pt-28 pb-20 text-center">
          <pre
            className="mono-text text-xs mb-6"
            style={{ color: "var(--color-text-muted)" }}
          >
{`
  .---------.
  | 4  0  4 |
  |         |
  | POST    |
  | NOT     |
  | FOUND   |
  '---------'
`}
          </pre>
          <p
            className="pixel-text text-sm mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            THIS POST DOES NOT EXIST
          </p>
          <Link
            href="/blog"
            className="pixel-btn inline-block"
          >
            BACK TO BLOG
          </Link>
        </div>
      </div>
    );
  }

  const readingTime = estimateReadingTime(post.content);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 mb-8 pixel-text transition-colors duration-200"
          style={{ fontSize: "0.55rem", color: "var(--color-accent)" }}
        >
          &larr; BACK TO BLOG
        </Link>

        {/* Post Header */}
        <header className="mb-10">
          <h1
            className="pixel-text text-xl sm:text-2xl md:text-3xl mb-4 leading-relaxed"
            style={{ color: "var(--color-text)" }}
          >
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            {post.published_at && (
              <span
                className="mono-text text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {formatDate(post.published_at)}
              </span>
            )}
            <span
              className="mono-text text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              {readingTime} min read
            </span>
          </div>

          {(post.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {(post.tags || []).map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="pixel-text px-2 py-0.5 transition-colors duration-200"
                  style={{
                    fontSize: "0.4rem",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <ShareButtons title={post.title} slug={post.slug} />
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="pixel-border overflow-hidden mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Divider */}
        <hr className="mb-10" style={{ borderColor: "var(--color-border)" }} />

        {/* Post Content */}
        <article className="prose-custom">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {post.content}
          </ReactMarkdown>
        </article>

        {/* Bottom divider */}
        <hr className="my-10" style={{ borderColor: "var(--color-border)" }} />

        {/* Share again at bottom */}
        <div className="mb-10">
          <ShareButtons title={post.title} slug={post.slug} />
        </div>

        {/* Previous / Next Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
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
                {prevPost.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
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
                {nextPost.title}
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
