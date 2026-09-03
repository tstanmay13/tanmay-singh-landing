"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  courseNumber,
  formatDwell,
  globeCities,
  travelCatalog,
  worldNumber,
} from "@/content/travel/catalog";
import { stillsFor } from "@/content/travel/stills";
import type { CatalogCity } from "@/content/travel/types";
import { visibleCities, type LodBand } from "@/lib/travel/geo";
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

const LOD_COPY: Record<LodBand, string> = {
  world: "SCROLL PANS · PINCH OR + − ZOOMS",
  region: "NEARBY STOPS SHARE A NODE",
  close: "HOVER A NODE FOR ITS NAME",
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

export default function TravelStage() {
  const cities = useMemo(() => globeCities(), []);
  const citiesById = useMemo(
    () => new Map(cities.map((city) => [city.id, city])),
    [cities],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusCountry, setFocusCountry] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [band, setBand] = useState<LodBand>("world");
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = selectedId ? citiesById.get(selectedId) ?? null : null;
  const pins = visibleCities(cities, band, selectedId);
  const hereId = useMemo(() => {
    const latest = cities.reduce(
      (best, city) => (city.lastSeen > best.lastSeen ? city : best),
      cities[0],
    );
    return latest?.id ?? null;
  }, [cities]);

  const activeCountry = selected?.countryCode ?? focusCountry;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setFocusCountry(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        {mounted ? (
          <PixelMap
            cities={pins}
            selectedId={selectedId}
            hoveredId={hoveredId}
            hereId={hereId}
            focusCountry={focusCountry}
            focusTick={focusTick}
            reducedMotion={reducedMotion}
            onSelect={pickCity}
            onHover={setHoveredId}
            onBand={setBand}
          />
        ) : (
          <p className={styles.mapBoot}>LOADING WORLD…</p>
        )}

        <header className={styles.hud}>
          <div>
            <p className={styles.kicker}>COURSE SELECT</p>
            <h1 className={styles.title}>WORLD MAP</h1>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt>CITIES</dt>
              <dd>×{travelCatalog.stats.cities}</dd>
            </div>
            <div>
              <dt>WORLDS</dt>
              <dd>×{travelCatalog.stats.countries}</dd>
            </div>
            <div>
              <dt>YEARS</dt>
              <dd>13–26</dd>
            </div>
          </dl>
        </header>

        <nav className={styles.worlds} aria-label="Worlds">
          {travelCatalog.countries.map((country, index) => {
            const on = country.code === activeCountry;
            return (
              <button
                key={country.code}
                type="button"
                className={`${styles.worldBtn} ${on ? styles.worldBtnOn : ""}`}
                onClick={() => pickWorld(country.code)}
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
          <LevelCard
            city={selected}
            cities={cities}
            onClose={() => setSelectedId(null)}
          />
        ) : null}

        <footer className={styles.dock}>
          <p>TWO-FINGER SCROLL PANS</p>
          <p>{LOD_COPY[band]}</p>
        </footer>
      </div>
    </div>
  );
}

function LevelCard({
  city,
  cities,
  onClose,
}: {
  city: CatalogCity;
  cities: CatalogCity[];
  onClose: () => void;
}) {
  const shots = stillsFor(city);
  const world = worldNumber(city.countryCode);
  const course = courseNumber(city, cities);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      className={styles.card}
      role="dialog"
      aria-modal="true"
      aria-label={`${city.name} course card`}
    >
      <div className={styles.cardHead}>
        <p className={styles.cardWorld}>
          WORLD {world} · COURSE {course}
        </p>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close course"
        >
          ×
        </button>
      </div>
      <h2 className={styles.cardName}>{city.name}</h2>
      <p className={styles.cardMeta}>
        {city.flag} {city.country}
        {city.admin ? ` · ${city.admin}` : ""}
      </p>

      <p className={styles.filmTag}>PLACEHOLDER FILM</p>
      <div className={styles.album}>
        {shots.map((shot, index) => (
          <figure key={`${shot.src}-${index}`} className={styles.shot}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt="" />
            <figcaption>{shot.caption}</figcaption>
          </figure>
        ))}
      </div>

      <dl className={styles.cardStats}>
        <div>
          <dt>TIME</dt>
          <dd>{formatDwell(city.dwellMs)}</dd>
        </div>
        <div>
          <dt>VISITS</dt>
          <dd>×{city.visitCount}</dd>
        </div>
        <div>
          <dt>STOPS</dt>
          <dd>×{city.spotCount}</dd>
        </div>
      </dl>
      <p className={styles.years}>
        {city.years.map((year) => (
          <span key={year}>{year.slice(2)}</span>
        ))}
      </p>
    </aside>
  );
}
