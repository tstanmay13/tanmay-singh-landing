"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface GamePlayCounterProps {
  slug: string;
  onPlay?: boolean;
}

export default function GamePlayCounter({
  slug,
  onPlay = false,
}: GamePlayCounterProps) {
  const [count, setCount] = useState<number | null>(null);
  const incrementedRef = useRef(false);

  useEffect(() => {
    fetch("/api/games/plays")
      .then((res) => res.json())
      .then((data: Record<string, number>) => {
        setCount(data[slug] ?? 0);
      })
      .catch(() => {
        setCount(0);
      });
  }, [slug]);

  const increment = useCallback(() => {
    if (incrementedRef.current) return;
    incrementedRef.current = true;

    setCount((prev) => (prev !== null ? prev + 1 : 1));

    fetch("/api/games/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {
      // Silently fail — the optimistic UI update already happened
    });
  }, [slug]);

  useEffect(() => {
    if (onPlay) {
      increment();
    }
  }, [onPlay, increment]);

  if (count === null) return null;

  return (
    <span
      className="pixel-text text-[8px] px-2 py-1 inline-flex items-center gap-1"
      style={{
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-card)",
      }}
    >
      <span style={{ fontSize: "10px" }}>&#9654;</span>
      {count.toLocaleString()} {count === 1 ? "PLAY" : "PLAYS"}
    </span>
  );
}

/**
 * Hook for games that need to trigger the counter imperatively
 * (when the game starts, not on mount).
 */
export function useGamePlay(slug: string) {
  const incrementedRef = useRef(false);

  const recordPlay = useCallback(() => {
    if (incrementedRef.current) return;
    incrementedRef.current = true;

    fetch("/api/games/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);

  return { recordPlay };
}
