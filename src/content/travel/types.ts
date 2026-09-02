export type CatalogCity = {
  id: string;
  name: string;
  admin: string;
  countryCode: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  population: number;
  visitCount: number;
  spotCount: number;
  dwellMs: number;
  firstSeen: string;
  lastSeen: string;
  years: string[];
};

export type CatalogCountry = {
  code: string;
  name: string;
  flag: string;
  visitCount: number;
  dwellMs: number;
  firstSeen: string;
  lastSeen: string;
  cities: CatalogCity[];
};

export type TravelCatalog = {
  generatedAt: string;
  stats: {
    countries: number;
    cities: number;
    visits: number;
  };
  countries: CatalogCountry[];
};
