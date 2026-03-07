"use client";

import { useState, useEffect } from "react";

interface DayNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

function formatDisplayDate(dateStr: string, compact: boolean): string {
  const date = new Date(dateStr + "T12:00:00");
  if (compact) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayString(): string {
  return toDateString(new Date());
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function daysDiff(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + "T12:00:00");
  const d2 = new Date(dateStr2 + "T12:00:00");
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DayNavigator({
  selectedDate,
  onDateChange,
}: DayNavigatorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const today = getTodayString();
  const isToday = selectedDate === today;
  const canGoForward = selectedDate < today;
  const canGoBack = daysDiff(today, selectedDate) < 30;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={() => onDateChange(addDays(selectedDate, -1))}
        disabled={!canGoBack}
        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-30"
        style={{
          background: "var(--color-bg-card)",
          border: "2px solid var(--color-border)",
          color: "var(--color-text)",
        }}
        aria-label="Previous day"
      >
        &#8592;
      </button>

      <div className="text-center min-w-0">
        <span
          className="text-sm sm:text-base font-semibold block"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text)",
          }}
        >
          <span className="hidden sm:inline">
            {formatDisplayDate(selectedDate, false)}
          </span>
          <span className="sm:hidden">
            {formatDisplayDate(selectedDate, true)}
          </span>
        </span>
        {isToday && (
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent)",
            }}
          >
            Today
          </span>
        )}
      </div>

      <button
        onClick={() => onDateChange(addDays(selectedDate, 1))}
        disabled={!canGoForward}
        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-30"
        style={{
          background: "var(--color-bg-card)",
          border: "2px solid var(--color-border)",
          color: "var(--color-text)",
        }}
        aria-label="Next day"
      >
        &#8594;
      </button>

      {!isToday && (
        <button
          onClick={() => onDateChange(today)}
          className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--color-accent-glow)",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
          }}
        >
          Today
        </button>
      )}
    </div>
  );
}
