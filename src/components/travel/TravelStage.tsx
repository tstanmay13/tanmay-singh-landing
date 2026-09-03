"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { globeCities, travelCatalog } from "@/content/travel/catalog";
import { stillsFor } from "@/content/travel/stills";
import type { CatalogCity } from "@/content/travel/types";
import { countryTitle, type AtlasView } from "@/lib/travel/geo";
import PixelMap from "./PixelMap";
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

const EMPTY_VIEW: AtlasView = {
  band: "world",
  kicker: "OVERWORLD",
  title: "WORLD MAP",
  continent: null,
  countryCode: null,
  cityId: null,
  visibleCountryCodes: [],
};

export default function TravelStage() {
  const cities = useMemo(() => globeCities(), []);
  const citiesById = useMemo(
    () => new Map(cities.map((city) => [city.id, city])),
    [cities],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);
  const [focusCountry, setFocusCountry] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [atlas, setAtlas] = useState<AtlasView>(EMPTY_VIEW);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const stripRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = selectedId ? citiesById.get(selectedId) ?? null : null;
  const hereId = useMemo(() => {
    const latest = cities.reduce(
      (best, city) => (city.lastSeen > best.lastSeen ? city : best),
      cities[0],
    );
    return latest?.id ?? null;
  }, [cities]);

  const stripCountry =
    highlightCountry ??
    (atlas.band === "world" ? focusCountry : atlas.countryCode) ??
    focusCountry ??
    selected?.countryCode;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setHighlightCountry(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!stripCountry || !stripRef.current) return;
    const root = stripRef.current;
    const node = root.querySelector(`[data-world="${stripCountry}"]`);
    if (!(node instanceof HTMLElement)) return;
    const left = node.offsetLeft - root.clientWidth / 2 + node.offsetWidth / 2;
    root.scrollTo({
      left: Math.max(0, left),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [reducedMotion, stripCountry]);

  const pickWorld = (code: string) => {
    setSelectedId(null);
    setFocusCountry(code);
    setFocusTick((tick) => tick + 1);
  };

  const pickCity = (id: string) => {
    setSelectedId(id);
    const city = citiesById.get(id);
    if (city) setFocusCountry(city.countryCode);
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("city");
    if (!query) return;
    const match = cities.find(
      (city) =>
        city.id === query || city.name.toLowerCase() === query.toLowerCase(),
    );
    if (match) pickCity(match.id);
    // Open deep links once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerTitle = selected ? selected.name.toUpperCase() : atlas.title;
  const headerKicker = selected
    ? countryTitle(selected.countryCode, selected.country)
    : atlas.kicker;

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        {mounted ? (
          <PixelMap
            cities={cities}
            selectedId={selectedId}
            hoveredId={hoveredId}
            hereId={hereId}
            highlightCountry={highlightCountry}
            focusCountry={focusCountry}
            focusTick={focusTick}
            reducedMotion={reducedMotion}
            onSelect={pickCity}
            onHover={setHoveredId}
            onView={setAtlas}
          />
        ) : (
          <p className={styles.mapBoot}>LOADING WORLD…</p>
        )}

        <header className={styles.hud}>
          <div>
            <p className={styles.kicker}>{headerKicker}</p>
            <h1 className={styles.title}>{headerTitle}</h1>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt>PLACES</dt>
              <dd>×{travelCatalog.stats.cities}</dd>
            </div>
            <div>
              <dt>COUNTRIES</dt>
              <dd>×{travelCatalog.stats.countries}</dd>
            </div>
            <div>
              <dt>YEARS</dt>
              <dd>13–26</dd>
            </div>
          </dl>
        </header>

        <nav ref={stripRef} className={styles.worlds} aria-label="Countries">
          {travelCatalog.countries.map((country, index) => {
            const on = country.code === stripCountry;
            const inView = atlas.visibleCountryCodes.includes(country.code);
            return (
              <button
                key={country.code}
                type="button"
                className={`${styles.worldBtn} ${on ? styles.worldBtnOn : ""} ${inView ? styles.worldBtnIn : ""}`}
                data-world={country.code}
                onClick={() => pickWorld(country.code)}
                onPointerEnter={() => setHighlightCountry(country.code)}
                onPointerLeave={() => setHighlightCountry(null)}
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
          <PlaceCard key={selected.id} city={selected} onClose={() => setSelectedId(null)} />
        ) : null}
      </div>
    </div>
  );
}

function PlaceCard({
  city,
  onClose,
}: {
  city: CatalogCity;
  onClose: () => void;
}) {
  const shots = stillsFor(city);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      className={styles.card}
      role="dialog"
      aria-modal="false"
      aria-label={`${city.name} place card`}
    >
      <div className={styles.cardHead}>
        <p className={styles.cardWorld}>PLACE</p>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close place"
        >
          ×
        </button>
      </div>
      <h2 className={styles.cardName}>{city.name}</h2>
      <p className={styles.cardMeta}>
        {city.flag} {city.country}
        {city.admin ? ` · ${city.admin}` : ""}
      </p>

      <p className={styles.filmTag}>STILLS</p>
      <div className={styles.album}>
        {shots.map((shot, index) => (
          <figure key={`${shot.src}-${index}`} className={styles.shot}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt="" />
            <figcaption>{shot.caption}</figcaption>
          </figure>
        ))}
      </div>
    </aside>
  );
}
