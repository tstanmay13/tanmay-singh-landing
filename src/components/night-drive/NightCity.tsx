import Image from "next/image";
import type { CSSProperties } from "react";
import type { DistrictId, NightDriveDistrict } from "@/content/nightDrive";
import styles from "./NightDrive.module.css";

interface NightCityProps {
  districts: NightDriveDistrict[];
}

const ROAD_GEOMETRY: Record<
  DistrictId,
  { surface: string; center: string }
> = {
  "city-limits": {
    surface: "M88 1000 C244 790 392 532 468 344 L532 344 C608 532 756 790 912 1000 Z",
    center: "M500 1000 C500 790 500 530 500 344",
  },
  downtown: {
    surface: "M66 1000 C260 806 300 610 532 344 L596 344 C472 604 612 800 936 1000 Z",
    center: "M500 1000 C382 782 610 562 564 344",
  },
  "studio-district": {
    surface: "M104 1000 C392 800 612 620 424 344 L488 344 C748 612 602 808 896 1000 Z",
    center: "M500 1000 C622 780 394 570 456 344",
  },
  "arcade-pier": {
    surface: "M52 1000 C290 770 474 602 500 344 L564 344 C552 586 690 786 948 1000 Z",
    center: "M500 1000 C430 748 574 554 532 344",
  },
  "radio-hill": {
    surface: "M98 1000 C336 830 258 612 454 344 L518 344 C420 598 760 822 902 1000 Z",
    center: "M500 1000 C340 806 528 564 486 344",
  },
  "last-exit": {
    surface: "M76 1000 C244 786 414 522 468 344 L532 344 C586 522 756 786 924 1000 Z",
    center: "M500 1000 C500 760 500 530 500 344",
  },
};

const STAR_POSITIONS = [
  [7, 12], [14, 28], [22, 8], [29, 20], [38, 11], [46, 26],
  [56, 9], [64, 22], [73, 13], [82, 29], [91, 10], [96, 23],
  [4, 39], [18, 45], [34, 36], [61, 42], [77, 38], [89, 48],
];

function Palm({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className={styles.palmTrunk} d="M0 90 C8 58 5 30 14 0" />
      <path className={styles.palmLeaf} d="M14 2 C-10 -16 -31 -10 -43 1 C-20 -2 -3 8 14 2 Z" />
      <path className={styles.palmLeaf} d="M14 2 C33 -19 57 -18 72 -7 C47 -9 31 4 14 2 Z" />
      <path className={styles.palmLeaf} d="M14 2 C0 -27 7 -48 20 -60 C17 -35 23 -16 14 2 Z" />
      <path className={styles.palmLeaf} d="M14 2 C34 -1 46 12 51 28 C35 14 24 11 14 2 Z" />
    </g>
  );
}

function Landmark({ districtId }: { districtId: DistrictId }) {
  if (districtId === "city-limits") {
    return (
      <g className={styles.landmark}>
        <path d="M270 515 Q390 350 510 515" />
        <path d="M300 515 Q390 405 480 515" />
        <line x1="270" y1="515" x2="510" y2="515" />
        <Palm x={184} y={435} scale={0.9} />
        <Palm x={1370} y={430} scale={1.08} />
      </g>
    );
  }

  if (districtId === "downtown") {
    return (
      <g className={styles.towerLandmark}>
        <path d="M760 510 L790 145 L820 510 Z" />
        <path d="M790 145 L790 82" />
        <path d="M778 210 L802 210" />
        <path d="M770 286 L810 286" />
      </g>
    );
  }

  if (districtId === "studio-district") {
    return (
      <g className={styles.studioLandmark}>
        <path d="M1130 504 L1230 338 L1368 504 Z" />
        <path d="M1176 504 L1234 402 L1305 504 Z" />
        <circle cx="1236" cy="430" r="18" />
        <path d="M150 505 L230 438 L310 505 Z" />
      </g>
    );
  }

  if (districtId === "arcade-pier") {
    return (
      <g className={styles.pierLandmark}>
        <circle cx="1186" cy="397" r="108" />
        <circle cx="1186" cy="397" r="12" />
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <line
            key={angle}
            x1="1186"
            y1="397"
            x2="1186"
            y2="289"
            transform={`rotate(${angle} 1186 397)`}
          />
        ))}
        <path d="M1112 515 L1186 397 L1260 515" />
        <Palm x={250} y={430} scale={0.9} />
      </g>
    );
  }

  if (districtId === "radio-hill") {
    return (
      <g className={styles.radioLandmark}>
        <path d="M1190 510 L1260 228 L1330 510" />
        <line x1="1211" y1="426" x2="1309" y2="426" />
        <line x1="1228" y1="354" x2="1292" y2="354" />
        <line x1="1245" y1="286" x2="1275" y2="286" />
        <circle cx="1260" cy="218" r="10" />
        <path d="M1210 210 Q1260 166 1310 210" />
        <path d="M1182 180 Q1260 112 1338 180" />
      </g>
    );
  }

  return (
    <g className={styles.overlookLandmark}>
      <path d="M64 518 Q300 430 510 492" />
      <path d="M1010 492 Q1280 410 1536 508" />
      <line x1="110" y1="480" x2="438" y2="454" />
      <line x1="1070" y1="456" x2="1490" y2="480" />
      <Palm x={118} y={382} scale={1.15} />
      <Palm x={1440} y={394} scale={1.02} />
    </g>
  );
}

function Skyline({
  districtId,
  districtIndex,
}: {
  districtId: DistrictId;
  districtIndex: number;
}) {
  const buildings = Array.from({ length: 13 }, (_, buildingIndex) => {
    const x = ((buildingIndex * 131 + districtIndex * 67) % 1510) - 30;
    const width = 78 + ((buildingIndex * 37 + districtIndex * 19) % 94);
    const height = 92 + ((buildingIndex * 71 + districtIndex * 41) % 240);
    const y = 520 - height;
    const windows = Array.from({ length: 3 }, (_, windowIndex) => ({
      x: x + 18 + windowIndex * Math.max(18, (width - 32) / 3),
      y: y + 30 + ((windowIndex + districtIndex) % 3) * 34,
    }));

    return (
      <g key={`${districtIndex}-${buildingIndex}`}>
        <rect
          className={buildingIndex % 3 === 0 ? styles.buildingNear : styles.building}
          x={x}
          y={y}
          width={width}
          height={height}
          rx="2"
        />
        <path
          className={styles.roofEdge}
          d={`M${x} ${y} L${x + width / 2} ${y - 12 - (buildingIndex % 2) * 12} L${x + width} ${y}`}
        />
        {windows.map((windowPosition, windowIndex) => (
          <rect
            key={windowIndex}
            className={windowIndex === districtIndex % 3 ? styles.windowHot : styles.windowCool}
            x={windowPosition.x}
            y={windowPosition.y}
            width="7"
            height="18"
          />
        ))}
      </g>
    );
  });

  return (
    <svg
      className={`${styles.skyline} ${styles.skylineDesktop}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path className={styles.farHills} d="M0 505 Q190 418 380 493 T760 475 T1140 490 T1600 445 L1600 610 L0 610 Z" />
      {buildings}
      <Landmark districtId={districtId} />
      <rect className={styles.water} x="0" y="520" width="1600" height="190" />
      {Array.from({ length: 17 }, (_, reflectionIndex) => (
        <line
          key={reflectionIndex}
          className={reflectionIndex % 4 === districtIndex % 4 ? styles.reflectionHot : styles.reflection}
          x1={reflectionIndex * 104 - 28}
          x2={reflectionIndex * 104 + 48}
          y1={552 + (reflectionIndex % 5) * 24}
          y2={552 + (reflectionIndex % 5) * 24}
        />
      ))}
    </svg>
  );
}

function PortraitLandmark({ districtId }: { districtId: DistrictId }) {
  if (districtId === "city-limits") {
    return (
      <g className={styles.landmark}>
        <path d="M184 642 Q330 458 476 642" />
        <path d="M220 642 Q330 520 440 642" />
        <line x1="184" y1="642" x2="476" y2="642" />
        <Palm x={94} y={530} scale={1.15} />
        <Palm x={760} y={515} scale={1.08} />
      </g>
    );
  }

  if (districtId === "downtown") {
    return (
      <g className={styles.towerLandmark}>
        <path d="M406 650 L450 172 L494 650 Z" />
        <path d="M450 172 L450 92" />
        <path d="M432 282 L468 282" />
        <path d="M420 382 L480 382" />
      </g>
    );
  }

  if (districtId === "studio-district") {
    return (
      <g className={styles.studioLandmark}>
        <path d="M142 646 L300 410 L468 646 Z" />
        <path d="M470 646 L610 458 L782 646 Z" />
        <circle cx="304" cy="530" r="24" />
      </g>
    );
  }

  if (districtId === "arcade-pier") {
    return (
      <g className={styles.pierLandmark}>
        <circle cx="630" cy="486" r="142" />
        <circle cx="630" cy="486" r="14" />
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <line
            key={angle}
            x1="630"
            y1="486"
            x2="630"
            y2="344"
            transform={`rotate(${angle} 630 486)`}
          />
        ))}
        <path d="M530 650 L630 486 L730 650" />
        <Palm x={100} y={530} scale={1.1} />
      </g>
    );
  }

  if (districtId === "radio-hill") {
    return (
      <g className={styles.radioLandmark}>
        <path d="M520 650 L610 258 L700 650" />
        <line x1="546" y1="538" x2="674" y2="538" />
        <line x1="570" y1="434" x2="650" y2="434" />
        <line x1="592" y1="334" x2="628" y2="334" />
        <circle cx="610" cy="246" r="12" />
        <path d="M548 232 Q610 174 672 232" />
        <path d="M506 192 Q610 98 714 192" />
      </g>
    );
  }

  return (
    <g className={styles.overlookLandmark}>
      <path d="M30 646 Q210 520 420 610" />
      <path d="M480 610 Q690 510 870 646" />
      <line x1="70" y1="596" x2="365" y2="564" />
      <line x1="535" y1="564" x2="832" y2="596" />
      <Palm x={80} y={470} scale={1.25} />
      <Palm x={780} y={485} scale={1.14} />
    </g>
  );
}

function PortraitSkyline({
  districtId,
  districtIndex,
}: {
  districtId: DistrictId;
  districtIndex: number;
}) {
  const buildings = Array.from({ length: 9 }, (_, buildingIndex) => {
    const x = ((buildingIndex * 109 + districtIndex * 43) % 860) - 30;
    const width = 78 + ((buildingIndex * 31 + districtIndex * 17) % 80);
    const height = 130 + ((buildingIndex * 83 + districtIndex * 47) % 275);
    const y = 650 - height;

    return (
      <g key={`portrait-${districtIndex}-${buildingIndex}`}>
        <rect
          className={buildingIndex % 3 === 1 ? styles.buildingNear : styles.building}
          x={x}
          y={y}
          width={width}
          height={height}
          rx="2"
        />
        <path
          className={styles.roofEdge}
          d={`M${x} ${y} L${x + width / 2} ${y - 14 - (buildingIndex % 2) * 14} L${x + width} ${y}`}
        />
        <rect
          className={buildingIndex % 2 === districtIndex % 2 ? styles.windowHot : styles.windowCool}
          x={x + width * 0.34}
          y={y + 42}
          width="8"
          height="24"
        />
      </g>
    );
  });

  return (
    <svg
      className={`${styles.skyline} ${styles.skylinePortrait}`}
      viewBox="0 0 900 1200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className={styles.farHills} d="M0 625 Q120 526 260 610 T520 592 T900 550 L900 790 L0 790 Z" />
      {buildings}
      <PortraitLandmark districtId={districtId} />
      <rect className={styles.water} x="0" y="650" width="900" height="245" />
      {Array.from({ length: 11 }, (_, reflectionIndex) => (
        <line
          key={reflectionIndex}
          className={reflectionIndex % 4 === districtIndex % 4 ? styles.reflectionHot : styles.reflection}
          x1={reflectionIndex * 94 - 22}
          x2={reflectionIndex * 94 + 52}
          y1={690 + (reflectionIndex % 4) * 34}
          y2={690 + (reflectionIndex % 4) * 34}
        />
      ))}
    </svg>
  );
}

function CinematicMedia({ district, index }: { district: NightDriveDistrict; index: number }) {
  const { media } = district;
  const hasPoster = Boolean(media.poster || media.mobilePoster);
  const hasClip = Boolean(media.desktopClip || media.mobileClip);

  if (!hasPoster && !hasClip) return null;

  return (
    <div className={styles.cinematicMedia} data-drive-media-index={index}>
      {media.poster ? (
        <Image
          className={`${styles.mediaPoster} ${media.mobilePoster ? styles.mediaPosterDesktop : ""}`}
          src={media.poster}
          alt=""
          fill
          sizes="100vw"
          priority={index === 0}
        />
      ) : null}
      {media.mobilePoster ? (
        <Image
          className={`${styles.mediaPoster} ${styles.mediaPosterMobile}`}
          src={media.mobilePoster}
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, 1px"
          priority={index === 0}
        />
      ) : null}
      {hasClip ? (
        <video
          className={styles.mediaVideo}
          data-drive-video={index}
          muted
          playsInline
          preload={index < 2 ? "metadata" : "none"}
          tabIndex={-1}
          aria-hidden="true"
        >
          {media.mobileClip ? (
            <source src={media.mobileClip} media="(max-width: 760px) and (orientation: portrait)" />
          ) : null}
          {media.desktopClip ? <source src={media.desktopClip} /> : null}
        </video>
      ) : null}
    </div>
  );
}

function StreetCanyon({ districts }: NightCityProps) {
  return (
    <>
      <div className={styles.streetCanyon}>
        {Array.from({ length: 18 }, (_, index) => {
          const kind = index % 7 === 2 ? "palm" : index % 7 === 5 ? "tower" : "building";
          const side = index % 2 === 0 ? "left" : "right";

          return (
            <span
              key={index}
              className={styles.streetBlock}
              data-drive-block={index}
              data-kind={kind}
              data-side={side}
              data-variant={index % 4}
            >
              <i className={styles.blockSide} />
              <i className={styles.blockFace}>
                {Array.from({ length: 8 }, (_, windowIndex) => (
                  <b key={windowIndex} />
                ))}
              </i>
              <i className={styles.streetPalm}>
                <b />
                <b />
                <b />
                <b />
              </i>
            </span>
          );
        })}
      </div>

      <div className={styles.districtGates}>
        {districts.map((district, index) => (
          <div
            key={district.id}
            className={styles.districtGate}
            data-drive-gate={index}
          >
            <i className={styles.gatePostLeft} />
            <i className={styles.gatePostRight} />
            <div className={styles.gateSign}>
              <span>Approaching</span>
              <strong>{district.label}</strong>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DriverCar() {
  return (
    <div className={styles.driverCar}>
      <i className={styles.carShadow} />
      <i className={`${styles.carWheel} ${styles.carWheelLeft}`} />
      <i className={`${styles.carWheel} ${styles.carWheelRight}`} />
      <div className={styles.carCabin}>
        <i className={styles.carRearWindow} />
        <i className={styles.carMirrorLeft} />
        <i className={styles.carMirrorRight} />
      </div>
      <div className={styles.carBody}>
        <i className={styles.carCenterStripe} />
        <i className={`${styles.carTailLight} ${styles.carTailLightLeft}`} />
        <i className={`${styles.carTailLight} ${styles.carTailLightRight}`} />
        <span className={styles.carPlate}>
          <small>NY</small>
          <strong>TS-13</strong>
        </span>
        <i className={styles.carBumper} />
      </div>
    </div>
  );
}

export default function NightCity({ districts }: NightCityProps) {
  return (
    <div className={styles.city} aria-hidden="true">
      <div className={styles.sky}>
        <div className={styles.horizonGlow} />
        <div className={styles.moon} />
        <div className={styles.stars}>
          {STAR_POSITIONS.map(([x, y], index) => (
            <span
              key={`${x}-${y}`}
              className={styles.star}
              style={{ "--star-x": x, "--star-y": y, "--star-size": index % 4 === 0 ? 2 : 1 } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className={styles.sceneStack}>
        {districts.map((district, index) => (
          <div
            key={district.id}
            className={styles.cityScene}
            data-drive-scene={index}
            data-accent={district.accent}
          >
            <Skyline districtId={district.id} districtIndex={index} />
            <PortraitSkyline districtId={district.id} districtIndex={index} />
            <CinematicMedia district={district} index={index} />
          </div>
        ))}
      </div>

      <div className={styles.roadStage}>
        <svg
          className={styles.road}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          {districts.map((district, index) => {
            const geometry = ROAD_GEOMETRY[district.id];
            return (
              <g key={district.id} className={styles.roadScene} data-drive-road={index}>
                <path className={styles.roadShoulder} d={geometry.surface} />
                <path className={styles.roadSurface} d={geometry.surface} />
                <path className={styles.roadCenterGlow} d={geometry.center} />
                <path
                  className={styles.roadCenterLine}
                  data-drive-road-line
                  d={geometry.center}
                  pathLength="1000"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className={styles.roadsideLights}>
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className={styles.roadsideLight} data-drive-lamp={index}>
            <i className={styles.lampGlow} />
            <i className={styles.lampPole} />
          </span>
        ))}
      </div>

      <StreetCanyon districts={districts} />

      <div className={styles.windshield} />
      <div className={styles.grain} />
      <DriverCar />
    </div>
  );
}
