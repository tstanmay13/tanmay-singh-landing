"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

type Category =
  | "all"
  | "arcade"
  | "puzzle"
  | "reflex"
  | "creative"
  | "simulation"
  | "trivia"
  | "multiplayer";

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
  // Original games
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
  // Phase 1 games
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
    id: "color-guesser",
    title: "Color Guesser",
    description: "Match hex codes to colors",
    icon: "🎨",
    path: "/games/color-guesser",
    category: "trivia",
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
  // Phase 2 games
  {
    id: "stack-tower",
    title: "Stack Tower",
    description: "Stack blocks, don't miss!",
    icon: "🏗️",
    path: "/games/stack-tower",
    category: "arcade",
    isNew: true,
  },
  {
    id: "orbit",
    title: "Orbit",
    description: "N-body gravity simulator",
    icon: "🪐",
    path: "/games/orbit",
    category: "simulation",
    isNew: true,
  },
  {
    id: "breakout",
    title: "Breakout Remix",
    description: "Smash bricks with power-ups",
    icon: "🧱",
    path: "/games/breakout",
    category: "arcade",
    isNew: true,
  },
  {
    id: "flappy",
    title: "Flappy Pixel",
    description: "Pixel-art flappy bird",
    icon: "🐦",
    path: "/games/flappy",
    category: "arcade",
    isNew: true,
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Classic mine-sweeping puzzle",
    icon: "💣",
    path: "/games/minesweeper",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "maze-runner",
    title: "Maze Runner",
    description: "Navigate through fog of war",
    icon: "🌀",
    path: "/games/maze-runner",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "code-quiz",
    title: "Code Quiz",
    description: "150+ questions across 8 tech categories",
    icon: "{ }",
    path: "/games/code-quiz",
    category: "trivia",
    isNew: true,
  },
  {
    id: "idle-bakery",
    title: "Idle Bakery",
    description: "Build your bakery empire",
    icon: "🍞",
    path: "/games/idle-bakery",
    category: "simulation",
    isNew: true,
  },
  // Multiplayer games
  {
    id: "pixel-impostor",
    title: "Pixel Impostor",
    description: "One word, one liar, find the fake",
    icon: "\uD83D\uDD75\uFE0F",
    path: "/games/pixel-impostor",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "spyfall-dev",
    title: "Spyfall: Dev Edition",
    description: "Everyone knows the location... except the spy",
    icon: "\uD83D\uDD0D",
    path: "/games/spyfall-dev",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "person-do-thing",
    title: "Person Do Thing",
    description: "Describe anything with only 34 words",
    icon: "\uD83D\uDDE3\uFE0F",
    path: "/games/person-do-thing",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "prompt-roulette",
    title: "Prompt Roulette",
    description: "Write the funniest answer, everyone votes",
    icon: "\uD83C\uDFB0",
    path: "/games/prompt-roulette",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "wavelength",
    title: "Wavelength",
    description: "Guess where the clue falls on the spectrum",
    icon: "\uD83D\uDCE1",
    path: "/games/wavelength",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "stack-overflow",
    title: "Stack Overflow",
    description: "Real tech facts vs convincing lies",
    icon: "\uD83D\uDCDA",
    path: "/games/stack-overflow",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "merge-conflict",
    title: "Merge Conflict",
    description: "Two devs, one function, zero communication",
    icon: "\uD83D\uDD00",
    path: "/games/merge-conflict",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "dev-trivia",
    title: "Dev Trivia Showdown",
    description: "Team programming trivia with wagering",
    icon: "\uD83C\uDFC6",
    path: "/games/dev-trivia",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "glitch-artist",
    title: "Glitch Artist",
    description: "Everyone draws, one player fakes it",
    icon: "\uD83C\uDFA8",
    path: "/games/glitch-artist",
    category: "multiplayer",
    isNew: true,
  },
  {
    id: "retro-reflex",
    title: "Retro Reflex Duel",
    description: "Rapid-fire micro-challenges",
    icon: "\u26A1",
    path: "/games/retro-reflex",
    category: "multiplayer",
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
  { key: "multiplayer", label: "Multiplayer" },
];

const categoryColors: Record<Category, string> = {
  all: "var(--color-accent)",
  arcade: "var(--color-red)",
  puzzle: "var(--color-purple)",
  reflex: "var(--color-orange)",
  creative: "var(--color-pink)",
  simulation: "var(--color-blue)",
  trivia: "var(--color-cyan)",
  multiplayer: "var(--color-green)",
};

function getNewCount(cat: Category): number {
  if (cat === "all") return games.filter((g) => g.isNew).length;
  return games.filter((g) => g.category === cat && g.isNew).length;
}

export default function GamesPage() {
  const [activeFilter, setActiveFilter] = useState<Category>("all");
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/games/plays")
      .then((res) => res.json())
      .then((data: Record<string, number>) => setPlayCounts(data))
      .catch(() => {});
  }, []);

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

                    {/* Category badge + play count */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span
                        className="pixel-text text-[8px] px-2 py-1 border inline-block"
                        style={{
                          borderColor: categoryColors[game.category],
                          color: categoryColors[game.category],
                        }}
                      >
                        {game.category.toUpperCase()}
                      </span>
                      {(playCounts[game.id] ?? 0) > 0 && (
                        <span
                          className="pixel-text text-[8px] px-2 py-1 inline-block"
                          style={{
                            color: "var(--color-text-muted)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {playCounts[game.id].toLocaleString()} PLAYS
                        </span>
                      )}
                    </div>

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
