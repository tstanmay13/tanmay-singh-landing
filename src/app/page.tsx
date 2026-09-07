import Link from "next/link";
import Preview from "@/components/showcase/Preview";
import SelectedProjects from "@/components/showcase/SelectedProjects";
import GamePicks from "@/components/showcase/GamePicks";
import styles from "@/components/showcase/showcase.module.css";

export default function Home() {
  return (
    <div className={styles.page} data-personal-page>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <h1>
              Tanmay
              <br />
              Singh
            </h1>
            <p>
              I live in New York. I try a lot of things. A lot of them turn into
              games.
            </p>
            <div className={styles.heroLinks}>
              <Link className={styles.textLink} href="/games">
                Find something to play
              </Link>
              <a className={styles.textLink} href="#projects">
                Other things I’ve made
              </a>
            </div>
          </div>
          <Link
            className={styles.cabinet}
            href="/games/snakes"
            aria-label="Play Snake"
          >
            <div className={styles.cabinetTop}>
              <span>Snake</span>
              <span>A familiar place to start</span>
            </div>
            <Preview kind="snake" />
            <div className={styles.cabinetBottom}>
              <span>
                Go on, play a round <span aria-hidden="true">↗</span>
              </span>
              <span className={styles.buttons} aria-hidden="true">
                <i />
                <i />
              </span>
            </div>
          </Link>
        </header>
        <section
          className={styles.section}
          id="projects"
          style={{ scrollMarginTop: 90 }}
          aria-labelledby="projects-heading"
        >
          <div className={styles.sectionHeader}>
            <h2 id="projects-heading">A couple of things I’ve made.</h2>
            <Link className={styles.textLink} href="/portfolio">
              More projects
            </Link>
          </div>
          <SelectedProjects compact />
        </section>
        <section className={styles.section} aria-labelledby="arcade-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="arcade-heading">There’s a whole arcade in here.</h2>
            </div>
            <Link className={styles.textLink} href="/games">
              All games
            </Link>
          </div>
          <GamePicks />
        </section>
        <section className={styles.aside} aria-labelledby="writing-heading">
          <h2 id="writing-heading">Occasionally, I write.</h2>
          <div>
            <p>
              Building a merge engine taught me a few things about git the hard
              way. Including that a pull request description can be too long.
            </p>
            <Link
              className={styles.textLink}
              href="/writing/regeneration-is-a-rebase"
            >
              Regeneration is a rebase
            </Link>
          </div>
        </section>
        <footer className={styles.footer}>
          <span>Tanmay Singh · New York</span>
          <div>
            <a
              className={styles.textLink}
              href="mailto:contact@tanmay-singh.com"
            >
              Say hi
            </a>
            <a
              className={styles.textLink}
              href="https://github.com/tstanmay13"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <Link className={styles.textLink} href="/contact">
              Elsewhere
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
