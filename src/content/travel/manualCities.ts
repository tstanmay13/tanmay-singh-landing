import type { ManualCatalogCity } from "./types";

const EMPTY_VISIT_AGGREGATE = {
  population: 0,
  visitCount: 0,
  spotCount: 0,
  dwellMs: 0,
  firstSeen: null,
  lastSeen: null,
  years: [],
} satisfies Pick<
  ManualCatalogCity,
  | "population"
  | "visitCount"
  | "spotCount"
  | "dwellMs"
  | "firstSeen"
  | "lastSeen"
  | "years"
>;

/** Canonical places absent from the generated Timeline aggregate. */
export const MANUAL_CITIES: ManualCatalogCity[] = [
  {
    ...EMPTY_VISIT_AGGREGATE,
    id: "murphy-tx",
    name: "Murphy",
    admin: "TX",
    countryCode: "US",
    country: "United States",
    flag: "🇺🇸",
    lat: 33.0151,
    lng: -96.613,
  },
  {
    ...EMPTY_VISIT_AGGREGATE,
    id: "richardson-tx",
    name: "Richardson",
    admin: "TX",
    countryCode: "US",
    country: "United States",
    flag: "🇺🇸",
    lat: 32.9482,
    lng: -96.7297,
  },
];
