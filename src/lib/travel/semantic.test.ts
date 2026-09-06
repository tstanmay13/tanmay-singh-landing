import { describe, expect, it } from "vitest";

import {
  HUB_DEFINITIONS,
  findTravelPlace,
  travelPlaces,
} from "@/content/travel/catalog";
import type {
  TravelPlace,
  TravelPlaceReference,
} from "@/content/travel/types";
import {
  DFW_LIVED_CLUSTER_ID,
  DFW_LIVED_CLUSTER_LABEL,
  buildTravelEntities,
  compareTravelEntities,
  isPlaceVisibleAtLevel,
  isShowAtZoomVisible,
  placeSemanticPriority,
  shouldClusterDfwLivedChapters,
  spreadDenseEntities,
  type TravelMapEntity,
} from "./semantic";

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

function requireEntity(
  entities: readonly TravelMapEntity[],
  place: TravelPlace,
): TravelMapEntity {
  const matches = entities.filter((entity) =>
    entity.members.some(
      (member) => member.canonicalKey === place.canonicalKey,
    ),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one entity for ${place.name}, received ${matches.length}`,
    );
  }
  return matches[0];
}

function requireMinorDestination(): TravelPlace {
  const found = places.find(
    (place) =>
      place.relationship === "visited" &&
      place.category === "destination" &&
      !place.featured &&
      place.importance <= 36,
  );
  if (!found) throw new Error("Missing a canonical minor destination");
  return found;
}

describe("semantic hub grouping", () => {
  it("uses only the explicit hubs at world/all with compact counts", () => {
    const entities = buildTravelEntities(places, {
      level: "world",
      filterMode: "all",
      hubs: HUB_DEFINITIONS,
    });
    const hubs = entities
      .filter((entity) => entity.kind === "hub")
      .map((entity) => ({
        id: entity.id,
        hubId: entity.hubId,
        name: entity.place.name,
        count: entity.count,
        selectionId: entity.selectionId,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(hubs).toEqual([
      {
        id: "hub:austin",
        hubId: "austin",
        name: "Austin",
        count: 5,
        selectionId: usPlace("Austin", "TX").id,
      },
      {
        id: "hub:dfw",
        hubId: "dfw",
        name: "Dallas",
        count: 15,
        selectionId: usPlace("Dallas", "TX").id,
      },
      {
        id: "hub:houston",
        hubId: "houston",
        name: "Houston",
        count: 3,
        selectionId: usPlace("Houston", "TX").id,
      },
      {
        id: "hub:kansai",
        hubId: "kansai",
        name: "Osaka",
        count: 2,
        selectionId: requirePlace({ countryCode: "JP", name: "Osaka" }).id,
      },
      {
        id: "hub:tokyo",
        hubId: "tokyo",
        name: "Tokyo",
        count: 1,
        selectionId: requirePlace({ countryCode: "JP", name: "Tokyo" }).id,
      },
    ]);
  });

  it("summarizes Murphy and Richardson in DFW until lived detail emerges", () => {
    const murphy = usPlace("Murphy", "TX");
    const richardson = usPlace("Richardson", "TX");
    const worldAll = buildTravelEntities(places, {
      level: "world",
      filterMode: "all",
    });
    const dfwAtWorld = worldAll.find((entity) => entity.id === "hub:dfw");

    expect(dfwAtWorld).toMatchObject({ count: 15, kind: "hub" });
    expect(dfwAtWorld?.members).toEqual(
      expect.arrayContaining([murphy, richardson]),
    );
    expect(worldAll.some((entity) => entity.id === murphy.id)).toBe(false);
    expect(worldAll.some((entity) => entity.id === richardson.id)).toBe(false);

    const country = buildTravelEntities(places, {
      level: "country",
      filterMode: "all",
    });
    expect(country.some((entity) => entity.id === murphy.id)).toBe(false);
    expect(country.some((entity) => entity.id === richardson.id)).toBe(false);

    const expanded = buildTravelEntities(places, {
      level: "country",
      filterMode: "all",
      focusedHubId: "dfw",
    });
    const metro = buildTravelEntities(places, {
      level: "metro",
      filterMode: "all",
    });
    for (const entities of [expanded, metro]) {
      for (const home of [murphy, richardson]) {
        const entity = requireEntity(entities, home);
        expect(entity).toMatchObject({
          id: home.id,
          kind: "place",
          count: 1,
        });
        expect(entity.members).toEqual([home]);
      }
    }

    const worldLived = buildTravelEntities(places, {
      level: "world",
      filterMode: "lived",
    });
    expect(worldLived.find((entity) => entity.id === DFW_LIVED_CLUSTER_ID)).toMatchObject({
      kind: "cluster",
      count: 2,
    });
    expect(worldLived.find((entity) => entity.id === "hub:dfw")).toBeUndefined();
  });

  it("keeps Austin canonical while presenting its lived and hub roles once", () => {
    const austin = usPlace("Austin", "TX");

    expect(
      places.filter((place) => place.canonicalKey === austin.canonicalKey),
    ).toEqual([austin]);
    expect(austin).toMatchObject({
      relationship: "lived",
      category: "hub",
      hubId: "austin",
    });

    const worldAll = requireEntity(
      buildTravelEntities(places, {
        level: "world",
        filterMode: "all",
      }),
      austin,
    );
    expect(worldAll).toMatchObject({
      id: "hub:austin",
      kind: "hub",
      count: 5,
      place: austin,
    });

    const countryAll = requireEntity(
      buildTravelEntities(places, {
        level: "country",
        filterMode: "all",
      }),
      austin,
    );
    expect(countryAll).toMatchObject({
      id: "hub:austin",
      kind: "hub",
      count: 5,
      place: austin,
    });

    const worldLived = requireEntity(
      buildTravelEntities(places, {
        level: "world",
        filterMode: "lived",
      }),
      austin,
    );
    expect(worldLived).toMatchObject({
      id: austin.id,
      kind: "place",
      count: 1,
      emphasis: "emphasized",
      place: austin,
    });
    expect(worldLived.members).toEqual([austin]);
  });

  it("keeps current-home NYC as one standalone world entity", () => {
    const nyc = usPlace("New York City", "NY");
    const entities = buildTravelEntities(places, {
      level: "world",
      filterMode: "all",
    });
    const entity = requireEntity(entities, nyc);

    expect(nyc.relationship).toBe("current_home");
    expect(entity).toMatchObject({
      id: nyc.id,
      kind: "place",
      count: 1,
      selectionId: nyc.id,
      place: nyc,
    });
    expect(entity.members).toEqual([nyc]);
  });
});

describe("semantic visibility and emphasis", () => {
  it.each([
    {
      reference: { countryCode: "US", admin: "AZ", name: "Grand Canyon" },
      showAtZoom: "world",
      visible: [true, true, true],
    },
    {
      reference: { countryCode: "US", admin: "WA", name: "Seattle" },
      showAtZoom: "country",
      visible: [false, true, true],
    },
    {
      reference: { countryCode: "US", admin: "TX", name: "Murphy" },
      showAtZoom: "metro",
      visible: [false, false, true],
    },
  ] as const)(
    "obeys $showAtZoom metadata for $reference.name",
    ({ reference, showAtZoom, visible }) => {
      const place = requirePlace(reference);

      expect(place.showAtZoom).toBe(showAtZoom);
      expect(
        (["world", "country", "metro"] as const).map((level) =>
          isShowAtZoomVisible(place.showAtZoom, level),
        ),
      ).toEqual(visible);
    },
  );

  it("applies level semantics and reveals a selected hidden place", () => {
    const grandCanyon = usPlace("Grand Canyon", "AZ");
    const seattle = usPlace("Seattle", "WA");
    const murphy = usPlace("Murphy", "TX");

    expect(
      (["world", "country", "metro"] as const).map((level) =>
        isPlaceVisibleAtLevel(grandCanyon, { level }),
      ),
    ).toEqual([true, true, true]);
    expect(
      (["world", "country", "metro"] as const).map((level) =>
        isPlaceVisibleAtLevel(seattle, { level }),
      ),
    ).toEqual([false, true, true]);
    expect(
      (["world", "country", "metro"] as const).map((level) =>
        isPlaceVisibleAtLevel(murphy, { level }),
      ),
    ).toEqual([false, true, true]);

    expect(
      isPlaceVisibleAtLevel(seattle, {
        level: "world",
        selectedId: seattle.canonicalKey,
      }),
    ).toBe(true);

    const selected = requireEntity(
      buildTravelEntities(places, {
        level: "world",
        filterMode: "all",
        selectedId: seattle.canonicalKey,
      }),
      seattle,
    );
    expect(selected).toMatchObject({
      id: seattle.id,
      selected: true,
      emphasis: "emphasized",
      place: seattle,
    });
  });

  it("changes visual emphasis without dropping canonical metro records", () => {
    const byMode = Object.fromEntries(
      (["all", "lived"] as const).map((filterMode) => [
        filterMode,
        buildTravelEntities(places, {
          level: "metro",
          filterMode,
        }),
      ]),
    ) as Record<"all" | "lived", TravelMapEntity[]>;
    const canonicalKeys = [...places]
      .map((place) => place.canonicalKey)
      .sort();

    for (const entities of Object.values(byMode)) {
      expect(entities).toHaveLength(places.length);
      expect(
        entities.map((entity) => entity.place.canonicalKey).sort(),
      ).toEqual(canonicalKeys);
      for (const entity of entities) {
        expect(entity.members).toEqual([entity.place]);
        expect(places).toContain(entity.place);
      }
    }

    const austin = usPlace("Austin", "TX");
    const murphy = usPlace("Murphy", "TX");
    const dallas = usPlace("Dallas", "TX");

    expect(requireEntity(byMode.all, murphy).emphasis).toBe("normal");
    expect(requireEntity(byMode.lived, murphy).emphasis).toBe("emphasized");
    expect(requireEntity(byMode.lived, dallas).emphasis).toBe("dimmed");
    expect(requireEntity(byMode.lived, austin).emphasis).toBe("emphasized");
  });

  it("prioritizes current and past homes over minor destinations", () => {
    const currentHome = usPlace("New York City", "NY");
    const pastHome = usPlace("Murphy", "TX");
    const minor = requireMinorDestination();

    expect(minor).toMatchObject({
      relationship: "visited",
      category: "destination",
      featured: false,
    });
    expect(placeSemanticPriority(currentHome)).toBeGreaterThan(
      placeSemanticPriority(pastHome),
    );
    expect(placeSemanticPriority(pastHome)).toBeGreaterThan(
      placeSemanticPriority(minor),
    );
  });
});

describe("dense marker spreading", () => {
  it("deterministically separates overlaps while preserving true coordinates for the highest priority", () => {
    const currentHome = usPlace("New York City", "NY");
    const pastHome = usPlace("Murphy", "TX");
    const minor = requireMinorDestination();
    const metroEntities = buildTravelEntities(places, {
      level: "metro",
      filterMode: "all",
    });
    const crowded = [currentHome, pastHome, minor]
      .map((place) => requireEntity(metroEntities, place))
      .map((entity) => ({ ...entity, x: 240, y: 160 }))
      .sort((left, right) => compareTravelEntities(left, right));

    expect(crowded.map((entity) => entity.place)).toEqual([
      currentHome,
      pastHome,
      minor,
    ]);

    const first = spreadDenseEntities(crowded, 2, 40);
    const repeated = spreadDenseEntities(crowded, 2, 40);

    expect(repeated).toEqual(first);
    expect(first[0]).toMatchObject({
      x: 240,
      y: 160,
      place: currentHome,
    });
    expect(crowded.every(({ x, y }) => x === 240 && y === 160)).toBe(true);

    for (let left = 0; left < first.length; left += 1) {
      for (let right = left + 1; right < first.length; right += 1) {
        const screenDistance =
          Math.hypot(
            first[left].x - first[right].x,
            first[left].y - first[right].y,
          ) * 2;
        expect(screenDistance).toBeGreaterThanOrEqual(40 - 1e-9);
      }
    }
  });

  it("clusters Murphy and Richardson on LIFE PATH until metro zoom", () => {
    expect(shouldClusterDfwLivedChapters("world", "lived")).toBe(true);
    expect(shouldClusterDfwLivedChapters("country", "lived")).toBe(true);
    expect(shouldClusterDfwLivedChapters("metro", "lived")).toBe(false);
    expect(shouldClusterDfwLivedChapters("world", "all")).toBe(false);

    const broad = buildTravelEntities(places, {
      level: "country",
      filterMode: "lived",
    });
    const cluster = broad.find((entity) => entity.id === DFW_LIVED_CLUSTER_ID);
    expect(cluster).toMatchObject({
      kind: "cluster",
      label: DFW_LIVED_CLUSTER_LABEL,
      count: 2,
    });
    expect(cluster?.members.map((place) => place.name)).toEqual([
      "Richardson",
      "Murphy",
    ]);
    expect(
      broad.filter((entity) =>
        ["Murphy", "Richardson"].includes(entity.place.name),
      ),
    ).toHaveLength(1);

    const metro = buildTravelEntities(places, {
      level: "metro",
      filterMode: "lived",
    });
    expect(
      metro.find((entity) => entity.id === DFW_LIVED_CLUSTER_ID),
    ).toBeUndefined();
    expect(requireEntity(metro, usPlace("Murphy", "TX")).kind).toBe("place");
    expect(requireEntity(metro, usPlace("Richardson", "TX")).kind).toBe(
      "place",
    );
  });

  it("keeps Dallas selectable instead of expanding Murphy at country zoom", () => {
    const country = buildTravelEntities(places, {
      level: "country",
      filterMode: "all",
    });
    const dallas = requireEntity(country, usPlace("Dallas", "TX"));
    expect(dallas.kind).toBe("hub");
    expect(dallas.selectionId).toBe(usPlace("Dallas", "TX").id);
    expect(
      country.find((entity) => entity.place.name === "Murphy"),
    ).toBeUndefined();

    const expanded = buildTravelEntities(places, {
      level: "country",
      filterMode: "all",
      focusedHubId: "dfw",
    });
    expect(requireEntity(expanded, usPlace("Murphy", "TX")).kind).toBe("place");
  });
});
