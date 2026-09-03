import type { TravelPlace } from "@/content/travel/types";

export type PlaceCardLabel =
  | "CURRENT HOME"
  | "LIVED HERE"
  | "TRAVEL HUB"
  | "VISITED";

export function placeCardLabels(
  place: Pick<TravelPlace, "category" | "relationship">,
): PlaceCardLabel[] {
  const labels: PlaceCardLabel[] = [];
  if (place.relationship === "current_home") labels.push("CURRENT HOME");
  else if (place.relationship === "lived") labels.push("LIVED HERE");
  if (place.category === "hub") labels.push("TRAVEL HUB");
  if (labels.length === 0) labels.push("VISITED");
  return labels;
}

export function residenceChapterLabel(
  place: Pick<TravelPlace, "chapterTitle" | "residenceOrder">,
): string | null {
  if (
    place.residenceOrder === undefined ||
    !Number.isFinite(place.residenceOrder)
  ) {
    return null;
  }
  const chapter = `CHAPTER ${String(place.residenceOrder).padStart(2, "0")}`;
  const title = place.chapterTitle?.trim();
  return title ? `${chapter} // ${title.toLocaleUpperCase("en-US")}` : chapter;
}

export function residenceDatesLabel(
  place: Pick<TravelPlace, "residenceEnd" | "residenceStart">,
): string | null {
  const dates = [place.residenceStart, place.residenceEnd].filter(
    (date): date is string => Boolean(date?.trim()),
  );
  return dates.length > 0 ? `RESIDENCE // ${dates.join(" — ")}` : null;
}

export function visitYearsLabel(yearsVisited: readonly number[]): string | null {
  const years = [...new Set(yearsVisited)]
    .filter(Number.isInteger)
    .sort((left, right) => left - right);
  return years.length > 0 ? `VISIT YEARS // ${years.join(" · ")}` : null;
}

export function placePhotoState(
  photos: Pick<TravelPlace, "photos">["photos"],
): "empty" | "ready" {
  return photos.length === 0 ? "empty" : "ready";
}

export function nearbyHubMembers(
  place: Pick<TravelPlace, "canonicalKey">,
  members: readonly TravelPlace[] = [],
): TravelPlace[] {
  const seen = new Set([place.canonicalKey]);
  return members.filter((member) => {
    if (seen.has(member.canonicalKey)) return false;
    seen.add(member.canonicalKey);
    return true;
  });
}

export function placeCardAriaLabel(
  place: Pick<
    TravelPlace,
    "admin" | "category" | "country" | "displayTitle" | "name" | "relationship"
  >,
): string {
  const name = place.displayTitle ?? place.name;
  const location = place.admin
    ? `${place.country}, ${place.admin}`
    : place.country;
  return `${name} travel place details. ${placeCardLabels(place).join(
    " and ",
  )}. ${location}.`;
}
