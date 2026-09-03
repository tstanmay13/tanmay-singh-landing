import catalogJson from "./catalog.json";
import { MANUAL_CITIES } from "./manualCities";
import type { CatalogCity, TravelCatalog } from "./types";

const NAME_FIX: Record<string, string> = {
  Mestre: "Venice",
};

export const travelCatalog = catalogJson as TravelCatalog;

function publicId(city: CatalogCity) {
  return city.id.startsWith(`${city.countryCode}-`)
    ? city.id
    : `${city.countryCode}-${city.id}`;
}

export function globeCities(): CatalogCity[] {
  const fromTimeline = travelCatalog.countries.flatMap((country) =>
    country.cities.map((city) => ({
      ...city,
      id: publicId(city),
      name:
        city.countryCode === "VA"
          ? "Vatican"
          : (NAME_FIX[city.name] ?? city.name),
    })),
  );
  const seen = new Set(fromTimeline.map((city) => city.id));
  const extras = MANUAL_CITIES.filter((city) => !seen.has(publicId(city))).map(
    (city) => ({ ...city, id: publicId(city) }),
  );
  return [...fromTimeline, ...extras];
}

export function cityLabel(city: CatalogCity) {
  return city.admin ? `${city.name}, ${city.admin}` : city.name;
}

export function worldNumber(countryCode: string) {
  const index = travelCatalog.countries.findIndex(
    (country) => country.code === countryCode,
  );
  return index >= 0 ? index + 1 : 0;
}

export function courseNumber(city: CatalogCity, cities: CatalogCity[]) {
  const siblings = cities
    .filter((item) => item.countryCode === city.countryCode)
    .sort((a, b) => b.dwellMs - a.dwellMs);
  return siblings.findIndex((item) => item.id === city.id) + 1;
}

export function dwellDays(ms: number) {
  return ms / 86_400_000;
}

export function formatDwell(ms: number) {
  const days = dwellDays(ms);
  if (days >= 365) return `${(days / 365).toFixed(1)} yr`;
  if (days >= 10) return `${Math.round(days)} days`;
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = days * 24;
  if (hours >= 1) return `${hours.toFixed(1)} hours`;
  return `${Math.max(1, Math.round(hours * 60))} min`;
}
