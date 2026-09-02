"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  cityLabel,
  formatDwell,
  globeCities,
  travelCatalog,
} from "@/content/travel/catalog";
import type { CatalogCity } from "@/content/travel/types";
import { visibleCities, type LodBand } from "@/lib/travel/geo";
import styles from "./travel.module.css";

const Globe = dynamic(() => import("./SouvenirGlobe"), {
  ssr: false,
  loading: () => <p className={styles.globeFallback}>Setting the globe on the desk…</p>,
});

const LOD_COPY: Record<LodBand, string> = {
  world: "Scroll in for shorter US stays",
  region: "Closer — more cities on the map",
  close: "Neighborhood scale — every city pin",
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
  const [band, setBand] = useState<LodBand>("world");
  const reducedMotion = usePrefersReducedMotion();

  const selected = selectedId ? citiesById.get(selectedId) ?? null : null;
  const hovered = hoveredId ? citiesById.get(hoveredId) ?? null : null;
  const pins = visibleCities(cities, band, selectedId);
  const railCities = cities.filter(
    (city) => city.countryCode !== "US" || city.dwellMs >= 2.5 * 86_400_000,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.globeSlot}>
        <Globe
          cities={pins}
          selectedId={selectedId}
          autoRotate={!reducedMotion && !selectedId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
          onBand={setBand}
        />
      </div>

      <header className={styles.mast}>
        <div>
          <p className={styles.kicker}>Souvenir globe</p>
          <h1 className={styles.title}>Places.</h1>
        </div>
        <p className={styles.hint}>
          Drag to spin. Scroll to lean in. {travelCatalog.stats.cities} cities from
          Timeline, {travelCatalog.stats.countries} countries.
        </p>
      </header>

      <nav className={styles.rail} aria-label="Cities">
        {railCities.map((city) => (
          <button
            key={city.id}
            type="button"
            className={`${styles.railButton} ${city.id === selectedId ? styles.railButtonSelected : ""}`}
            onClick={() => setSelectedId(city.id)}
          >
            <span className={styles.railName}>{city.name}</span>
            <span className={styles.railMeta}>
              {city.flag} {city.years[0]}–{city.years.at(-1)} · {formatDwell(city.dwellMs)}
            </span>
          </button>
        ))}
      </nav>

      {hovered && hovered.id !== selectedId ? (
        <p className={styles.hoverChip}>{cityLabel(hovered)}</p>
      ) : null}

      {selected ? <StoryTicket city={selected} onClose={() => setSelectedId(null)} /> : null}

      <p className={styles.lodNote}>{LOD_COPY[band]}</p>
    </div>
  );
}

function StoryTicket({
  city,
  onClose,
}: {
  city: CatalogCity;
  onClose: () => void;
}) {
  return (
    <aside className={styles.ticket} aria-label={`${city.name} story`}>
      <div className={styles.ticketHead}>
        <div>
          <p className={styles.ticketRegion}>
            {city.flag} {city.country}
            {city.admin ? ` · ${city.admin}` : ""}
          </p>
          <h2 className={styles.ticketName}>{city.name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <p className={styles.visitBody}>
        {formatDwell(city.dwellMs)} on the clock · {city.visitCount} visits ·{" "}
        {city.spotCount} stops.
      </p>
      <p className={styles.years}>
        {city.years.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </p>
      <p className={styles.visitBody}>
        Photos and the Tuesday-at-2pm beats land on this card later.
      </p>
    </aside>
  );
}
