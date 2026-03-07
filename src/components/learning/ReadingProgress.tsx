"use client";

import { useState, useEffect, useCallback } from "react";

interface ReadingProgressProps {
  color: string;
}

export default function ReadingProgress({ color }: ReadingProgressProps) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      setProgress(0);
      return;
    }
    const scrolled = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
    setProgress(scrolled);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [mounted, handleScroll]);

  if (!mounted) return null;

  const isAtTop = progress < 1;

  return (
    <div
      className="fixed top-0 left-0 w-full z-[60] transition-opacity duration-300"
      style={{
        height: "3px",
        opacity: isAtTop ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      <div
        className="h-full transition-[width] duration-150 ease-out"
        style={{
          width: `${progress}%`,
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
    </div>
  );
}
