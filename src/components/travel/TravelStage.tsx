"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  HUB_DEFINITIONS,
  getCurrentHome,
  getTravelPlace,
  travelCatalog,
  travelPlaces,
} from "@/content/travel/catalog";
import type {
  TravelHub,
  TravelHubId,
  TravelPlace,
} from "@/content/travel/types";
import { countryTitle } from "@/lib/travel/geo";
import {
  getHubMembers,
  type TravelFilterMode,
} from "@/lib/travel/semantic";
import {
  deriveContextualTravelStats,
  type TravelStatsContext,
} from "@/lib/travel/stats";
import PixelMap, { type TravelMapView } from "./PixelMap";
import PlaceCard from "./PlaceCard";
import styles from "./travel.module.css";

const WORLD_SHORT: Record<string, string> = {
  US: "USA",
  JP: "JAPAN",
  MX: "MEXICO",
  TH: "THAILAND",
  IT: "ITALY",
  ES: "SPAIN",
  CH: "SWISS",
  VN: "VIETNAM",
  AU: "AUSTRALIA",
  FR: "FRANCE",
  VA: "VATICAN",
};

const EMPTY_VIEW: TravelMapView = {
  band: "world",
  kicker: "OVERWORLD",
  title: "WORLD MAP",
  continent: null,
  countryCode: null,
  cityId: null,
  visibleCountryCodes: [],
  hubId: null,
};

const FILTERS: ReadonlyArray<{
  id: TravelFilterMode;
  label: string;
  description: string;
}> = [
  { id: "all", label: "TRAVEL MAP", description: "Show every destination" },
  { id: "lived", label: "LIFE PATH", description: "Show home chapters" },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function selectedKicker(place: TravelPlace) {
  if (place.relationship === "current_home") return "CURRENT HOME";
  if (place.relationship === "lived") return "LIVED HERE";
  if (place.category === "hub") return "TRAVEL HUB";
  return countryTitle(place.countryCode, place.country);
}

export default function TravelStage() {
  const places = useMemo(() => travelPlaces(), []);
  const placesById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );
  const hubsById = useMemo(
    () =>
      new Map(
        HUB_DEFINITIONS.map((hub) => [hub.id, hub] as const),
      ) as ReadonlyMap<TravelHubId, TravelHub>,
    [],
  );
  const hubMembersById = useMemo(
    () =>
      new Map(
        HUB_DEFINITIONS.map((hub) => [
          hub.id,
          getHubMembers(places, hub.id),
        ]),
      ),
    [places],
  );
  const currentHome = useMemo(() => getCurrentHome(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);
  const [focusCountry, setFocusCountry] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [mode, setMode] = useState<TravelFilterMode>("all");
  const [atlas, setAtlas] = useState<TravelMapView>(EMPTY_VIEW);
  const [mounted, setMounted] = useState(false);
  const stripRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = selectedId ? placesById.get(selectedId) ?? null : null;
  const selectedHub = selected?.hubId
    ? hubsById.get(selected.hubId) ?? null
    : null;
  const selectedHubMembers = selected?.hubId
    ? hubMembersById.get(selected.hubId) ?? []
    : [];

  const closePlace = useCallback(() => {
    const closingId = selectedId;
    setSelectedId(null);
    if (!closingId) return;
    requestAnimationFrame(() => {
      const pin = document.querySelector<HTMLElement>(
        `[data-place-id="${CSS.escape(closingId)}"]`,
      );
      pin?.focus();
    });
  }, [selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !selectedId) return;
      event.preventDefault();
      closePlace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePlace, selectedId]);

  const pickWorld = useCallback((code: string) => {
    setSelectedId(null);
    setFocusCountry(code);
    setFocusTick((tick) => tick + 1);
  }, []);

  const pickPlace = useCallback(
    (id: string) => {
      setSelectedId(id);
      const place = placesById.get(id);
      if (place) setFocusCountry(place.countryCode);
    },
    [placesById],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("city");
    if (!query) return;
    const match = getTravelPlace(query);
    if (match) pickPlace(match.id);
  }, [pickPlace]);

  const stripCountry =
    atlas.countryCode ??
    (atlas.band === "world" ? null : focusCountry) ??
    selected?.countryCode;

  useEffect(() => {
    if (!stripCountry || !stripRef.current) return;
    const root = stripRef.current;
    const node = root.querySelector(`[data-world="${stripCountry}"]`);
    if (!(node instanceof HTMLElement)) return;
    const left =
      node.offsetLeft - root.clientWidth / 2 + node.offsetWidth / 2;
    root.scrollTo({
      left: Math.max(0, left),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [reducedMotion, stripCountry]);

  const statsContext: TravelStatsContext =
    mode === "lived"
      ? { kind: "lived" }
      : atlas.hubId
        ? { kind: "hub", hubId: atlas.hubId }
        : atlas.countryCode
          ? { kind: "country", countryCode: atlas.countryCode }
          : { kind: "world" };
  const contextualStats = deriveContextualTravelStats(
    places,
    statsContext,
    HUB_DEFINITIONS,
  );
  const stats = contextualStats?.hud ?? [];
  const activeHub = atlas.hubId
    ? hubsById.get(atlas.hubId) ?? null
    : null;
  const headerTitle = selected
    ? (selected.displayTitle ?? selected.name).toLocaleUpperCase("en-US")
    : mode === "lived"
      ? "LIFE PATH"
      : focusCountry && !activeHub
        ? (WORLD_SHORT[focusCountry] ?? focusCountry)
      : activeHub
        ? activeHub.name.toLocaleUpperCase("en-US")
      : atlas.title;
  const headerKicker = selected
    ? selectedKicker(selected)
    : mode === "lived"
      ? "HOME CHAPTERS"
      : activeHub
        ? "METRO"
      : atlas.kicker;

  return (
    <div
      className={styles.root}
      data-map-mode={mode}
      data-theme={theme}
    >
      <div className={styles.stage}>
        {mounted ? (
          <PixelMap
            places={places}
            selectedId={selectedId}
            currentHomeId={currentHome.id}
            mode={mode}
            highlightCountry={focusCountry ? null : highlightCountry}
            focusCountry={focusCountry}
            focusTick={focusTick}
            reducedMotion={reducedMotion}
            theme={theme}
            onSelect={pickPlace}
            onView={setAtlas}
          />
        ) : (
          <p className={styles.mapBoot}>LOADING WORLD…</p>
        )}

        <header className={styles.hud} aria-live="polite">
          <div className={styles.heading}>
            <p className={styles.kicker}>{headerKicker}</p>
            <h1 className={styles.title}>{headerTitle}</h1>
          </div>
          <div
            className={styles.modes}
            role="group"
            aria-label="Map story mode"
          >
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`${styles.filterBtn} ${
                  mode === filter.id ? styles.filterBtnOn : ""
                }`}
                aria-pressed={mode === filter.id}
                aria-label={`${filter.label}: ${filter.description}`}
                onClick={() => setMode(filter.id)}
                data-filter={filter.id}
                data-interactive
              >
                {filter.label}
              </button>
            ))}
          </div>
          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div key={stat.id} data-stat={stat.id}>
                <dt>{stat.label}</dt>
                <dd title={String(stat.value)}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <nav
          ref={stripRef}
          className={styles.worlds}
          aria-label="Countries"
          data-layer="chrome"
        >
          {travelCatalog.countries.map((country, index) => {
            const active = country.code === stripCountry;
            const inView =
              !focusCountry &&
              atlas.visibleCountryCodes.includes(country.code);
            return (
              <button
                key={country.code}
                type="button"
                className={`${styles.worldBtn} ${
                  active ? styles.worldBtnOn : ""
                } ${inView ? styles.worldBtnIn : ""}`}
                data-world={country.code}
                aria-label={`Focus map on ${country.name}`}
                aria-current={active ? "true" : undefined}
                onClick={() => pickWorld(country.code)}
                onPointerEnter={() => setHighlightCountry(country.code)}
                onPointerLeave={() => setHighlightCountry(null)}
                onFocus={() => setHighlightCountry(country.code)}
                onBlur={() => setHighlightCountry(null)}
                data-interactive
              >
                <span className={styles.worldNum}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.worldName}>
                  {WORLD_SHORT[country.code] ?? country.name.toUpperCase()}
                </span>
              </button>
            );
          })}
        </nav>

        {selected ? (
          <PlaceCard
            key={selected.id}
            place={selected}
            hub={selectedHub}
            hubMembers={selectedHubMembers}
            onClose={closePlace}
          />
        ) : null}
      </div>
    </div>
  );
}
