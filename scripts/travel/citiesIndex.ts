import cities from "all-the-cities";

export type WorldCity = {
  cityId: number;
  name: string;
  country: string;
  featureCode: string;
  adminCode: string;
  population: number;
  loc: { coordinates: [number, number] };
};

export type CityMatch = WorldCity & { distanceKm: number };

const CELL = 1;
const CITY_POP = 15_000;
const CITY_RADIUS_KM = 25;
const EARTH_KM = 6371;
const DEG = Math.PI / 180;

const worldCities = cities as WorldCity[];

const grid = new Map<string, WorldCity[]>();
for (const city of worldCities) {
  const [lng, lat] = city.loc.coordinates;
  const key = cellKey(lat, lng);
  const bucket = grid.get(key);
  if (bucket) bucket.push(city);
  else grid.set(key, [city]);
}

function cellKey(lat: number, lng: number) {
  return `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function cellsAround(lat: number, lng: number, ring: number) {
  const originLat = Math.floor(lat / CELL);
  const originLng = Math.floor(lng / CELL);
  const keys: string[] = [];
  for (let dLat = -ring; dLat <= ring; dLat += 1) {
    for (let dLng = -ring; dLng <= ring; dLng += 1) {
      keys.push(`${originLat + dLat}:${originLng + dLng}`);
    }
  }
  return keys;
}

function collectNearby(lat: number, lng: number, ring: number) {
  const nearby: CityMatch[] = [];
  for (const key of cellsAround(lat, lng, ring)) {
    const bucket = grid.get(key);
    if (!bucket) continue;
    for (const city of bucket) {
      const [cityLng, cityLat] = city.loc.coordinates;
      nearby.push({
        ...city,
        distanceKm: haversineKm(lat, lng, cityLat, cityLng),
      });
    }
  }
  return nearby;
}

function pickCity(candidates: CityMatch[]) {
  const inRadius = candidates.filter(
    (city) => city.population >= CITY_POP && city.distanceKm <= CITY_RADIUS_KM,
  );
  const withoutSections = inRadius.filter((city) => city.featureCode !== "PPLX");
  const pool = withoutSections.length > 0 ? withoutSections : inRadius;
  if (pool.length > 0) {
    return pool.reduce((best, city) =>
      city.population > best.population ? city : best,
    );
  }
  return candidates.reduce((best, city) =>
    city.distanceKm < best.distanceKm ? city : best,
  );
}

/** Nearest real city: most populous ≥15k place within 25km, else closest named place. */
export function matchCity(lat: number, lng: number): CityMatch | null {
  // The population preference otherwise pulls Haad Rin across the sea to
  // Ko Samui. Keep this island on its own named municipal center.
  if (lat >= 9.65 && lat <= 9.83 && lng >= 99.9 && lng <= 100.1) {
    const island = worldCities.find((city) => city.cityId === 1596216);
    if (island) {
      return {
        ...island,
        distanceKm: haversineKm(lat, lng, island.loc.coordinates[1], island.loc.coordinates[0]),
      };
    }
  }
  const nearby = collectNearby(lat, lng, 2);
  if (nearby.length === 0) return null;
  return pickCity(nearby);
}
