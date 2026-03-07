"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface LessonContentProps {
  content: string;
  format: string;
}

const SPECIAL_HEADINGS = [
  "reflect",
  "quiz",
  "try this today",
  "try it",
  "challenge",
  "exercise",
  "practice",
  "action item",
  "your turn",
];

function isSpecialHeading(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return SPECIAL_HEADINGS.some(
    (h) => lower === h || lower.startsWith(h + ":") || lower.startsWith(h + " ")
  );
}

function getMarkdownComponents(format: string): Components {
  return {
    h1: ({ children }) => (
      <h1
        className="text-2xl sm:text-3xl font-bold mt-10 mb-4"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-text)",
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const isSpecial = isSpecialHeading(text);

      if (isSpecial) {
        return (
          <div
            className="mt-8 mb-4 p-5 rounded-lg"
            style={{
              background: "var(--color-accent-glow)",
              border: "2px solid var(--color-accent)",
            }}
          >
            <h2
              className="text-xl sm:text-2xl font-bold mb-0"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-accent)",
              }}
            >
              {children}
            </h2>
          </div>
        );
      }

      return (
        <h2
          className="text-xl sm:text-2xl font-bold mt-8 mb-3"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text)",
          }}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => (
      <h3
        className="text-lg sm:text-xl font-semibold mt-6 mb-2"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-text)",
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className="text-base sm:text-lg font-semibold mt-4 mb-2"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-text-secondary)",
        }}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p
        className="text-base sm:text-lg leading-[1.75] mb-4 max-w-[720px]"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-text-secondary)",
        }}
      >
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors duration-200 hover:underline"
        style={{
          color: "var(--color-accent)",
          textDecoration: "none",
        }}
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code
            className={`${className || ""} text-sm`}
            style={{ fontFamily: "var(--font-mono)" }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="text-sm px-1.5 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-mono)",
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
        className="pixel-border p-4 mb-4 overflow-x-auto text-sm rounded-lg"
        style={{
          fontFamily: "var(--font-mono)",
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
        className="list-disc pl-6 mb-4 space-y-2 max-w-[720px]"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className="list-decimal pl-6 mb-4 space-y-2 max-w-[720px]"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li
        className="text-base sm:text-lg leading-[1.75]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
      </li>
    ),
    img: ({ src, alt }) => (
      <figure className="mb-6">
        <div className="pixel-border overflow-hidden rounded-lg">
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
          fontFamily: "var(--font-body)",
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
      <hr className="my-8" style={{ borderColor: "var(--color-border)" }} />
    ),
    // Handle details/summary for interactive format
    details: ({ children }) => {
      if (format !== "interactive") {
        return <details className="mb-4">{children}</details>;
      }
      return (
        <details
          className="mb-4 rounded-lg overflow-hidden group"
          style={{
            border: "2px solid var(--color-border)",
            background: "var(--color-bg-card)",
          }}
        >
          {children}
        </details>
      );
    },
    summary: ({ children }) => {
      if (format !== "interactive") {
        return <summary className="cursor-pointer">{children}</summary>;
      }
      return (
        <summary
          className="cursor-pointer p-4 font-semibold text-base transition-colors duration-200 select-none list-none flex items-center gap-2"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text)",
            background: "var(--color-bg-card)",
          }}
        >
          <span
            className="text-xs transition-transform duration-200 inline-block group-open:rotate-90"
            style={{ color: "var(--color-accent)" }}
          >
            &#9654;
          </span>
          {children}
        </summary>
      );
    },
  };
}

export default function LessonContent({ content, format }: LessonContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4 max-w-[720px]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-4 rounded"
            style={{
              background: "var(--color-bg-secondary)",
              width: `${60 + Math.random() * 40}%`,
            }}
          />
        ))}
      </div>
    );
  }

  const components = getMarkdownComponents(format);

  return (
    <div className="learning-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
