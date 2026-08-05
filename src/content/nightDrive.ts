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
    eyebrow: "Tanmay Singh · New York City",
    headline: "I build the systems behind good developer experiences.",
    body:
      "Senior software engineer working across SDK generation, identity, real-time systems, and agent tooling — with a habit of turning side ideas into things people can actually use.",
    proof: ["3+ years", "SDKs + agents", "33 browser games"],
    links: [
      {
        label: "Start the drive",
        href: "#downtown",
        detail: "Selected work ahead",
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
    eyebrow: "Selected work",
    headline: "Useful systems, shipped into the real world.",
    body:
      "The work spans generated code, daily games, and data-heavy products. The common thread is careful infrastructure made approachable at the surface.",
    proof: ["Production systems", "Independent products", "End-to-end ownership"],
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
    eyebrow: "Practice",
    headline: "Deep in the stack. Curious at the edges.",
    body:
      "I work mostly in TypeScript, Java, Python, Rust, and Go, with current attention on agent-ready APIs, reliable code generation, streaming systems, and the tools that make complex platforms feel simple.",
    proof: ["TypeScript · Java", "Rust · Go · Python", "WebSockets · SSE · OpenAPI"],
    links: [
      {
        label: "Explore the portfolio",
        href: "/portfolio",
        detail: "The projects behind the toolchain",
        primary: true,
      },
      {
        label: "Read the résumé",
        href: "/resume.pdf",
        detail: "Experience and technical focus",
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
    eyebrow: "Playground",
    headline: "The fastest way to understand my work is to play it.",
    body:
      "The arcade holds 33 browser games: quick solo experiments, pass-the-phone chaos, and real-time multiplayer rooms built on Supabase Realtime.",
    proof: ["33 games", "7 online multiplayer", "No install"],
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
    eyebrow: "Writing",
    headline: "Notes from inside the machinery.",
    body:
      "Long-form writing stays close to systems I have actually built. Few pieces, on purpose — each one earns the transmission.",
    proof: ["Engineering essays", "Real systems", "No filler"],
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
    eyebrow: "Open channel",
    headline: "Good systems start with a clear conversation.",
    body:
      "If you are building developer infrastructure, agent tooling, or a product that needs both technical depth and a sharp interface, I would like to hear about it.",
    proof: ["NYC", "contact@tanmay-singh.com", "Usually replies within a few days"],
    links: [
      {
        label: "Start a conversation",
        href: "/contact",
        detail: "Send a message",
        primary: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/tstanmay13",
        detail: "Code, experiments, and current work",
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
