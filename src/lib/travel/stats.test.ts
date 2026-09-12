import { describe, expect, it } from "vitest";

import {
  findTravelPlace,
  travelPlaces,
} from "@/content/travel/catalog";
import type {
  TravelPlace,
  TravelPlaceReference,
} from "@/content/travel/types";
import {
  canonicalStatsPlaces,
  deriveContextualTravelStats,
  deriveCountryStats,
  deriveHubStats,
  deriveLivedStats,
  deriveVisitYearRange,
  deriveWorldStats,
  type ContextualTravelStats,
  type TravelStatsContext,
} from "./stats";

const places = travelPlaces();

function requirePlace(reference: TravelPlaceReference): TravelPlace {
  const found = findTravelPlace(reference);
  if (!found) {
    throw new Error(`Missing canonical place: ${reference.name}`);
  }
  return found;
}

function usPlace(name: string, admin: string): TravelPlace {
  return requirePlace({ countryCode: "US", admin, name });
}

function requireContext(
  context: TravelStatsContext,
): ContextualTravelStats {
  const result = deriveContextualTravelStats(places, context);
  if (!result) throw new Error(`Missing stats for ${context.kind}`);
  return result;
}

describe("canonical contextual travel statistics", () => {
  it("reports the exact world totals, countries, visit years, and homes", () => {
    expect(deriveWorldStats(places)).toEqual({
      kind: "world",
      placeCount: 129,
      countryCount: 12,
      countries: [
        "AU",
        "CH",
        "ES",
        "FR",
        "IN",
        "IT",
        "JP",
        "MX",
        "TH",
        "US",
        "VA",
        "VN",
      ],
      homesCount: 7,
      visitYearRange: { first: 2013, last: 2026 },
    });
  });

  it("keeps residence chapters chronological and identifies current NYC", () => {
    const lived = deriveLivedStats(places);

    expect(lived.chapterCount).toBe(7);
    expect(
      lived.chapters.map(({ name, order, current, chapterTitle }) => ({
        name,
        order,
        current,
        chapterTitle,
      })),
    ).toEqual([
      {
        name: "Uttar Pradesh",
        order: 1,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "Boston",
        order: 2,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "Bangalore",
        order: 3,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "Richardson",
        order: 4,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "Murphy",
        order: 5,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "Austin",
        order: 6,
        current: false,
        chapterTitle: "Past home",
      },
      {
        name: "New York City",
        order: 7,
        current: true,
        chapterTitle: "Current home",
      },
    ]);
    expect(lived.progression).toEqual(
      lived.chapters.map((chapter) => chapter.id),
    );
    expect(lived.currentHome).toMatchObject({
      name: "New York City",
      order: 7,
      current: true,
      relationship: "current_home",
    });
  });

  it("reports exact United States totals, hubs, years, and lived count", () => {
    expect(deriveCountryStats(places, "us")).toEqual({
      kind: "country",
      countryCode: "US",
      countryName: "United States",
      placeCount: 94,
      majorHubCount: 3,
      majorHubs: [
        {
          id: "austin",
          name: "Austin / Central Texas",
          placeCount: 5,
        },
        {
          id: "dfw",
          name: "Dallas–Fort Worth",
          placeCount: 15,
        },
        {
          id: "houston",
          name: "Houston",
          placeCount: 3,
        },
      ],
      livedCount: 5,
      visitYearRange: { first: 2013, last: 2026 },
    });
  });

  it("counts Tokyo as a Japanese major hub", () => {
    const japan = deriveCountryStats(places, "JP");
    expect(japan.majorHubCount).toBeGreaterThanOrEqual(1);
    expect(japan.majorHubs.map((hub) => hub.id)).toEqual(
      expect.arrayContaining(["tokyo"]),
    );
    expect(japan.majorHubs.some((hub) => hub.id === "tokyo")).toBe(true);
  });

  it("reports DFW's grouped places, lived homes, and relevant years", () => {
    const dfw = deriveHubStats(places, "dfw");

    expect(dfw).toMatchObject({
      kind: "hub",
      hubId: "dfw",
      name: "Dallas–Fort Worth",
      placeCount: 15,
      livedCount: 2,
      visitYearRange: { first: 2013, last: 2026 },
    });
    expect(
      dfw?.places
        .filter((place) => place.relationship !== "visited")
        .map((place) => ({
          name: place.name,
          yearsVisited: place.yearsVisited,
        })),
    ).toEqual([
      { name: "Murphy", yearsVisited: [] },
      { name: "Richardson", yearsVisited: [] },
    ]);
  });

  it("does not double-count duplicate Austin or NYC canonical records", () => {
    const austin = usPlace("Austin", "TX");
    const nyc = usPlace("New York City", "NY");
    const withDuplicates = [
      ...places,
      { ...austin, id: "zz-austin-alias" },
      { ...nyc, id: "zz-nyc-alias" },
    ];
    const canonical = canonicalStatsPlaces(withDuplicates);

    expect(canonical).toHaveLength(129);
    expect(
      canonical.filter(
        (place) => place.canonicalKey === austin.canonicalKey,
      ),
    ).toHaveLength(1);
    expect(
      canonical.filter((place) => place.canonicalKey === nyc.canonicalKey),
    ).toHaveLength(1);
    expect(deriveWorldStats(withDuplicates)).toEqual(
      deriveWorldStats(places),
    );
    expect(deriveCountryStats(withDuplicates, "US")).toEqual(
      deriveCountryStats(places, "US"),
    );
  });
});

describe("visit year derivation", () => {
  it("uses only yearsVisited and ignores empty manual residence dates", () => {
    const murphy = usPlace("Murphy", "TX");
    const richardson = usPlace("Richardson", "TX");

    expect(
      [murphy, richardson].map(
        ({ firstSeen, lastSeen, years, yearsVisited }) => ({
          firstSeen,
          lastSeen,
          years,
          yearsVisited,
        }),
      ),
    ).toEqual([
      { firstSeen: "", lastSeen: "", years: [], yearsVisited: [] },
      { firstSeen: "", lastSeen: "", years: [], yearsVisited: [] },
    ]);
    expect(deriveVisitYearRange([murphy, richardson])).toBeNull();

    const misleadingResidenceDates: TravelPlace = {
      ...murphy,
      firstSeen: "1900-01-01",
      lastSeen: "2099-12-31",
      years: ["1900", "2099"],
      yearsVisited: [2018, 2024],
      residenceStart: "1900-01-01",
      residenceEnd: "2099-12-31",
    };
    expect(deriveVisitYearRange([misleadingResidenceDates])).toEqual({
      first: 2018,
      last: 2024,
    });
  });
});

describe("compact contextual HUD statistics", () => {
  it("emits exact labels and compact values for each context", () => {
    expect(requireContext({ kind: "world" }).hud).toEqual([
      { id: "places", label: "PLACES", value: 129 },
      { id: "countries", label: "COUNTRIES", value: 12 },
      { id: "visit-years", label: "VISIT YEARS", value: "2013–2026" },
      { id: "homes", label: "HOMES", value: 7 },
    ]);

    expect(
      requireContext({ kind: "country", countryCode: "US" }).hud,
    ).toEqual([
      { id: "places", label: "PLACES", value: 94 },
      { id: "major-hubs", label: "MAJOR HUBS", value: 3 },
      { id: "visit-years", label: "VISIT YEARS", value: "2013–2026" },
      { id: "lived", label: "LIVED", value: 5 },
    ]);

    expect(requireContext({ kind: "hub", hubId: "dfw" }).hud).toEqual([
      { id: "places", label: "PLACES", value: 15 },
      { id: "lived", label: "LIVED", value: 2 },
      { id: "visit-years", label: "VISIT YEARS", value: "2013–2026" },
    ]);

    expect(requireContext({ kind: "lived" }).hud).toEqual([
      { id: "chapters", label: "CHAPTERS", value: 7 },
      {
        id: "current-home",
        label: "CURRENT HOME",
        value: "New York City",
      },
      {
        id: "progression",
        label: "PROGRESSION",
        value: "01 → 02 → 03 → 04 → 05 → 06 → 07",
      },
    ]);
  });
});
