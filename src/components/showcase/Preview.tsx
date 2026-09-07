import styles from "./showcase.module.css";

export type PreviewKind =
  | "football"
  | "radiordle"
  | "orbit"
  | "merge"
  | "paint"
  | "snake";

/** Illustrations of the game mechanics, not screenshots or simulated controls. */
export default function Preview({ kind }: { kind: PreviewKind }) {
  return (
    <div className={`${styles.preview} ${styles[kind]}`} aria-hidden="true">
      {kind === "football" && (
        <svg viewBox="0 0 640 400" fill="none">
          <path
            d="M60 45H580V355H60Z"
            stroke="currentColor"
            strokeWidth="2"
            opacity=".5"
          />
          {[140, 230, 320, 410, 500].map((x) => (
            <path
              key={x}
              d={`M${x} 45V355`}
              stroke="currentColor"
              opacity=".25"
            />
          ))}
          {[90, 115, 140, 165, 190, 215, 240, 265, 290, 315].map((y) => (
            <path
              key={y}
              d={`M300 ${y}h10m20 0h10`}
              stroke="currentColor"
              opacity=".5"
            />
          ))}
          <text x="320" y="238" textAnchor="middle" className={styles.score}>
            16–0
          </text>
          <path
            d="M160 305V260Q160 240 180 240H450l-24-20m24 20-24 20"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="8 7"
          />
          <circle
            cx="160"
            cy="305"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <text x="80" y="78" className={styles.artLabel}>
            DRAFT YOUR PERFECT SEASON
          </text>
        </svg>
      )}
      {kind === "radiordle" && (
        <svg viewBox="0 0 640 400" fill="none">
          <path
            d="M90 90V60h35m390 30V60h-35M90 310v30h35m390-30v30h-35"
            stroke="currentColor"
            strokeWidth="2"
            opacity=".5"
          />
          <text
            x="320"
            y="158"
            textAnchor="middle"
            className={styles.pixelTitle}
          >
            Radiordle
          </text>
          <text x="320" y="201" textAnchor="middle" className={styles.artLabel}>
            ONE IMAGE. FIVE GUESSES.
          </text>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect
                x={197 + i * 51}
                y="244"
                width="42"
                height="42"
                rx="3"
                fill="currentColor"
                opacity={i === 2 ? 0.85 : 0.12}
              />
              {i < 2 && (
                <path
                  d={`M${210 + i * 51} 257l16 16m0-16-16 16`}
                  stroke="currentColor"
                  strokeWidth="2"
                />
              )}
              {i === 2 && (
                <path
                  d="m310 266 6 6 12-14"
                  stroke="var(--art-dark)"
                  strokeWidth="3"
                />
              )}
            </g>
          ))}
        </svg>
      )}
      {kind === "orbit" && (
        <svg viewBox="0 0 640 400" fill="none">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <circle
              key={i}
              cx={35 + ((i * 137) % 580)}
              cy={30 + ((i * 79) % 340)}
              r="1.5"
              fill="currentColor"
              opacity=".4"
            />
          ))}
          <g transform="rotate(-24 320 200)">
            {[80, 145, 220].map((r) => (
              <ellipse
                key={r}
                cx="320"
                cy="200"
                rx={r}
                ry={r * 0.57}
                stroke="currentColor"
                opacity=".25"
              />
            ))}
            <ellipse
              cx="320"
              cy="200"
              rx="220"
              ry="125.4"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="230 900"
            />
            <circle cx="100" cy="200" r="12" fill="var(--art-peach)" />
            <circle cx="430" cy="254" r="7" fill="currentColor" />
          </g>
          <circle cx="320" cy="200" r="34" fill="var(--art-peach)" />
          <circle
            cx="320"
            cy="200"
            r="46"
            stroke="var(--art-peach)"
            opacity=".25"
          />
          <path
            d="m473 305 28-38m-28 38 3-16m-3 16 15-7"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
      {kind === "merge" && (
        <svg viewBox="0 0 640 400" fill="none">
          <path
            d="M210 55v85q0 50 75 50t75 55v80M430 55v85q0 50-75 50t-75 55v80"
            stroke="currentColor"
            strokeWidth="12"
          />
          <path
            d="M430 55v85q0 50-75 50t-75 55v80"
            stroke="var(--art-peach)"
            strokeWidth="12"
          />
          {[
            [210, 65],
            [430, 65],
            [280, 325],
            [360, 325],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x - 18}
              y={y - 18}
              width="36"
              height="36"
              fill={i % 2 ? "var(--art-peach)" : "currentColor"}
              stroke="var(--art-dark)"
              strokeWidth="6"
            />
          ))}
          <text x="140" y="205" className={styles.artLabel}>
            YOU
          </text>
          <text x="420" y="205" className={styles.artLabel}>
            THEM
          </text>
        </svg>
      )}
      {kind === "paint" && (
        <svg viewBox="0 0 640 400" fill="none">
          <g transform="translate(208 70)">
            {Array.from({ length: 144 }, (_, i) => (
              <rect
                key={i}
                x={(i % 12) * 19}
                y={Math.floor(i / 12) * 19}
                width="18"
                height="18"
                fill="currentColor"
                opacity=".07"
              />
            ))}
            {[
              "000111111000",
              "001111111100",
              "011211121110",
              "111111111111",
              "111211112111",
              "111111111111",
              "000333330000",
              "000343430000",
              "000333330000",
              "000333330000",
              "000033300000",
              "000000000000",
            ].flatMap((row, y) =>
              [...row].map((p, x) =>
                p === "0" ? null : (
                  <rect
                    key={`${x}-${y}`}
                    x={x * 19}
                    y={y * 19}
                    width="19"
                    height="19"
                    fill={
                      p === "1"
                        ? "var(--art-peach)"
                        : p === "2"
                          ? "var(--art-paper)"
                          : p === "4"
                            ? "var(--art-dark)"
                            : "currentColor"
                    }
                  />
                ),
              ),
            )}
          </g>
          {[
            "var(--art-peach)",
            "var(--art-paper)",
            "currentColor",
            "var(--art-dark)",
          ].map((color, i) => (
            <rect
              key={color}
              x={244 + i * 40}
              y="329"
              width="25"
              height="25"
              fill={color}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>
      )}
      {kind === "snake" && (
        <svg viewBox="0 0 640 400" fill="none">
          {Array.from({ length: 60 }, (_, i) => (
            <circle
              key={i}
              cx={50 + (i % 10) * 60}
              cy={50 + Math.floor(i / 10) * 60}
              r="2"
              fill="currentColor"
              opacity=".15"
            />
          ))}
          <path
            d="M140 285h120V165h120V105h65"
            stroke="currentColor"
            strokeWidth="28"
            strokeLinejoin="miter"
          />
          <path
            d="M435 98h5m-5 12h5"
            stroke="var(--art-dark)"
            strokeWidth="5"
          />
          <rect x="493" y="93" width="24" height="24" fill="var(--art-peach)" />
        </svg>
      )}
    </div>
  );
}
