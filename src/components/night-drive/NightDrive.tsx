"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { NightDriveDistrict } from "@/content/nightDrive";
import NightCity from "./NightCity";
import styles from "./NightDrive.module.css";

interface NightDriveProps {
  districts: NightDriveDistrict[];
}

const ROAD_CURVES = [-0.08, 0.24, -0.18, 0.16, -0.22, 0];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
}

function lingerEase(value: number, amount: number) {
  const x = clamp(value);
  const linger = clamp(amount, 0, 0.6);
  const centered = x - 0.5;
  return (1 - linger) * x + linger * (4 * centered * centered * centered + 0.5);
}

function DistrictAction({
  link,
}: {
  link: NightDriveDistrict["links"][number];
}) {
  const className = `${styles.districtAction} ${link.primary ? styles.districtActionPrimary : ""}`;
  const content = (
    <>
      <span>
        <strong>{link.label}</strong>
        {link.detail ? <small>{link.detail}</small> : null}
      </span>
      <span className={styles.actionArrow} aria-hidden="true">
        {link.external ? "↗" : "→"}
      </span>
    </>
  );

  if (link.external) {
    return (
      <a
        className={className}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={link.href}>
      {content}
    </Link>
  );
}

export default function NightDrive({ districts }: NightDriveProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chapters = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-chapter]"),
    );
    const copies = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-copy]"),
    );
    const scenes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-scene]"),
    );
    const roadScenes = Array.from(
      root.querySelectorAll<SVGGElement>("[data-drive-road]"),
    );
    const roadLines = Array.from(
      root.querySelectorAll<SVGPathElement>("[data-drive-road-line]"),
    );
    const lamps = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-lamp]"),
    );
    const videos = Array.from(
      root.querySelectorAll<HTMLVideoElement>("[data-drive-video]"),
    );
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    reducedMotionRef.current = reduceQuery.matches;

    let viewportHeight = window.innerHeight;
    let layoutWidth = window.innerWidth;
    let rootTop = 0;
    let scrollableHeight = 1;
    let chapterMetrics: { top: number; height: number }[] = [];
    let frameId = 0;
    let ticking = false;

    const measure = () => {
      viewportHeight = window.innerHeight;
      layoutWidth = window.innerWidth;
      const rootRect = root.getBoundingClientRect();
      rootTop = rootRect.top + window.scrollY;
      scrollableHeight = Math.max(1, root.offsetHeight - viewportHeight);
      chapterMetrics = chapters.map((chapter) => {
        const rect = chapter.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY - rootTop,
          height: Math.max(1, rect.height),
        };
      });
    };

    const update = () => {
      const travelY = clamp(window.scrollY - rootTop, 0, scrollableHeight);
      const rootProgress = clamp(travelY / scrollableHeight);
      const focusY = travelY + viewportHeight * 0.52;
      let currentIndex = 0;

      for (let index = 0; index < chapterMetrics.length; index += 1) {
        if (focusY >= chapterMetrics[index].top) currentIndex = index;
      }

      const currentMetric = chapterMetrics[currentIndex] ?? {
        top: 0,
        height: viewportHeight,
      };
      const localProgress = clamp(
        (focusY - currentMetric.top) / currentMetric.height,
      );
      const cameraProgress = lingerEase(
        localProgress,
        districts[currentIndex]?.linger ?? 0,
      );
      const transition = smoothstep((cameraProgress - 0.7) / 0.3);
      const scenePosition = Math.min(
        districts.length - 1,
        currentIndex + transition,
      );
      const currentCurve = ROAD_CURVES[currentIndex] ?? 0;
      const nextCurve = ROAD_CURVES[currentIndex + 1] ?? currentCurve;
      const curve = currentCurve + (nextCurve - currentCurve) * transition;

      root.style.setProperty("--drive-progress", rootProgress.toFixed(4));
      root.style.setProperty("--drive-local", localProgress.toFixed(4));
      root.style.setProperty("--drive-curve", curve.toFixed(4));

      scenes.forEach((scene, index) => {
        const opacity = clamp(1 - Math.abs(scenePosition - index));
        const sceneProgress = index === currentIndex ? cameraProgress : transition;
        scene.style.setProperty("--scene-opacity", opacity.toFixed(4));
        scene.style.setProperty(
          "--scene-scale",
          (1.025 + sceneProgress * 0.09).toFixed(4),
        );
        scene.style.setProperty(
          "--scene-shift",
          (((index % 2 === 0 ? -1 : 1) * sceneProgress * 1.8) + curve * 3).toFixed(3),
        );
      });

      roadScenes.forEach((roadScene, index) => {
        const opacity = clamp(1 - Math.abs(scenePosition - index));
        roadScene.style.opacity = opacity.toFixed(4);
      });
      roadLines.forEach((roadLine) => {
        roadLine.style.strokeDashoffset = String(-rootProgress * 5200);
      });

      lamps.forEach((lamp, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const seed = Math.floor(index / 2) / Math.max(1, lamps.length / 2);
        const depth = (rootProgress * 7.5 + seed) % 1;
        const perspective = Math.pow(depth, 1.72);
        const center = 50 + curve * 18 * (1 - depth);
        const halfRoad = 3.4 + perspective * 43;
        const x = center + side * halfRoad;
        const y = 34 + perspective * 71;
        const scale = 0.22 + perspective * 1.82;
        const opacity = clamp(Math.sin(Math.PI * depth) * 1.45);

        lamp.style.left = `${x.toFixed(3)}%`;
        lamp.style.top = `${y.toFixed(3)}%`;
        lamp.style.opacity = opacity.toFixed(3);
        lamp.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      });

      copies.forEach((copy, index) => {
        if (reducedMotionRef.current) {
          copy.style.opacity = "1";
          copy.style.transform = "none";
          copy.style.pointerEvents = "auto";
          return;
        }

        let opacity = 0;
        if (index === currentIndex) {
          if (index === 0) {
            opacity = 1 - smoothstep((localProgress - 0.62) / 0.22);
          } else if (index === districts.length - 1) {
            opacity = smoothstep(localProgress / 0.16);
          } else {
            const enter = smoothstep(localProgress / 0.15);
            const exit = 1 - smoothstep((localProgress - 0.7) / 0.22);
            opacity = Math.min(enter, exit);
          }
        }
        copy.style.opacity = opacity.toFixed(4);
        copy.style.transform = `translate3d(0, ${((0.48 - localProgress) * 24).toFixed(2)}px, 0)`;
        copy.style.pointerEvents = opacity > 0.65 ? "auto" : "none";
      });

      videos.forEach((video) => {
        const index = Number(video.dataset.driveVideo ?? -1);
        const sceneDistance = Math.abs(scenePosition - index);
        if (
          reducedMotionRef.current ||
          sceneDistance > 1.05 ||
          !Number.isFinite(video.duration) ||
          video.duration <= 0 ||
          video.seeking
        ) {
          return;
        }
        const videoProgress = index === currentIndex ? cameraProgress : transition;
        const targetTime = clamp(videoProgress, 0, 0.999) * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.035) {
          video.currentTime = targetTime;
        }
      });

      if (currentIndex !== activeIndexRef.current) {
        activeIndexRef.current = currentIndex;
        setActiveIndex(currentIndex);
        root.dataset.accent = districts[currentIndex]?.accent ?? "magenta";
      }

      if (progressRef.current) {
        progressRef.current.style.setProperty(
          "--route-progress",
          rootProgress.toFixed(4),
        );
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = clamp(1 - rootProgress * 16).toFixed(3);
      }

      ticking = false;
    };

    const scheduleUpdate = () => {
      if (ticking) return;
      ticking = true;
      frameId = window.requestAnimationFrame(update);
    };

    const handleResize = () => {
      if (coarseQuery.matches && window.innerWidth === layoutWidth) return;
      measure();
      scheduleUpdate();
    };

    const handleMotionChange = () => {
      reducedMotionRef.current = reduceQuery.matches;
      root.dataset.reducedMotion = String(reduceQuery.matches);
      measure();
      scheduleUpdate();
    };

    videos.forEach((video) => {
      video.addEventListener("loadedmetadata", scheduleUpdate);
      video.addEventListener("seeked", () => {
        video.parentElement?.setAttribute("data-video-ready", "true");
      }, { once: true });
    });

    root.dataset.reducedMotion = String(reduceQuery.matches);
    root.dataset.accent = districts[0]?.accent ?? "magenta";
    measure();
    update();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    reduceQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      reduceQuery.removeEventListener("change", handleMotionChange);
      videos.forEach((video) => {
        video.removeEventListener("loadedmetadata", scheduleUpdate);
      });
    };
  }, [districts]);

  const scrollToDistrict = useCallback((index: number) => {
    const root = rootRef.current;
    const chapter = root?.querySelector<HTMLElement>(
      `[data-drive-chapter="${index}"]`,
    );
    if (!root || !chapter) return;

    const chapterTop = chapter.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: chapterTop,
      behavior: reducedMotionRef.current ? "auto" : "smooth",
    });
  }, []);

  const activeDistrict = districts[activeIndex] ?? districts[0];

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-accent={districts[0]?.accent ?? "magenta"}
    >
      <a className={styles.skipLink} href="#city-limits">
        Skip to portfolio content
      </a>

      <div className={styles.stage}>
        <NightCity districts={districts} />

        <div className={styles.hud}>
          <div className={styles.districtReadout}>
            <span className={styles.hudLabel}>Current district</span>
            <strong>{activeDistrict?.label}</strong>
            <span className={styles.hudCode}>
              {activeDistrict?.code} / {String(districts.length).padStart(2, "0")}
            </span>
          </div>

          <div className={styles.statusReadout} aria-hidden="true">
            <span className={styles.statusLight} />
            <span>ROUTE LIVE</span>
          </div>
        </div>

        <nav className={styles.route} aria-label="Night Drive districts">
          <span className={styles.routeLine} aria-hidden="true">
            <span ref={progressRef} />
          </span>
          {districts.map((district, index) => (
            <button
              key={district.id}
              type="button"
              className={styles.routeStop}
              data-active={index === activeIndex}
              aria-current={index === activeIndex ? "step" : undefined}
              aria-label={`Go to ${district.label}`}
              onClick={() => scrollToDistrict(index)}
            >
              <i aria-hidden="true" />
              <span>{district.label}</span>
            </button>
          ))}
        </nav>

        <div ref={hintRef} className={styles.scrollHint} aria-hidden="true">
          <span>Scroll to drive</span>
          <i />
        </div>
      </div>

      <div className={styles.chapters}>
        {districts.map((district, index) => {
          const Heading = index === 0 ? "h1" : "h2";

          return (
            <section
              key={district.id}
              id={district.id}
              className={styles.chapter}
              data-drive-chapter={index}
              data-accent={district.accent}
              style={{ "--chapter-scroll": district.scrollLength } as CSSProperties}
              aria-labelledby={`${district.id}-title`}
            >
              <div className={styles.chapterFrame}>
                <article className={styles.chapterContent} data-drive-copy={index}>
                  <div className={styles.chapterMeta}>
                    <span>{district.code}</span>
                    <span>{district.label}</span>
                  </div>
                  <p className={styles.eyebrow}>{district.eyebrow}</p>
                  <Heading id={`${district.id}-title`} className={styles.headline}>
                    {district.headline}
                  </Heading>
                  <p className={styles.body}>{district.body}</p>

                  <ul className={styles.proof} aria-label={`${district.label} highlights`}>
                    {district.proof.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <div className={styles.actions}>
                    {district.links.map((link) => (
                      <DistrictAction key={`${link.href}-${link.label}`} link={link} />
                    ))}
                  </div>
                </article>
              </div>
            </section>
          );
        })}
      </div>

      <p className={styles.srStatus} aria-live="polite">
        Current district: {activeDistrict?.label}
      </p>
    </div>
  );
}
