import type { Metadata } from "next";
import Link from "next/link";
import SelectedProjects from "@/components/showcase/SelectedProjects";
import styles from "@/components/showcase/showcase.module.css";

export const metadata: Metadata = {
  title: "Things I’ve made — Tanmay Singh",
  description:
    "Football games, daily puzzles, an arcade, and a few tools I needed.",
};

const tools = [
  {
    title: "Claude Code session search",
    description:
      "Built because I kept losing good sessions. Search the old ones, pick one, and carry on where you left off.",
    href: "https://github.com/tstanmay13/claude-code-search-",
  },
  {
    title: "debrief",
    description:
      "A Claude Code plugin that asks you to recall what happened at the end of a session. A way to check what actually stuck.",
    href: "https://github.com/tstanmay13/debrief",
  },
  {
    title: "product-view",
    description:
      "A plugin that brings an agent’s explanation back to what someone using the product will see and do.",
    href: "https://github.com/tstanmay13/product-view",
  },
  {
    title: "Agent Tracking Portal",
    description:
      "When several agents are working at once, this puts the ones that need me in one place.",
    href: "https://github.com/tstanmay13/agent-tracking-portal",
  },
];

export default function PortfolioPage() {
  return (
    <div className={styles.page} data-personal-page>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1>Things I’ve made.</h1>
          <p>
            Games, mostly. And a few tools for problems I kept running into.
          </p>
        </header>
        <section className={styles.section} aria-label="Selected projects">
          <SelectedProjects />
        </section>
        <section className={styles.section} aria-labelledby="tools-heading">
          <div className={styles.sectionHeader}>
            <h2 id="tools-heading">Smaller things that stuck around.</h2>
          </div>
          <div className={styles.smallThings}>
            {tools.map((tool) => (
              <article key={tool.href} className={styles.smallThing}>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
                <a
                  className={styles.textLink}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  On GitHub <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.aside} aria-labelledby="fern-heading">
          <h2 id="fern-heading">And at work, Fern Replay.</h2>
          <div>
            <p>
              I built a merge engine that keeps people’s edits intact when their
              SDKs regenerate. It’s in production for ElevenLabs and Auth0.
            </p>
            <Link
              className={styles.textLink}
              href="/writing/regeneration-is-a-rebase"
            >
              The story, including what broke
            </Link>
            <details className={styles.notes}>
              <summary>What I built</summary>
              <p>
                I designed and built Replay solo at Fern. It finds customer
                edits in git history and replays them onto newly generated code.
                The difficult part was handling the ways real repositories
                change: squash merges, force pushes, and shallow clones.
              </p>
              <a
                className={styles.textLink}
                href="https://www.npmjs.com/package/@fern-api/replay"
                target="_blank"
                rel="noopener noreferrer"
              >
                The package on npm
              </a>
            </details>
          </div>
        </section>
        <footer className={styles.footer}>
          <Link className={styles.textLink} href="/">
            Back home
          </Link>
          <a
            className={styles.textLink}
            href="https://github.com/tstanmay13?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
          >
            More experiments on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
