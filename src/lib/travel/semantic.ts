import {
  HUB_DEFINITIONS,
  canonicalPlaceKey,
} from "@/content/travel/catalog";
import type {
  TravelHub,
  TravelHubId,
  TravelPlace,
  TravelPlaceZoom,
} from "@/content/travel/types";
import { cityPoint, type LodBand, type MapPoint } from "./geo";

export type TravelFilterMode = "all" | "lived";

export const DFW_LIVED_CLUSTER_ID = "cluster:dfw-lived";
export const DFW_LIVED_CLUSTER_LABEL = "MURPHY + RICHARDSON · 01–02";

export type SemanticMapLevel = "world" | "country" | "metro";

export type TravelVisualEmphasis = "emphasized" | "normal" | "dimmed";

export type MarkerPresentationTier = "hero" | "major" | "standard" | "minor";

export type ProjectTravelPlace = (place: TravelPlace) => MapPoint;

export type TravelMapEntity = {
  id: string;
  /** The canonical place used for marker position and interaction. */
  place: TravelPlace;
  /** The canonical places represented by this marker. */
  members: readonly TravelPlace[];
  hubId: TravelHubId | null;
  kind: "place" | "hub" | "cluster";
  count: number;
  livedCount: number;
  x: number;
  y: number;
  label?: string;
  selectionId: string;
  selected: boolean;
  emphasis: TravelVisualEmphasis;
  presentationTier: MarkerPresentationTier;
};

export type BuildTravelEntitiesOptions = {
  level: SemanticMapLevel | LodBand;
  filterMode?: TravelFilterMode;
  selectedId?: string | null;
  focusedHubId?: TravelHubId | null;
  project?: ProjectTravelPlace;
  hubs?: readonly TravelHub[];
};

export type PlaceVisibilityOptions = {
  level: SemanticMapLevel | LodBand;
  filterMode?: TravelFilterMode;
  selectedId?: string | null;
};

export type ResolveFocusedHubOptions = {
  selectedId?: string | null;
  cameraNearestPlaceId?: string | null;
  cameraPoint?: MapPoint | null;
  project?: ProjectTravelPlace;
  maxDistance?: number;
  hubs?: readonly TravelHub[];
};

const DEFAULT_HUBS: readonly TravelHub[] = HUB_DEFINITIONS;

const SEMANTIC_LEVEL_BY_LOD: Readonly<Record<LodBand, SemanticMapLevel>> = {
  world: "world",
  region: "country",
  country: "country",
  city: "metro",
};

const LEVEL_RANK: Readonly<Record<SemanticMapLevel, number>> = {
  world: 0,
  country: 1,
  metro: 2,
};

const SHOW_AT_RANK: Readonly<Record<TravelPlaceZoom, number>> = {
  world: 0,
  country: 1,
  metro: 2,
};

export function semanticLevelForLodBand(band: LodBand): SemanticMapLevel {
  return SEMANTIC_LEVEL_BY_LOD[band];
}

/** Alias for call sites that read the conversion as a transformation. */
export const semanticLevelFromLodBand = semanticLevelForLodBand;

export function normalizeSemanticLevel(
  level: SemanticMapLevel | LodBand,
): SemanticMapLevel {
  if (level === "region" || level === "city") {
    return semanticLevelForLodBand(level);
  }
  return level;
}

export function isShowAtZoomVisible(
  showAtZoom: TravelPlaceZoom,
  level: SemanticMapLevel | LodBand,
): boolean {
  return SHOW_AT_RANK[showAtZoom] <= LEVEL_RANK[normalizeSemanticLevel(level)];
}

function stableKey(place: Pick<TravelPlace, "canonicalKey" | "id">): string {
  return `${place.canonicalKey}\u0000${place.id}`;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function compareCanonicalPlaces(
  left: Pick<TravelPlace, "canonicalKey" | "id">,
  right: Pick<TravelPlace, "canonicalKey" | "id">,
): number {
  return compareText(stableKey(left), stableKey(right));
}

function matchesPlaceId(
  place: Pick<TravelPlace, "id" | "canonicalKey">,
  id: string | null | undefined,
): boolean {
  if (!id) return false;
  const query = id.trim().toLocaleLowerCase("en-US");
  return (
    place.id.toLocaleLowerCase("en-US") === query ||
    place.canonicalKey.toLocaleLowerCase("en-US") === query
  );
}

/**
 * Removes source aliases defensively. Canonical inputs normally make this a
 * no-op, but it prevents a selected or featured place from appearing twice.
 */
export function uniqueTravelPlaces(
  places: readonly TravelPlace[],
): TravelPlace[] {
  const sorted = [...places].sort(compareCanonicalPlaces);
  const ids = new Set<string>();
  const canonicalKeys = new Set<string>();
  const unique: TravelPlace[] = [];

  for (const place of sorted) {
    const id = place.id.toLocaleLowerCase("en-US");
    const canonicalKey = place.canonicalKey.toLocaleLowerCase("en-US");
    if (ids.has(id) || canonicalKeys.has(canonicalKey)) continue;
    ids.add(id);
    canonicalKeys.add(canonicalKey);
    unique.push(place);
  }

  return unique;
}

export function hasActualVisitData(place: TravelPlace): boolean {
  return (
    place.yearsVisited.length > 0 ||
    place.visitCount > 0 ||
    place.spotCount > 0
  );
}

export function filterVisualEmphasis(
  place: TravelPlace,
  mode: TravelFilterMode,
): TravelVisualEmphasis {
  if (mode === "lived") {
    return place.relationship === "visited" ? "dimmed" : "emphasized";
  }
  return "normal";
}

export const getFilterVisualEmphasis = filterVisualEmphasis;

/**
 * Pure semantic visibility. Hub grouping is handled by buildTravelEntities;
 * this helper answers whether an individual place is eligible at a level.
 */
export function isPlaceVisibleAtLevel(
  place: TravelPlace,
  options: PlaceVisibilityOptions,
): boolean {
  if (matchesPlaceId(place, options.selectedId)) return true;

  const level = normalizeSemanticLevel(options.level);
  const mode = options.filterMode ?? "all";

  if (mode === "lived" && level !== "metro") {
    return place.relationship !== "visited";
  }

  if (level === "metro") return true;
  if (level === "country") {
    return (
      place.category === "hub" ||
      place.category === "satellite" ||
      place.relationship !== "visited" ||
      isShowAtZoomVisible(place.showAtZoom, level)
    );
  }
  if (mode === "lived" && place.relationship !== "visited") return true;

  return (
    place.category === "hub" ||
    isShowAtZoomVisible(place.showAtZoom, level)
  );
}

export const isTravelPlaceVisible = isPlaceVisibleAtLevel;

export function placeSemanticPriority(
  place: TravelPlace,
  options: {
    selectedId?: string | null;
    filterMode?: TravelFilterMode;
  } = {},
): number {
  const selected = matchesPlaceId(place, options.selectedId);
  const relationship =
    place.relationship === "current_home"
      ? 3
      : place.relationship === "lived"
        ? 2
        : 1;
  const category =
    place.category === "hub" ? 3 : place.category === "destination" ? 2 : 1;
  const zoom = 3 - SHOW_AT_RANK[place.showAtZoom];
  const emphasis = filterVisualEmphasis(
    place,
    options.filterMode ?? "all",
  );

  return (
    (selected ? 1_000_000 : 0) +
    (emphasis === "emphasized" ? 100_000 : emphasis === "dimmed" ? 0 : 50_000) +
    relationship * 10_000 +
    (place.featured ? 5_000 : 0) +
    category * 1_000 +
    zoom * 100 +
    place.importance
  );
}

export function markerPresentationTier(
  place: TravelPlace,
  options: {
    selectedId?: string | null;
    kind?: TravelMapEntity["kind"];
  } = {},
): MarkerPresentationTier {
  if (
    matchesPlaceId(place, options.selectedId) ||
    place.relationship === "current_home"
  ) {
    return "hero";
  }
  if (
    place.relationship === "lived" ||
    options.kind === "hub" ||
    place.category === "hub" ||
    (place.featured && place.importance >= 90)
  ) {
    return "major";
  }
  if (place.featured || place.importance >= 70) return "standard";
  return "minor";
}

export const getMarkerPresentationTier = markerPresentationTier;

function definitionMemberKeys(hub: TravelHub): Set<string> {
  return new Set(hub.members.map(canonicalPlaceKey));
}

export function getHubMembers(
  places: readonly TravelPlace[],
  hubId: TravelHubId,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): TravelPlace[] {
  const hub = hubs.find((candidate) => candidate.id === hubId);
  if (!hub) return [];
  const memberKeys = definitionMemberKeys(hub);
  return uniqueTravelPlaces(places)
    .filter(
      (place) =>
        memberKeys.has(place.canonicalKey) ||
        (place.hubId === hub.id && memberKeys.has(place.canonicalKey)),
    )
    .sort(compareCanonicalPlaces);
}

export const hubMembers = getHubMembers;

export function getHubRoot(
  places: readonly TravelPlace[],
  hubId: TravelHubId,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): TravelPlace | null {
  const hub = hubs.find((candidate) => candidate.id === hubId);
  if (!hub) return null;
  const rootKey = canonicalPlaceKey(hub.centerPlace);
  return (
    uniqueTravelPlaces(places).find(
      (place) => place.canonicalKey === rootKey,
    ) ?? null
  );
}

export function getPlaceHub(
  place: TravelPlace,
  hubs: readonly TravelHub[] = DEFAULT_HUBS,
): TravelHub | null {
  if (place.hubId) {
    const direct = hubs.find((hub) => hub.id === place.hubId);
    if (direct && definitionMemberKeys(direct).has(place.canonicalKey)) {
      return direct;
    }
  }
  return (
    hubs.find((hub) => definitionMemberKeys(hub).has(place.canonicalKey)) ??
    null
  );
}

function projectedPoint(
  place: TravelPlace,
  project?: ProjectTravelPlace,
): MapPoint {
  return project ? project(place) : cityPoint(place);
}

/**
 * Selection wins. With no selected hub, callers can supply either the
 * camera-nearest root id or a camera point from which roots are ranked.
 */
export function resolveFocusedHub(
  places: readonly TravelPlace[],
  options: ResolveFocusedHubOptions = {},
): TravelHub | null {
  const hubs = options.hubs ?? DEFAULT_HUBS;
  const canonicalPlaces = uniqueTravelPlaces(places);
  const selected = canonicalPlaces.find((place) =>
    matchesPlaceId(place, options.selectedId),
  );
  if (selected) {
    const selectedHub = getPlaceHub(selected, hubs);
    if (selectedHub) return selectedHub;
  }

  const nearest = canonicalPlaces.find((place) =>
    matchesPlaceId(place, options.cameraNearestPlaceId),
  );
  if (nearest) {
    const rootHub = hubs.find(
      (hub) =>
        canonicalPlaceKey(hub.centerPlace) === nearest.canonicalKey,
    );
    if (rootHub) return rootHub;
  }

  if (!options.cameraPoint) return null;
  const limit = options.maxDistance ?? Number.POSITIVE_INFINITY;
  const candidates = hubs
    .map((hub) => {
      const root = getHubRoot(canonicalPlaces, hub.id, hubs);
      if (!root) return null;
      const point = projectedPoint(root, options.project);
      return {
        hub,
        distance: Math.hypot(
          point.x - options.cameraPoint!.x,
          point.y - options.cameraPoint!.y,
        ),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        hub: TravelHub;
        distance: number;
      } => candidate !== null && candidate.distance <= limit,
    )
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareText(left.hub.id, right.hub.id),
    );

  return candidates[0]?.hub ?? null;
}

function entityEmphasis(
  members: readonly TravelPlace[],
  filterMode: TravelFilterMode,
  selected: boolean,
): TravelVisualEmphasis {
  if (selected) return "emphasized";
  const values = members.map((place) =>
    filterVisualEmphasis(place, filterMode),
  );
  if (values.some((value) => value === "emphasized")) return "emphasized";
  if (values.every((value) => value === "dimmed")) return "dimmed";
  return "normal";
}

function createPlaceEntity(
  place: TravelPlace,
  options: Required<
    Pick<BuildTravelEntitiesOptions, "filterMode" | "selectedId">
  > &
    Pick<BuildTravelEntitiesOptions, "project">,
  kind: TravelMapEntity["kind"] = "place",
): TravelMapEntity {
  const point = projectedPoint(place, options.project);
  const selected = matchesPlaceId(place, options.selectedId);
  return {
    id: place.id,
    place,
    members: [place],
    hubId: place.hubId,
    kind,
    count: 1,
    livedCount: place.relationship === "visited" ? 0 : 1,
    x: point.x,
    y: point.y,
    selectionId: place.id,
    selected,
    emphasis: entityEmphasis([place], options.filterMode, selected),
    presentationTier: markerPresentationTier(place, {
      selectedId: options.selectedId,
      kind,
    }),
  };
}

export function dfwLivedChapters(
  places: readonly TravelPlace[],
): TravelPlace[] {
  return uniqueTravelPlaces(places)
    .filter(
      (place) =>
        place.hubId === "dfw" &&
        place.relationship === "lived" &&
        (place.residenceOrder === 1 || place.residenceOrder === 2),
    )
    .sort(
      (left, right) =>
        (left.residenceOrder ?? 99) - (right.residenceOrder ?? 99) ||
        compareCanonicalPlaces(left, right),
    );
}

export function shouldClusterDfwLivedChapters(
  level: SemanticMapLevel | LodBand,
  filterMode: TravelFilterMode = "all",
): boolean {
  return (
    filterMode === "lived" && normalizeSemanticLevel(level) !== "metro"
  );
}

function createDfwLivedCluster(
  members: readonly TravelPlace[],
  options: Required<
    Pick<BuildTravelEntitiesOptions, "filterMode" | "selectedId">
  > &
    Pick<BuildTravelEntitiesOptions, "project">,
): TravelMapEntity | null {
  if (members.length < 2) return null;
  const primary = members[0];
  const points = members.map((place) => projectedPoint(place, options.project));
  const selected = members.some((place) =>
    matchesPlaceId(place, options.selectedId),
  );
  return {
    id: DFW_LIVED_CLUSTER_ID,
    place: primary,
    members,
    hubId: "dfw",
    kind: "cluster",
    count: members.length,
    livedCount: members.length,
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    label: DFW_LIVED_CLUSTER_LABEL,
    selectionId: primary.id,
    selected,
    emphasis: "emphasized",
    presentationTier: "major",
  };
}

function createHubEntity(
  hub: TravelHub,
  root: TravelPlace,
  members: readonly TravelPlace[],
  options: Required<
    Pick<BuildTravelEntitiesOptions, "filterMode" | "selectedId">
  > &
    Pick<BuildTravelEntitiesOptions, "project">,
): TravelMapEntity {
  const point = projectedPoint(root, options.project);
  const selected = members.some((place) =>
    matchesPlaceId(place, options.selectedId),
  );
  return {
    id: `hub:${hub.id}`,
    place: root,
    members,
    hubId: hub.id,
    kind: "hub",
    count: members.length,
    livedCount: members.filter(
      (place) => place.relationship !== "visited",
    ).length,
    x: point.x,
    y: point.y,
    selectionId: root.id,
    selected,
    emphasis: entityEmphasis(members, options.filterMode, selected),
    presentationTier: markerPresentationTier(root, {
      selectedId: selected ? root.id : options.selectedId,
      kind: "hub",
    }),
  };
}

export function entityPriority(
  entity: TravelMapEntity,
  filterMode: TravelFilterMode = "all",
): number {
  const memberPriority = Math.max(
    ...entity.members.map((place) =>
      placeSemanticPriority(place, {
        selectedId: entity.selected ? place.id : null,
        filterMode,
      }),
    ),
  );
  return memberPriority + (entity.kind === "hub" ? 500 : 0);
}

export function compareTravelEntities(
  left: TravelMapEntity,
  right: TravelMapEntity,
  filterMode: TravelFilterMode = "all",
): number {
  return (
    entityPriority(right, filterMode) - entityPriority(left, filterMode) ||
    compareCanonicalPlaces(left.place, right.place) ||
    compareText(left.id, right.id)
  );
}

function stableAngle(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 33) + id.charCodeAt(index)) >>> 0;
  }
  return ((hash % 24) / 24) * Math.PI * 2;
}

/**
 * Separates dense metro markers in screen space without changing canonical
 * coordinates. Higher-priority entities keep their true position; lower
 * priorities move to the first deterministic nearby free slot.
 */
export function spreadDenseEntities(
  entities: readonly TravelMapEntity[],
  scale: number,
  minimumScreenDistance = 30,
): TravelMapEntity[] {
  const safeScale = Math.max(0.01, scale);
  const accepted: TravelMapEntity[] = [];

  for (const entity of entities) {
    const collides = (x: number, y: number) =>
      accepted.some(
        (other) =>
          Math.hypot(x - other.x, y - other.y) * safeScale <
          minimumScreenDistance,
      );
    if (!collides(entity.x, entity.y)) {
      accepted.push(entity);
      continue;
    }

    const start = stableAngle(entity.id);
    let placed = entity;
    let found = false;
    for (let ring = 1; ring <= 3 && !found; ring += 1) {
      const radius = (minimumScreenDistance * ring) / safeScale;
      for (let slot = 0; slot < 12; slot += 1) {
        const angle = start + (slot / 12) * Math.PI * 2;
        const x = entity.x + Math.cos(angle) * radius;
        const y = entity.y + Math.sin(angle) * radius;
        if (collides(x, y)) continue;
        placed = { ...entity, x, y };
        found = true;
        break;
      }
    }
    accepted.push(placed);
  }

  return accepted;
}

/**
 * Builds semantic markers without geographic clustering. Explicit curated
 * hubs are the only groups, and every split/collapse decision is deterministic.
 */
export function buildTravelEntities(
  places: readonly TravelPlace[],
  options: BuildTravelEntitiesOptions,
): TravelMapEntity[] {
  const level = normalizeSemanticLevel(options.level);
  const filterMode = options.filterMode ?? "all";
  const selectedId = options.selectedId ?? null;
  const focusedHubId = options.focusedHubId ?? null;
  const hubs = options.hubs ?? DEFAULT_HUBS;
  const canonicalPlaces = uniqueTravelPlaces(places);
  const consumed = new Set<string>();
  const entities: TravelMapEntity[] = [];
  const entityOptions = {
    filterMode,
    selectedId,
    project: options.project,
  };
  const addPlace = (
    place: TravelPlace,
    kind: TravelMapEntity["kind"] = "place",
  ) => {
    if (consumed.has(place.canonicalKey)) return;
    consumed.add(place.canonicalKey);
    entities.push(createPlaceEntity(place, entityOptions, kind));
  };

  if (shouldClusterDfwLivedChapters(level, filterMode)) {
    const chapters = dfwLivedChapters(canonicalPlaces);
    const cluster = createDfwLivedCluster(
      chapters,
      entityOptions,
    );
    if (cluster) {
      cluster.members.forEach((place) => consumed.add(place.canonicalKey));
      entities.push(cluster);
    }
  }

  if (level === "world" && filterMode === "lived") {
    for (const place of canonicalPlaces) {
      if (place.relationship !== "visited") addPlace(place);
    }
  }

  for (const hub of [...hubs].sort((left, right) =>
    compareText(left.id, right.id),
  )) {
    const allMembers = getHubMembers(canonicalPlaces, hub.id, hubs);
    const root = getHubRoot(canonicalPlaces, hub.id, hubs);
    if (!root || allMembers.length === 0) continue;
    if (filterMode === "lived" && root.relationship === "visited") continue;

    if (level === "world") {
      // A lived root (Austin) is already its own chronology marker.
      if (consumed.has(root.canonicalKey)) continue;
      const selectedMember = allMembers.find((place) =>
        matchesPlaceId(place, selectedId),
      );
      const groupedMembers = allMembers.filter(
        (place) =>
          !consumed.has(place.canonicalKey) &&
          (!selectedMember ||
            selectedMember.canonicalKey === root.canonicalKey ||
            place.canonicalKey !== selectedMember.canonicalKey),
      );
      if (groupedMembers.length > 0) {
        groupedMembers.forEach((place) => consumed.add(place.canonicalKey));
        entities.push(
          createHubEntity(hub, root, groupedMembers, entityOptions),
        );
      }
      if (
        selectedMember &&
        selectedMember.canonicalKey !== root.canonicalKey
      ) {
        addPlace(selectedMember);
      }
      continue;
    }

    if (level === "country") {
      if (!consumed.has(root.canonicalKey)) {
        consumed.add(root.canonicalKey);
        const rootSelected = matchesPlaceId(root, selectedId);
        const hubEntity = createPlaceEntity(
          root,
          entityOptions,
          "hub",
        );
        entities.push({
          ...hubEntity,
          id: `hub:${hub.id}`,
          count: allMembers.length,
          livedCount: allMembers.filter(
            (place) => place.relationship !== "visited",
          ).length,
          selected: rootSelected,
          emphasis: entityEmphasis(
            allMembers,
            filterMode,
            rootSelected,
          ),
          presentationTier: markerPresentationTier(root, {
            selectedId,
            kind: "hub",
          }),
        });
      }
      if (focusedHubId === hub.id) {
        for (const member of allMembers) {
          if (member.canonicalKey !== root.canonicalKey) addPlace(member);
        }
      } else {
        for (const member of allMembers) {
          if (member.canonicalKey !== root.canonicalKey) {
            consumed.add(member.canonicalKey);
          }
        }
      }
      continue;
    }

    for (const member of allMembers) addPlace(member);
  }

  for (const place of canonicalPlaces) {
    if (consumed.has(place.canonicalKey)) continue;
    if (
      isPlaceVisibleAtLevel(place, {
        level,
        filterMode,
        selectedId,
      })
    ) {
      addPlace(place, place.category === "hub" ? "hub" : "place");
    }
  }

  const selectedPlace = canonicalPlaces.find((place) =>
    matchesPlaceId(place, selectedId),
  );
  if (selectedPlace && !consumed.has(selectedPlace.canonicalKey)) {
    addPlace(selectedPlace);
  }

  return entities.sort((left, right) =>
    compareTravelEntities(left, right, filterMode),
  );
}

export const buildMapEntities = buildTravelEntities;
export const buildSemanticEntities = buildTravelEntities;
