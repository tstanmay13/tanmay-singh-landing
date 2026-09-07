"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import GamePicks from "@/components/showcase/GamePicks";
import { games, type Category } from "@/content/games/catalog";
import styles from "@/components/showcase/showcase.module.css";

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "arcade", label: "Arcade" },
  { key: "puzzle", label: "Puzzles" },
  { key: "reflex", label: "Reflexes" },
  { key: "creative", label: "Make something" },
  { key: "simulation", label: "Simulations" },
  { key: "trivia", label: "Trivia" },
  { key: "multiplayer", label: "With friends" },
  { key: "deep", label: "Settle in" },
];
const marks: Record<string, string> = {
  arcade: "▶",
  puzzle: "?",
  reflex: "!",
  creative: "+",
  simulation: "∞",
  trivia: "??",
  multiplayer: "2P",
};
const oneDevice = new Set(["person-do-thing", "glitch-artist", "retro-reflex"]);

export default function GamesPage() {
  const [activeFilter, setActiveFilter] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("shelf");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsStatus, setCountsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/games/plays", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Play counts unavailable");
        return response.json();
      })
      .then((data) => {
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          !Object.values(data).every((value) => typeof value === "number")
        )
          throw new Error("Invalid play counts");
        setCounts(data);
        setCountsStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCountsStatus("error");
      });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = games.filter(
      (game) =>
        (activeFilter === "all" ||
          (activeFilter === "deep"
            ? game.isDeep
            : game.category === activeFilter)) &&
        (!query ||
          `${game.title} ${game.description}`.toLowerCase().includes(query)),
    );
    if (sort === "a-z") result.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "most-played")
      result.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    return result;
  }, [activeFilter, search, sort, counts]);

  return (
    <div className={styles.page} data-personal-page>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1>The arcade.</h1>
          <p>
            This is where a lot of my experiments end up. Pick something below
            and give it a go.
          </p>
        </header>
        <section className={styles.section} aria-labelledby="picks-heading">
          <div className={styles.sectionHeader}>
            <h2 id="picks-heading">Three places to start.</h2>
            <a className={styles.textLink} href="#all-games">
              Browse everything
            </a>
          </div>
          <GamePicks />
        </section>
        <section
          className={styles.section}
          id="all-games"
          style={{ scrollMarginTop: 90 }}
          aria-labelledby="all-heading"
        >
          <div className={styles.sectionHeader}>
            <h2 id="all-heading">The whole shelf.</h2>
            <p>
              Solo games, things to tinker with, and a few that need company.
            </p>
          </div>
          <div className={styles.filters}>
            <div className={styles.searchRow}>
              <input
                type="search"
                aria-label="Search games"
                placeholder="Find a game…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <label>
                Sort by
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="shelf">Shelf order</option>
                  <option value="a-z">Name</option>
                  <option
                    value="most-played"
                    disabled={countsStatus !== "ready"}
                  >
                    Most played
                    {countsStatus === "loading"
                      ? " (loading)"
                      : countsStatus === "error"
                        ? " (unavailable)"
                        : ""}
                  </option>
                </select>
              </label>
            </div>
            <div
              className={styles.categories}
              role="group"
              aria-label="Game categories"
            >
              {categories.map((category) => (
                <button
                  key={category.key}
                  aria-pressed={activeFilter === category.key}
                  onClick={() => setActiveFilter(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          <p className={styles.resultCount} role="status">
            {filtered.length} {filtered.length === 1 ? "game" : "games"}
            {activeFilter !== "all" || search.trim()
              ? ` of ${games.length}`
              : ""}
          </p>
          <div className={styles.gameGrid}>
            {filtered.map((game) => (
              <Link href={game.path} key={game.id} className={styles.game}>
                <span className={styles.gameMark} aria-hidden="true">
                  {marks[game.category]}
                </span>
                <div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <small>
                    {game.playerCount
                      ? `${game.playerCount}${oneDevice.has(game.id) ? "" : game.id === "merge-conflict" ? " online · Separate devices" : " · Separate devices"}`
                      : game.id === "slevens"
                        ? "Pass a phone around"
                        : "Solo"}
                  </small>
                </div>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className={styles.empty}>
              <p>No games match that combination.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                Clear the search and filters
              </button>
            </div>
          )}
        </section>
        <footer className={styles.footer}>
          <Link className={styles.textLink} href="/">
            Back home
          </Link>
          <a className={styles.textLink} href="mailto:contact@tanmay-singh.com">
            Tell me how it went
          </a>
        </footer>
      </div>
    </div>
  );
}
