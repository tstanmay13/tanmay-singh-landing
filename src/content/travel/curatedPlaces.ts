import type {
  TravelHub,
  TravelPlaceMetadata,
  TravelPlaceReference,
} from "./types";

const place = (
  countryCode: string,
  name: string,
  admin = "",
): TravelPlaceReference => ({ countryCode, admin, name });

export function canonicalPlaceKey(reference: TravelPlaceReference): string {
  return [
    reference.countryCode.trim().toUpperCase(),
    (reference.admin ?? "").trim().toUpperCase(),
    reference.name.trim().toLocaleLowerCase("en-US"),
  ].join(":");
}

const key = (countryCode: string, name: string, admin = "") =>
  canonicalPlaceKey(place(countryCode, name, admin));

/**
 * Hub membership is deliberately explicit. Adding a nearby city to the
 * generated catalog does not silently make it part of a hub.
 */
export const HUB_DEFINITIONS = [
  {
    id: "dfw",
    name: "Dallas–Fort Worth",
    center: { lat: 32.7831, lng: -96.8067 },
    centerPlace: place("US", "Dallas", "TX"),
    members: [
      place("US", "Dallas", "TX"),
      place("US", "Murphy", "TX"),
      place("US", "Richardson", "TX"),
      place("US", "Plano", "TX"),
      place("US", "Arlington", "TX"),
      place("US", "Denton", "TX"),
      place("US", "Frisco", "TX"),
      place("US", "Fort Worth", "TX"),
      place("US", "Garland", "TX"),
      place("US", "Irving", "TX"),
      place("US", "Mansfield", "TX"),
      place("US", "DeSoto", "TX"),
      place("US", "Rockwall", "TX"),
      place("US", "Rowlett", "TX"),
      place("US", "Waxahachie", "TX"),
    ],
  },
  {
    id: "austin",
    name: "Austin / Central Texas",
    center: { lat: 30.2672, lng: -97.7431 },
    centerPlace: place("US", "Austin", "TX"),
    members: [
      place("US", "Austin", "TX"),
      place("US", "Round Rock", "TX"),
      place("US", "Georgetown", "TX"),
      place("US", "San Marcos", "TX"),
      place("US", "New Braunfels", "TX"),
    ],
  },
  {
    id: "houston",
    name: "Houston",
    center: { lat: 29.7633, lng: -95.3633 },
    centerPlace: place("US", "Houston", "TX"),
    members: [
      place("US", "Houston", "TX"),
      place("US", "Cypress", "TX"),
      place("US", "The Woodlands", "TX"),
    ],
  },
  {
    id: "tokyo",
    name: "Tokyo",
    center: { lat: 35.6895, lng: 139.6917 },
    centerPlace: place("JP", "Tokyo"),
    members: [place("JP", "Tokyo")],
  },
  {
    id: "kansai",
    name: "Kansai",
    center: { lat: 34.6937, lng: 135.5022 },
    centerPlace: place("JP", "Osaka"),
    members: [place("JP", "Osaka"), place("JP", "Kyoto")],
  },
] as const satisfies readonly TravelHub[];

/** Short alias retained for consumers that prefer the domain name. */
export const HUBS = HUB_DEFINITIONS;

const NEW_YORK_CITY_KEY = key("US", "New York City", "NY");
const VENICE_KEY = key("IT", "Venice");
const VATICAN_KEY = key("VA", "Vatican");

/**
 * Source aliases collapse into one canonical aggregate before metadata is
 * applied. Values point to canonical keys, not generated catalog IDs.
 */
export const CANONICAL_PLACE_ALIASES: Readonly<Record<string, string>> = {
  [key("US", "New York", "NY")]: NEW_YORK_CITY_KEY,
  [key("US", "Manhattan", "NY")]: NEW_YORK_CITY_KEY,
  [key("IT", "Mestre")]: VENICE_KEY,
  [key("VA", "Rome")]: VATICAN_KEY,
};

export const CANONICAL_PLACE_NAMES: Readonly<Record<string, string>> = {
  [NEW_YORK_CITY_KEY]: "New York City",
  [VENICE_KEY]: "Venice",
  [VATICAN_KEY]: "Vatican",
};

/**
 * Fixed editorial priorities are intentionally independent of population and
 * distance. Unlisted places receive stable defaults in catalog.ts.
 */
export const PLACE_METADATA: Readonly<Record<string, TravelPlaceMetadata>> = {
  // User-confirmed chronology; never derive residence dates from visit data.
  [key("IN", "Uttar Pradesh", "UP")]: {
    importance: 100, featured: true, showAtZoom: "world", relationship: "lived", residenceOrder: 1,
    chapterTitle: "Where it began", description: "Born in Uttar Pradesh, India. The first chapter.",
  },
  [key("US", "Boston", "MA")]: {
    importance: 96, featured: true, showAtZoom: "world", relationship: "lived", residenceOrder: 2, chapterTitle: "The next chapter",
  },
  [key("IN", "Bangalore", "KA")]: {
    importance: 96, featured: true, showAtZoom: "world", relationship: "lived", residenceOrder: 3, chapterTitle: "Back to India",
  },
  [key("US", "Murphy", "TX")]: {
    importance: 76,
    featured: true,
    showAtZoom: "metro",
    relationship: "lived",
    residenceOrder: 5,
    chapterTitle: "Past home",
    displayTitle: "Murphy, TX",
  },
  [key("US", "Richardson", "TX")]: {
    importance: 78,
    featured: true,
    showAtZoom: "metro",
    relationship: "lived",
    residenceOrder: 4,
    chapterTitle: "Past home",
    displayTitle: "Richardson, TX",
  },
  [key("US", "Austin", "TX")]: {
    importance: 100,
    featured: true,
    category: "hub",
    showAtZoom: "world",
    relationship: "lived",
    residenceOrder: 6,
    chapterTitle: "Past home",
    displayTitle: "Austin, TX",
  },
  [NEW_YORK_CITY_KEY]: {
    importance: 100,
    featured: true,
    category: "destination",
    showAtZoom: "world",
    relationship: "current_home",
    residenceOrder: 7,
    chapterTitle: "Current home",
    displayTitle: "New York City, NY",
  },

  // Editable hub centers.
  [key("US", "Dallas", "TX")]: {
    importance: 94,
    featured: true,
    category: "hub",
    showAtZoom: "world",
  },
  [key("US", "Houston", "TX")]: {
    importance: 90,
    featured: true,
    category: "hub",
    showAtZoom: "world",
  },

  // Standalone destinations called out by the product.
  [key("US", "South Padre Island", "TX")]: {
    importance: 86,
    featured: true,
    showAtZoom: "country",
  },
  [key("US", "Grand Canyon", "AZ")]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [key("US", "Lake Placid", "NY")]: {
    importance: 84,
    featured: true,
    showAtZoom: "country",
  },

  // Major US travel destinations.
  [key("US", "Seattle", "WA")]: {
    importance: 88,
    featured: true,
    showAtZoom: "country",
  },
  [key("US", "Las Vegas", "NV")]: {
    importance: 92,
    featured: true,
    showAtZoom: "world",
  },
  [key("US", "Los Angeles", "CA")]: {
    importance: 94,
    featured: true,
    showAtZoom: "world",
  },
  [key("US", "San Francisco", "CA")]: {
    importance: 94,
    featured: true,
    showAtZoom: "world",
  },
  [key("US", "Nashville", "TN")]: {
    importance: 86,
    featured: true,
    showAtZoom: "country",
  },
  [key("US", "New Orleans", "LA")]: {
    importance: 90,
    featured: true,
    showAtZoom: "country",
  },
  [key("US", "Chicago", "IL")]: {
    importance: 92,
    featured: true,
    showAtZoom: "world",
  },
  [key("US", "San Diego", "CA")]: {
    importance: 86,
    featured: true,
    showAtZoom: "country",
  },

  // International destinations.
  [key("JP", "Tokyo")]: {
    importance: 100,
    featured: true,
    category: "hub",
    showAtZoom: "world",
  },
  [key("JP", "Kyoto")]: {
    importance: 98,
    featured: true,
    showAtZoom: "country",
  },
  [key("JP", "Osaka")]: {
    importance: 96,
    featured: true,
    category: "hub",
    showAtZoom: "world",
  },
  [key("JP", "Ōmachi")]: {
    importance: 82,
    featured: true,
    showAtZoom: "country",
  },
  [key("JP", "Nagano")]: {
    importance: 80,
    featured: true,
    showAtZoom: "country",
  },
  [key("TH", "Bangkok")]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [VENICE_KEY]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [key("IT", "Florence")]: {
    importance: 94,
    featured: true,
    showAtZoom: "country",
  },
  [key("IT", "Rome")]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [key("IT", "Siena")]: {
    importance: 82,
    featured: true,
    showAtZoom: "country",
  },
  [key("ES", "Madrid")]: {
    importance: 96,
    featured: true,
    showAtZoom: "world",
  },
  [key("ES", "Barcelona")]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [key("VN", "Hanoi")]: {
    importance: 96,
    featured: true,
    showAtZoom: "world",
  },
  [key("VN", "Bỉm Sơn")]: {
    importance: 80,
    featured: true,
    showAtZoom: "country",
  },
  [key("MX", "Cancún")]: {
    importance: 96,
    featured: true,
    showAtZoom: "world",
  },
  [key("MX", "Playa del Carmen")]: {
    importance: 88,
    featured: true,
    showAtZoom: "country",
  },
  [key("CH", "Thun", "BE")]: {
    importance: 90,
    featured: true,
    showAtZoom: "world",
  },
  [key("AU", "Sydney")]: {
    importance: 98,
    featured: true,
    showAtZoom: "world",
  },
  [key("FR", "Paris")]: {
    importance: 100,
    featured: true,
    showAtZoom: "world",
  },
  [VATICAN_KEY]: {
    importance: 94,
    featured: true,
    showAtZoom: "world",
  },
};
