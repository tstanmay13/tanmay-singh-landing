"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  GAMES,
  KEEPSAKES,
  PROJECTS,
  STEAM_URL,
} from "@/content/home/collections";
import type { RoomObject } from "./PixelHome";
import styles from "./home.module.css";
const PackOpener = dynamic(() => import("./PackOpener"), {
  loading: () => <p role="status">Getting the packs…</p>,
});

const SourMixer = dynamic(() => import("./SourGame"), {
  loading: () => <p role="status">Setting out the shaker…</p>,
});
const FerrariToy = dynamic(() => import("./FerrariToy"), {
  loading: () => <p role="status">Getting the little red car…</p>,
});

const Mario = dynamic(() => import("@/components/PixelPlayground"), {
  loading: () => <p role="status">Getting the television ready…</p>,
});
const TRACKS = [
  {
    title: "Power Trip",
    artist: "J. Cole & Miguel",
    id: "7FOJvA3PxiIU0DN3JjQ7jT",
    color: "coral",
  },
  {
    title: "ATM",
    artist: "Don Toliver",
    id: "0FrESd7LNffZyGZ37VuSmH",
    color: "green",
  },
  {
    title: "Street Lights",
    artist: "Kanye West",
    id: "6j8gTlbhj9KJSeypNcNAS9",
    color: "blue",
  },
  {
    title: "La Vie En Rose",
    artist: "Cristin Milioti · How I Met Your Mother",
    id: "7FMudQFEInauBuk4OP1yhT",
    color: "gold",
  },
] as const;

function GameShelf() {
  const [selected, setSelected] = useState<string>("pokemon");
  const game = GAMES.find((item) => item.id === selected) ?? GAMES[0];
  return (
    <>
      <p className={styles.lead}>
        The ones I love, and a few that have claimed a considerable number of
        hours.
      </p>
      <div className={styles.gameShelf} aria-label="Choose a game">
        {GAMES.map((item) => (
          <button
            key={item.id}
            className={styles.cartridge}
            data-color={item.color}
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
          >
            <span className={styles.cartridgeNotch} />
            <span className={styles.cartridgeArt} aria-hidden="true">
              {item.mark}
            </span>
            <strong>{item.name}</strong>
            <span className={styles.cartridgeLines} />
          </button>
        ))}
      </div>
      <article
        className={styles.gameStory}
        data-color={game.color}
        aria-live="polite"
      >
        <span className={styles.gameStoryMark} aria-hidden="true">
          {game.mark}
        </span>
        <div>
          <p className={styles.caption}>{game.note}</p>
          <h3>{game.name}</h3>
          <p>{game.story}</p>
        </div>
      </article>
      <div className={styles.linkRow}>
        <Link href="/games" className={styles.primaryLink}>
          Play something in my arcade
        </Link>
        <a href={STEAM_URL} target="_blank" rel="noreferrer">
          My Steam profile ↗
        </a>
      </div>
      <p className={styles.finePrint}>
        Steam playtime from September 8, 2026. Favorites are personal; hours are
        just hours.
      </p>
    </>
  );
}

function Music() {
  const [selected, setSelected] = useState(0);
  const [player, setPlayer] = useState(false);
  const track = TRACKS[selected];
  return (
    <>
      <p className={styles.lead}>
        J. Cole and Kanye, with detours through The Strokes, BETWEEN FRIENDS,
        and Balu Brigada. A few selections from my Spotify all-time playlist:
      </p>
      <div className={styles.stereo} data-color={track.color}>
        <div className={styles.record} aria-hidden="true">
          <span>TS</span>
        </div>
        <div>
          <p className={styles.caption}>On the turntable</p>
          <h3>{track.title}</h3>
          <p>{track.artist}</p>
          <button
            className={styles.primaryLink}
            onClick={() => setPlayer((value) => !value)}
            aria-expanded={player}
          >
            {player ? "Put the needle away" : "Listen here"}
          </button>
        </div>
      </div>
      {player && (
        <iframe
          key={track.id}
          className={styles.spotifyPlayer}
          src={`https://open.spotify.com/embed/track/${track.id}`}
          width="100%"
          height="152"
          title={`Spotify: ${track.title}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}
      <div className={styles.trackList} aria-label="Choose a record">
        {TRACKS.map((item, index) => (
          <button
            key={item.id}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            <span aria-hidden="true">{index === selected ? "♫" : "○"}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.artist}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className={styles.aside}>
        Yes, the HIMYM version of “La Vie En Rose” made the all-time list. The
        winter rewatch is serious.
      </p>
      <a
        href={`https://open.spotify.com/track/${track.id}`}
        target="_blank"
        rel="noreferrer"
      >
        Open on Spotify ↗
      </a>
    </>
  );
}

export default function RoomContents({
  active,
  onExplore,
  onClose,
  onServe,
}: {
  active: RoomObject;
  onExplore: (object: RoomObject) => void;
  onClose: () => void;
  onServe?: () => void;
}) {
  switch (active) {
    case "games":
      return <GameShelf />;
    case "mario":
      return (
        <>
          <div className={styles.tvChoice}>
            <span aria-hidden="true">⚔</span>
            <div>
              <h3>One more escape?</h3>
              <p>
                Underworld, my little Hades homage. Twelve chambers, god boons,
                bosses, and a reason to try again.
              </p>
              <Link
                className={styles.primaryLink}
                href="/games/underworld"
                prefetch={false}
              >
                Play Underworld
              </Link>
            </div>
          </div>
          <p className={styles.lead}>
            The original 32 courses. Stay for a level, or several.
          </p>
          <Mario onExit={onClose} embedded />
          <div className={styles.linkRow}>
            <Link href="/games" className={styles.primaryLink}>
              Visit the whole arcade
            </Link>
            <button onClick={() => onExplore("sofa")}>
              What else is on TV?
            </button>
          </div>
        </>
      );
    case "desk":
      return (
        <>
          <p className={styles.lead}>
            I try a lot of things. Some become games. Some become tools. These
            are a few that stuck.
          </p>
          <div className={styles.projects}>
            {PROJECTS.map((project) => (
              <a
                key={project.name}
                href={project.href}
                target={project.href.startsWith("http") ? "_blank" : undefined}
                rel={project.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <span className={styles.projectMark} aria-hidden="true">
                  {project.mark}
                </span>
                <div>
                  <small>{project.kind}</small>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
          <Link href="/portfolio" className={styles.primaryLink}>
            More from my desk
          </Link>
        </>
      );
    case "music":
      return <Music />;
    case "keepsakes":
      return (
        <>
          <p className={styles.lead}>
            The cards, the teams, and the small things that make a place mine.
          </p>
          <PackOpener />
          <FerrariToy />
          <div className={styles.keepsakes}>
            {KEEPSAKES.map((item) => (
              <article key={item.name} data-color={item.color}>
                <span className={styles.keepsakeMark} aria-hidden="true">
                  {item.symbol}
                </span>
                <small>{item.subtitle}</small>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <p className={styles.aside}>
            Also on the Pokémon team: pink shiny Kyogre and Salamence.
          </p>
          <button
            className={styles.primaryLink}
            onClick={() => onExplore("games")}
          >
            Look through the game shelf
          </button>
        </>
      );
    case "books":
      return (
        <>
          <p className={styles.lead}>
            I love mythology. Give me gods, monsters, and a very long journey
            home.
          </p>
          <div className={styles.bookShelf}>
            <div className={styles.book} data-color="blue">
              <span aria-hidden="true">♆</span>
              <strong>
                Percy
                <br />
                Jackson
              </strong>
              <small>Rick Riordan</small>
            </div>
            <div className={styles.book} data-color="gold">
              <span aria-hidden="true">≈</span>
              <strong>
                The
                <br />
                Odyssey
              </strong>
              <small>Homer</small>
            </div>
            <div className={styles.book} data-color="red">
              <span aria-hidden="true">☾</span>
              <strong>
                Hades
                <br />& Hades II
              </strong>
              <small>Another way into myth</small>
            </div>
          </div>
          <p>
            Percy Jackson is a favorite, I’ve read The Odyssey, and the Hades
            games get a permanent place nearby. Different ways of spending more
            time with mythology.
          </p>
          <div className={styles.writingNote}>
            <p className={styles.caption}>From my own notebook</p>
            <h3>Regeneration is a rebase</h3>
            <p>
              What building a merge engine for generated code taught me about
              trusting git history.
            </p>
            <Link href="/writing/regeneration-is-a-rebase">
              Read the essay ↗
            </Link>
          </div>
        </>
      );
    case "sofa":
      return (
        <>
          <div className={styles.winterNote}>
            <span aria-hidden="true">☂</span>
            <div>
              <p className={styles.caption}>An annual tradition</p>
              <h3>Every winter, HIMYM.</h3>
              <p>
                I’ve watched it enough to have a lot of the lines memorized.
                It’s the best. New Girl is in the regular rotation, too.
              </p>
              <button onClick={() => onExplore("music")}>
                Find “La Vie En Rose” on the stereo ↗
              </button>
            </div>
          </div>
          <div className={styles.watchList}>
            <article>
              <span aria-hidden="true">✦</span>
              <div>
                <h3>La La Land</h3>
                <p>My favorite movie. It’s so beautiful.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">♜</span>
              <div>
                <h3>Game of Thrones</h3>
                <p>Another world I love spending time in.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">⌂</span>
              <div>
                <h3>New Girl</h3>
                <p>Always happy to be back at the loft.</p>
              </div>
            </article>
          </div>
          <button
            className={styles.primaryLink}
            onClick={() => onExplore("mario")}
          >
            Switch the TV to Mario
          </button>
        </>
      );
    case "drink":
      return (
        <>
          <SourMixer onServe={onServe} />
          <p className={styles.lead}>
            I love a whiskey sour, and I love making one. It’s what I’d offer if
            you were actually here.
          </p>
          <p>
            Also very happy with a Guinness or a sour beer. Plenty of room for
            other beers, too. IPAs don’t really do it for me.
          </p>
          <div className={styles.linkRow}>
            <a
              href="mailto:contact@tanmay-singh.com"
              className={styles.primaryLink}
            >
              Say hello
            </a>
            <button onClick={() => onExplore("music")}>
              Pick something for the stereo
            </button>
          </div>
        </>
      );
    case "about":
      return (
        <>
          <p className={styles.lead}>
            I live in New York. I make games and tools, travel when I can, and
            get very attached to fictional worlds.
          </p>
          <p>
            I’ve called places in India, Massachusetts, and Texas home along the
            way. Austin gets a particularly big chapter. Hook ’em.
          </p>
          <p>
            Outside the things I build: mythology, Pokémon and Naruto cards, the
            Mavericks, Ferrari, college football, a whiskey sour, and a winter
            rewatch of How I Met Your Mother.
          </p>
          <p>
            This room is a little collection of all of that. Have a look around.
          </p>
          <div className={styles.linkRow}>
            <Link
              className={styles.primaryLink}
              href="/travel"
              prefetch={false}
            >
              Explore my life path
            </Link>
            <button onClick={() => onExplore("desk")}>See what I make</button>
            <a href="/resume.pdf" target="_blank" rel="noreferrer">
              Résumé ↗
            </a>
          </div>
        </>
      );
  }
}
