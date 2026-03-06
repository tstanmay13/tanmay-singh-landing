"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/* ============================================
   TYPES
   ============================================ */

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

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string;
  cover_image_url: string;
  is_published: boolean;
}

const EMPTY_FORM: PostFormData = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  tags: "",
  cover_image_url: "",
  is_published: false,
};

/* ============================================
   HELPERS
   ============================================ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ============================================
   MAIN ADMIN PAGE
   ============================================ */

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
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState<PostFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      showMsg("Failed to load posts", "error");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchPosts();
    }
  }, [authenticated, fetchPosts]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ---------- Auth ---------- */

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
  };

  /* ---------- CRUD ---------- */

  const handleNewPost = () => {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    setView("editor");
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      tags: (post.tags || []).join(", "),
      cover_image_url: post.cover_image_url || "",
      is_published: post.is_published,
    });
    setView("editor");
  };

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      showMsg("Title, slug, and content are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        content: form.content,
        excerpt: form.excerpt || null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        cover_image_url: form.cover_image_url || null,
        is_published: form.is_published,
      };
      if (editingPost) {
        const res = await fetch(`/api/blog/admin/posts/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to update");
        showMsg("Post updated", "success");
      } else {
        const res = await fetch("/api/blog/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to create");
        showMsg("Post created", "success");
      }
      setView("list");
      fetchPosts();
    } catch {
      showMsg("Failed to save post", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: Post) => {
    try {
      const res = await fetch(`/api/blog/admin/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !post.is_published }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      showMsg(post.is_published ? "Post unpublished" : "Post published", "success");
      fetchPosts();
    } catch {
      showMsg("Failed to update post", "error");
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const res = await fetch(`/api/blog/admin/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showMsg("Post deleted", "success");
      setDeleteConfirm(null);
      fetchPosts();
    } catch {
      showMsg("Failed to delete post", "error");
    }
  };

  const updateField = (field: keyof PostFormData, value: string | boolean) => {
    const updated = { ...form, [field]: value };
    if (field === "title" && !editingPost) {
      updated.slug = slugify(value as string);
    }
    setForm(updated);
  };

  /* ---------- Rendering ---------- */

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

  // --- LOGIN ---
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
              style={{ opacity: loginLoading || !password ? 0.5 : 1 }}
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
      className="min-h-screen px-4 pt-24 pb-12"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="pixel-text text-lg"
            style={{ color: "var(--color-accent)" }}
          >
            BLOG ADMIN
          </h1>
          <div className="flex gap-3">
            {view === "list" && (
              <button onClick={handleNewPost} className="pixel-btn">
                + NEW POST
              </button>
            )}
            <Link href="/blog" className="pixel-btn text-xs">
              VIEW BLOG
            </Link>
            <button
              onClick={handleLogout}
              className="pixel-btn text-xs"
              style={{ borderColor: "var(--color-red)", color: "var(--color-red)" }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className="pixel-border p-3 mb-6"
            style={{
              borderColor:
                message.type === "success"
                  ? "var(--color-accent)"
                  : "var(--color-red)",
              backgroundColor: "var(--color-bg-card)",
            }}
          >
            <p
              className="pixel-text text-xs"
              style={{
                color:
                  message.type === "success"
                    ? "var(--color-accent)"
                    : "var(--color-red)",
              }}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === "editor" ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2
                className="pixel-text text-sm"
                style={{ color: "var(--color-text)" }}
              >
                {editingPost ? "EDIT POST" : "CREATE NEW POST"}
              </h2>
              <button
                onClick={() => setView("list")}
                className="pixel-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                CANCEL
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="pixel-text text-xs block mb-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    TITLE
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
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
                    SLUG
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
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
                    EXCERPT
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => updateField("excerpt", e.target.value)}
                    rows={2}
                    className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none resize-y"
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
                    TAGS (COMMA SEPARATED)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => updateField("tags", e.target.value)}
                    placeholder="react, nextjs, typescript"
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
                    COVER IMAGE URL
                  </label>
                  <input
                    type="text"
                    value={form.cover_image_url}
                    onChange={(e) => updateField("cover_image_url", e.target.value)}
                    className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none"
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("is_published", !form.is_published)}
                    className="px-3 py-1.5 pixel-text text-xs transition-all duration-200"
                    style={{
                      color: form.is_published
                        ? "var(--color-bg)"
                        : "var(--color-text-muted)",
                      background: form.is_published
                        ? "var(--color-accent)"
                        : "transparent",
                      border: `2px solid ${
                        form.is_published
                          ? "var(--color-accent)"
                          : "var(--color-border)"
                      }`,
                    }}
                  >
                    {form.is_published ? "PUBLISHED" : "DRAFT"}
                  </button>
                </div>

                <div>
                  <label
                    className="pixel-text text-xs block mb-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    CONTENT (MARKDOWN)
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => updateField("content", e.target.value)}
                    rows={20}
                    className="pixel-border w-full px-3 py-2 text-sm mono-text outline-none resize-y"
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      color: "var(--color-text)",
                      minHeight: "400px",
                    }}
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="pixel-btn"
                  style={{ opacity: saving ? 0.5 : 1 }}
                >
                  {saving
                    ? "SAVING..."
                    : editingPost
                      ? "UPDATE POST"
                      : "CREATE POST"}
                </button>
              </div>

              {/* Right: Preview */}
              <div>
                <div
                  className="pixel-text text-xs mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  PREVIEW
                </div>
                <div
                  className="pixel-border p-4 overflow-y-auto"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    maxHeight: "80vh",
                  }}
                >
                  {form.title && (
                    <h1
                      className="pixel-text text-lg mb-3"
                      style={{ color: "var(--color-text)" }}
                    >
                      {form.title}
                    </h1>
                  )}
                  {form.content ? (
                    <div
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {form.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p
                      className="mono-text text-sm italic"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Start writing to see preview...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* LIST VIEW */
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
                  className="pixel-text text-xs mb-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  NO POSTS YET. CREATE YOUR FIRST ONE!
                </p>
                <button onClick={handleNewPost} className="pixel-btn">
                  + NEW POST
                </button>
              </div>
            ) : (
              <div
                className="pixel-border overflow-hidden"
                style={{ backgroundColor: "var(--color-bg-card)" }}
              >
                {/* Table header */}
                <div
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b-2"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div
                    className="col-span-4 pixel-text"
                    style={{
                      fontSize: "0.45rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    TITLE
                  </div>
                  <div
                    className="col-span-2 pixel-text"
                    style={{
                      fontSize: "0.45rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    STATUS
                  </div>
                  <div
                    className="col-span-2 pixel-text hidden sm:block"
                    style={{
                      fontSize: "0.45rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    DATE
                  </div>
                  <div
                    className="col-span-4 sm:col-span-4 pixel-text text-right"
                    style={{
                      fontSize: "0.45rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    ACTIONS
                  </div>
                </div>

                {/* Table rows */}
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="col-span-4">
                      <p
                        className="text-sm truncate"
                        style={{ color: "var(--color-text)" }}
                      >
                        {post.title}
                      </p>
                      <p
                        className="mono-text text-xs truncate"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        /{post.slug}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <span
                        className="pixel-text px-2 py-0.5 inline-block"
                        style={{
                          fontSize: "0.4rem",
                          color: post.is_published
                            ? "var(--color-bg)"
                            : "var(--color-text-muted)",
                          background: post.is_published
                            ? "var(--color-accent)"
                            : "transparent",
                          border: post.is_published
                            ? "none"
                            : "1px solid var(--color-border)",
                        }}
                      >
                        {post.is_published ? "LIVE" : "DRAFT"}
                      </span>
                    </div>

                    <div className="col-span-2 hidden sm:block">
                      <span
                        className="mono-text text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {post.published_at
                          ? formatDate(post.published_at)
                          : formatDate(post.created_at)}
                      </span>
                    </div>

                    <div className="col-span-4 flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="pixel-text px-2 py-1 transition-colors duration-200"
                        style={{
                          fontSize: "0.4rem",
                          color: "var(--color-accent)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className="pixel-text px-2 py-1 transition-colors duration-200"
                        style={{
                          fontSize: "0.4rem",
                          color: "var(--color-orange)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {post.is_published ? "HIDE" : "PUBLISH"}
                      </button>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="pixel-text px-2 py-1"
                        style={{
                          fontSize: "0.4rem",
                          color: "var(--color-cyan)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        VIEW
                      </Link>
                      {deleteConfirm === post.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="pixel-text px-2 py-1"
                            style={{
                              fontSize: "0.4rem",
                              color: "var(--color-bg)",
                              backgroundColor: "var(--color-red)",
                            }}
                          >
                            CONFIRM
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="pixel-text px-2 py-1"
                            style={{
                              fontSize: "0.4rem",
                              color: "var(--color-text-muted)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            CANCEL
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="pixel-text px-2 py-1 transition-colors duration-200"
                          style={{
                            fontSize: "0.4rem",
                            color: "var(--color-red)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          DELETE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
