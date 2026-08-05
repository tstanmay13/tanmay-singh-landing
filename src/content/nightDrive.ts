export type DistrictAccent = "magenta" | "cyan" | "amber" | "violet";

export interface DistrictLink {
  label: string;
  href: string;
  detail?: string;
  external?: boolean;
  primary?: boolean;
}

/**
 * Optional slots for a future frame-locked cinematic pass. The local SVG city
 * remains the durable fallback, so adding media never changes portfolio copy.
 */
export interface DistrictMedia {
  poster: string | null;
  desktopClip: string | null;
  mobilePoster: string | null;
  mobileClip: string | null;
}

export interface NightDriveDistrict {
  id: string;
  code: string;
  label: string;
  eyebrow: string;
  headline: string;
  body: string;
  proof: string[];
  links: DistrictLink[];
  accent: DistrictAccent;
  scrollLength: number;
  linger: number;
  media: DistrictMedia;
}

const EMPTY_MEDIA: DistrictMedia = {
  poster: null,
  desktopClip: null,
  mobilePoster: null,
  mobileClip: null,
};

export const NIGHT_DRIVE_DISTRICTS: NightDriveDistrict[] = [
  {
    id: "city-limits",
    code: "ND-01",
    label: "City Limits",
    eyebrow: "Tanmay Singh · driving after dark",
    headline: "Hey, I’m Tanmay.",
    body:
      "I write software in New York, disappear into side projects, and keep building browser games long after I should have gone to sleep.",
    proof: ["Software engineer", "Game maker", "Occasional writer"],
    links: [
      {
        label: "Keep driving",
        href: "#downtown",
        detail: "Downtown is up ahead",
        primary: true,
      },
    ],
    accent: "magenta",
    scrollLength: 1.55,
    linger: 0.34,
    media: EMPTY_MEDIA,
  },
  {
    id: "downtown",
    code: "ND-02",
    label: "Downtown",
    eyebrow: "Things I’ve made",
    headline: "A few projects I couldn’t leave alone.",
    body:
      "A radiology guessing game, a college-football arcade, a merge engine for generated code, and a growing pile of smaller experiments.",
    proof: ["Daily puzzles", "Odd tools", "Side quests"],
    links: [
      {
        label: "Radiordle",
        href: "https://www.radiordle.org/",
        detail: "A daily radiology diagnosis puzzle",
        external: true,
        primary: true,
      },
      {
        label: "CFB Games",
        href: "https://cfb-games.com/",
        detail: "A live college football arcade",
        external: true,
      },
      {
        label: "Fern Replay",
        href: "/writing/regeneration-is-a-rebase",
        detail: "A git-native merge engine for generated SDKs",
      },
      {
        label: "All work",
        href: "/portfolio",
        detail: "Featured projects and live GitHub activity",
      },
    ],
    accent: "cyan",
    scrollLength: 1.7,
    linger: 0.42,
    media: EMPTY_MEDIA,
  },
  {
    id: "studio-district",
    code: "ND-03",
    label: "Studio District",
    eyebrow: "Current rabbit holes",
    headline: "What I’m messing with lately.",
    body:
      "Small Rust tools, agents that can actually find their way around a codebase, real-time multiplayer, weird browser APIs, and whichever language makes the idea more fun.",
    proof: ["Rust tools", "Agents", "Realtime games"],
    links: [
      {
        label: "Explore the portfolio",
        href: "/portfolio",
        detail: "More finished and unfinished things",
        primary: true,
      },
      {
        label: "Read the résumé",
        href: "/resume.pdf",
        detail: "The chronological version",
        external: true,
      },
    ],
    accent: "violet",
    scrollLength: 1.45,
    linger: 0.32,
    media: EMPTY_MEDIA,
  },
  {
    id: "arcade-pier",
    code: "ND-04",
    label: "Arcade Pier",
    eyebrow: "Open late",
    headline: "Thirty-three games. Pick one.",
    body:
      "Some take ten seconds. Some need a room full of friends. A suspicious number began as jokes and became fully working games.",
    proof: ["Solo", "Pass the phone", "Online multiplayer"],
    links: [
      {
        label: "Enter the arcade",
        href: "/games",
        detail: "Pick a game and start immediately",
        primary: true,
      },
      {
        label: "Play Merge Conflict",
        href: "/games/merge-conflict",
        detail: "Race your team to resolve the code",
      },
    ],
    accent: "amber",
    scrollLength: 1.6,
    linger: 0.4,
    media: EMPTY_MEDIA,
  },
  {
    id: "radio-hill",
    code: "ND-05",
    label: "Radio Hill",
    eyebrow: "One clear signal",
    headline: "A story about git, generators, and a very stubborn problem.",
    body:
      "I don’t publish often. This one is about building a merge engine and realizing regeneration behaves a lot like a rebase.",
    proof: ["12 min read", "Git internals", "One actual war story"],
    links: [
      {
        label: "Regeneration is a rebase",
        href: "/writing/regeneration-is-a-rebase",
        detail: "What a merge engine taught me about trusting git history",
        primary: true,
      },
      {
        label: "Writing archive",
        href: "/writing",
        detail: "All published transmissions",
      },
    ],
    accent: "magenta",
    scrollLength: 1.45,
    linger: 0.36,
    media: EMPTY_MEDIA,
  },
  {
    id: "last-exit",
    code: "ND-06",
    label: "Last Exit",
    eyebrow: "End of the road",
    headline: "That’s the city.",
    body:
      "GitHub has the code. The résumé has the chronological version. The contact page is there if you want to say hi.",
    proof: ["New York City", "contact@tanmay-singh.com", "Thanks for driving"],
    links: [
      {
        label: "Say hi",
        href: "/contact",
        detail: "Send a message",
        primary: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/tstanmay13",
        detail: "Code and unfinished experiments",
        external: true,
      },
      {
        label: "Résumé",
        href: "/resume.pdf",
        detail: "Open the PDF",
        external: true,
      },
    ],
    accent: "cyan",
    scrollLength: 1.7,
    linger: 0.48,
    media: EMPTY_MEDIA,
  },
];
