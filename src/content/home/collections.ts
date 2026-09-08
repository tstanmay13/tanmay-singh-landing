// Personal details supplied by Tanmay, September 8, 2026.
// Steam figures are a dated snapshot, not live activity or inferred favorites.
export const STEAM_URL =
  "https://steamcommunity.com/profiles/76561198101473427/";

export const GAMES = [
  {
    id: "pokemon",
    name: "Pokémon",
    detail: "Gengar, shiny Kyogre & Salamence",
    mark: "◓",
    color: "purple",
    story:
      "Gengar has my heart. Pink shiny Kyogre and Salamence are right up there, too. The Pokémon cards have started taking up real shelf space.",
    note: "A few favorites",
  },
  {
    id: "hades",
    name: "Hades",
    detail: "The mythology. The story. Another run.",
    mark: "♜",
    color: "red",
    story:
      "I love mythology, so Hades feels very at home here. The story is a huge part of why I love it. Percy Jackson and The Odyssey are on the same shelf for a reason.",
    note: "80.1 hours on Steam",
  },
  {
    id: "hades-2",
    name: "Hades II",
    detail: "More room for the underworld",
    mark: "☾",
    color: "green",
    story:
      "I love the Hades games. The sequel gets a permanent spot beside the original.",
    note: "Another favorite",
  },
  {
    id: "destiny",
    name: "Destiny 2",
    detail: "Quite a few hours in orbit",
    mark: "✦",
    color: "blue",
    story:
      "The most-played game in my Steam library. The hours probably say enough.",
    note: "803.6 hours on Steam",
  },
  {
    id: "minecraft",
    name: "Minecraft",
    detail: "A lot of time in a blocky world",
    mark: "▧",
    color: "green",
    story:
      "I play a lot of Minecraft. Some of the best parts of my gaming life don’t show up on Steam.",
    note: "A well-loved world",
  },
  {
    id: "tft",
    name: "Teamfight Tactics",
    detail: "One more comp",
    mark: "♟",
    color: "gold",
    story: "I love TFT. It absolutely belongs on this shelf.",
    note: "Another favorite",
  },
  {
    id: "spire",
    name: "Slay the Spire 2",
    detail: "There goes another evening",
    mark: "♠",
    color: "coral",
    story: "Another sizeable chapter of my Steam library, one run at a time.",
    note: "146.8 hours on Steam",
  },
] as const;

export const PROJECTS = [
  {
    name: "Radiordle",
    mark: "XR",
    kind: "A daily puzzle",
    description:
      "Read the radiology image. Make the diagnosis. Five guesses to solve the case.",
    href: "https://www.radiordle.org/",
  },
  {
    name: "CFB Games",
    mark: "16–0",
    kind: "For college football people",
    description:
      "Draft legends across eras, or try to guess the season. My college football obsession found an outlet.",
    href: "https://cfb-games.com/",
  },
  {
    name: "Fern Replay",
    mark: "↔",
    kind: "Something I built at work",
    description:
      "A merge engine that keeps people’s hand-edits alive when their SDKs regenerate. Here’s what building it taught me about git.",
    href: "/writing/regeneration-is-a-rebase",
  },
  {
    name: "The arcade",
    mark: "A+B",
    kind: "A shelf of little distractions",
    description:
      "Games to play alone, with a friend, or with everyone passing a phone around. Start with Merge Conflict.",
    href: "/games",
  },
] as const;

export const KEEPSAKES = [
  {
    name: "Gengar",
    subtitle: "The collection",
    text: "Pokémon cards, Naruto cards, and a soft spot for Gengar. Collectibles have a way of becoming part of the furniture.",
    color: "purple",
    symbol: "◓",
  },
  {
    name: "Dallas, always",
    subtitle: "The keepsakes",
    text: "The Mavericks. Dirk Nowitzki. Luka. Still a little sad about that last one.",
    color: "blue",
    symbol: "41",
  },
  {
    name: "Hook ’em",
    subtitle: "Saturdays",
    text: "UT Austin and college football. Enough of an obsession that I made a whole website of college football games.",
    color: "coral",
    symbol: "UT",
  },
  {
    name: "Forza Ferrari",
    subtitle: "Sundays",
    text: "F1 and Ferrari. There’s a little red car on the shelf for a reason.",
    color: "red",
    symbol: "F1",
  },
] as const;
