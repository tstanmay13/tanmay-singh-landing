import catalogJson from "./catalog.json";
import { MANUAL_CITIES } from "./manualCities";
import type { CatalogCity, TravelCatalog } from "./types";

export const travelCatalog = catalogJson as TravelCatalog;

export function globeCities(): CatalogCity[] {
  const fromTimeline = travelCatalog.countries.flatMap((country) => country.cities);
  const seen = new Set(fromTimeline.map((city) => city.id));
  const extras = MANUAL_CITIES.filter((city) => !seen.has(city.id));
  return [...fromTimeline, ...extras];
}

export function cityLabel(city: CatalogCity) {
  return city.admin ? `${city.name}, ${city.admin}` : city.name;
}

export function dwellDays(ms: number) {
  return ms / 86_400_000;
}

export function formatDwell(ms: number) {
  const days = dwellDays(ms);
  if (days >= 10) return `${Math.round(days)} days`;
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = days * 24;
  if (hours >= 1) return `${hours.toFixed(1)} hours`;
  return `${Math.max(1, Math.round(hours * 60))} min`;
}
