import Link from "next/link";
import Preview from "./Preview";
import styles from "./showcase.module.css";

const picks = [
  {
    title: "Orbit",
    kind: "orbit" as const,
    path: "/games/orbit",
    prompt: "Something to get lost in",
    description: "Launch a planet. See what gravity does with it.",
    setup: "Solo · Mouse or touch",
    time: "No timer; stay as long as you like",
  },
  {
    title: "Merge Conflict",
    kind: "merge" as const,
    path: "/games/merge-conflict",
    prompt: "Bring someone along",
    description:
      "Write half the code. Hope the other person had the same idea.",
    setup: "2–8 online · Separate devices",
    time: "60-second writing turns",
  },
  {
    title: "Pixel Art Painter",
    kind: "paint" as const,
    path: "/games/pixel-painter",
    prompt: "Make a little something",
    description: "A small canvas, a few colors, and an undo button.",
    setup: "Solo · Mouse or touch",
    time: "No timer; save your drawing",
  },
];
export default function GamePicks() {
  return (
    <div className={styles.picks}>
      {picks.map((pick) => (
        <Link href={pick.path} key={pick.path} className={styles.pick}>
          <Preview kind={pick.kind} />
          <div className={styles.pickCopy}>
            <p className={styles.pickPrompt}>{pick.prompt}</p>
            <h3>{pick.title}</h3>
            <p>{pick.description}</p>
            <div className={styles.pickMeta}>
              <span>{pick.setup}</span>
              <span>{pick.time}</span>
            </div>
            <span className={styles.playLink}>
              Play <span aria-hidden="true">↗</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
