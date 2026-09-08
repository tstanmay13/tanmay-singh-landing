"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./home.module.css";

export type RoomObject =
  | "mario"
  | "games"
  | "desk"
  | "books"
  | "music"
  | "keepsakes"
  | "sofa"
  | "drink"
  | "about";
const RoomContents = dynamic(() => import("./RoomContents"), {
  loading: () => (
    <p className={styles.loading} role="status">
      Opening the room…
    </p>
  ),
});
const TITLES: Record<RoomObject, [string, string]> = {
  mario: ["The television", "Pick your escape."],
  games: ["The game shelf", "Worlds I keep coming back to."],
  desk: ["At my desk", "Things I’ve made."],
  books: ["The coffee table", "Gods, monsters & margins."],
  music: ["On the stereo", "A little of everything."],
  keepsakes: ["The collection", "Things that get shelf space."],
  sofa: ["Take a seat", "The familiar favorites."],
  drink: ["Pull up a chair", "I’ll make a whiskey sour."],
  about: ["The person who lives here", "Hey, I’m Tanmay."],
};
const OBJECTS: {
  id: RoomObject;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
}[] = [
  { id: "mario", label: "Play something", x: 6, y: 39, w: 23, h: 25 },
  { id: "games", label: "Game shelf", x: 74, y: 12, w: 24, h: 22 },
  { id: "desk", label: "My projects", x: 76, y: 36, w: 17, h: 25 },
  { id: "books", label: "Books & writing", x: 40, y: 73, w: 13, h: 12 },
  { id: "music", label: "Music corner", x: 21, y: 64, w: 8, h: 7 },
  {
    id: "keepsakes",
    label: "Cards & keepsakes",
    x: 17,
    y: 71,
    w: 12,
    h: 7,
    hidden: true,
  },
  {
    id: "sofa",
    label: "The winter rewatch",
    x: 33,
    y: 54,
    w: 34,
    h: 19,
    hidden: true,
  },
  {
    id: "drink",
    label: "A whiskey sour",
    x: 58,
    y: 73,
    w: 6,
    h: 12,
    hidden: true,
  },
  {
    id: "about",
    label: "A little about me",
    x: 38,
    y: 12,
    w: 28,
    h: 34,
    hidden: true,
  },
];

export default function PixelHome() {
  const [active, setActive] = useState<RoomObject | null>(null);
  const [labels, setLabels] = useState(true);
  const [winter, setWinter] = useState(false);
  const [lamp, setLamp] = useState(true);
  const [ghost, setGhost] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setActive(null), []);
  const isOpen = active !== null;
  const focusObject = OBJECTS.find((object) => object.id === active);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!isOpen) {
      node.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      node.close();
    };
  }, [isOpen]);

  return (
    <div className={styles.home}>
      <div className={styles.container}>
        <header className={styles.intro}>
          <div>
            <p className={styles.greeting}>Hey, I’m Tanmay.</p>
            <h1>Come hang out.</h1>
          </div>
          <p className={styles.introNote}>
            I make things, get lost in games, and collect a few too many cards.
            <br />
            <span>This is my little corner of the world.</span>
          </p>
        </header>

        <section
          aria-label="Explore Tanmay’s pixel home"
          className={styles.world}
        >
          <div className={styles.sceneBar}>
            <span>
              <i aria-hidden="true" /> Home, New York
            </span>
            <div className={styles.sceneControls}>
              <button
                type="button"
                onClick={() => setWinter(!winter)}
                aria-pressed={winter}
                aria-label="Winter in the room"
              >
                <span aria-hidden="true">{winter ? "❄" : "☾"}</span>{" "}
                {winter ? "Winter rewatch" : "Blue hour"}
              </button>
              <button
                type="button"
                onClick={() => setLabels(!labels)}
                aria-pressed={labels}
                aria-label="Show room labels"
              >
                {labels ? "Hide labels" : "Show labels"}
              </button>
            </div>
          </div>
          <div className={styles.sceneViewport}>
            <div
              className={styles.scene}
              data-labels={labels}
              data-winter={winter}
              data-lamp={lamp}
              data-open={isOpen}
              style={
                {
                  "--room-focus": focusObject
                    ? `${focusObject.x + focusObject.w / 2}% ${focusObject.y + focusObject.h / 2}%`
                    : "50% 50%",
                } as CSSProperties
              }
            >
              {/* A responsive, static illustration avoids an always-running canvas. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.roomImage}
                src="/home/room.webp"
                srcSet="/home/room-small.webp 960w, /home/room.webp 1659w"
                sizes="(max-width: 700px) 900px, (max-width: 1300px) 96vw, 1240px"
                width="1659"
                height="948"
                fetchPriority="high"
                alt="A detailed pixel-art apartment at dusk: a New York window, travel map, Mario television, game and collectible shelves, a cozy green sofa, books, and a developer’s desk."
              />
              <div className={styles.lampShade} aria-hidden="true" />
              <button
                className={`${styles.hotspot} ${styles.lampSpot}`}
                data-secret="true"
                aria-label="Toggle the reading lamp"
                aria-pressed={lamp}
                onClick={() => setLamp((value) => !value)}
              >
                <span className={styles.hotspotLabel}>
                  {lamp ? "Lights down" : "Lights on"}
                </span>
              </button>
              <button
                className={`${styles.hotspot} ${styles.ghostSpot}`}
                data-secret="true"
                aria-label="Say hello to Gengar"
                onClick={() => setGhost((value) => value + 1)}
              >
                <span className={styles.hotspotLabel}>Psst, Gengar</span>
              </button>
              {ghost > 0 && (
                <span
                  key={ghost}
                  className={styles.ghostHello}
                  aria-live="polite"
                >
                  {
                    ["Gengaaaar.", "That’s my seat.", "One more run?", "Boo."][
                      (ghost - 1) % 4
                    ]
                  }
                </span>
              )}
              <div className={styles.snow} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <Link
                href="/travel"
                prefetch={false}
                className={`${styles.hotspot} ${styles.travelSpot}`}
                aria-label="Explore my travel map"
              >
                <span className={styles.hotspotLabel}>
                  <b aria-hidden="true">↗</b> Travel map
                </span>
              </Link>
              {OBJECTS.map((object) => (
                <button
                  key={object.id}
                  type="button"
                  className={styles.hotspot}
                  data-secret={object.hidden || undefined}
                  style={
                    {
                      "--x": `${object.x}%`,
                      "--y": `${object.y}%`,
                      "--w": `${object.w}%`,
                      "--h": `${object.h}%`,
                    } as CSSProperties
                  }
                  aria-label={object.label}
                  aria-haspopup="dialog"
                  onClick={() => setActive(object.id)}
                >
                  <span className={styles.hotspotLabel}>
                    <b aria-hidden="true">+</b> {object.label}
                  </span>
                </button>
              ))}
              <a
                href="mailto:contact@tanmay-singh.com"
                className={`${styles.hotspot} ${styles.letterSpot}`}
                aria-label="Say hello by email"
              >
                <span className={styles.hotspotLabel}>Say hi</span>
              </a>
            </div>
          </div>
          <div className={styles.sceneFoot}>
            <p>
              <span aria-hidden="true">✦</span> Click around. Everything has a
              story.
            </p>
            <span className={styles.panHint}>Swipe to explore the room</span>
            <span className={styles.desktopHint}>Make yourself at home.</span>
          </div>
        </section>

        <nav className={styles.roomNav} aria-label="Room shortcuts">
          <button onClick={() => setActive("mario")}>
            <span aria-hidden="true">▣</span> Play something
          </button>
          <Link href="/travel" prefetch={false}>
            <span aria-hidden="true">↗</span> Go exploring
          </Link>
          <button onClick={() => setActive("games")}>
            <span aria-hidden="true">◓</span> Games I love
          </button>
          <button onClick={() => setActive("music")}>
            <span aria-hidden="true">♫</span> Put a record on
          </button>
          <button onClick={() => setActive("keepsakes")}>
            <span aria-hidden="true">✦</span> The collection
          </button>
          <button onClick={() => setActive("desk")}>
            <span aria-hidden="true">⌘</span> Things I make
          </button>
        </nav>

        <section
          className={styles.postscript}
          aria-label="A little more about me"
        >
          <div className={styles.note}>
            <span className={styles.notePin} aria-hidden="true" />
            <h2>A few things you should know</h2>
            <p>
              Gengar gets a spot on the shelf. Mythology gets a spot in my head.{" "}
              <em>How I Met Your Mother</em> gets a rewatch every winter.
            </p>
            <button onClick={() => setActive("about")}>
              A little more about me <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className={styles.stay}>
            <p>
              India. Texas. New York.
              <br />A few homes, a lot of side quests.
            </p>
            <Link href="/travel" prefetch={false}>
              Follow the life path <span aria-hidden="true">↗</span>
            </Link>
            <div className={styles.smallLinks}>
              <Link href="/writing">Writing</Link>
              <Link href="/portfolio">Portfolio</Link>
              <a href="/resume.pdf" target="_blank" rel="noreferrer">
                Résumé
              </a>
            </div>
          </div>
        </section>
        <footer className={styles.footer}>
          <span>Thanks for stopping by.</span>
          <div>
            <a href="mailto:contact@tanmay-singh.com">Say hello</a>
            <a
              href="https://github.com/tstanmay13"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/tstanmay13"
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </a>
          </div>
          <span>Tanmay Singh</span>
        </footer>
      </div>

      <dialog
        ref={dialog}
        className={styles.dialog}
        data-kind={active}
        aria-labelledby="room-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              close();
          }
        }}
      >
        {active ? (
          <>
            <header className={styles.dialogHead}>
              <div>
                <p>{TITLES[active][0]}</p>
                <h2 id="room-dialog-title">{TITLES[active][1]}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Back to the room"
                autoFocus
              >
                <span aria-hidden="true">×</span>
                <span>Back to room</span>
              </button>
            </header>
            <div className={styles.dialogBody}>
              <RoomContents
                active={active}
                onExplore={setActive}
                onClose={close}
              />
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
