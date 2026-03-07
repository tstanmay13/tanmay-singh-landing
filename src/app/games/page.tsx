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
  | "multiplayer"
  | "deep";

type SortOption = "newest" | "most-played" | "a-z";

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  category: Exclude<Category, "all" | "deep">;
  isNew: boolean;
  isDeep?: boolean;
  playerCount?: string;
}

const games: Game[] = [
  // Original games
  {
    id: "slevens",
    title: "Slevens",
    description: "Shake to roll dice drinking game",
    icon: "\uD83C\uDFB2",
    path: "/games/slevens",
    category: "arcade",
    isNew: false,
  },
  {
    id: "snakes",
    title: "Snake Game",
    description: "Classic snake with pixel art",
    icon: "\uD83D\uDC0D",
    path: "/games/snakes",
    category: "arcade",
    isNew: false,
  },
  // Phase 1 games
  {
    id: "salary",
    title: "The Salary Game",
    description: "Can you spend a dev salary?",
    icon: "\uD83D\uDCB0",
    path: "/games/salary",
    category: "simulation",
    isNew: true,
  },
  {
    id: "reflex-duel",
    title: "Reflex Duel",
    description: "Cowboy reaction time test",
    icon: "\uD83E\uDD20",
    path: "/games/reflex-duel",
    category: "reflex",
    isNew: true,
  },
  {
    id: "color-guesser",
    title: "Color Guesser",
    description: "Match hex codes to colors",
    icon: "\uD83C\uDFA8",
    path: "/games/color-guesser",
    category: "trivia",
    isNew: true,
  },
  {
    id: "type-racer",
    title: "Type Racer",
    description: "Speed typing with pixel car",
    icon: "\u2328\uFE0F",
    path: "/games/type-racer",
    category: "reflex",
    isNew: true,
  },
  {
    id: "pixel-painter",
    title: "Pixel Art Painter",
    description: "Create pixel art masterpieces",
    icon: "\uD83D\uDD8C\uFE0F",
    path: "/games/pixel-painter",
    category: "creative",
    isNew: true,
  },
  {
    id: "perfect-shape",
    title: "Draw Perfect Shape",
    description: "How steady is your hand?",
    icon: "\u270F\uFE0F",
    path: "/games/perfect-shape",
    category: "creative",
    isNew: true,
  },
  {
    id: "pixel-perfector",
    title: "Pixel Perfector",
    description: "Memorize and recreate pixel art",
    icon: "\uD83D\uDC7E",
    path: "/games/pixel-perfector",
    category: "puzzle",
    isNew: true,
  },
  // Phase 2 games
  {
    id: "stack-tower",
    title: "Stack Tower",
    description: "Stack blocks, don't miss!",
    icon: "\uD83C\uDFD7\uFE0F",
    path: "/games/stack-tower",
    category: "arcade",
    isNew: true,
  },
  {
    id: "orbit",
    title: "Orbit",
    description: "N-body gravity simulator",
    icon: "\uD83E\uDE90",
    path: "/games/orbit",
    category: "simulation",
    isNew: true,
  },
  {
    id: "breakout",
    title: "Breakout Remix",
    description: "Smash bricks with power-ups",
    icon: "\uD83E\uDDF1",
    path: "/games/breakout",
    category: "arcade",
    isNew: true,
  },
  {
    id: "flappy",
    title: "Flappy Pixel",
    description: "Pixel-art flappy bird",
    icon: "\uD83D\uDC26",
    path: "/games/flappy",
    category: "arcade",
    isNew: true,
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Classic mine-sweeping puzzle",
    icon: "\uD83D\uDCA3",
    path: "/games/minesweeper",
    category: "puzzle",
    isNew: true,
  },
  {
    id: "maze-runner",
    title: "Maze Runner",
    description: "Navigate through fog of war",
    icon: "\uD83C\uDF00",
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
    icon: "\uD83C\uDF5E",
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
    playerCount: "3-8 players",
  },
  {
    id: "spyfall-dev",
    title: "Spyfall: Dev Edition",
    description: "Everyone knows the location... except the spy",
    icon: "\uD83D\uDD0D",
    path: "/games/spyfall-dev",
    category: "multiplayer",
    isNew: true,
    playerCount: "4-10 players",
  },
  {
    id: "person-do-thing",
    title: "Person Do Thing",
    description: "Describe anything with only 34 words",
    icon: "\uD83D\uDDE3\uFE0F",
    path: "/games/person-do-thing",
    category: "multiplayer",
    isNew: true,
    playerCount: "3-8 players",
  },
  {
    id: "prompt-roulette",
    title: "Prompt Roulette",
    description: "Write the funniest answer, everyone votes",
    icon: "\uD83C\uDFB0",
    path: "/games/prompt-roulette",
    category: "multiplayer",
    isNew: true,
    playerCount: "3-10 players",
  },
  {
    id: "wavelength",
    title: "Wavelength",
    description: "Guess where the clue falls on the spectrum",
    icon: "\uD83D\uDCE1",
    path: "/games/wavelength",
    category: "multiplayer",
    isNew: true,
    playerCount: "2-12 players",
  },
  {
    id: "stack-overflow",
    title: "Stack Overflow",
    description: "Real tech facts vs convincing lies",
    icon: "\uD83D\uDCDA",
    path: "/games/stack-overflow",
    category: "multiplayer",
    isNew: true,
    playerCount: "3-8 players",
  },
  {
    id: "merge-conflict",
    title: "Merge Conflict",
    description: "Two devs, one function, zero communication",
    icon: "\uD83D\uDD00",
    path: "/games/merge-conflict",
    category: "multiplayer",
    isNew: true,
    playerCount: "2 players",
  },
  {
    id: "dev-trivia",
    title: "Dev Trivia Showdown",
    description: "Team programming trivia with wagering",
    icon: "\uD83C\uDFC6",
    path: "/games/dev-trivia",
    category: "multiplayer",
    isNew: true,
    playerCount: "2-8 players",
  },
  {
    id: "glitch-artist",
    title: "Glitch Artist",
    description: "Everyone draws, one player fakes it",
    icon: "\uD83C\uDFA8",
    path: "/games/glitch-artist",
    category: "multiplayer",
    isNew: true,
    playerCount: "4-8 players",
  },
  {
    id: "retro-reflex",
    title: "Retro Reflex Duel",
    description: "Rapid-fire micro-challenges",
    icon: "\u26A1",
    path: "/games/retro-reflex",
    category: "multiplayer",
    isNew: true,
    playerCount: "2-4 players",
  },
  // Solo deep games
  {
    id: "alignment-problem",
    title: "The Alignment Problem",
    description: "Train an AI, watch it find loopholes",
    icon: "\uD83E\uDD16",
    path: "/games/alignment-problem",
    category: "simulation",
    isNew: true,
    isDeep: true,
  },
  {
    id: "ecosystem",
    title: "Ecosystem Architect",
    description: "Design ecosystems, watch life emerge",
    icon: "\uD83C\uDF3F",
    path: "/games/ecosystem",
    category: "simulation",
    isNew: true,
    isDeep: true,
  },
  {
    id: "galactic-census",
    title: "Galactic Census",
    description: "Survey alien civilizations across the galaxy",
    icon: "\uD83D\uDEF8",
    path: "/games/galactic-census",
    category: "puzzle",
    isNew: true,
    isDeep: true,
  },
  {
    id: "deja-vu",
    title: "Deja Vu",
    description: "Escape a room that keeps resetting",
    icon: "\uD83D\uDD04",
    path: "/games/deja-vu",
    category: "puzzle",
    isNew: true,
    isDeep: true,
  },
  {
    id: "code-review",
    title: "Code Review From Hell",
    description: "Satisfy impossible review comments",
    icon: "\uD83E\uDD13",
    path: "/games/code-review",
    category: "puzzle",
    isNew: true,
    isDeep: true,
  },
  {
    id: "tos-game",
    title: "Terms of Service",
    description: "Find the absurd clauses in legal text",
    icon: "\uD83D\uDCDC",
    path: "/games/tos-game",
    category: "puzzle",
    isNew: true,
    isDeep: true,
  },
];

const DEEP_GAME_IDS = new Set([
  "code-review",
  "tos-game",
  "ecosystem",
  "galactic-census",
  "deja-vu",
]);

const categories: { key: Category; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "\u2B50" },
  { key: "arcade", label: "Arcade", icon: "\uD83D\uDD79\uFE0F" },
  { key: "puzzle", label: "Puzzle", icon: "\uD83E\uDDE9" },
  { key: "reflex", label: "Reflex", icon: "\u26A1" },
  { key: "creative", label: "Creative", icon: "\uD83C\uDFA8" },
  { key: "simulation", label: "Simulation", icon: "\uD83C\uDF0D" },
  { key: "trivia", label: "Trivia", icon: "\uD83E\uDDE0" },
  { key: "multiplayer", label: "Multiplayer", icon: "\uD83D\uDC65" },
  { key: "deep", label: "Deep Games", icon: "\uD83C\uDF0A" },
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
  deep: "var(--color-yellow)",
};

const sortOptions: { key: SortOption; label: string }[] = [
  { key: "newest", label: "NEWEST" },
  { key: "most-played", label: "MOST PLAYED" },
  { key: "a-z", label: "A-Z" },
];

export default function GamesPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setMounted(true);
    fetch("/api/games/plays")
      .then((res) => res.json())
      .then((data: Record<string, number>) => setPlayCounts(data))
      .catch(() => {});
  }, []);

  const filteredGames = useMemo(() => {
    let result = [...games];

    // Category filter
    if (activeFilter === "deep") {
      result = result.filter((g) => g.isDeep);
    } else if (activeFilter !== "all") {
      result = result.filter((g) => g.category === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => {
          if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
          return 0;
        });
        break;
      case "most-played":
        result.sort(
          (a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0)
        );
        break;
      case "a-z":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [activeFilter, searchQuery, sortBy, playCounts]);

  const multiplayerCount = games.filter(
    (g) => g.category === "multiplayer"
  ).length;
  const uniqueCategories = new Set(games.map((g) => g.category)).size;

  if (!mounted) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--color-bg)" }}
      />
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Grid background */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header Section */}
        <header className="pt-12 pb-6 px-4 text-center">
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
              className="pixel-text text-xs sm:text-sm animate-flicker mb-4"
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
              {filteredGames.length} OF {games.length} GAMES
            </p>
          </ScrollReveal>
        </header>

        {/* Search + Sort Row */}
        <ScrollReveal delay={250}>
          <div className="max-w-5xl mx-auto px-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {"\uD83D\uDD0D"}
                </span>
                <input
                  type="text"
                  placeholder="SEARCH GAMES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pixel-text text-[10px] w-full pl-9 pr-4 py-2.5 border-2 outline-none transition-all duration-200"
                  style={{
                    background: "var(--color-bg-card)",
                    borderColor: searchQuery
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) => {
                    if (!searchQuery) {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }
                  }}
                />
              </div>

              {/* Sort dropdown */}
              <div className="flex gap-1.5">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className="pixel-text text-[9px] sm:text-[10px] px-2.5 sm:px-3 py-2 border-2 transition-all duration-200 cursor-pointer whitespace-nowrap"
                    style={{
                      borderColor:
                        sortBy === opt.key
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                      background:
                        sortBy === opt.key
                          ? "var(--color-accent)"
                          : "var(--color-bg-card)",
                      color:
                        sortBy === opt.key
                          ? "var(--color-bg)"
                          : "var(--color-text-secondary)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filter Bar */}
        <ScrollReveal delay={300}>
          <nav className="max-w-5xl mx-auto px-4 mb-10">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {categories.map((cat) => {
                const isActive = activeFilter === cat.key;
                const count =
                  cat.key === "all"
                    ? games.length
                    : cat.key === "deep"
                      ? games.filter((g) => g.isDeep).length
                      : games.filter((g) => g.category === cat.key).length;
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
                    <span className="mr-1.5">{cat.icon}</span>
                    {cat.label.toUpperCase()}
                    <span
                      className="ml-1.5 opacity-70"
                      style={{
                        fontSize: "0.65em",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </ScrollReveal>

        {/* Game Cards Grid */}
        <main className="max-w-5xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGames.map((game, index) => {
              const isMultiplayer = game.category === "multiplayer";
              const color = categoryColors[game.category];

              return (
                <ScrollReveal key={game.id} delay={index * 60} variant="scale">
                  <Link href={game.path} className="block group">
                    <div
                      className="pixel-card p-6 text-center transition-all duration-250 relative overflow-hidden"
                      style={{
                        minHeight: "240px",
                        borderColor: isMultiplayer ? color : undefined,
                        animation: isMultiplayer
                          ? "multiplayer-pulse 3s ease-in-out infinite"
                          : undefined,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform =
                          "translateY(-4px)";
                        e.currentTarget.style.boxShadow = `0 8px 24px ${color}30, 0 0 20px ${color}15`;
                        e.currentTarget.style.borderColor = color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "";
                        if (!isMultiplayer) {
                          e.currentTarget.style.borderColor = "";
                        }
                      }}
                    >
                      {/* Badges - top row */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className="flex gap-1.5">
                          {isMultiplayer && (
                            <span
                              className="pixel-text text-[7px] px-1.5 py-0.5"
                              style={{
                                background: "var(--color-green)",
                                color: "#fff",
                              }}
                            >
                              MULTIPLAYER
                            </span>
                          )}
                          {game.isDeep && (
                            <span
                              className="pixel-text text-[7px] px-1.5 py-0.5"
                              style={{
                                background: "var(--color-yellow)",
                                color: "#000",
                              }}
                            >
                              DEEP
                            </span>
                          )}
                        </div>
                        {game.isNew && (
                          <span
                            className="pixel-text text-[7px] px-1.5 py-0.5 animate-glow-pulse"
                            style={{
                              background: "var(--color-accent)",
                              color: "var(--color-bg)",
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Cabinet screen area */}
                      <div
                        className="mx-auto mb-4 mt-4 w-20 h-20 flex items-center justify-center border-2 transition-all duration-250 group-hover:scale-110"
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
                        className="text-xs mb-3 leading-relaxed"
                        style={{
                          color: "var(--color-text-muted)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {game.description}
                      </p>

                      {/* Player count for multiplayer */}
                      {game.playerCount && (
                        <p
                          className="pixel-text text-[8px] mb-2"
                          style={{ color: "var(--color-green)" }}
                        >
                          {game.playerCount.toUpperCase()}
                        </p>
                      )}

                      {/* Category badge + play count */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span
                          className="pixel-text text-[8px] px-2 py-1 border inline-block"
                          style={{
                            borderColor: color,
                            color: color,
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
                          {isMultiplayer ? "START LOBBY" : "PLAY"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredGames.length === 0 && (
            <div className="text-center py-20">
              <p
                className="pixel-text text-2xl mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                NO GAMES FOUND
              </p>
              <p
                className="text-sm mb-6"
                style={{
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No games in this category yet"}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="pixel-btn text-[10px] cursor-pointer"
              >
                SHOW ALL GAMES
              </button>
            </div>
          )}
        </main>

        {/* Stats Footer */}
        <footer
          className="border-t-2 mt-8 py-10 px-4 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-6">
                <div>
                  <p
                    className="pixel-text text-lg sm:text-xl mb-1"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {games.length}
                  </p>
                  <p
                    className="pixel-text text-[8px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    TOTAL GAMES
                  </p>
                </div>
                <div>
                  <p
                    className="pixel-text text-lg sm:text-xl mb-1"
                    style={{ color: "var(--color-green)" }}
                  >
                    {multiplayerCount}
                  </p>
                  <p
                    className="pixel-text text-[8px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    MULTIPLAYER
                  </p>
                </div>
                <div>
                  <p
                    className="pixel-text text-lg sm:text-xl mb-1"
                    style={{ color: "var(--color-purple)" }}
                  >
                    {uniqueCategories}
                  </p>
                  <p
                    className="pixel-text text-[8px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    CATEGORIES
                  </p>
                </div>
                <div>
                  <p
                    className="pixel-text text-lg sm:text-xl mb-1"
                    style={{ color: "var(--color-yellow)" }}
                  >
                    {DEEP_GAME_IDS.size}
                  </p>
                  <p
                    className="pixel-text text-[8px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    DEEP GAMES
                  </p>
                </div>
              </div>
              <p
                className="pixel-text text-[10px] sm:text-xs mb-6"
                style={{ color: "var(--color-text-muted)" }}
              >
                TOTAL PLAY TIME: INFINITE
              </p>
              <div>
                <Link href="/" className="pixel-btn inline-block text-[10px]">
                  RETURN TO LOBBY
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </footer>
      </div>

      {/* Multiplayer pulse animation */}
      <style jsx>{`
        @keyframes multiplayer-pulse {
          0%,
          100% {
            box-shadow: 0 0 5px var(--color-green);
          }
          50% {
            box-shadow: 0 0 15px var(--color-green), 0 0 25px var(--color-green);
          }
        }
      `}</style>
    </div>
  );
}
