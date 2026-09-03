import { describe, expect, it } from "vitest";

import {
  HUB_DEFINITIONS,
  canonicalPlaceKey,
  findTravelPlace,
  getCurrentHome,
  getResidenceChapters,
  travelCatalog,
  travelPlaces,
} from "./catalog";
import { CANONICAL_PLACE_ALIASES } from "./curatedPlaces";
import { MANUAL_CITIES } from "./manualCities";
import type { TravelHubId, TravelPlaceReference } from "./types";

const reference = (
  name: string,
  admin: string,
  countryCode = "US",
): TravelPlaceReference => ({ countryCode, admin, name });

function requirePlace(placeReference: TravelPlaceReference) {
  const found = findTravelPlace(placeReference);
  expect(
    found,
    `${placeReference.name}, ${placeReference.admin ?? placeReference.countryCode} should resolve`,
  ).toBeDefined();
  return found!;
}

describe("travel catalog curation", () => {
  it("assigns the explicitly curated DFW, Austin, and Houston hub members", () => {
    const requiredMembers = {
      dfw: [
        "Dallas",
        "Murphy",
        "Richardson",
        "Plano",
        "Arlington",
        "Denton",
        "Frisco",
        "Fort Worth",
        "Garland",
        "Irving",
        "Mansfield",
        "DeSoto",
        "Rockwall",
        "Rowlett",
        "Waxahachie",
      ],
      austin: [
        "Austin",
        "Round Rock",
        "Georgetown",
        "San Marcos",
        "New Braunfels",
      ],
      houston: ["Houston", "Cypress", "The Woodlands"],
    } satisfies Record<TravelHubId, readonly string[]>;

    expect(HUB_DEFINITIONS.map((hub) => hub.id)).toEqual([
      "dfw",
      "austin",
      "houston",
    ]);

    for (const hub of HUB_DEFINITIONS) {
      expect(hub.members.map((member) => member.name)).toEqual(
        requiredMembers[hub.id],
      );

      for (const member of hub.members) {
        expect(requirePlace(member).hubId).toBe(hub.id);
      }
    }
  });

  it("keeps the exact residence chronology and only NYC as current home", () => {
    const chapters = getResidenceChapters();

    expect(
      chapters.map(({ name, relationship, residenceOrder }) => ({
        name,
        relationship,
        residenceOrder,
      })),
    ).toEqual([
      { name: "Murphy", relationship: "lived", residenceOrder: 1 },
      { name: "Richardson", relationship: "lived", residenceOrder: 2 },
      { name: "Austin", relationship: "lived", residenceOrder: 3 },
      {
        name: "New York City",
        relationship: "current_home",
        residenceOrder: 4,
      },
    ]);

    expect(
      travelPlaces()
        .filter((place) => place.relationship === "current_home")
        .map((place) => place.name),
    ).toEqual(["New York City"]);
    expect(getCurrentHome().name).toBe("New York City");
  });

  it("does not invent residence start or end dates", () => {
    for (const chapter of getResidenceChapters()) {
      expect(chapter).not.toHaveProperty("residenceStart");
      expect(chapter).not.toHaveProperty("residenceEnd");
    }
  });

  it("keeps Austin as one lived-in hub with its actual visit years", () => {
    const austinKey = canonicalPlaceKey(reference("Austin", "TX"));
    const matching = travelPlaces().filter(
      (place) => place.canonicalKey === austinKey,
    );

    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      name: "Austin",
      relationship: "lived",
      category: "hub",
      hubId: "austin",
      yearsVisited: [2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    });
  });

  it("collapses New York and Manhattan into one canonical New York City", () => {
    const newYorkCity = requirePlace(reference("New York City", "NY"));
    const newYorkAlias = requirePlace(reference("New York", "NY"));
    const manhattanAlias = requirePlace(reference("Manhattan", "NY"));

    expect(newYorkAlias).toBe(newYorkCity);
    expect(manhattanAlias).toBe(newYorkCity);
    expect(
      travelPlaces().filter(
        (place) => place.canonicalKey === newYorkCity.canonicalKey,
      ),
    ).toHaveLength(1);
    expect(newYorkCity).toMatchObject({
      name: "New York City",
      visitCount: 711,
      spotCount: 354,
      dwellMs: 32_720_643_494,
      yearsVisited: [2016, 2021, 2022, 2023, 2024, 2025, 2026],
    });
  });

  it("exposes unique public IDs and canonical keys", () => {
    const places = travelPlaces();

    expect(new Set(places.map((place) => place.id)).size).toBe(places.length);
    expect(new Set(places.map((place) => place.canonicalKey)).size).toBe(
      places.length,
    );
  });

  it("aggregates every source place exactly once into canonical totals", () => {
    const generatedCities = travelCatalog.countries.flatMap(
      (country) => country.cities,
    );
    const rawTotals = generatedCities.reduce(
      (totals, city) => ({
        visitCount: totals.visitCount + city.visitCount,
        spotCount: totals.spotCount + city.spotCount,
        dwellMs: totals.dwellMs + city.dwellMs,
      }),
      { visitCount: 0, spotCount: 0, dwellMs: 0 },
    );
    const canonicalTotals = travelPlaces().reduce(
      (totals, place) => ({
        visitCount: totals.visitCount + place.visitCount,
        spotCount: totals.spotCount + place.spotCount,
        dwellMs: totals.dwellMs + place.dwellMs,
      }),
      { visitCount: 0, spotCount: 0, dwellMs: 0 },
    );
    const expectedCanonicalKeys = new Set(
      [...generatedCities, ...MANUAL_CITIES].map((city) => {
        const sourceKey = canonicalPlaceKey(city);
        return CANONICAL_PLACE_ALIASES[sourceKey] ?? sourceKey;
      }),
    );

    expect(canonicalTotals).toEqual(rawTotals);
    expect(travelPlaces()).toHaveLength(expectedCanonicalKeys.size);
  });

  it("includes empty manual records for Murphy and Richardson", () => {
    for (const name of ["Murphy", "Richardson"]) {
      expect(requirePlace(reference(name, "TX"))).toMatchObject({
        visitCount: 0,
        spotCount: 0,
        dwellMs: 0,
        firstSeen: "",
        lastSeen: "",
        years: [],
        yearsVisited: [],
        photos: [],
        media: [],
      });
    }
  });

  it("starts every canonical place without photos or media", () => {
    for (const place of travelPlaces()) {
      expect(place.photos).toEqual([]);
      expect(place.media).toEqual([]);
    }
  });
});
