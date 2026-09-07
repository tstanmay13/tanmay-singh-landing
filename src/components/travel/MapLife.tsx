import { memo, type CSSProperties } from "react";
import type { MapSprite } from "@/lib/travel/mapLife";
import styles from "./travel.module.css";

/** Tiny compositor-animated sprites. No frame loop and no terrain mutation. */
export default memo(function MapLife({ spots }: { spots: MapSprite[] }) {
  return (
    <div className={styles.oceanLife} aria-hidden="true" data-ocean-life>
      {spots.map((spot) => (
        <div
          key={`${spot.x}:${spot.y}`}
          className={`${styles.oceanSprite} ${spot.kind === "wave" ? styles.waveSprite : styles.creatureSprite}`}
          style={{ left: spot.x, top: spot.y, "--ocean-delay": `${spot.delay}s` } as CSSProperties}
          data-ocean-kind={spot.kind}
        >
          <div className={spot.kind === "wave" ? styles.waveMotion : spot.kind === "trees" ? styles.treeMotion : spot.kind === "camp" ? styles.campMotion : styles.bobMotion}>
            {spot.kind === "wave" ? (
              <svg viewBox="0 0 28 12" width="28" height="12" fill="none" shapeRendering="crispEdges">
                <path className={styles.waveInk} d="M2 3h5v2h6V3h5v2h6M8 9h5V7h5" strokeWidth="2" />
              </svg>
            ) : spot.kind === "trees" ? (
              <svg viewBox="0 0 36 32" width="36" height="32" shapeRendering="crispEdges">
                <path className={styles.treeShadow} d="M1 28h33v3H1z" />
                <path className={styles.treeTrunk} d="M8 21h3v8H8zM24 18h3v11h-3z" />
                <path className={styles.treeDark} d="M8 7h3v4h3v4h3v5h3v4H0v-4h3v-5h3v-4h2z" />
                <path className={styles.treeLight} d="M24 3h3v4h3v5h3v5h3v5H15v-5h3v-5h3V7h3z" />
                <path className={styles.treeDark} d="M24 10h3v5h3v3h-6z" />
              </svg>
            ) : spot.kind === "camp" ? (
              <svg viewBox="0 0 38 32" width="38" height="32" shapeRendering="crispEdges">
                <path className={styles.treeShadow} d="M1 27h36v3H1z" />
                <path className={styles.tentCanvas} d="M11 10h3v4h3v4h3v4h3v5H0v-5h3v-4h3v-4h5z" />
                <path className={styles.treeTrunk} d="M11 17h3v10H7v-5h4zM26 26h10v3H26z" />
                <path className={styles.fireOuter} d="M29 17h3v3h3v5h-9v-5h3z" />
                <path className={styles.fireInner} d="M29 21h3v4h-3z" />
              </svg>
            ) : spot.kind === "sailboat" ? (
              <svg viewBox="0 0 36 32" width="36" height="32" shapeRendering="crispEdges">
                <path className={styles.waveInk} d="M2 29h8v-1h9v1h13" fill="none" strokeWidth="2" />
                <path className={styles.sailShade} d="M18 3h2v21h-2z" />
                <path className={styles.sailWhite} d="M16 6v16H4v-3h3v-4h3v-4h3V6z" />
                <path className={styles.sailShade} d="M22 11h3v4h3v4h3v3h-9z" />
                <path className={styles.boatHull} d="M5 23h27v3h-3v2H9v-2H5z" />
                <path className={styles.boatFlag} d="M20 3h8v3h-8z" />
              </svg>
            ) : (
              <div className={styles.whale}>
                <svg viewBox="0 0 38 30" width="38" height="30" shapeRendering="crispEdges">
                  <path className={styles.waveInk} d="M3 27h11v1h13v-1h8" fill="none" strokeWidth="2" />
                  <path className={styles.whaleBack} d="M4 16h3v-3h15v3h4v5h3v-5h3v-3h4v7h-3v4h-7v2H8v-3H4z" />
                  <path className={styles.whaleBelly} d="M7 22h16v3H9v-1H7z" />
                  <path className={styles.sailWhite} d="M8 17h3v3H8z" />
                  <path className={styles.whaleEye} d="M8 18h2v2H8z" />
                </svg>
                <svg className={styles.whaleSpout} viewBox="0 0 18 14" width="18" height="14" fill="none" shapeRendering="crispEdges">
                  <path className={styles.spoutInk} d="M9 13V5H6V2H2M9 7h4V3h3" strokeWidth="2" />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
