"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogAdminPage() {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  // Login form state
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin panel state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // New post form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/admin/session", {
        credentials: "include",
      });
      const data = await res.json();
      setAuthenticated(data.authenticated === true);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      checkSession();
    }
  }, [mounted, checkSession]);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/blog/posts?limit=50");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      console.error("Failed to fetch posts");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchPosts();
    }
  }, [authenticated, fetchPosts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/blog/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (res.ok) {
        setPassword("");
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/blog/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setAuthenticated(false);
    window.location.href = "/blog";
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/blog/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content,
          excerpt: excerpt || null,
          tags: tags ? tags.split(",").map((t) => t.trim()) : null,
          cover_image_url: coverImageUrl || null,
          is_published: isPublished,
        }),
        credentials: "include",
      });

      if (res.ok) {
        setSaveSuccess("Post created successfully!");
        setTitle("");
        setSlug("");
        setContent("");
        setExcerpt("");
        setTags("");
        setCoverImageUrl("");
        setIsPublished(false);
        setShowForm(false);
        fetchPosts();
      } else {
        const data = await res.json();
        setSaveError(data.error || "Failed to create post");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (!mounted || checking) {
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

  // --- LOGIN FORM ---
  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div
          className="pixel-border p-8 w-full max-w-sm"
          style={{ backgroundColor: "var(--color-bg-card)" }}
        >
          <h1
            className="pixel-text text-lg mb-6 text-center"
            style={{ color: "var(--color-accent)" }}
          >
            ADMIN LOGIN
          </h1>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label
                className="pixel-text text-xs block mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none focus:border-[var(--color-accent)]"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-text)",
                }}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {loginError && (
              <p
                className="pixel-text text-xs"
                style={{ color: "var(--color-red)" }}
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="pixel-btn w-full"
              disabled={loginLoading || !password}
              style={{
                opacity: loginLoading || !password ? 0.5 : 1,
              }}
            >
              {loginLoading ? "LOGGING IN..." : "LOGIN"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/blog"
              className="pixel-text text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              &lt; BACK TO BLOG
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN PANEL ---
  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="pixel-text text-lg"
            style={{ color: "var(--color-accent)" }}
          >
            BLOG ADMIN
          </h1>
          <div className="flex gap-3">
            <Link href="/blog" className="pixel-btn text-xs">
              VIEW BLOG
            </Link>
            <button
              onClick={handleLogout}
              className="pixel-btn text-xs"
              style={{
                borderColor: "var(--color-red)",
                color: "var(--color-red)",
              }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Success message */}
        {saveSuccess && (
          <div
            className="pixel-border p-3 mb-4"
            style={{
              borderColor: "var(--color-accent)",
              backgroundColor: "var(--color-bg-card)",
            }}
          >
            <p
              className="pixel-text text-xs"
              style={{ color: "var(--color-accent)" }}
            >
              {saveSuccess}
            </p>
          </div>
        )}

        {/* New Post Button / Form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="pixel-btn mb-8"
          >
            + NEW POST
          </button>
        ) : (
          <div
            className="pixel-border p-6 mb-8"
            style={{ backgroundColor: "var(--color-bg-card)" }}
          >
            <h2
              className="pixel-text text-sm mb-4"
              style={{ color: "var(--color-text)" }}
            >
              CREATE NEW POST
            </h2>
            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  TITLE
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug || slug === generateSlug(title)) {
                      setSlug(generateSlug(e.target.value));
                    }
                  }}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  SLUG
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  EXCERPT
                </label>
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  CONTENT (MARKDOWN)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none resize-y"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  TAGS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                  placeholder="react, nextjs, typescript"
                />
              </div>

              <div>
                <label
                  className="pixel-text text-xs block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  COVER IMAGE URL
                </label>
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="is_published"
                  className="pixel-text text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  PUBLISH IMMEDIATELY
                </label>
              </div>

              {saveError && (
                <p
                  className="pixel-text text-xs"
                  style={{ color: "var(--color-red)" }}
                >
                  {saveError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="pixel-btn"
                  disabled={saving}
                  style={{ opacity: saving ? 0.5 : 1 }}
                >
                  {saving ? "SAVING..." : "CREATE POST"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="pixel-btn"
                  style={{
                    borderColor: "var(--color-text-muted)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posts List */}
        <div>
          <h2
            className="pixel-text text-sm mb-4"
            style={{ color: "var(--color-text)" }}
          >
            POSTS ({posts.length})
          </h2>

          {loadingPosts ? (
            <p
              className="pixel-text text-xs animate-flicker"
              style={{ color: "var(--color-text-muted)" }}
            >
              LOADING POSTS...
            </p>
          ) : posts.length === 0 ? (
            <div
              className="pixel-border p-6 text-center"
              style={{ backgroundColor: "var(--color-bg-card)" }}
            >
              <p
                className="pixel-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                NO POSTS YET. CREATE YOUR FIRST ONE!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="pixel-border p-4 flex items-center justify-between"
                  style={{ backgroundColor: "var(--color-bg-card)" }}
                >
                  <div>
                    <h3
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--color-text)" }}
                    >
                      {post.title}
                    </h3>
                    <div className="flex gap-3 items-center">
                      <span
                        className="mono-text text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        /{post.slug}
                      </span>
                      <span
                        className="pixel-text text-xs"
                        style={{
                          color: post.is_published
                            ? "var(--color-accent)"
                            : "var(--color-orange)",
                        }}
                      >
                        {post.is_published ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="pixel-text text-xs"
                    style={{ color: "var(--color-accent)" }}
                  >
                    VIEW
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
