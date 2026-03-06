"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

type Category =
  | "all"
  | "arcade"
  | "puzzle"
  | "reflex"
  | "creative"
  | "simulation"
  | "trivia";

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  category: Category;
  isNew: boolean;
}

const games: Game[] = [
  {
    id: "slevens",
    title: "Slevens",
    description: "Shake to roll dice drinking game",
    icon: "🎲",
    path: "/games/slevens",
    category: "arcade",
    isNew: false,
  },
  {
    id: "snakes",
    title: "Snake Game",
    description: "Classic snake with pixel art",
    icon: "🐍",
    path: "/games/snakes",
    category: "arcade",
    isNew: false,
  },
  {
    id: "salary",
    title: "The Salary Game",
    description: "Can you spend a dev salary?",
    icon: "💰",
    path: "/games/salary",
    category: "simulation",
    isNew: true,
  },
  {
    id: "reflex-duel",
    title: "Reflex Duel",
    description: "Cowboy reaction time test",
    icon: "🤠",
    path: "/games/reflex-duel",
    category: "reflex",
    isNew: true,
  },
  {
    id: "guess-framework",
    title: "Guess the Framework",
    description: "Identify JS frameworks from code snippets",
    icon: "</>",
    path: "/games/guess-framework",
    category: "trivia",
    isNew: true,
  },
  {
    id: "color-guesser",
    title: "Color Guesser",
    description: "Match hex codes to colors",
    icon: "🎨",
    path: "/games/color-guesser",
    category: "trivia",
    isNew: true,
  },
  {
    id: "memory-matrix",
    title: "Memory Matrix",
    description: "Remember the pattern",
    icon: "🧠",
    path: "/games/memory-matrix",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "type-racer",
    title: "Type Racer",
    description: "Speed typing with pixel car",
    icon: "⌨️",
    path: "/games/type-racer",
    category: "reflex",
    isNew: true,
  },
  {
    id: "pixel-painter",
    title: "Pixel Art Painter",
    description: "Create pixel art masterpieces",
    icon: "🖌️",
    path: "/games/pixel-painter",
    category: "creative",
    isNew: true,
  },
  {
    id: "password-game",
    title: "Password Game",
    description: "Satisfy absurd password rules",
    icon: "🔐",
    path: "/games/password-game",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "perfect-shape",
    title: "Draw Perfect Shape",
    description: "How steady is your hand?",
    icon: "✏️",
    path: "/games/perfect-shape",
    category: "creative",
    isNew: true,
  },
  {
    id: "pixel-perfector",
    title: "Pixel Perfector",
    description: "Memorize and recreate pixel art",
    icon: "👾",
    path: "/games/pixel-perfector",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "2048",
    title: "2048 Bento Remix",
    description: "Merge foods to reach the crown",
    icon: "\uD83C\uDF71",
    path: "/games/2048",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "maze-runner",
    title: "Maze Runner",
    description: "Navigate fog-shrouded procedural mazes",
    icon: "\uD83C\uDFD9\uFE0F",
    path: "/games/maze-runner",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "element-mixer",
    title: "Element Mixer",
    description: "Combine elements, discover new ones",
    icon: "\u2697\uFE0F",
    path: "/games/element-mixer",
    category: "creative",
    isNew: true,
  },
  {
    id: "stack-tower",
    title: "Stack Tower",
    description: "Tap to drop, stack blocks high",
    icon: "\uD83C\uDFD7\uFE0F",
    path: "/games/stack-tower",
    category: "arcade",
    isNew: true,
  },
  {
    id: "dev-wordle",
    title: "Dev Wordle",
    description: "Daily 5-letter dev word puzzle",
    icon: "\uD83D\uDCDD",
    path: "/games/dev-wordle",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "gravity-pong",
    title: "Gravity Pong",
    description: "Pong with a gravity well twist",
    icon: "\uD83C\uDF0C",
    path: "/games/gravity-pong",
    category: "arcade",
    isNew: true,
  },
  {
    id: "orbit",
    title: "Orbit",
    description: "N-body gravity simulator toy",
    icon: "\uD83E\uDE90",
    path: "/games/orbit",
    category: "simulation",
    isNew: true,
  },
  {
    id: "flappy",
    title: "Flappy Pixel",
    description: "Pixel-art flappy bird clone",
    icon: "\uD83D\uDC26",
    path: "/games/flappy",
    category: "arcade",
    isNew: true,
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Classic minesweeper with pixel art",
    icon: "\uD83D\uDCA3",
    path: "/games/minesweeper",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "idle-bakery",
    title: "Idle Bakery",
    description: "Bake bread, earn coins, upgrade",
    icon: "\uD83C\uDF5E",
    path: "/games/idle-bakery",
    category: "simulation",
    isNew: true,
  },
];

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "arcade", label: "Arcade" },
  { key: "puzzle", label: "Puzzle" },
  { key: "reflex", label: "Reflex" },
  { key: "creative", label: "Creative" },
  { key: "simulation", label: "Simulation" },
  { key: "trivia", label: "Trivia" },
];

const categoryColors: Record<Category, string> = {
  all: "var(--color-accent)",
  arcade: "var(--color-red)",
  puzzle: "var(--color-purple)",
  reflex: "var(--color-orange)",
  creative: "var(--color-pink)",
  simulation: "var(--color-blue)",
  trivia: "var(--color-cyan)",
};

function getNewCount(cat: Category): number {
  if (cat === "all") return games.filter((g) => g.isNew).length;
  return games.filter((g) => g.category === cat && g.isNew).length;
}

export default function GamesPage() {
  const [activeFilter, setActiveFilter] = useState<Category>("all");

  const filteredGames = useMemo(() => {
    if (activeFilter === "all") return games;
    return games.filter((g) => g.category === activeFilter);
  }, [activeFilter]);

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Grid background */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header Section */}
        <header className="pt-12 pb-8 px-4 text-center">
          <Link
            href="/"
            className="pixel-text text-xs inline-block mb-8 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            &lt; BACK TO HOME
          </Link>

          <ScrollReveal>
            <h1
              className="pixel-text text-4xl sm:text-5xl md:text-7xl mb-4 leading-tight"
              style={{
                color: "var(--color-accent)",
                textShadow: `
                  0 0 10px var(--color-accent-glow),
                  0 0 30px var(--color-accent-glow),
                  0 0 60px var(--color-accent-glow)
                `,
              }}
            >
              ARCADE
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p
              className="pixel-text text-xs sm:text-sm animate-flicker mb-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              INSERT COIN TO PLAY
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p
              className="pixel-text text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {games.length} GAMES AVAILABLE
            </p>
          </ScrollReveal>
        </header>

        {/* Filter Bar */}
        <ScrollReveal delay={300}>
          <nav className="max-w-5xl mx-auto px-4 mb-10">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {categories.map((cat) => {
                const isActive = activeFilter === cat.key;
                const newCount = getNewCount(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveFilter(cat.key)}
                    className="pixel-text text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2.5 border-2 transition-all duration-200 relative cursor-pointer"
                    style={{
                      borderColor: isActive
                        ? categoryColors[cat.key]
                        : "var(--color-border)",
                      background: isActive
                        ? categoryColors[cat.key]
                        : "var(--color-bg-card)",
                      color: isActive
                        ? "var(--color-bg)"
                        : "var(--color-text-secondary)",
                      boxShadow: isActive
                        ? `0 0 15px ${categoryColors[cat.key]}40, 3px 3px 0 ${categoryColors[cat.key]}80`
                        : "none",
                    }}
                  >
                    {cat.label.toUpperCase()}
                    {newCount > 0 && (
                      <span
                        className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] pixel-text leading-none border"
                        style={{
                          background: "var(--color-red)",
                          color: "#fff",
                          borderColor: "var(--color-red)",
                        }}
                      >
                        {newCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </ScrollReveal>

        {/* Game Cards Grid */}
        <main className="max-w-5xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGames.map((game, index) => (
              <ScrollReveal key={game.id} delay={index * 60} variant="scale">
                <Link href={game.path} className="block group">
                  <div
                    className="pixel-card p-6 text-center transition-all duration-250 relative"
                    style={{ minHeight: "240px" }}
                  >
                    {/* NEW badge */}
                    {game.isNew && (
                      <span
                        className="absolute top-3 right-3 pixel-text text-[8px] px-2 py-1 animate-glow-pulse"
                        style={{
                          background: "var(--color-accent)",
                          color: "var(--color-bg)",
                        }}
                      >
                        NEW
                      </span>
                    )}

                    {/* Cabinet screen area */}
                    <div
                      className="mx-auto mb-4 w-20 h-20 flex items-center justify-center border-2 transition-all duration-250 group-hover:scale-110"
                      style={{
                        borderColor: "var(--color-border)",
                        background: "var(--color-bg)",
                      }}
                    >
                      <span className="text-4xl">{game.icon}</span>
                    </div>

                    {/* Title */}
                    <h2
                      className="pixel-text text-xs sm:text-sm mb-2 transition-colors duration-200"
                      style={{ color: "var(--color-text)" }}
                    >
                      {game.title.toUpperCase()}
                    </h2>

                    {/* Description */}
                    <p
                      className="text-xs mb-4 leading-relaxed"
                      style={{
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {game.description}
                    </p>

                    {/* Category badge */}
                    <span
                      className="pixel-text text-[8px] px-2 py-1 border inline-block mb-3"
                      style={{
                        borderColor: categoryColors[game.category],
                        color: categoryColors[game.category],
                      }}
                    >
                      {game.category.toUpperCase()}
                    </span>

                    {/* Play button */}
                    <div className="mt-auto">
                      <span className="pixel-btn inline-block text-[10px] px-4 py-2 transition-all duration-200">
                        PLAY
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          {/* Empty state */}
          {filteredGames.length === 0 && (
            <div className="text-center py-20">
              <p
                className="pixel-text text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                NO GAMES FOUND IN THIS CATEGORY
              </p>
            </div>
          )}
        </main>

        {/* Stats Footer */}
        <footer
          className="border-t-2 mt-8 py-10 px-4 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ScrollReveal>
            <div className="max-w-3xl mx-auto space-y-3">
              <p
                className="pixel-text text-[10px] sm:text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                TOTAL PLAY TIME: INFINITE
              </p>
              <p
                className="pixel-text text-[10px] sm:text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                HIGH SCORES: PRICELESS
              </p>
              <div className="pt-4">
                <Link href="/" className="pixel-btn inline-block text-[10px]">
                  RETURN TO LOBBY
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </footer>
      </div>
    </div>
  );
}
