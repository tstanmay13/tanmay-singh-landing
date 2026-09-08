"use client";
import { useState } from "react";
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
  return (
    <section className={styles.binder} aria-label="My favorite Pokémon">
      <p className={styles.caption}>
        A few favorites. Tap a card to turn it over.
      </p>
      <div className={styles.binderCards}>
        {favorites.map((card) => (
          <button
            key={card.name}
            data-color={card.color}
            className={styles.collectible}
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
              <span className={styles.cardFront}>
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
              <span className={styles.cardBack}>
                <strong>{card.title}</strong>
                <span>{card.story}</span>
                <small>Turn back over ↶</small>
              </span>
            </span>
          </button>
        ))}
      </div>
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
const recipe = [
  ["Rye", "2 oz"],
  ["Fresh lemon juice", "1 oz · or ½ oz bottled lemon juice"],
  ["Turbinado syrup", "½ oz"],
  ["Egg white", "1 fresh egg white, not from a carton"],
];
const method = [
  "Dry shake",
  "Add ice & shake",
  "Double strain",
  "Angostura spray",
];
const instructions = [
  "No ice yet. Shake vigorously for 30 seconds to emulsify the egg white.",
  "Add ice, then give it another long shake: 30–45 seconds.",
  "Fine strain through a second strainer into a coupe.",
  "Finish with a spray of Angostura bitters. Cheers.",
];
export function SourMixer() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const all = ingredients.length === recipe.length;
  return (
    <section className={styles.mixer} aria-label="Tanmay’s whiskey sour recipe">
      <div className={styles.recipeHead}>
        <div>
          <p className={styles.caption}>From my actual cocktail notes</p>
          <h3>My whiskey sour</h3>
          <p>Rye, a proper egg-white foam, and a very long shake.</p>
        </div>
        <div
          className={styles.drinkScene}
          data-shaken={step > 0}
          aria-hidden="true"
        >
          <span
            className={styles.lemon}
            style={{
              opacity: ingredients.includes("Fresh lemon juice") ? 1 : 0,
            }}
          />
          <span className={styles.glass}>
            <i
              style={{
                transform: `scaleY(${ingredients.length / recipe.length})`,
                transformOrigin: "bottom",
                borderTopWidth: step > 0 ? 15 : 0,
              }}
            />
            <b />
          </span>
        </div>
      </div>
      <p className={styles.caption}>Tap to add the ingredients</p>
      <div className={styles.ingredientButtons}>
        {recipe.map(([ingredient, amount]) => (
          <button
            key={ingredient}
            disabled={step > 0}
            aria-pressed={ingredients.includes(ingredient)}
            onClick={() =>
              setIngredients((current) =>
                current.includes(ingredient)
                  ? current.filter((item) => item !== ingredient)
                  : [...current, ingredient],
              )
            }
          >
            <span>
              {ingredients.includes(ingredient) ? "✓ " : "+ "}
              {ingredient}
            </span>
            <small>{amount}</small>
          </button>
        ))}
      </div>
      <ol className={styles.recipeSteps}>
        {method.map((name, index) => (
          <li key={name} data-done={step > index}>
            <strong>{name}</strong>
            <span>{instructions[index]}</span>
          </li>
        ))}
      </ol>
      <p className={styles.caption} aria-live="polite">
        {step === 4
          ? "Cheers. Stay a while."
          : all
            ? instructions[step]
            : "Four ingredients. Then we shake."}
      </p>
      <button
        className={styles.primaryLink}
        disabled={!all}
        onClick={() => {
          if (step === 4) {
            setStep(0);
            setIngredients([]);
          } else setStep((current) => current + 1);
        }}
      >
        {step === 4 ? "Make another" : method[step]}
      </button>
    </section>
  );
}
