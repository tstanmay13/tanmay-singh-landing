import { describe, expect, it } from "vitest";
import {
  EMPTY_PHOTO_COPY,
  placeCardLabels,
  placePhotoState,
  residenceChapterLabel,
  residenceDatesLabel,
  visitYearsLabel,
} from "@/lib/travel/placeCard";

describe("place card presentation", () => {
  it("keeps lived and hub classifications together", () => {
    expect(
      placeCardLabels({ relationship: "lived", category: "hub" }),
    ).toEqual(["LIVED HERE", "TRAVEL HUB"]);
    expect(
      placeCardLabels({
        relationship: "current_home",
        category: "destination",
      }),
    ).toEqual(["CURRENT HOME"]);
    expect(
      placeCardLabels({
        relationship: "visited",
        category: "destination",
      }),
    ).toEqual(["VISITED"]);
  });

  it("treats an empty photo array as an intentional empty state", () => {
    expect(placePhotoState([])).toBe("empty");
    expect(EMPTY_PHOTO_COPY).toBe("PHOTOS COMING LATER");
    expect(
      placePhotoState([
        { src: "/real-photo.jpg", alt: "A real travel photograph" },
      ]),
    ).toBe("ready");
  });

  it("does not derive residence dates from visit history", () => {
    expect(
      residenceDatesLabel({
        residenceStart: undefined,
        residenceEnd: undefined,
      }),
    ).toBeNull();
  });

  it("surfaces chapter titles without inventing residence years", () => {
    expect(
      residenceChapterLabel({
        residenceOrder: 1,
        chapterTitle: "Past home",
      }),
    ).toBe("CHAPTER 01 // PAST HOME");
    expect(
      residenceChapterLabel({
        residenceOrder: 4,
        chapterTitle: "Current home",
      }),
    ).toBe("CHAPTER 04 // CURRENT HOME");
    expect(residenceChapterLabel({})).toBeNull();
  });

  it("deduplicates and orders actual visit years", () => {
    expect(visitYearsLabel([2025, 2021, 2025, 2023])).toBe(
      "VISIT YEARS // 2021 · 2023 · 2025",
    );
    expect(visitYearsLabel([])).toBeNull();
  });
});
