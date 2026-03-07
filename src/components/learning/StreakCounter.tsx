"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "learning-streak";

interface StreakData {
  lastVisit: string;
  count: number;
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StreakCounter() {
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [justIncremented, setJustIncremented] = useState(false);

  useEffect(() => {
    setMounted(true);

    const today = getTodayString();
    const yesterday = getYesterdayString();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let data: StreakData;

      if (stored) {
        data = JSON.parse(stored);

        if (data.lastVisit === today) {
          // Already visited today, keep same streak
          setStreak(data.count);
        } else if (data.lastVisit === yesterday) {
          // Visited yesterday, increment streak
          const newCount = data.count + 1;
          data = { lastVisit: today, count: newCount };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setStreak(newCount);
          setJustIncremented(true);
        } else {
          // Streak broken, reset to 1
          data = { lastVisit: today, count: 1 };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setStreak(1);
        }
      } else {
        // First visit ever
        data = { lastVisit: today, count: 1 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setStreak(1);
      }
    } catch {
      // localStorage not available, show default
      setStreak(1);
    }
  }, []);

  useEffect(() => {
    if (justIncremented) {
      const timer = setTimeout(() => setJustIncremented(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [justIncremented]);

  if (!mounted) return null;

  const label = streak <= 1 ? "First day!" : `${streak} day streak`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm transition-transform duration-300"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--color-text-secondary)",
        transform: justIncremented ? "scale(1.15)" : "scale(1)",
      }}
    >
      <span
        className="transition-transform duration-300"
        style={{
          display: "inline-block",
          transform: justIncremented ? "scale(1.3)" : "scale(1)",
        }}
      >
        {"\uD83D\uDD25"}
      </span>
      <span
        className="font-medium"
        style={{
          color: justIncremented ? "var(--color-accent)" : "var(--color-text-secondary)",
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </span>
    </span>
  );
}
