"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { DistrictId, NightDriveDistrict } from "@/content/nightDrive";
import NightCity from "./NightCity";
import styles from "./NightDrive.module.css";

interface NightDriveProps {
  districts: NightDriveDistrict[];
}

const ROAD_CURVES: Record<DistrictId, number> = {
  "city-limits": -0.08,
  downtown: 0.24,
  "studio-district": -0.18,
  "arcade-pier": 0.16,
  "radio-hill": -0.22,
  "last-exit": 0,
};

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

function DestinationLink({
  link,
  className,
  children,
  dataDrivePoi,
}: {
  link: NightDriveDistrict["links"][number];
  className: string;
  children: ReactNode;
  dataDrivePoi?: number;
}) {
  if (link.external) {
    return (
      <a
        className={className}
        data-drive-poi={dataDrivePoi}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} data-drive-poi={dataDrivePoi} href={link.href}>
      {children}
    </Link>
  );
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

  return (
    <DestinationLink className={className} link={link}>
      {content}
    </DestinationLink>
  );
}

function DistrictPoi({
  link,
  index,
}: {
  link: NightDriveDistrict["links"][number];
  index: number;
}) {
  const className = styles.poi;
  const content = (
    <>
      <i aria-hidden="true" />
      <span>
        <small>POI {String(index + 1).padStart(2, "0")}</small>
        <strong>{link.label}</strong>
      </span>
    </>
  );

  return (
    <DestinationLink className={className} dataDrivePoi={index} link={link}>
      {content}
    </DestinationLink>
  );
}

export default function NightDrive({ districts }: NightDriveProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
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
    const streetBlocks = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-block]"),
    );
    const districtGates = Array.from(
      root.querySelectorAll<HTMLElement>("[data-drive-gate]"),
    );
    const steerControls = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-drive-steer-control]"),
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
    let steerTarget = 0;
    let steerCurrent = 0;
    let lookTarget = 0;
    let lookCurrent = 0;
    let speedTarget = 8;
    let speedCurrent = 8;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

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
      const currentId = districts[currentIndex]?.id ?? "city-limits";
      const nextId = districts[currentIndex + 1]?.id ?? currentId;
      const currentCurve = ROAD_CURVES[currentId];
      const nextCurve = ROAD_CURVES[nextId];
      const curve = currentCurve + (nextCurve - currentCurve) * transition;
      steerCurrent += (steerTarget - steerCurrent) * 0.14;
      lookCurrent += (lookTarget - lookCurrent) * 0.12;
      speedCurrent += (speedTarget - speedCurrent) * 0.2;
      speedTarget += (8 - speedTarget) * 0.075;
      const drivingCurve = curve + steerCurrent * 0.11;

      root.style.setProperty("--drive-progress", rootProgress.toFixed(4));
      root.style.setProperty("--drive-local", localProgress.toFixed(4));
      root.style.setProperty("--drive-curve", drivingCurve.toFixed(4));
      root.style.setProperty("--drive-steer", steerCurrent.toFixed(4));
      root.style.setProperty("--drive-look", lookCurrent.toFixed(4));
      root.style.setProperty("--drive-speed", speedCurrent.toFixed(2));

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
          (((index % 2 === 0 ? -1 : 1) * sceneProgress * 1.8) + drivingCurve * 3).toFixed(3),
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
        const center = 50 + drivingCurve * 18 * (1 - depth) - steerCurrent * 2.2;
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

      streetBlocks.forEach((block, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const seed = Math.floor(index / 2) / Math.max(1, streetBlocks.length / 2);
        const depth = (rootProgress * 11.5 + seed) % 1;
        const perspective = Math.pow(depth, 1.64);
        const center = 50 + drivingCurve * 22 * (1 - depth) - steerCurrent * 3.4;
        const streetWidth = 6 + perspective * 57;
        const x = center + side * streetWidth;
        const y = 33 + perspective * 79;
        const scale = 0.1 + perspective * 2.9;
        const opacity = clamp(Math.sin(Math.PI * depth) * 1.7);

        block.style.left = `${x.toFixed(3)}%`;
        block.style.top = `${y.toFixed(3)}%`;
        block.style.opacity = opacity.toFixed(3);
        block.style.zIndex = String(20 + Math.round(depth * 70));
        block.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)}) rotateY(${side * -7}deg)`;
      });

      const arrivingIndex = Math.min(districts.length - 1, currentIndex + 1);
      const gateDepth = clamp((cameraProgress - 0.58) / 0.42);
      const gateOpacity =
        smoothstep(gateDepth / 0.16) *
        (1 - smoothstep((gateDepth - 0.76) / 0.24));
      districtGates.forEach((gate, index) => {
        const isArriving = index === arrivingIndex && arrivingIndex !== currentIndex;
        const perspective = Math.pow(gateDepth, 1.82);
        const y = 34 + perspective * 78;
        const scale = 0.18 + perspective * 3.9;
        gate.style.top = `${y.toFixed(3)}%`;
        gate.style.opacity = isArriving ? gateOpacity.toFixed(3) : "0";
        gate.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      });

      const pois = Array.from(
        root.querySelectorAll<HTMLElement>("[data-drive-poi]"),
      );
      pois.forEach((poi, index) => {
        const side = index % 2 === 0 ? 1 : -1;
        const start = 0.02 + index * 0.11;
        const depth = clamp((localProgress - start) / 0.72);
        const perspective = Math.pow(depth, 1.7);
        const center =
          50 + drivingCurve * 18 * (1 - depth) - steerCurrent * 2.8;
        const roadside = 6 + perspective * 49;
        const x = center + side * roadside;
        const y = 34 + perspective * 61;
        const scale = 0.42 + perspective * 1.28;
        const enter = smoothstep(depth / 0.12);
        const exit = 1 - smoothstep((depth - 0.82) / 0.18);
        const opacity = enter * exit;
        const focused =
          opacity > 0.45 && Math.abs(steerCurrent - side * 0.72) < 0.46;

        poi.style.left = `${x.toFixed(3)}%`;
        poi.style.top = `${y.toFixed(3)}%`;
        poi.style.opacity = opacity.toFixed(3);
        poi.style.pointerEvents = opacity > 0.3 ? "auto" : "none";
        poi.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        poi.dataset.focused = String(focused);
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
        window.requestAnimationFrame(scheduleUpdate);
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
      if (speedRef.current) {
        speedRef.current.textContent = String(Math.round(speedCurrent)).padStart(2, "0");
      }

      ticking = false;
      const stillSettling =
        Math.abs(steerTarget - steerCurrent) > 0.002 ||
        Math.abs(lookTarget - lookCurrent) > 0.002 ||
        Math.abs(speedCurrent - 8) > 0.2 ||
        Math.abs(speedTarget - 8) > 0.2;
      if (stillSettling) scheduleUpdate();
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

    const handleScroll = () => {
      const now = performance.now();
      const elapsed = Math.max(16, now - lastScrollTime);
      const distance = Math.abs(window.scrollY - lastScrollY);
      speedTarget = clamp(8 + (distance / elapsed) * 18, 8, 96);
      lastScrollY = window.scrollY;
      lastScrollTime = now;
      scheduleUpdate();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (coarseQuery.matches || reducedMotionRef.current) return;
      steerTarget = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      lookTarget = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      scheduleUpdate();
    };

    const resetPointerLook = () => {
      steerTarget = 0;
      lookTarget = 0;
      scheduleUpdate();
    };

    const handleSteerControlStart = (event: PointerEvent) => {
      const control = event.currentTarget as HTMLButtonElement;
      steerTarget = clamp(
        Number(control.dataset.driveSteerControl ?? 0),
        -1,
        1,
      );
      scheduleUpdate();
    };

    const handleSteerControlEnd = () => {
      steerTarget = 0;
      scheduleUpdate();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        steerTarget = -0.92;
      } else if (key === "arrowright" || key === "d") {
        steerTarget = 0.92;
      } else {
        return;
      }

      scheduleUpdate();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        key !== "arrowleft" &&
        key !== "arrowright" &&
        key !== "a" &&
        key !== "d"
      ) {
        return;
      }

      steerTarget = 0;
      scheduleUpdate();
    };

    const handleMotionChange = () => {
      reducedMotionRef.current = reduceQuery.matches;
      root.dataset.reducedMotion = String(reduceQuery.matches);
      measure();
      scheduleUpdate();
    };

    const handleVideoSeeked = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      video.parentElement?.setAttribute("data-video-ready", "true");
      scheduleUpdate();
    };

    videos.forEach((video) => {
      video.addEventListener("loadedmetadata", scheduleUpdate);
      video.addEventListener("seeked", handleVideoSeeked);
    });
    steerControls.forEach((control) => {
      control.addEventListener("pointerdown", handleSteerControlStart);
      control.addEventListener("pointerup", handleSteerControlEnd);
      control.addEventListener("pointercancel", handleSteerControlEnd);
      control.addEventListener("pointerleave", handleSteerControlEnd);
    });

    root.dataset.reducedMotion = String(reduceQuery.matches);
    root.dataset.accent = districts[0]?.accent ?? "magenta";
    measure();
    update();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetPointerLook);
    root.addEventListener("pointerleave", resetPointerLook);
    reduceQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetPointerLook);
      root.removeEventListener("pointerleave", resetPointerLook);
      reduceQuery.removeEventListener("change", handleMotionChange);
      videos.forEach((video) => {
        video.removeEventListener("loadedmetadata", scheduleUpdate);
        video.removeEventListener("seeked", handleVideoSeeked);
      });
      steerControls.forEach((control) => {
        control.removeEventListener("pointerdown", handleSteerControlStart);
        control.removeEventListener("pointerup", handleSteerControlEnd);
        control.removeEventListener("pointercancel", handleSteerControlEnd);
        control.removeEventListener("pointerleave", handleSteerControlEnd);
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
            <span ref={speedRef}>08</span>
            <span>KM/H</span>
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

        <nav className={styles.poiLayer} aria-label={`${activeDistrict?.label} points of interest`}>
          {activeDistrict?.links.map((link, index) => (
            <DistrictPoi key={`${activeDistrict.id}-${link.href}`} link={link} index={index} />
          ))}
        </nav>

        <div className={styles.steerControls} role="group" aria-label="Steering controls">
          <button
            type="button"
            data-drive-steer-control="-1"
            aria-label="Steer left"
          >
            ←
          </button>
          <span aria-hidden="true">STEER</span>
          <button
            type="button"
            data-drive-steer-control="1"
            aria-label="Steer right"
          >
            →
          </button>
        </div>

        <div ref={hintRef} className={styles.scrollHint} aria-hidden="true">
          <span>Scroll to drive · move or use A/D to steer</span>
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
