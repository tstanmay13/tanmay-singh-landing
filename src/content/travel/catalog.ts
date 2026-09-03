import catalogJson from "./catalog.json";
import {
  CANONICAL_PLACE_ALIASES,
  CANONICAL_PLACE_NAMES,
  HUB_DEFINITIONS,
  PLACE_METADATA,
  canonicalPlaceKey,
} from "./curatedPlaces";
import { MANUAL_CITIES } from "./manualCities";
import type {
  CatalogCity,
  TravelCatalog,
  TravelPlace,
  TravelPlaceCategory,
  TravelPlaceReference,
  TravelRelationship,
  TravelHubId,
} from "./types";

export {
  HUBS,
  HUB_DEFINITIONS,
  PLACE_METADATA,
  canonicalPlaceKey,
} from "./curatedPlaces";
export type {
  TravelHub,
  TravelHubId,
  TravelPlace,
  TravelPlaceCategory,
  TravelPlaceReference,
  TravelPlaceZoom,
  TravelRelationship,
} from "./types";

export const travelCatalog = catalogJson as TravelCatalog;

function publicId(city: CatalogCity) {
  return city.id.startsWith(`${city.countryCode}-`)
    ? city.id
    : `${city.countryCode}-${city.id}`;
}

function sourceKey(city: CatalogCity) {
  return canonicalPlaceKey(city);
}

function resolvedKey(city: CatalogCity) {
  const key = sourceKey(city);
  return CANONICAL_PLACE_ALIASES[key] ?? key;
}

function earlierDate(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function laterDate(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

/**
 * Collapse source aliases and same-location manual records before enrichment.
 * Numeric visit aggregates are summed once while years are unioned.
 */
function canonicalCatalogCities(): Array<CatalogCity & { canonicalKey: string }> {
  const manualCities: CatalogCity[] = MANUAL_CITIES.map((city) => ({
    ...city,
    firstSeen: city.firstSeen ?? "",
    lastSeen: city.lastSeen ?? "",
  }));
  const sourceCities = [
    ...travelCatalog.countries.flatMap((country) => country.cities),
    ...manualCities,
  ].map((city) => ({ ...city, id: publicId(city) }));
  const canonical = new Map<
    string,
    CatalogCity & { canonicalKey: string }
  >();

  for (const city of sourceCities) {
    const canonicalKey = resolvedKey(city);
    const canonicalName = CANONICAL_PLACE_NAMES[canonicalKey] ?? city.name;
    const existing = canonical.get(canonicalKey);

    if (!existing) {
      canonical.set(canonicalKey, {
        ...city,
        name: canonicalName,
        canonicalKey,
        years: [...new Set(city.years)].sort(),
      });
      continue;
    }

    const primary = city.dwellMs > existing.dwellMs ? city : existing;
    canonical.set(canonicalKey, {
      ...primary,
      id: primary.id,
      name: canonicalName,
      canonicalKey,
      population: Math.max(existing.population, city.population),
      visitCount: existing.visitCount + city.visitCount,
      spotCount: existing.spotCount + city.spotCount,
      dwellMs: existing.dwellMs + city.dwellMs,
      firstSeen: earlierDate(existing.firstSeen, city.firstSeen),
      lastSeen: laterDate(existing.lastSeen, city.lastSeen),
      years: [...new Set([...existing.years, ...city.years])].sort(),
    });
  }

  return [...canonical.values()];
}

const HUB_BY_PLACE_KEY = new Map<string, TravelHubId>(
  HUB_DEFINITIONS.flatMap((hub) =>
    hub.members.map(
      (member) => [canonicalPlaceKey(member), hub.id] as const,
    ),
  ),
);

const HUB_CENTER_KEYS = new Set(
  HUB_DEFINITIONS.map((hub) => canonicalPlaceKey(hub.centerPlace)),
);

const DEFAULT_IMPORTANCE: Record<TravelPlaceCategory, number> = {
  hub: 88,
  destination: 36,
  satellite: 42,
};

function enrichPlace(
  city: CatalogCity & { canonicalKey: string },
): TravelPlace {
  const metadata = PLACE_METADATA[city.canonicalKey] ?? {};
  const hubId =
    metadata.hubId === undefined
      ? (HUB_BY_PLACE_KEY.get(city.canonicalKey) ?? null)
      : metadata.hubId;
  const defaultCategory: TravelPlaceCategory = HUB_CENTER_KEYS.has(
    city.canonicalKey,
  )
    ? "hub"
    : hubId
      ? "satellite"
      : "destination";
  const category = metadata.category ?? defaultCategory;

  return {
    ...city,
    hubId,
    importance: metadata.importance ?? DEFAULT_IMPORTANCE[category],
    featured: metadata.featured ?? false,
    category,
    showAtZoom:
      metadata.showAtZoom ??
      (category === "hub"
        ? "world"
        : category === "satellite"
          ? "metro"
          : "country"),
    yearsVisited: [
      ...new Set(
        city.years
          .map((year) => Number(year))
          .filter((year) => Number.isInteger(year)),
      ),
    ].sort((left, right) => left - right),
    photos: [],
    media: [],
    relationship: metadata.relationship ?? "visited",
    ...(metadata.residenceOrder === undefined
      ? {}
      : { residenceOrder: metadata.residenceOrder }),
    ...(metadata.residenceStart === undefined
      ? {}
      : { residenceStart: metadata.residenceStart }),
    ...(metadata.residenceEnd === undefined
      ? {}
      : { residenceEnd: metadata.residenceEnd }),
    ...(metadata.chapterTitle === undefined
      ? {}
      : { chapterTitle: metadata.chapterTitle }),
    ...(metadata.displayTitle === undefined
      ? {}
      : { displayTitle: metadata.displayTitle }),
    ...(metadata.description === undefined
      ? {}
      : { description: metadata.description }),
  };
}

let placesCache: TravelPlace[] | undefined;

/** Return the canonical runtime model used by all travel experiences. */
export function travelPlaces(): TravelPlace[] {
  placesCache ??= canonicalCatalogCities().map(enrichPlace);
  return placesCache;
}

/** Backward-compatible name; now returns the richer canonical place model. */
export function globeCities(): TravelPlace[] {
  return travelPlaces();
}

function resolveReferenceKey(reference: TravelPlaceReference) {
  const key = canonicalPlaceKey(reference);
  return CANONICAL_PLACE_ALIASES[key] ?? key;
}

export function getTravelPlaceByCanonicalKey(
  canonicalKey: string,
): TravelPlace | undefined {
  return travelPlaces().find((place) => place.canonicalKey === canonicalKey);
}

export function findTravelPlace(
  reference: TravelPlaceReference,
): TravelPlace | undefined {
  return getTravelPlaceByCanonicalKey(resolveReferenceKey(reference));
}

export function getTravelPlace(id: string): TravelPlace | undefined {
  const query = id.trim().toLocaleLowerCase("en-US");
  return travelPlaces().find(
    (place) =>
      place.id.toLocaleLowerCase("en-US") === query ||
      place.canonicalKey.toLocaleLowerCase("en-US") === query ||
      place.name.toLocaleLowerCase("en-US") === query ||
      place.displayTitle?.toLocaleLowerCase("en-US") === query,
  );
}

export function cityLabel(city: CatalogCity) {
  return city.admin ? `${city.name}, ${city.admin}` : city.name;
}

export const RELATIONSHIP_LABELS: Readonly<
  Record<TravelRelationship, string>
> = {
  visited: "Visited",
  lived: "Past home",
  current_home: "Current home",
};

export function relationshipLabel(
  value: TravelRelationship | Pick<TravelPlace, "relationship">,
) {
  const relationship =
    typeof value === "string" ? value : value.relationship;
  return RELATIONSHIP_LABELS[relationship];
}

export function relationshipA11yLabel(place: TravelPlace) {
  return `${cityLabel(place)} — ${relationshipLabel(place)}`;
}

export const travelPlaceA11yLabel = relationshipA11yLabel;

export function getResidenceChapters(): TravelPlace[] {
  return travelPlaces()
    .filter((place) => place.residenceOrder !== undefined)
    .sort(
      (left, right) =>
        (left.residenceOrder ?? Number.POSITIVE_INFINITY) -
        (right.residenceOrder ?? Number.POSITIVE_INFINITY),
    );
}

export function getCurrentHome(): TravelPlace {
  const currentHome = travelPlaces().find(
    (place) => place.relationship === "current_home",
  );
  if (!currentHome) {
    throw new Error("Travel place metadata must define a current home.");
  }
  return currentHome;
}

export function worldNumber(countryCode: string) {
  const index = travelCatalog.countries.findIndex(
    (country) => country.code === countryCode,
  );
  return index >= 0 ? index + 1 : 0;
}

export function courseNumber(city: CatalogCity, cities: CatalogCity[]) {
  const siblings = cities
    .filter((item) => item.countryCode === city.countryCode)
    .sort((a, b) => b.dwellMs - a.dwellMs);
  return siblings.findIndex((item) => item.id === city.id) + 1;
}

export function dwellDays(ms: number) {
  return ms / 86_400_000;
}

export function formatDwell(ms: number) {
  const days = dwellDays(ms);
  if (days >= 365) return `${(days / 365).toFixed(1)} yr`;
  if (days >= 10) return `${Math.round(days)} days`;
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = days * 24;
  if (hours >= 1) return `${hours.toFixed(1)} hours`;
  return `${Math.max(1, Math.round(hours * 60))} min`;
}
