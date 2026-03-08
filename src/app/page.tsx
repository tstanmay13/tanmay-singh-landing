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
    title: "Cloud Platform",
    description:
      "Scalable microservices platform with real-time monitoring, CI/CD pipelines, and automated infrastructure provisioning.",
    techStack: ["Go", "K8s", "AWS", "Terraform"],
    link: "https://github.com/tstanmay13",
    icon: "[ ]",
  },
  {
    title: "AI Chat Engine",
    description:
      "Conversational AI system with RAG pipeline, vector search, and streaming responses for enterprise knowledge bases.",
    techStack: ["Python", "FastAPI", "LangChain", "Pinecone"],
    link: "https://github.com/tstanmay13",
    icon: ">_",
  },
  {
    title: "Retro Arcade",
    description:
      "Collection of browser-based retro games with shake detection, leaderboards, and mobile-first touch controls.",
    techStack: ["Next.js", "TypeScript", "Canvas", "WebSocket"],
    link: "/games",
    icon: "##",
  },
  {
    title: "Dev Toolkit",
    description:
      "CLI tool suite for automating development workflows including code generation, DB migrations, and deployments.",
    techStack: ["Rust", "SQLite", "Docker", "gRPC"],
    link: "https://github.com/tstanmay13",
    icon: "./",
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
    title: "TETRIS",
    description: "Block-stacking puzzle game",
    path: "/games",
    status: "coming-soon",
    art: [
      " [][] []   ",
      " [][][][] ",
      "   [][][]  ",
      " [][][]    ",
      " [][][][]  ",
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

const TECH_STATS: { name: string; level: number; color: string }[] = [
  { name: "TypeScript", level: 92, color: "var(--color-blue)" },
  { name: "React/Next", level: 90, color: "var(--color-cyan)" },
  { name: "Node.js", level: 88, color: "var(--color-accent)" },
  { name: "Python", level: 82, color: "var(--color-orange)" },
  { name: "Go", level: 75, color: "var(--color-purple)" },
  { name: "DevOps", level: 78, color: "var(--color-pink)" },
];

const ROTATING_PROJECTS = [
  "retro game arcade",
  "AI-powered dev tools",
  "open source libraries",
  "cloud infrastructure",
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
          style={{ color: "var(--color-text-muted)", fontSize: "0.55rem" }}
        >
          {title}
        </span>
      </div>
      {/* Content */}
      <div className="p-5 mono-text text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function PixelBar({
  label,
  value,
  maxValue = 100,
  color,
}: {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="flex items-center gap-3 mb-2">
      <span
        className="pixel-text w-28 text-right shrink-0"
        style={{ color: "var(--color-text-secondary)", fontSize: "0.5rem" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-4 relative"
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      <span
        className="pixel-text w-10 shrink-0"
        style={{ color: "var(--color-text-muted)", fontSize: "0.5rem" }}
      >
        {value}
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
        setContributions(243);
      }
    };
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/portfolio/repos");
        if (!response.ok) throw new Error("Failed to fetch repos");
        const data = await response.json();
        setProjectCount(data.repos?.length ?? null);
      } catch {
        setProjectCount(37);
      }
    };
    fetchContributions();
    fetchProjects();
  }, []);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const heroStats: Stat[] = [
    { label: "YRS EXP", value: "3+", icon: ">" },
    { label: "PROJECTS", value: projectCount !== null ? `${projectCount}` : "...", icon: "#" },
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
          className="pixel-text text-3xl sm:text-5xl md:text-6xl text-center mb-4 animate-flicker leading-tight"
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
          <TypingText texts={["Full-Stack Developer", "Game Builder", "Open Source Contributor", "Problem Solver"]} />
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
                  fontSize: "0.5rem",
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
          <span className="pixel-text" style={{ fontSize: "0.5rem" }}>
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
              <span style={{ color: "var(--color-accent)" }}>$</span> Hey there.
              I&apos;m a full-stack developer who builds things for the web. I care
              about clean architecture, developer experience, and shipping products
              that actually work.
            </p>
            <br />
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-accent)" }}>$</span> When I&apos;m
              not pushing commits, I&apos;m building retro games, experimenting with
              new frameworks, or tinkering with side projects that probably
              won&apos;t make money but are fun to build.
            </p>
            <br />
            <p style={{ color: "var(--color-text-muted)" }}>
              <span style={{ color: "var(--color-orange)" }}>currently crafting:</span>{" "}
              <TypingText texts={ROTATING_PROJECTS} />
            </p>
          </TerminalWindow>
        </ScrollReveal>

        {/* Tech stack RPG stats */}
        <ScrollReveal delay={200}>
          <div className="mt-10">
            <h3
              className="pixel-text text-sm mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              SKILL TREE
            </h3>
            <div
              className="pixel-border p-5"
              style={{ background: "var(--color-bg-card)" }}
            >
              {TECH_STATS.map((tech) => (
                <PixelBar
                  key={tech.name}
                  label={tech.name}
                  value={tech.level}
                  color={tech.color}
                />
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
                        fontSize: "0.45rem",
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
            className="pixel-text text-xl sm:text-2xl mb-2 text-center animate-glow-pulse inline-block w-full"
            style={{
              color: "var(--color-accent)",
              textShadow:
                "0 0 10px var(--color-accent-glow), 0 0 30px var(--color-accent-glow)",
            }}
          >
            ARCADE
          </h2>
          <p
            className="pixel-text text-center mb-10"
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.55rem",
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
                      fontSize: "0.5rem",
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
                      fontSize: "0.5rem",
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
                  fontSize: "0.5rem",
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
                  fontSize: "0.5rem",
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
              GAME OVER?{" "}
              <span style={{ color: "var(--color-accent)" }}>
                LET&apos;S TALK!
              </span>
            </h2>
            <p
              className="mono-text text-sm mb-8"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Whether it&apos;s a project, a job, or just geeking out about
              tech -- I&apos;m all ears.
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
                      fontSize: "0.45rem",
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
          style={{ fontSize: "0.45rem", color: "var(--color-text-muted)" }}
        >
          CRAFTED WITH CODE & CAFFEINE &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
