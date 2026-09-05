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
  // Uttar Pradesh is a state: this is a regional anchor, not an invented birth city.
  { ...EMPTY_VISIT_AGGREGATE, id: "uttar-pradesh", name: "Uttar Pradesh", admin: "UP", countryCode: "IN", country: "India", flag: "🇮🇳", lat: 27.0, lng: 80.5 },
  { ...EMPTY_VISIT_AGGREGATE, id: "boston-ma", name: "Boston", admin: "MA", countryCode: "US", country: "United States", flag: "🇺🇸", lat: 42.3601, lng: -71.0589 },
  { ...EMPTY_VISIT_AGGREGATE, id: "bangalore", name: "Bangalore", admin: "KA", countryCode: "IN", country: "India", flag: "🇮🇳", lat: 12.9716, lng: 77.5946 },
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
