import Link from "next/link";
import Preview from "./Preview";
import styles from "./showcase.module.css";

export default function SelectedProjects({
  compact = false,
}: {
  compact?: boolean;
}) {
  const Heading = compact ? "h3" : "h2";
  return (
    <div className={styles.projects}>
      <article className={styles.project}>
        <a
          href="https://cfb-games.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.artLink}
          aria-label="Play CFB Games"
        >
          <Preview kind="football" />
        </a>
        <div className={styles.projectCopy}>
          <Heading>
            College football, <br />
            between Saturdays.
          </Heading>
          <p>
            Draft a team from players across eras. Try to go 16–0. Or see how
            much you remember in Guess the Season.
          </p>
          <a
            className={styles.textLink}
            href="https://cfb-games.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Play CFB Games <span aria-hidden="true">↗</span>
          </a>
          {!compact && (
            <details className={styles.notes}>
              <summary>A little more about it</summary>
              <p>
                Two games built around the same sport. The 16–0 Draft is about
                picking players across eras; Guess the Season is about
                remembering what actually happened.
              </p>
              <p>Built with React, TypeScript, and Supabase.</p>
            </details>
          )}
        </div>
      </article>
      <article className={`${styles.project} ${styles.reverse}`}>
        <a
          href="https://www.radiordle.org/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.artLink}
          aria-label="Play Radiordle"
        >
          <Preview kind="radiordle" />
        </a>
        <div className={styles.projectCopy}>
          <Heading>
            A daily puzzle. <br />
            This one has X-rays.
          </Heading>
          <p>
            Radiordle gives you an image and five guesses to work out the
            diagnosis. A new case every day.
          </p>
          <a
            className={styles.textLink}
            href="https://www.radiordle.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try today’s case <span aria-hidden="true">↗</span>
          </a>
          {!compact && (
            <details className={styles.notes}>
              <summary>A little more about it</summary>
              <p>
                The image is the question. Each daily case keeps the game small
                enough to come back to tomorrow.
              </p>
              <p>
                Built with Next.js and Supabase, with Playwright for browser
                testing. I also built Stat!, a daily medical-emergency puzzle
                with four timed decisions and physician-written scenarios.
              </p>
              <a
                href="https://github.com/tstanmay13/stat-"
                className={styles.textLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                See Stat! on GitHub
              </a>
            </details>
          )}
        </div>
      </article>
      {!compact && (
        <article className={styles.project}>
          <Link
            href="/games/merge-conflict"
            className={styles.artLink}
            aria-label="Play Merge Conflict"
          >
            <Preview kind="merge" />
          </Link>
          <div className={styles.projectCopy}>
            <Heading>
              Two people. <br />
              One questionable function.
            </Heading>
            <p>
              In Merge Conflict, you write code without seeing what the other
              person wrote. Then the game puts it together.
            </p>
            <Link className={styles.textLink} href="/games/merge-conflict">
              Play Merge Conflict <span aria-hidden="true">↗</span>
            </Link>
            <details className={styles.notes}>
              <summary>Behind the arcade</summary>
              <p>
                The multiplayer games use room codes to get people into the same
                game. Underneath are shared game state, realtime updates, and
                reconnection handling.
              </p>
              <p>
                The arcade also has solo games, drawing tools, and simulations.
                It became a fairly large corner of this site.
              </p>
              <Link className={styles.textLink} href="/games">
                Browse the arcade
              </Link>
            </details>
          </div>
        </article>
      )}
    </div>
  );
}
