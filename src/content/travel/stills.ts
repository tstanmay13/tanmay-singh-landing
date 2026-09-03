import type { CatalogCity } from "./types";

export type StillShot = {
  src: string;
  caption: string;
};

const SRC = {
  kyoto: "/travel/stills/kyoto.png",
  tokyo: "/travel/stills/tokyo.png",
  nyc: "/travel/stills/nyc.png",
  austin: "/travel/stills/austin.png",
  bangkok: "/travel/stills/bangkok.png",
  paris: "/travel/stills/paris.png",
  venice: "/travel/stills/venice.png",
  barcelona: "/travel/stills/barcelona.png",
  alps: "/travel/stills/alps.png",
  generic: "/travel/stills/generic.png",
  cancun: "/travel/stills/cancun.png",
  sydney: "/travel/stills/sydney.png",
  hanoi: "/travel/stills/hanoi.png",
  rome: "/travel/stills/rome.png",
} as const;

type Pack = StillShot[];

const PACKS: Record<string, Pack> = {
  kyoto: [
    { src: SRC.kyoto, caption: "TORII PATH" },
    { src: SRC.tokyo, caption: "NIGHT WALK" },
    { src: SRC.generic, caption: "GARDEN" },
    { src: SRC.kyoto, caption: "GATE ROW" },
  ],
  tokyo: [
    { src: SRC.tokyo, caption: "TOWER GLOW" },
    { src: SRC.kyoto, caption: "SIDE STREET" },
    { src: SRC.tokyo, caption: "NEON WATER" },
    { src: SRC.generic, caption: "STATION" },
  ],
  nyc: [
    { src: SRC.nyc, caption: "SKYLINE" },
    { src: SRC.nyc, caption: "BLOCK" },
    { src: SRC.generic, caption: "PARK" },
    { src: SRC.austin, caption: "AWAY GAME" },
  ],
  texas: [
    { src: SRC.austin, caption: "RIVER" },
    { src: SRC.austin, caption: "DOWNTOWN" },
    { src: SRC.generic, caption: "HIGHWAY" },
    { src: SRC.nyc, caption: "LATER" },
  ],
  bangkok: [
    { src: SRC.bangkok, caption: "RIVER" },
    { src: SRC.hanoi, caption: "MARKET" },
    { src: SRC.bangkok, caption: "NIGHT" },
    { src: SRC.generic, caption: "HEAT" },
  ],
  paris: [
    { src: SRC.paris, caption: "TOWER" },
    { src: SRC.barcelona, caption: "CAFE" },
    { src: SRC.venice, caption: "STONE" },
    { src: SRC.paris, caption: "EVENING" },
  ],
  italy: [
    { src: SRC.venice, caption: "CANAL" },
    { src: SRC.rome, caption: "BRICK" },
    { src: SRC.paris, caption: "WALK" },
    { src: SRC.venice, caption: "WATER" },
  ],
  rome: [
    { src: SRC.rome, caption: "ARENA" },
    { src: SRC.venice, caption: "LANE" },
    { src: SRC.rome, caption: "CYPRESS" },
    { src: SRC.paris, caption: "STONE" },
  ],
  spain: [
    { src: SRC.barcelona, caption: "HARBOR" },
    { src: SRC.paris, caption: "PLAZA" },
    { src: SRC.venice, caption: "TILE" },
    { src: SRC.barcelona, caption: "STREET" },
  ],
  alps: [
    { src: SRC.alps, caption: "LAKE" },
    { src: SRC.alps, caption: "RIDGE" },
    { src: SRC.generic, caption: "TRAIL" },
    { src: SRC.paris, caption: "TRAIN" },
  ],
  mexico: [
    { src: SRC.cancun, caption: "SHORE" },
    { src: SRC.cancun, caption: "PALMS" },
    { src: SRC.barcelona, caption: "WATER" },
    { src: SRC.generic, caption: "HEAT" },
  ],
  vietnam: [
    { src: SRC.hanoi, caption: "LANTERNS" },
    { src: SRC.bangkok, caption: "RIVER" },
    { src: SRC.hanoi, caption: "STREET" },
    { src: SRC.generic, caption: "LATE" },
  ],
  sydney: [
    { src: SRC.sydney, caption: "HARBOR" },
    { src: SRC.sydney, caption: "ARCH" },
    { src: SRC.cancun, caption: "WATER" },
    { src: SRC.generic, caption: "WALK" },
  ],
  generic: [
    { src: SRC.generic, caption: "STILL 1" },
    { src: SRC.alps, caption: "STILL 2" },
    { src: SRC.nyc, caption: "STILL 3" },
    { src: SRC.austin, caption: "STILL 4" },
  ],
};

const BY_NAME: Record<string, string> = {
  Kyoto: "kyoto",
  Tokyo: "tokyo",
  Osaka: "tokyo",
  Nagano: "alps",
  "Ōmachi": "alps",
  "New York": "nyc",
  Manhattan: "nyc",
  Austin: "texas",
  Plano: "texas",
  Dallas: "texas",
  Houston: "texas",
  Bangkok: "bangkok",
  Paris: "paris",
  Venice: "italy",
  Florence: "italy",
  Rome: "rome",
  Vatican: "rome",
  Siena: "italy",
  Arezzo: "italy",
  Poggibonsi: "italy",
  Madrid: "spain",
  Barcelona: "spain",
  Thun: "alps",
  Cancún: "mexico",
  "Playa del Carmen": "mexico",
  Hanoi: "vietnam",
  "Bỉm Sơn": "vietnam",
  Sydney: "sydney",
  "Grand Canyon": "alps",
  "Lake Placid": "alps",
  Breckenridge: "alps",
  Seattle: "nyc",
  "Los Angeles": "nyc",
  "San Francisco": "nyc",
  Chicago: "nyc",
};

const BY_COUNTRY: Record<string, string> = {
  JP: "tokyo",
  US: "texas",
  MX: "mexico",
  TH: "bangkok",
  IT: "italy",
  ES: "spain",
  CH: "alps",
  VN: "vietnam",
  AU: "sydney",
  FR: "paris",
  VA: "rome",
};

export function stillsFor(city: CatalogCity): StillShot[] {
  const key = BY_NAME[city.name] ?? BY_COUNTRY[city.countryCode] ?? "generic";
  return PACKS[key] ?? PACKS.generic;
}
