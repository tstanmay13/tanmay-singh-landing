"use client";

import { useEffect, useRef } from "react";
import type { TravelHub, TravelPlace } from "@/content/travel/types";
import {
  EMPTY_PHOTO_COPY,
  nearbyHubMembers,
  placeCardAriaLabel,
  placeCardLabels,
  placePhotoState,
  residenceChapterLabel,
  residenceDatesLabel,
  visitYearsLabel,
} from "@/lib/travel/placeCard";
import styles from "./travel.module.css";

export type PlaceCardProps = {
  place: TravelPlace;
  hub?: TravelHub | null;
  hubMembers?: TravelPlace[];
  onClose: () => void;
};

export default function PlaceCard({
  place,
  hub = null,
  hubMembers = [],
  onClose,
}: PlaceCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const labels = placeCardLabels(place);
  const residenceChapter = residenceChapterLabel(place);
  const residenceDates = residenceDatesLabel(place);
  const visitYears = visitYearsLabel(place.yearsVisited);
  const photoState = placePhotoState(place.photos);
  const nearby =
    place.category === "hub" ? nearbyHubMembers(place, hubMembers) : [];
  const isResidence =
    place.relationship === "lived" ||
    place.relationship === "current_home";

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      className={styles.card}
      data-layer="card"
      data-relationship={place.relationship}
      role="dialog"
      aria-modal={false}
      aria-label={placeCardAriaLabel(place)}
    >
      <header className={styles.cardHead}>
        <div>
          <p className={styles.cardWorld}>PLACE // {place.countryCode}</p>
          <div className={styles.cardFacts} aria-label="Classification">
            {labels.map((label) => (
              <span key={label} className={styles.cardBadge}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={`Close ${place.displayTitle ?? place.name} place card`}
          data-interactive
        >
          <span aria-hidden="true">×</span>
          <span>CLOSE</span>
        </button>
      </header>

      <h2 className={styles.cardName}>{place.displayTitle ?? place.name}</h2>
      <p className={styles.cardMeta}>
        {place.flag} {place.country}
        {place.admin ? ` · ${place.admin}` : null}
      </p>

      {isResidence && residenceChapter ? (
        <div className={styles.cardFacts}>
          <span>{residenceChapter}</span>
          {residenceDates ? <span>{residenceDates}</span> : null}
        </div>
      ) : null}

      {place.description ? (
        <p className={styles.cardMeta}>{place.description}</p>
      ) : null}

      {visitYears ? <p className={styles.cardFacts}>{visitYears}</p> : null}

      {nearby.length > 0 ? (
        <section aria-label={`Places near ${place.name}`}>
          <p className={styles.filmTag}>
            {hub ? hub.name.toLocaleUpperCase("en-US") : "TRAVEL HUB"}
            {" // NEARBY"}
          </p>
          <ul className={styles.hubList}>
            {nearby.map((member) => (
              <li key={member.canonicalKey}>
                {member.displayTitle ?? member.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {photoState === "empty" ? (
        <p className={styles.emptyStills}>{EMPTY_PHOTO_COPY}</p>
      ) : (
        <section aria-label={`${place.name} stills`}>
          <p className={styles.filmTag}>STILLS</p>
          <div className={styles.album}>
            {place.photos.map((photo, index) => (
              <figure key={`${photo.src}-${index}`} className={styles.shot}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                />
                {photo.caption ? (
                  <figcaption>{photo.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
