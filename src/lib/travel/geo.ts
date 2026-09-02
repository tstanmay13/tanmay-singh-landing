import { Vector3 } from "three";
import type { CatalogCity } from "@/content/travel/types";

const DEG = Math.PI / 180;
const DAY = 86_400_000;

export const GLOBE_RADIUS = 1.32;
export const PIN_RADIUS = GLOBE_RADIUS + 0.024;
export const MAX_VISIBLE_PINS = 48;

export type LodBand = "world" | "region" | "close";

export function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function lodBand(cameraDistance: number): LodBand {
  if (cameraDistance > 4.15) return "world";
  if (cameraDistance > 3.2) return "region";
  return "close";
}

function minDwellMs(band: LodBand) {
  if (band === "world") return 2.5 * DAY;
  if (band === "region") return 0.8 * DAY;
  return 0;
}

export function visibleCities(
  cities: CatalogCity[],
  band: LodBand,
  selectedId: string | null,
) {
  const min = minDwellMs(band);
  const eligible = cities.filter((city) => {
    if (city.id === selectedId) return true;
    if (city.countryCode !== "US") return true;
    return city.dwellMs >= min;
  });

  if (eligible.length <= MAX_VISIBLE_PINS) return eligible;

  const ranked = [...eligible].sort((a, b) => b.dwellMs - a.dwellMs);
  const kept = new Set(ranked.slice(0, MAX_VISIBLE_PINS).map((city) => city.id));
  if (selectedId) kept.add(selectedId);
  return cities.filter((city) => kept.has(city.id));
}

export function pinScale(dwellMs: number, selected: boolean) {
  const days = Math.max(0.2, dwellMs / DAY);
  const size = 0.72 + Math.log10(days + 1) * 0.38;
  return selected ? size * 1.18 : size;
}
