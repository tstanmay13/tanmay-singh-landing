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

/** Manual records have no generated Timeline dates to invent. */
export type ManualCatalogCity = Omit<
  CatalogCity,
  "firstSeen" | "lastSeen"
> & {
  firstSeen: null;
  lastSeen: null;
};

export type TravelHubId = "dfw" | "austin" | "houston" | "tokyo" | "kansai";

export type TravelPlaceCategory = "hub" | "destination" | "satellite";

export type TravelPlaceZoom = "world" | "country" | "metro";

/**
 * A place has one primary relationship. Its independent visit aggregates
 * preserve travel history even when that relationship is residential.
 */
export type TravelRelationship = "visited" | "lived" | "current_home";

export type TravelCoordinates = {
  lat: number;
  lng: number;
};

export type TravelPlaceReference = {
  countryCode: string;
  admin?: string;
  name: string;
};

export type TravelPhoto = {
  src: string;
  alt: string;
  caption?: string;
};

export type TravelMedia = {
  src: string;
  type: "image" | "video";
  alt: string;
  caption?: string;
  width: number;
  height: number;
  poster?: string;
  duration?: number;
  captureDate?: string;
};

/**
 * The canonical, UI-facing place model. CatalogCity fields remain available
 * for compatibility with generated timeline data and existing map utilities.
 */
export type TravelPlace = CatalogCity & {
  canonicalKey: string;
  hubId: TravelHubId | null;
  importance: number;
  featured: boolean;
  category: TravelPlaceCategory;
  showAtZoom: TravelPlaceZoom;
  yearsVisited: number[];
  photos: TravelPhoto[];
  media: TravelMedia[];
  relationship: TravelRelationship;
  residenceOrder?: number;
  residenceStart?: string;
  residenceEnd?: string;
  chapterTitle?: string;
  displayTitle?: string;
  description?: string;
};

export type TravelPlaceMetadata = Partial<
  Pick<
    TravelPlace,
    | "lat"
    | "lng"
    | "hubId"
    | "importance"
    | "featured"
    | "category"
    | "showAtZoom"
    | "relationship"
    | "residenceOrder"
    | "residenceStart"
    | "residenceEnd"
    | "chapterTitle"
    | "displayTitle"
    | "description"
  >
>;

export type TravelHub = {
  id: TravelHubId;
  name: string;
  center: TravelCoordinates;
  centerPlace: TravelPlaceReference;
  members: readonly TravelPlaceReference[];
};
