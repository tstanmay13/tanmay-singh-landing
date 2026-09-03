import {
  HUB_DEFINITIONS,
  canonicalPlaceKey,
} from "@/content/travel/catalog";
import type {
  TravelHub,
  TravelHubId,
  TravelPlace,
  TravelRelationship,
} from "@/content/travel/types";

export type VisitYearRange = {
  first: number;
  last: number;
};

export type TravelHudStat = {
  id: string;
  label: string;
  value: string | number;
};

export type TravelPlaceSummary = {
  id: string;
  canonicalKey: string;
  name: string;
  displayTitle: string;
  countryCode: string;
  relationship: TravelRelationship;
  yearsVisited: readonly number[];
};

export type ResidenceChapter = TravelPlaceSummary & {
  order: number | null;
  chapterTitle: string;
  current: boolean;
};

export type LivedTravelStats = {
  kind: "lived";
  chapterCount: number;
  chapters: readonly ResidenceChapter[];
  currentHome: ResidenceChapter | null;
  /** Canonical chapter ids in chronological residenceOrder. */
  progression: readonly string[];
};

export type HubTravelStats = {
  kind: "hub";
  hubId: TravelHubId;
  name: string;
  placeCount: number;
  places: readonly TravelPlaceSummary[];
  livedCount: number;
  visitYearRange: VisitYearRange | null;
};

export type CountryHubSummary = {
  id: TravelHubId;
  name: string;
  placeCount: number;
};

export type CountryTravelStats = {
  kind: "country";
  countryCode: string;
  countryName: string;
  placeCount: number;
  majorHubCount: number;
  majorHubs: readonly CountryHubSummary[];
  livedCount: number;
  visitYearRange: VisitYearRange | null;
};

export type WorldTravelStats = {
  kind: "world";
  placeCount: number;
  countryCount: number;
  countries: readonly string[];
  homesCount: number;
  visitYearRange: VisitYearRange | null;
};

export type TravelContextDetails =
  | LivedTravelStats
  | HubTravelStats
  | CountryTravelStats
  | WorldTravelStats;

export type TravelStatsContext =
  | { kind: "lived" }
  | { kind: "hub"; hubId: TravelHubId }
  | { kind: "country"; countryCode: string }
  | { kind: "world" };

export type ContextualTravelStats = {
  details: TravelContextDetails;
  hud: readonly TravelHudStat[];
};

const DEFAULT_HUBS: readonly TravelHub[] = HUB_DEFINITIONS;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function comparePlaces(
  left: Pick<TravelPlace, "canonicalKey" | "id">,
  right: Pick<TravelPlace, "canonicalKey" | "id">,
): number {
  return (
    compareText(left.canonicalKey, right.canonicalKey) ||
    compareText(left.id, right.id)
  );
}

/**
 * Totals always start from this canonical set. Callers should pass the full
 * place model, never a visually filtered entity list.
 */
export function canonicalStatsPlaces(
  places: readonly TravelPlace[],
): TravelPlace[] {
  const ids = new Set<string>();
  const canonicalKeys = new Set<string>();
  const result: TravelPlace[] = [];

  for (const place of [...places].sort(comparePlaces)) {
    const id = place.id.toLocaleLowerCase("en-US");
    const canonicalKey = place.canonicalKey.toLocaleLowerCase("en-US");
    if (ids.has(id) || canonicalKeys.has(canonicalKey)) continue;
    ids.add(id);
    canonicalKeys.add(canonicalKey);
    result.push(place);
  }

  return result;
}

function normalizedVisitYears(places: readonly TravelPlace[]): number[] {
  return [
    ...new Set(
      places.flatMap((place) =>
        place.yearsVisited.filter((year) => Number.isInteger(year)),
      ),
    ),
  ].sort((left, right) => left - right);
}

/** Uses yearsVisited only; residence fields never contribute a year. */
export function deriveVisitYearRange(
  places: readonly TravelPlace[],
): VisitYearRange | null {
  const years = normalizedVisitYears(canonicalStatsPlaces(places));
  if (years.length === 0) return null;
  return {
    first: years[0],
    last: years[years.length - 1],
  };
}

export function formatVisitYearRange(
  range: VisitYearRange | null,
  emptyValue = "—",
): string {
  if (!range) return emptyValue;
  return range.first === range.last
    ? String(range.first)
    : `${range.first}–${range.last}`;
}

function summarizePlace(place: TravelPlace): TravelPlaceSummary {
  return {
    id: place.id,
    canonicalKey: place.canonicalKey,
    name: place.name,
    displayTitle: place.displayTitle ?? place.name,
    countryCode: place.countryCode,
    relationship: place.relationship,
    yearsVisited: [...place.yearsVisited].sort(
      (left, right) => left - right,
    ),
  };
}

function isHome(place: TravelPlace): boolean {
  return place.relationship !== "visited";
}

function compareResidenceChapters(
  left: TravelPlace,
  right: TravelPlace,
): number {
  return (
    (left.residenceOrder ?? Number.POSITIVE_INFINITY) -
      (right.residenceOrder ?? Number.POSITIVE_INFINITY) ||
    comparePlaces(left, right)
  );
}

export function deriveLivedStats(
  places: readonly TravelPlace[],
): LivedTravelStats {
  const homes = canonicalStatsPlaces(places)
    .filter(isHome)
    .sort(compareResidenceChapters);
  const chapters = homes.map<ResidenceChapter>((place) => ({
    ...summarizePlace(place),
    order: place.residenceOrder ?? null,
    chapterTitle: place.chapterTitle ?? "Home",
    current: place.relationship === "current_home",
  }));
  const currentHome =
    chapters.find((chapter) => chapter.current) ?? null;

  return {
    kind: "lived",
    chapterCount: chapters.length,
    chapters,
    currentHome,
    progression: chapters.map((chapter) => chapter.id),
  };
}

function hubMemberKeys(hub: TravelHub): Set<string> {
  return new Set(hub.members.map(canonicalPlaceKey));
}

function canonicalHubMembers(
  places: readonly TravelPlace[],
  hub: TravelHub,
): TravelPlace[] {
  const memberKeys = hubMemberKeys(hub);
  return canonicalStatsPlaces(places)
    .filter((place) => memberKeys.has(place.canonicalKey))
    .sort(comparePlaces);
}

export function deriveHubStats(
  places: readonly TravelPlace[],
  hubId: TravelHubId,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): HubTravelStats | null {
  const hub = hubs.find((candidate) => candidate.id === hubId);
  if (!hub) return null;
  const members = canonicalHubMembers(places, hub);

  return {
    kind: "hub",
    hubId: hub.id,
    name: hub.name,
    placeCount: members.length,
    places: members.map(summarizePlace),
    livedCount: members.filter(isHome).length,
    visitYearRange: deriveVisitYearRange(members),
  };
}

function hubCountryCode(hub: TravelHub): string {
  return hub.centerPlace.countryCode.toUpperCase();
}

export function deriveCountryStats(
  places: readonly TravelPlace[],
  countryCode: string,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): CountryTravelStats {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const countryPlaces = canonicalStatsPlaces(places).filter(
    (place) => place.countryCode.toUpperCase() === normalizedCountryCode,
  );
  const majorHubs = hubs
    .filter((hub) => hubCountryCode(hub) === normalizedCountryCode)
    .map((hub) => ({
      id: hub.id,
      name: hub.name,
      placeCount: canonicalHubMembers(countryPlaces, hub).length,
    }))
    .filter((hub) => hub.placeCount > 0)
    .sort((left, right) => compareText(left.id, right.id));

  return {
    kind: "country",
    countryCode: normalizedCountryCode,
    countryName: countryPlaces[0]?.country ?? normalizedCountryCode,
    placeCount: countryPlaces.length,
    majorHubCount: majorHubs.length,
    majorHubs,
    livedCount: countryPlaces.filter(isHome).length,
    visitYearRange: deriveVisitYearRange(countryPlaces),
  };
}

export function deriveWorldStats(
  places: readonly TravelPlace[],
): WorldTravelStats {
  const canonicalPlaces = canonicalStatsPlaces(places);
  const countries = [
    ...new Set(canonicalPlaces.map((place) => place.countryCode.toUpperCase())),
  ].sort(compareText);

  return {
    kind: "world",
    placeCount: canonicalPlaces.length,
    countryCount: countries.length,
    countries,
    homesCount: canonicalPlaces.filter(isHome).length,
    visitYearRange: deriveVisitYearRange(canonicalPlaces),
  };
}

function progressionLabel(chapters: readonly ResidenceChapter[]): string {
  return chapters
    .map((chapter, index) =>
      String(chapter.order ?? index + 1).padStart(2, "0"),
    )
    .join(" → ");
}

export function compactStatsForHud(
  details: TravelContextDetails,
): TravelHudStat[] {
  switch (details.kind) {
    case "lived":
      return [
        {
          id: "chapters",
          label: "CHAPTERS",
          value: details.chapterCount,
        },
        {
          id: "current-home",
          label: "CURRENT HOME",
          value: details.currentHome?.name ?? "—",
        },
        {
          id: "progression",
          label: "PROGRESSION",
          value: progressionLabel(details.chapters),
        },
      ];

    case "hub":
      return [
        { id: "places", label: "PLACES", value: details.placeCount },
        { id: "lived", label: "LIVED", value: details.livedCount },
        {
          id: "visit-years",
          label: "VISIT YEARS",
          value: formatVisitYearRange(details.visitYearRange),
        },
      ];

    case "country":
      return [
        { id: "places", label: "PLACES", value: details.placeCount },
        {
          id: "major-hubs",
          label: "MAJOR HUBS",
          value: details.majorHubCount,
        },
        {
          id: "visit-years",
          label: "VISIT YEARS",
          value: formatVisitYearRange(details.visitYearRange),
        },
        { id: "lived", label: "LIVED", value: details.livedCount },
      ];

    case "world":
      return [
        { id: "places", label: "PLACES", value: details.placeCount },
        {
          id: "countries",
          label: "COUNTRIES",
          value: details.countryCount,
        },
        {
          id: "visit-years",
          label: "VISIT YEARS",
          value: formatVisitYearRange(details.visitYearRange),
        },
        { id: "homes", label: "HOMES", value: details.homesCount },
      ];
  }
}

export function deriveContextualTravelStats(
  places: readonly TravelPlace[],
  context: TravelStatsContext,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): ContextualTravelStats | null {
  let details: TravelContextDetails | null;

  switch (context.kind) {
    case "lived":
      details = deriveLivedStats(places);
      break;
    case "hub":
      details = deriveHubStats(places, context.hubId, hubs);
      break;
    case "country":
      details = deriveCountryStats(
        places,
        context.countryCode,
        hubs,
      );
      break;
    case "world":
      details = deriveWorldStats(places);
      break;
  }

  if (!details) return null;
  return {
    details,
    hud: compactStatsForHud(details),
  };
}

export const getContextualTravelStats = deriveContextualTravelStats;
export const getWorldTravelStats = deriveWorldStats;
export const getCountryTravelStats = deriveCountryStats;
export const getHubTravelStats = deriveHubStats;
export const getLivedTravelStats = deriveLivedStats;
