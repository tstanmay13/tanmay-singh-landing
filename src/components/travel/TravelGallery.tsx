"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { TravelMedia, TravelPlace } from "@/content/travel/types";
import styles from "./travel.module.css";

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function GalleryItem({ item }: { item: TravelMedia }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p role="status">This memory could not load. Try another photo or reopen the gallery.</p>;
  return item.type === "video" ? (
    <video
      className={styles.galleryMedia}
      src={item.src}
      poster={item.poster}
      width={item.width}
      height={item.height}
      controls
      playsInline
      preload="none"
      aria-label={item.alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <Image
      className={styles.galleryMedia}
      src={item.src}
      alt={item.alt}
      width={item.width}
      height={item.height}
      sizes="(max-width: 700px) 92vw, 80vw"
      onError={() => setFailed(true)}
    />
  );
}

function GalleryViewer({ place, start, onClose }: {
  place: TravelPlace;
  start: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [index, setIndex] = useState(start);
  const item = place.media[index];
  const count = place.media.length;
  const move = (direction: number) => setIndex((current) => (current + direction + count) % count);

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.galleryDialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        // Keep Escape and arrows inside the viewer; the map retains its own keys.
        event.stopPropagation();
        if (event.target instanceof HTMLVideoElement) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
        if (event.key === "Home") { event.preventDefault(); setIndex(0); }
        if (event.key === "End") { event.preventDefault(); setIndex(count - 1); }
      }}
    >
      <div className={styles.galleryShell}>
        <header className={styles.galleryHeader}>
          <div>
            <h2 id={titleId}>{place.displayTitle ?? place.name}</h2>
            <p>{place.country} · Photos & moments</p>
          </div>
          <button type="button" className={styles.galleryControl} onClick={onClose} autoFocus aria-label="Close gallery">Close ×</button>
        </header>
        <figure className={styles.galleryFigure}>
          <div className={styles.galleryCanvas}>
            <GalleryItem key={item.src} item={item} />
          </div>
          <figcaption aria-live="polite">
            <span>{item.caption ?? item.alt}</span>
            <span className={styles.galleryPosition}>{index + 1} / {count}{item.type === "video" && item.duration ? ` · Video ${durationLabel(item.duration)}` : ""}</span>
          </figcaption>
        </figure>
        <nav className={styles.galleryNavigation} aria-label={`${place.name} gallery navigation`}>
          <button type="button" className={styles.galleryControl} onClick={() => move(-1)} disabled={count < 2} aria-label="Previous memory">←</button>
          <div className={styles.galleryThumbnails}>
            {place.media.map((media, position) => (
              <button
                key={media.src}
                type="button"
                className={styles.galleryThumbnail}
                aria-label={`View ${media.type === "video" ? "video" : "photo"} ${position + 1}: ${media.alt}`}
                aria-current={index === position ? "true" : undefined}
                onClick={() => setIndex(position)}
              >
                <Image src={media.poster ?? media.src} alt="" width={80} height={60} sizes="80px" loading="lazy" />
                {media.type === "video" ? <span aria-hidden="true">▶</span> : null}
              </button>
            ))}
          </div>
          <button type="button" className={styles.galleryControl} onClick={() => move(1)} disabled={count < 2} aria-label="Next memory">→</button>
        </nav>
      </div>
    </dialog>
  );
}

export default function TravelGallery({ place }: { place: TravelPlace }) {
  const [start, setStart] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const cover = place.media.find((item) => item.type === "image") ?? place.media[0];
  const imageCount = place.media.filter((item) => item.type === "image").length;
  const videoCount = place.media.length - imageCount;
  const countLabel = [imageCount ? `${imageCount} photo${imageCount === 1 ? "" : "s"}` : "", videoCount ? `${videoCount} video${videoCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");

  function close() {
    setStart(null);
    requestAnimationFrame(() => opener.current?.focus());
  }

  return (
    <section className={styles.galleryPreview} aria-label={`${place.name} photos and videos`}>
      <button ref={opener} type="button" className={styles.galleryCover} onClick={() => setStart(0)} aria-label={`Open ${place.name} gallery: ${countLabel}`} data-interactive>
        <Image src={cover.poster ?? cover.src} alt={cover.alt} width={cover.width} height={cover.height} sizes="(max-width: 700px) 80vw, 260px" loading="lazy" />
        <span><strong>View gallery</strong><span>{countLabel}</span></span>
      </button>
      {start !== null ? <GalleryViewer place={place} start={start} onClose={close} /> : null}
    </section>
  );
}
