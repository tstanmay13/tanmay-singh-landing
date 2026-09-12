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
      tokyo: ["Tokyo"],
      kansai: ["Osaka", "Kyoto"],
    } satisfies Record<TravelHubId, readonly string[]>;

    expect(HUB_DEFINITIONS.map((hub) => hub.id)).toEqual([
      "dfw",
      "austin",
      "houston",
      "tokyo",
      "kansai",
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
      { name: "Uttar Pradesh", relationship: "lived", residenceOrder: 1 },
      { name: "Boston", relationship: "lived", residenceOrder: 2 },
      { name: "Bangalore", relationship: "lived", residenceOrder: 3 },
      { name: "Richardson", relationship: "lived", residenceOrder: 4 },
      { name: "Murphy", relationship: "lived", residenceOrder: 5 },
      { name: "Austin", relationship: "lived", residenceOrder: 6 },
      {
        name: "New York City",
        relationship: "current_home",
        residenceOrder: 7,
      },
    ]);

    expect(
      travelPlaces()
        .filter((place) => place.relationship === "current_home")
        .map((place) => place.name),
    ).toEqual(["New York City"]);
    expect(getCurrentHome().name).toBe("New York City");
  });

  it("keeps the editorial residence dates supplied for each chapter", () => {
    expect(
      getResidenceChapters().map(
        ({ name, residenceStart, residenceEnd }) => ({
          name,
          residenceStart,
          residenceEnd,
        }),
      ),
    ).toEqual([
      {
        name: "Uttar Pradesh",
        residenceStart: "2000",
        residenceEnd: "2001",
      },
      { name: "Boston", residenceStart: "2001", residenceEnd: "2002" },
      { name: "Bangalore", residenceStart: "2002", residenceEnd: "2008" },
      {
        name: "Richardson",
        residenceStart: "2008",
        residenceEnd: "Sep 2013",
      },
      { name: "Murphy", residenceStart: "Sep 2013", residenceEnd: "2018" },
      { name: "Austin", residenceStart: "2018", residenceEnd: "2025" },
      {
        name: "New York City",
        residenceStart: "2025",
        residenceEnd: "present",
      },
    ]);
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

  it("includes empty manual records for homes absent from Timeline", () => {
    const manuals = [
      reference("Uttar Pradesh", "UP", "IN"),
      reference("Boston", "MA"),
      reference("Bangalore", "KA", "IN"),
      reference("Murphy", "TX"),
      reference("Richardson", "TX"),
    ];
    for (const placeReference of manuals) {
      expect(requirePlace(placeReference)).toMatchObject({
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

  it("keeps Ko Phangan separate from the following Ko Samui stop", () => {
    const phangan = requirePlace(reference("Ko Phangan", "", "TH"));
    expect(requirePlace(reference("Ko Pha Ngan", "", "TH"))).toBe(phangan);
    const samui = requirePlace(reference("Ko Samui", "", "TH"));
    expect(phangan.id).not.toBe(samui.id);
    expect(phangan.firstSeen.startsWith("2026-09-07")).toBe(true);
    expect(samui.firstSeen.startsWith("2026-09-09")).toBe(true);
    expect(phangan.media.length).toBeGreaterThan(0);
    expect(samui.media.length).toBeGreaterThan(0);
  });

  it("corrects Ninh Binh while preserving the source aggregate", () => {
    const corrected = requirePlace(reference("Ninh Bình", "", "VN"));
    const source = travelCatalog.countries.find(country => country.code === "VN")!.cities.find(city => city.name === "Bỉm Sơn")!;
    expect(requirePlace(reference("Bỉm Sơn", "", "VN"))).toBe(corrected);
    expect(corrected).toMatchObject({ visitCount: source.visitCount, spotCount: source.spotCount, dwellMs: source.dwellMs, firstSeen: source.firstSeen, lastSeen: source.lastSeen });
    expect(corrected.lat).toBeCloseTo(20.2581);
    expect(corrected.lng).toBeCloseTo(105.9797);
  });

  it("maps the Lake Thun photo to Leissigen without inventing a Timeline visit", () => {
    const place = requirePlace(reference("Leissigen", "BE", "CH"));
    expect(place).toMatchObject({ relationship: "visited", visitCount: 0, dwellMs: 0 });
    expect(place.media[0].src).toBe("/travel/media/leissigen/lake-thun.webp");
    expect(place.yearsVisited).toContain(2025);
    expect(requirePlace(reference("Thun", "BE", "CH")).media).toEqual([]);
  });

  it("keeps photo-established stops separate from nearby Timeline cities", () => {
    for (const [name, admin, country, count] of [
      ["Fuji", "", "JP", 1],
      ["Hakuba", "", "JP", 1],
      ["Lauterbrunnen", "BE", "CH", 2],
      ["Krattigen", "BE", "CH", 1],
    ] as const) {
      const place = requirePlace(reference(name, admin, country));
      expect(place).toMatchObject({ relationship: "visited", visitCount: 0, dwellMs: 0 });
      expect(place.media).toHaveLength(count);
    }
    expect(requirePlace(reference("Tokyo", "", "JP")).media.some(item => item.src.includes("/fuji/"))).toBe(false);
    expect(requirePlace(reference("Thun", "BE", "CH")).media).toEqual([]);
  });

  it("exposes photos from the same canonical gallery and keeps homes empty", () => {
    for (const place of travelPlaces()) {
      expect(place.photos).toEqual(place.media.filter(item => item.type === "image"));
      if (place.relationship !== "visited") expect(place.media).toEqual([]);
    }
  });
});
