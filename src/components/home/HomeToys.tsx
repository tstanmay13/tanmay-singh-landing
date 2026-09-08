"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./home.module.css";
const favorites = [
  {
    name: "Gengar",
    image: "gengar.png",
    color: "purple",
    title: "A permanent favorite",
    story:
      "A mischievous grin. A few special cards. Gengar gets pride of place.",
  },
  {
    name: "Shiny Kyogre",
    image: "kyogre-shiny.png",
    color: "coral",
    title: "Especially the pink one",
    story:
      "Kyogre is already great. Pink shiny Kyogre is the one I really love.",
  },
  {
    name: "Salamence",
    image: "salamence.png",
    color: "blue",
    title: "Always on the team",
    story: "One more favorite that deserves a place beside Gengar and Kyogre.",
  },
];
export function CardBinder() {
  const [flipped, setFlipped] = useState<string[]>([]);
  const [opened, setOpened] = useState(false);
  const firstCard = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (opened) firstCard.current?.focus({ preventScroll: true });
  }, [opened]);
  return (
    <section className={styles.binder} aria-label="My favorite Pokémon">
      <p className={styles.caption}>
        {opened
          ? "Three familiar faces. Swipe through, or tap a card to turn it over."
          : "A little pack of my favorites. Go on, open it."}
      </p>
      {!opened ? (
        <button
          className={styles.favoritePack}
          onClick={() => {
            setOpened(true);
            setFlipped([]);
          }}
          aria-label="Open the Pokémon favorites pack"
        >
          <span className={styles.packSeal}>Pull here ↓</span>
          <span className={styles.packBall} aria-hidden="true">
            ◓
          </span>
          <strong>
            The good
            <br />
            company pack
          </strong>
          <small>Gengar & friends · 3 favorites</small>
          <span>Tap to open</span>
        </button>
      ) : (
        <div className={styles.binderCards}>
          {favorites.map((card, index) => (
            <button
              key={card.name}
              ref={index === 0 ? firstCard : undefined}
              data-color={card.color}
              className={styles.collectible}
              style={{ animationDelay: `${index * 110}ms` }}
              aria-pressed={flipped.includes(card.name)}
              aria-label={`Flip ${card.name} card`}
              onClick={() =>
                setFlipped((current) =>
                  current.includes(card.name)
                    ? current.filter((name) => name !== card.name)
                    : [...current, card.name],
                )
              }
            >
              <span className={styles.cardInner}>
                <span
                  className={styles.cardFront}
                  aria-hidden={flipped.includes(card.name)}
                >
                  <strong>{card.name}</strong>
                  <span className={styles.cardPortrait}>
                    <Image
                      unoptimized
                      src={`/home/sprites/${card.image}`}
                      alt=""
                      width="96"
                      height="96"
                    />
                  </span>
                  <small>Tanmay’s favorites</small>
                  <span aria-hidden="true">✦ ✦ ✦</span>
                </span>
                <span
                  className={styles.cardBack}
                  aria-hidden={!flipped.includes(card.name)}
                >
                  <strong>{card.title}</strong>
                  <span>{card.story}</span>
                  <small>Turn back over ↶</small>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {opened && (
        <button className={styles.packAgain} onClick={() => setOpened(false)}>
          Pack them up again ↶
        </button>
      )}
      <p className={styles.finePrint}>
        Favorite Pokémon, illustrated as keepsake cards.{" "}
        <a
          href="https://github.com/PokeAPI/sprites"
          target="_blank"
          rel="noreferrer"
        >
          Sprite credits
        </a>
        .
      </p>
    </section>
  );
}
