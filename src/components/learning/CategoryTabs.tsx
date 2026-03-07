"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LearningCategory } from "@/lib/learning/types";
import { getCategoryColor } from "@/lib/learning/utils";

interface CategoryTabsProps {
  categories: LearningCategory[];
  activeCategory: string | null;
}

export default function CategoryTabs({
  categories,
  activeCategory,
}: CategoryTabsProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const currentCategory = activeCategory || searchParams.get("category") || "all";

  function handleTabClick(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  const allTabs = [
    { slug: "all", name: "All", icon: "🎮" },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
  ];

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-x-visible scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {allTabs.map((tab) => {
        const isActive = currentCategory === tab.slug;
        const color =
          tab.slug === "all" ? "var(--color-accent)" : getCategoryColor(tab.slug);

        return (
          <button
            key={tab.slug}
            onClick={() => handleTabClick(tab.slug)}
            className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 shrink-0"
            style={{
              fontFamily: "var(--font-body)",
              background: isActive ? color : "var(--color-bg-card)",
              color: isActive ? "var(--color-bg)" : "var(--color-text-secondary)",
              border: `2px solid ${isActive ? color : "var(--color-border)"}`,
              boxShadow: isActive ? `0 0 12px ${color}40` : "none",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
}
