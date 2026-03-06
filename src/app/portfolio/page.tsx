"use client";

import { useState } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

type ProjectStatus = "Live" | "In Progress" | "Archived";

interface Project {
  id: string;
  icon: string;
  name: string;
  description: string;
  techStack: string[];
  status: ProjectStatus;
  githubUrl?: string;
  liveUrl?: string;
}

const projects: Project[] = [
  {
    id: "tanmay-singh-com",
    icon: "🌐",
    name: "tanmay-singh.com",
    description:
      "Personal portfolio with retro pixel-art aesthetic, 20+ browser games, and interactive experiences.",
    techStack: ["Next.js", "React", "TypeScript", "Tailwind"],
    status: "Live",
    githubUrl: "https://github.com/tanmaysingh/tanmay-singh-landing",
    liveUrl: "https://tanmay-singh.com",
  },
  {
    id: "slevens",
    icon: "🎲",
    name: "Slevens",
    description:
      "Shake-to-roll dice drinking game with mobile motion detection.",
    techStack: ["React", "DeviceMotion API"],
    status: "Live",
    liveUrl: "/games/slevens",
  },
  {
    id: "code-playground",
    icon: "🛠️",
    name: "Code Playground",
    description:
      "Browser-based code editor with live preview and collaboration.",
    techStack: ["React", "Monaco Editor", "WebSockets"],
    status: "In Progress",
    githubUrl: "https://github.com/tanmaysingh/code-playground",
  },
  {
    id: "ai-chat-interface",
    icon: "🤖",
    name: "AI Chat Interface",
    description:
      "Sleek chat UI for interacting with multiple AI models.",
    techStack: ["Next.js", "OpenAI API", "Streaming"],
    status: "In Progress",
    githubUrl: "https://github.com/tanmaysingh/ai-chat",
  },
  {
    id: "weather-dashboard",
    icon: "🌤️",
    name: "Weather Dashboard",
    description:
      "Real-time weather app with beautiful data visualizations.",
    techStack: ["React", "D3.js", "Weather API"],
    status: "Live",
    githubUrl: "https://github.com/tanmaysingh/weather-dashboard",
    liveUrl: "https://weather.tanmay-singh.com",
  },
  {
    id: "task-manager-cli",
    icon: "📋",
    name: "Task Manager CLI",
    description:
      "Terminal-based task management with natural language parsing.",
    techStack: ["Node.js", "TypeScript", "CLI"],
    status: "Archived",
    githubUrl: "https://github.com/tanmaysingh/task-manager-cli",
  },
];

const STATUS_CONFIG: Record<
  ProjectStatus,
  { color: string; bg: string; border: string }
> = {
  Live: {
    color: "var(--color-accent)",
    bg: "rgba(0, 255, 136, 0.1)",
    border: "var(--color-accent)",
  },
  "In Progress": {
    color: "var(--color-orange)",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "var(--color-orange)",
  },
  Archived: {
    color: "var(--color-text-muted)",
    bg: "rgba(85, 85, 112, 0.1)",
    border: "var(--color-text-muted)",
  },
};

const FILTER_OPTIONS: Array<{ label: string; value: ProjectStatus | "All" }> = [
  { label: "All", value: "All" },
  { label: "Live", value: "Live" },
  { label: "In Progress", value: "In Progress" },
  { label: "Archived", value: "Archived" },
];

const TECH_COLORS: Record<string, string> = {
  "Next.js": "var(--color-purple)",
  React: "var(--color-cyan)",
  TypeScript: "var(--color-blue)",
  Tailwind: "var(--color-accent)",
  "DeviceMotion API": "var(--color-orange)",
  "Monaco Editor": "var(--color-pink)",
  WebSockets: "var(--color-purple)",
  "OpenAI API": "var(--color-accent)",
  Streaming: "var(--color-cyan)",
  "D3.js": "var(--color-orange)",
  "Weather API": "var(--color-blue)",
  "Node.js": "var(--color-accent)",
  CLI: "var(--color-text-secondary)",
};

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "All">(
    "All"
  );

  const filteredProjects =
    activeFilter === "All"
      ? projects
      : projects.filter((p) => p.status === activeFilter);

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Background grid pattern */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 md:py-16">
        {/* Back link */}
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 pixel-text text-xs mb-10 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            <span>&lt;-</span>
            <span>HOME</span>
          </Link>
        </ScrollReveal>

        {/* Header */}
        <ScrollReveal delay={100}>
          <header className="text-center mb-12 md:mb-16">
            <h1
              className="pixel-text text-3xl md:text-5xl mb-4 animate-flicker"
              style={{
                color: "var(--color-accent)",
                textShadow:
                  "0 0 20px var(--color-accent-glow), 0 0 40px var(--color-accent-glow)",
              }}
            >
              PORTFOLIO
            </h1>
            <p
              className="text-lg md:text-xl"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Projects &amp; Creations
            </p>
            <div
              className="mx-auto mt-6 h-[2px] w-24"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
              }}
            />
          </header>
        </ScrollReveal>

        {/* Filter Bar */}
        <ScrollReveal delay={200}>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className="pixel-text text-[10px] px-4 py-2 transition-all duration-200 border-2"
                  style={{
                    borderColor: isActive
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    backgroundColor: isActive
                      ? "var(--color-accent)"
                      : "transparent",
                    color: isActive
                      ? "var(--color-bg)"
                      : "var(--color-text-secondary)",
                    boxShadow: isActive
                      ? "0 0 15px var(--color-accent-glow), 3px 3px 0 var(--color-accent-secondary)"
                      : "none",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project, index) => (
            <ScrollReveal key={project.id} delay={100 + index * 80}>
              <div className="pixel-card rounded-lg p-6 h-full flex flex-col">
                {/* Icon and Status Row */}
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{project.icon}</span>
                  <span
                    className="pixel-text text-[8px] px-2 py-1 rounded-sm border"
                    style={{
                      color: STATUS_CONFIG[project.status].color,
                      backgroundColor: STATUS_CONFIG[project.status].bg,
                      borderColor: STATUS_CONFIG[project.status].border,
                    }}
                  >
                    {project.status}
                  </span>
                </div>

                {/* Project Name */}
                <h3
                  className="pixel-text text-sm mb-3"
                  style={{ color: "var(--color-text)" }}
                >
                  {project.name}
                </h3>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed mb-4 flex-grow"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {project.description}
                </p>

                {/* Tech Stack Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="mono-text text-[10px] px-2 py-0.5 rounded-sm"
                      style={{
                        color: TECH_COLORS[tech] || "var(--color-text-secondary)",
                        backgroundColor: "var(--color-surface)",
                        border: `1px solid ${
                          TECH_COLORS[tech] || "var(--color-border)"
                        }`,
                        opacity: 0.85,
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Links */}
                <div className="flex gap-3 mt-auto">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pixel-text text-[9px] px-3 py-2 border-2 transition-all duration-200"
                      style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-text)";
                        e.currentTarget.style.color = "var(--color-text)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-border)";
                        e.currentTarget.style.color =
                          "var(--color-text-secondary)";
                      }}
                    >
                      GitHub
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target={
                        project.liveUrl.startsWith("/") ? "_self" : "_blank"
                      }
                      rel={
                        project.liveUrl.startsWith("/")
                          ? undefined
                          : "noopener noreferrer"
                      }
                      className="pixel-text text-[9px] px-3 py-2 border-2 transition-all duration-200"
                      style={{
                        borderColor: "var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-accent)";
                        e.currentTarget.style.color = "var(--color-bg)";
                        e.currentTarget.style.boxShadow =
                          "0 0 15px var(--color-accent-glow)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--color-accent)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Empty state */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p
              className="pixel-text text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              No projects match this filter.
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <ScrollReveal delay={300}>
          <div className="text-center mt-16 md:mt-20">
            <div
              className="inline-block pixel-card rounded-lg px-8 py-8 md:px-12"
            >
              <p
                className="pixel-text text-sm md:text-base mb-6"
                style={{ color: "var(--color-text)" }}
              >
                Want to collaborate?
              </p>
              <Link
                href="/contact"
                className="pixel-btn inline-block"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer spacer */}
        <div className="h-10" />
      </div>
    </div>
  );
}
