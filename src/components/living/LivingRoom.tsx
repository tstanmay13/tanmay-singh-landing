"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { RoomObject } from "../home/PixelHome";
import homeStyles from "../home/home.module.css";
import styles from "./living.module.css";
import { useRoomCamera } from "./useRoomCamera";

const Contents = dynamic(() => import("../home/RoomContents"), {
  loading: () => <p role="status">Getting comfortable…</p>,
});
type ObjectId = RoomObject | "travel";
const OBJECTS: {
  id: ObjectId;
  name: string;
  x: number;
  y: number;
  title: string;
  note: string;
  glyph: string;
}[] = [
  {
    id: "mario",
    name: "The television",
    x: 18.5,
    y: 49,
    title: "One more level?",
    note: "Mario on the TV. The Underworld just a little further down.",
    glyph: "▣",
  },
  {
    id: "travel",
    name: "The travel map",
    x: 15,
    y: 24,
    title: "A few places I've called home.",
    note: "India. Texas. New York. And a lot of places in between.",
    glyph: "↗",
  },
  {
    id: "music",
    name: "The stereo",
    x: 25,
    y: 66,
    title: "Put a record on.",
    note: "J. Cole, late-night detours, and a little La Vie En Rose.",
    glyph: "♫",
  },
  {
    id: "keepsakes",
    name: "Cards & keepsakes",
    x: 22,
    y: 75,
    title: "The things I hold on to.",
    note: "Pokémon cards, Naruto cards, and a very loyal Mavericks fan.",
    glyph: "✦",
  },
  {
    id: "sofa",
    name: "The sofa",
    x: 46,
    y: 62,
    title: "You can take the good seat.",
    note: "Every winter, How I Met Your Mother goes back on.",
    glyph: "☂",
  },
  {
    id: "books",
    name: "The books",
    x: 47,
    y: 79,
    title: "Gods, monsters & a long way home.",
    note: "Percy Jackson, The Odyssey, and the margins in between.",
    glyph: "≋",
  },
  {
    id: "drink",
    name: "A whiskey sour",
    x: 61,
    y: 78,
    title: "I'll make you a drink.",
    note: "Rye, fresh lemon, turbinado, egg white. Shake longer.",
    glyph: "◇",
  },
  {
    id: "games",
    name: "The game shelf",
    x: 86,
    y: 24,
    title: "Worlds within this world.",
    note: "Gengar, shiny Kyogre, Hades, Minecraft, and far too much TFT.",
    glyph: "◓",
  },
  {
    id: "desk",
    name: "The desk",
    x: 84,
    y: 46,
    title: "Something's always in progress.",
    note: "Games, tools, and ideas that turned into things you can use.",
    glyph: "⌘",
  },
  {
    id: "about",
    name: "A little about me",
    x: 29,
    y: 26,
    title: "Hey, I'm Tanmay.",
    note: "I make things, get lost in games, and collect a few too many cards.",
    glyph: "✉",
  },
];
const CORNERS = [
  {
    name: "The whole room",
    short: "Home",
    x: 0.5,
    y: 0.51,
    zoom: 1.08,
    glyph: "⌂",
  },
  {
    name: "Explore the TV corner",
    short: "TV corner",
    x: 0.21,
    y: 0.54,
    zoom: 1.4,
    glyph: "▣",
  },
  {
    name: "Settle into the sofa",
    short: "The sofa",
    x: 0.51,
    y: 0.62,
    zoom: 1.35,
    glyph: "☂",
  },
  {
    name: "Explore the desk",
    short: "The desk",
    x: 0.84,
    y: 0.46,
    zoom: 1.4,
    glyph: "⌘",
  },
];

export default function LivingRoom() {
  const camera = useRoomCamera();
  const { go } = camera;
  const [corner, setCorner] = useState(0);
  const [selected, setSelected] = useState<ObjectId | null>(null);
  const [active, setActive] = useState<ObjectId | null>(null);
  const [lamp, setLamp] = useState(true);
  const [weather, setWeather] = useState<"clear" | "rain" | "snow">("rain");
  const [moving, setMoving] = useState(true);
  const [labels, setLabels] = useState(false);
  const [menu, setMenu] = useState(false);
  const [served, setServed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const arrival = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const homeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const object = OBJECTS.find((item) => item.id === selected);
  const onServe = useCallback(() => setServed(true), []);

  const explore = useCallback(
    (id: ObjectId) => {
      const destination = OBJECTS.find((item) => item.id === id)!;
      if (arrival.current) clearTimeout(arrival.current);
      lastTrigger.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setMenu(false);
      setSelected(id);
      setActive(null);
      go({
        x: destination.x / 100,
        y: destination.y / 100,
        zoom: 1.65,
        reading: true,
      });
      arrival.current = setTimeout(
        () => {
          setActive(id);
          arrival.current = null;
        },
        matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550,
      );
    },
    [go],
  );

  const stepBack = useCallback(() => {
    if (arrival.current) clearTimeout(arrival.current);
    setSelected(null);
    setActive(null);
    go(CORNERS[corner]);
    (lastTrigger.current?.isConnected
      ? lastTrigger.current
      : homeButton.current
    )?.focus({ preventScroll: true });
  }, [corner, go]);

  const visitCorner = (index: number) => {
    if (arrival.current) clearTimeout(arrival.current);
    setSelected(null);
    setActive(null);
    setCorner(index);
    setMenu(false);
    go(CORNERS[index]);
  };

  useEffect(() => {
    if (active) panel.current?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stepBack();
        setMenu(false);
      }
    };
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [stepBack]);
  useEffect(
    () => () => {
      if (arrival.current) clearTimeout(arrival.current);
    },
    [],
  );

  return (
    <div
      className={`${homeStyles.home} ${styles.world}`}
      data-moving={moving && !hidden}
      data-reading={!!selected}
    >
      <div
        className={styles.viewport}
        ref={camera.viewport}
        {...camera.gestures}
        aria-label="Explore Tanmay’s illustrated room. Drag or swipe to look around."
      >
        <div
          className={styles.scene}
          ref={camera.scene}
          data-lamp={lamp}
          data-labels={labels}
        >
          {/* The entire world is one compressed illustration; motion layers stay small and transparent. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.art}
            src="/home/room.webp"
            width={1659}
            height={948}
            alt="Tanmay’s pixel apartment at dusk, full of books, games, cards, a cozy sofa and a view of New York."
            fetchPriority="high"
            draggable={false}
          />
          <div
            className={styles.windowWeather}
            data-weather={weather}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </div>
          <div className={styles.cityLights} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.shootingStar} aria-hidden="true">
            <i />
          </div>
          <div className={styles.kyogreShimmer} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className={styles.tvGlow} aria-hidden="true" />
          <div className={styles.monitorCursor} aria-hidden="true" />
          <div className={styles.candleGlow} aria-hidden="true" />
          <div className={styles.lampGlow} aria-hidden="true" />
          <div className={styles.lightsDown} aria-hidden="true" />
          <div className={styles.dust} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className={styles.stereoLights} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          {OBJECTS.map((item) => (
            <button
              key={item.id}
              className={styles.object}
              style={
                { "--x": `${item.x}%`, "--y": `${item.y}%` } as CSSProperties
              }
              aria-label={
                item.id === "drink" && served
                  ? "Your whiskey sour — make another"
                  : item.name
              }
              aria-expanded={selected === item.id}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) {
                  go({ x: item.x / 100, y: item.y / 100, zoom: 1.35 });
                }
              }}
              onClick={() => explore(item.id)}
              tabIndex={selected ? -1 : 0}
            >
              <span className={styles.marker} aria-hidden="true">
                {item.glyph}
              </span>
              <span className={styles.objectName}>{item.name}</span>
            </button>
          ))}
          <button
            className={styles.lampButton}
            aria-label="Toggle the reading lamp"
            aria-pressed={lamp}
            onClick={() => setLamp((v) => !v)}
            tabIndex={selected ? -1 : 0}
          >
            <span>Click</span>
          </button>
          {served && (
            <span className={styles.servedDrink} aria-hidden="true">
              ✦ Made by you
            </span>
          )}
        </div>
      </div>

      <div className={styles.edgeShade} aria-hidden="true" />
      <header className={styles.header}>
        <button
          className={styles.signature}
          ref={homeButton}
          onClick={() => visitCorner(0)}
          aria-label="Return to the whole room"
        >
          <span>
            TS<span className={styles.signatureDot}>.</span>
          </span>
          <span>
            Tanmay’s place<small>New York · after hours</small>
          </span>
        </button>
        <nav aria-label="Room settings" className={styles.settings}>
          <button
            onClick={() =>
              setWeather((v) =>
                v === "rain" ? "snow" : v === "snow" ? "clear" : "rain",
              )
            }
            aria-label={`Window weather: ${weather}. Change weather.`}
          >
            <span aria-hidden="true">
              {weather === "rain" ? "☂" : weather === "snow" ? "❄" : "☾"}
            </span>
            <span className={styles.settingText}>
              {weather === "rain"
                ? "A little rain"
                : weather === "snow"
                  ? "Winter evening"
                  : "Clear skies"}
            </span>
          </button>
          <button
            onClick={() => setMoving((v) => !v)}
            aria-pressed={!moving}
            aria-label={
              moving ? "Pause room animations" : "Resume room animations"
            }
          >
            {moving ? "Ⅱ" : "▷"}
          </button>
          <button
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-label="Open room guide"
          >
            ☷<span className={styles.settingText}> Room guide</span>
          </button>
        </nav>
      </header>

      {menu && (
        <nav className={styles.guide} aria-label="Room guide">
          <p>Make yourself at home.</p>
          <small>
            Swipe or drag to look around. Tap a little detail to get closer.
          </small>
          <div>
            {OBJECTS.map((item) => (
              <button key={item.id} onClick={() => explore(item.id)}>
                <span aria-hidden="true">{item.glyph}</span>
                {item.name}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <button onClick={() => setLabels((v) => !v)} aria-pressed={labels}>
            {labels ? "Hide" : "Show"} object labels
          </button>
          <Link href="/room">Browse the room index ↗</Link>
        </nav>
      )}

      {!selected && (
        <div className={styles.invitation} key={corner}>
          <p>
            {corner === 0
              ? "HEY, I’M TANMAY."
              : ["", "ONE MORE LEVEL?", "NO RUSH.", "A WORK IN PROGRESS."][
                  corner
                ]}
          </p>
          <h1>
            {
              [
                "Stay a while.",
                "Pick your escape.",
                "The good seat’s yours.",
                "I like making things.",
              ][corner]
            }
          </h1>
          <span>
            {
              [
                "A little world of things I love. Come look around.",
                "Games, records, and things I’ve held on to.",
                "A long story, a familiar show, a whiskey sour.",
                "Some ideas make it off the desk.",
              ][corner]
            }
          </span>
        </div>
      )}

      {selected && (
        <button className={styles.back} onClick={stepBack}>
          ← Back to the room
        </button>
      )}
      {selected && !active && (
        <p className={styles.arriving} role="status">
          {object?.name}
        </p>
      )}
      {active && object && (
        <section
          className={styles.story}
          data-kind={active}
          ref={panel}
          tabIndex={-1}
          aria-labelledby="living-story-title"
          key={active}
        >
          <header>
            <p>{object.name}</p>
            <h2 id="living-story-title">{object.title}</h2>
            <button onClick={stepBack} aria-label="Close this corner">
              ×
            </button>
          </header>
          <div className={styles.storyBody}>
            {active === "travel" ? (
              <div className={styles.travelStory}>
                <p>{object.note}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/travel/stills/kyoto.png"
                  width={640}
                  height={360}
                  alt="Pixel illustration of Kyoto"
                />
                <p>
                  Follow the places, the moves, and the side quests on my travel
                  map.
                </p>
                <Link href="/travel" prefetch={false}>
                  Open the travel map ↗
                </Link>
              </div>
            ) : (
              <Contents
                active={active}
                onExplore={explore}
                onClose={stepBack}
                onServe={onServe}
              />
            )}
          </div>
        </section>
      )}

      {!selected && (
        <footer className={styles.footer}>
          <nav className={styles.corners} aria-label="Move around the room">
            {CORNERS.map((item, index) => (
              <button
                key={item.name}
                aria-label={item.name}
                aria-pressed={corner === index}
                onClick={() => visitCorner(index)}
              >
                <span aria-hidden="true">{item.glyph}</span>
                {item.short}
              </button>
            ))}
          </nav>
          <p>
            <span aria-hidden="true">↔</span> Swipe or drag to wander · tap to
            get closer
          </p>
        </footer>
      )}
    </div>
  );
}
