"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

interface Project {
  title: string;
  description: string;
  techStack: string[];
  link: string;
  icon: string;
}

interface ArcadeGame {
  title: string;
  description: string;
  path: string;
  status: "playable" | "coming-soon";
  art: string[];
}

interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

interface Stat {
  label: string;
  value: string | number;
  icon: string;
}

/* ============================================
   STATIC DATA
   ============================================ */

const PROJECTS: Project[] = [
  {
    title: "Radiordle",
    description:
      "A daily radiology puzzle: read the image, make the diagnosis, and solve each case in five guesses. Live and playable every day.",
    techStack: ["Next.js", "Supabase", "Playwright"],
    link: "https://www.radiordle.org/",
    icon: "[XR]",
  },
  {
    title: "CFB Games",
    description:
      "A live college football arcade featuring The 16-0 Draft and Guess the Season—draft legends across eras, then test your CFB memory.",
    techStack: ["React", "TypeScript", "Supabase"],
    link: "https://cfb-games.com/",
    icon: "16-0",
  },
  {
    title: "Fern Replay",
    description:
      "Git-native 3-way merge engine that keeps customers' hand-edits alive across SDK regenerations. Designed and built it solo at Fern; live in production for ElevenLabs and Auth0. I wrote up what it taught me about git.",
    techStack: ["TypeScript", "git internals", "diff3"],
    link: "/writing/regeneration-is-a-rebase",
    icon: "<->",
  },
  {
    title: "Retro Arcade",
    description:
      "The 33 browser games on this site, including realtime multiplayer over WebSocket channels — lobbies, room codes, reconnection and all. Start with Merge Conflict.",
    techStack: ["Next.js", "Canvas", "Supabase Realtime"],
    link: "/games",
    icon: "##",
  },
];

const ARCADE_GAMES: ArcadeGame[] = [
  {
    title: "SLEVENS",
    description: "Shake-to-roll dice drinking game",
    path: "/games/slevens",
    status: "playable",
    art: [
      "  .-----.  ",
      " /  o    \\ ",
      "|    o    |",
      " \\  o   / ",
      "  '-----'  ",
    ],
  },
  {
    title: "SNAKE",
    description: "Classic snake with pixel graphics",
    path: "/games/snakes",
    status: "playable",
    art: [
      " ~~>       ",
      "   \\       ",
      "    \\____  ",
      "         | ",
      "    *    | ",
    ],
  },
  {
    title: "MERGE CONFLICT",
    description: "Multiplayer: merge code before your team does",
    path: "/games/merge-conflict",
    status: "playable",
    art: [
      " <<<<<<<   ",
      "  a = 1;   ",
      " =======   ",
      "  a = 2;   ",
      " >>>>>>>   ",
    ],
  },
];

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/tstanmay13",
    icon: "[ git ]",
  },
  {
    label: "Twitter / X",
    href: "https://twitter.com/tstanmay13",
    icon: "[ x__ ]",
  },
  {
    label: "Email",
    href: "mailto:contact@tanmay-singh.com",
    icon: "[ @>> ]",
  },
];

// Inventory-style loadout — the tools actually in daily use, no invented percentages.
const LOADOUT: { slot: string; items: string }[] = [
  { slot: "LANGUAGES", items: "TypeScript · Java · Python · Rust · Go" },
  { slot: "WIRE", items: "WebSockets · SSE · OAuth2 · OpenAPI" },
  { slot: "INFRA", items: "AWS · Postgres · Docker · Vercel" },
  { slot: "AGENTS", items: "Claude SDK · MCP · agent-readiness evals" },
];

const ROTATING_PROJECTS = [
  "a Rust CLI generator",
  "agent-readiness tooling",
  "SDKs in six languages",
  "too many browser games",
];

/* ============================================
   SUBCOMPONENTS
   ============================================ */

function TypingText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[index];

    if (!deleting && displayed === current) {
      const timeout = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }

    if (deleting && displayed === "") {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const speed = deleting ? 40 : 80;
    const timeout = setTimeout(() => {
      setDisplayed(
        deleting
          ? current.slice(0, displayed.length - 1)
          : current.slice(0, displayed.length + 1)
      );
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayed, deleting, index, texts]);

  return (
    <span>
      {displayed}
      <span
        className="animate-cursor-blink inline-block ml-0.5"
        style={{ color: "var(--color-accent)" }}
      >
        _
      </span>
    </span>
  );
}

function TerminalWindow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pixel-border rounded-none overflow-hidden"
      style={{ background: "var(--color-bg-card)" }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b-2"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
        }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "var(--color-red)" }}
        />
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "var(--color-orange)" }}
        />
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        <span
          className="pixel-text text-xs ml-2"
          style={{ color: "var(--color-text-muted)", fontSize: "0.625rem" }}
        >
          {title}
        </span>
      </div>
      {/* Content */}
      <div className="p-5 mono-text text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function LoadoutRow({ slot, items }: { slot: string; items: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3 last:mb-0">
      <span
        className="pixel-text w-28 text-right shrink-0"
        style={{ color: "var(--color-accent)", fontSize: "0.625rem" }}
      >
        {slot}
      </span>
      <span
        className="mono-text text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {items}
      </span>
    </div>
  );
}

/* ============================================
   MAIN PAGE COMPONENT
   ============================================ */

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contributions, setContributions] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const aboutRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If an API fails we keep the placeholder rather than a made-up number.
    const fetchContributions = async () => {
      try {
        const response = await fetch("/api/github-contributions");
        if (!response.ok) {
          throw new Error("Failed to fetch contributions");
        }
        const data = await response.json();
        setContributions(data.totalContributions);
      } catch (error) {
        console.error("Failed to fetch GitHub contributions:", error);
      }
    };
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/portfolio/repos");
        if (!response.ok) throw new Error("Failed to fetch repos");
        const data = await response.json();
        setProjectCount(data.repos?.length ?? null);
      } catch {
        // leave null
      }
    };
    fetchContributions();
    fetchProjects();
  }, []);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // The classic trio — live numbers where possible, placeholders while loading.
  const heroStats: Stat[] = [
    { label: "YRS EXP", value: "3+", icon: ">" },
    {
      label: "PROJECTS",
      value: projectCount !== null ? `${projectCount}` : "...",
      icon: "#",
    },
    {
      label: "COMMITS",
      value: contributions !== null ? contributions.toLocaleString() : "...",
      icon: "*",
    },
  ];

  if (!mounted) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--color-bg)" }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* ============================================
         SECTION 1: HERO
         ============================================ */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 relative">
        {/* Decorative floating pixels */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-float"
              style={{
                background: "var(--color-accent)",
                opacity: 0.15,
                top: `${15 + i * 15}%`,
                left: `${10 + i * 14}%`,
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}
        </div>

        {/* ASCII art decoration */}
        <div
          className="mono-text text-xs mb-6 text-center animate-fade-in-up hidden sm:block"
          style={{ color: "var(--color-text-muted)", animationDelay: "0.1s" }}
          aria-hidden="true"
        >
          <pre>{`
    ╔══════════════════════════════════════╗
    ║  > SYSTEM BOOT... OK                ║
    ║  > LOADING PROFILE... OK            ║
    ║  > WELCOME, PLAYER 1                ║
    ╚══════════════════════════════════════╝
          `}</pre>
        </div>

        {/* Main title */}
        <h1
          className="pixel-text text-3xl sm:text-5xl md:text-6xl text-center mb-4 leading-tight"
          style={{ color: "var(--color-text)" }}
        >
          TANMAY{" "}
          <span style={{ color: "var(--color-accent)" }}>SINGH</span>
        </h1>

        {/* Subtitle with typing effect */}
        <p
          className="mono-text text-lg sm:text-xl md:text-2xl text-center mb-10"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span style={{ color: "var(--color-accent)" }}>&gt;</span>{" "}
          <TypingText
            texts={[
              "Senior Software Engineer",
              "Game Builder",
              "SDK Generator Author",
              "Agent Tooling Nerd",
            ]}
          />
        </p>

        {/* Stats bar */}
        <div
          className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-12 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          {heroStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="pixel-text text-xl sm:text-2xl mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>
                  {stat.icon}
                </span>{" "}
                {stat.value}
              </div>
              <div
                className="pixel-text"
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.625rem",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* PRESS START button */}
        <button
          onClick={scrollToAbout}
          className="pixel-btn animate-glow-pulse"
        >
          PRESS START
        </button>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span className="pixel-text" style={{ fontSize: "0.625rem" }}>
            v v v
          </span>
        </div>
      </section>

      {/* ============================================
         SECTION 2: ABOUT / BIO
         ============================================ */}
      <section
        ref={aboutRef}
        className="max-w-4xl mx-auto px-4 py-20"
        id="about"
      >
        <ScrollReveal>
          <h2
            className="pixel-text text-xl sm:text-2xl mb-8"
            style={{ color: "var(--color-accent)" }}
          >
            {"//"} ABOUT
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <TerminalWindow title="tanmay@dev:~$ cat about.txt">
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-accent)" }}>$</span> I build the
              machinery that turns API specs into SDKs people actually want to
              use — six languages, streaming, auth, pagination, the hard parts.
              Lately that includes a git-native merge engine (Replay) and tooling
              that makes CLIs legible to AI agents.
            </p>
            <br />
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-accent)" }}>$</span> This site is
              mostly an excuse to build games. There are 33 in the arcade,
              multiplayer included. Try Merge Conflict — it&apos;s basically my
              day job with a scoreboard.
            </p>
            <br />
            <p style={{ color: "var(--color-text-muted)" }}>
              <span style={{ color: "var(--color-orange)" }}>currently crafting:</span>{" "}
              <TypingText texts={ROTATING_PROJECTS} />
            </p>
          </TerminalWindow>
        </ScrollReveal>

        {/* Daily-driver tools, inventory style */}
        <ScrollReveal delay={200}>
          <div className="mt-10">
            <h3
              className="pixel-text text-sm mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              LOADOUT
            </h3>
            <div
              className="pixel-border p-5"
              style={{ background: "var(--color-bg-card)" }}
            >
              {LOADOUT.map((row) => (
                <LoadoutRow key={row.slot} slot={row.slot} items={row.items} />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
         SECTION 3: FEATURED PROJECTS
         ============================================ */}
      <section className="max-w-5xl mx-auto px-4 py-20" id="projects">
        <ScrollReveal>
          <h2
            className="pixel-text text-xl sm:text-2xl mb-10"
            style={{ color: "var(--color-accent)" }}
          >
            {"//"} PROJECTS
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROJECTS.map((project, i) => (
            <ScrollReveal key={project.title} delay={i * 100}>
              <a
                href={project.link}
                target={project.link.startsWith("http") ? "_blank" : undefined}
                rel={
                  project.link.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="pixel-card block p-6 h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="pixel-text text-lg"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {project.icon}
                  </span>
                  <span
                    className="mono-text text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    &rarr;
                  </span>
                </div>
                <h3
                  className="pixel-text text-sm mb-3"
                  style={{ color: "var(--color-text)" }}
                >
                  {project.title}
                </h3>
                <p
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="pixel-text px-2 py-1"
                      style={{
                        fontSize: "0.625rem",
                        color: "var(--color-accent)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg-secondary)",
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ============================================
         SECTION 4: GAMES ARCADE
         ============================================ */}
      <section className="max-w-5xl mx-auto px-4 py-20" id="arcade">
        <ScrollReveal>
          <h2
            className="pixel-text text-xl sm:text-2xl mb-2 text-center inline-block w-full"
            style={{ color: "var(--color-accent)" }}
          >
            ARCADE
          </h2>
          <p
            className="pixel-text text-center mb-10"
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.625rem",
            }}
          >
            INSERT COIN TO PLAY
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {ARCADE_GAMES.map((game, i) => (
            <ScrollReveal key={game.title} delay={i * 120}>
              <Link
                href={game.path}
                className="pixel-card block p-5 text-center group"
              >
                {/* ASCII art thumbnail */}
                <pre
                  className="mono-text text-xs mb-4 leading-tight transition-colors duration-300"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {game.art.map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < game.art.length - 1 ? "\n" : ""}
                    </span>
                  ))}
                </pre>
                <h3
                  className="pixel-text text-sm mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {game.title}
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {game.description}
                </p>
                {game.status === "playable" ? (
                  <span
                    className="pixel-text inline-block px-3 py-1"
                    style={{
                      fontSize: "0.625rem",
                      color: "var(--color-bg)",
                      background: "var(--color-accent)",
                    }}
                  >
                    PLAY NOW
                  </span>
                ) : (
                  <span
                    className="pixel-text inline-block px-3 py-1"
                    style={{
                      fontSize: "0.625rem",
                      color: "var(--color-text-muted)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    COMING SOON
                  </span>
                )}
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <div className="text-center">
            <Link href="/games" className="pixel-btn inline-block">
              ENTER THE ARCADE
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
         SECTION 5: GITHUB ACTIVITY
         ============================================ */}
      <section className="max-w-4xl mx-auto px-4 py-20" id="github">
        <ScrollReveal>
          <h2
            className="pixel-text text-xl sm:text-2xl mb-8"
            style={{ color: "var(--color-accent)" }}
          >
            {"//"} GITHUB XP
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div
            className="pixel-border p-6"
            style={{ background: "var(--color-bg-card)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="pixel-text text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                @tstanmay13
              </span>
              <span
                className="pixel-text"
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.625rem",
                }}
              >
                LIFETIME XP
              </span>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
              <div
                className="w-full h-8 relative"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "2px solid var(--color-border)",
                }}
              >
                <div
                  className="h-full transition-all duration-2000 ease-out"
                  style={{
                    width: contributions !== null ? "100%" : "0%",
                    background:
                      "linear-gradient(90deg, var(--color-accent-secondary), var(--color-accent))",
                    boxShadow: "0 0 15px var(--color-accent-glow)",
                    transitionDuration: "2s",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="pixel-text text-sm"
                    style={{
                      color:
                        contributions !== null
                          ? "var(--color-bg)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {contributions !== null
                      ? `${contributions.toLocaleString()} XP`
                      : "LOADING..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex justify-between">
              <span
                className="mono-text text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                total contributions across all repos
              </span>
              <a
                href="https://github.com/tstanmay13"
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-text transition-colors duration-200 hover:underline"
                style={{
                  fontSize: "0.625rem",
                  color: "var(--color-accent)",
                }}
              >
                VIEW PROFILE &rarr;
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
         SECTION 6: CONTACT CTA
         ============================================ */}
      <section className="max-w-4xl mx-auto px-4 py-20 mb-10" id="contact">
        <ScrollReveal>
          <div
            className="pixel-border-accent p-8 sm:p-12 text-center"
            style={{ background: "var(--color-bg-card)" }}
          >
            <h2
              className="pixel-text text-lg sm:text-2xl mb-4"
              style={{ color: "var(--color-text)" }}
            >
              PLAYER 2{" "}
              <span style={{ color: "var(--color-accent)" }}>
                WANTED
              </span>
            </h2>
            <p
              className="mono-text text-sm mb-8"
              style={{ color: "var(--color-text-secondary)" }}
            >
              I&apos;m in NYC building SDK and agent tooling. If you want to
              talk shop — or you beat my Snake high score — say hi.
            </p>

            {/* Social links */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={
                    social.href.startsWith("mailto") ? undefined : "_blank"
                  }
                  rel={
                    social.href.startsWith("mailto")
                      ? undefined
                      : "noopener noreferrer"
                  }
                  className="pixel-card px-5 py-3 inline-flex flex-col items-center gap-1 min-w-[100px]"
                >
                  <span
                    className="mono-text text-sm font-bold"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {social.icon}
                  </span>
                  <span
                    className="pixel-text"
                    style={{
                      fontSize: "0.625rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {social.label}
                  </span>
                </a>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="pixel-btn inline-block">
                START CONVERSATION
              </Link>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-btn inline-block"
                style={{
                  background: "transparent",
                  color: "var(--color-accent)",
                  border: "2px solid var(--color-accent)",
                }}
              >
                VIEW RESUME
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="text-center py-8">
        <p
          className="pixel-text"
          style={{ fontSize: "0.625rem", color: "var(--color-text-muted)" }}
        >
          &copy; {new Date().getFullYear()} TANMAY SINGH &middot; NYC
        </p>
      </footer>
    </div>
  );
}
