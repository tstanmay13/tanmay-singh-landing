"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import PixelPlayground from "@/components/PixelPlayground";
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
  { label: "GitHub", href: "https://github.com/tstanmay13" },
  { label: "Twitter / X", href: "https://twitter.com/tstanmay13" },
  { label: "Email", href: "mailto:contact@tanmay-singh.com" },
];

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
    const fetchContributions = async () => {
      try {
        const response = await fetch("/api/github-contributions");
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.totalContributions === "number") {
          setContributions(data.totalContributions);
        }
      } catch {
        // Keep the placeholder rather than a made-up number.
      }
    };
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/portfolio/repos");
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.projectCount === "number") {
          setProjectCount(data.projectCount);
        }
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

  const heroStats: Stat[] = [
    { label: "YRS EXP", value: "4", icon: ">" },
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
      <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 relative">
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

        <h1
          className="pixel-text text-3xl sm:text-5xl md:text-6xl text-center mb-8 leading-tight"
          style={{ color: "var(--color-text)" }}
        >
          TANMAY{" "}
          <span style={{ color: "var(--color-accent)" }}>SINGH</span>
        </h1>

        <div
          className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-12"
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

        <button onClick={scrollToAbout} className="pixel-btn">
          about
        </button>
        <PixelPlayground />
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
            ABOUT
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div
            className="pixel-border p-6 sm:p-8 mono-text text-sm leading-relaxed"
            style={{ background: "var(--color-bg-card)" }}
          >
            <p style={{ color: "var(--color-text-secondary)" }}>
              I live in New York. I try a lot of things. Some of them stick,
              some of them don&apos;t. A lot of them are games, which is why
              this place looks like an arcade.
            </p>
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
            PROJECTS
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
            GAMES
          </h2>
          <p
            className="text-center mb-10 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            A few to start. There are 33.
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
                    Play
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
              All games
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
            GITHUB
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div
            className="pixel-border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{ background: "var(--color-bg-card)" }}
          >
            <div>
              <p
                className="pixel-text text-sm mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                @tstanmay13
              </p>
              <p
                className="mono-text text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {contributions !== null
                  ? `${contributions.toLocaleString()} contributions`
                  : "GitHub"}
              </p>
            </div>
            <a
              href="https://github.com/tstanmay13"
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-text hover:underline"
              style={{
                fontSize: "0.75rem",
                color: "var(--color-accent)",
              }}
            >
              Profile &rarr;
            </a>
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
              SAY HI
            </h2>
            <p
              className="mono-text text-sm mb-8"
              style={{ color: "var(--color-text-secondary)" }}
            >
              I&apos;m in New York. If you want to talk, email me.
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
                  className="pixel-card px-5 py-3 inline-flex items-center justify-center min-w-[100px]"
                >
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
                Contact
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
                Resume
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
