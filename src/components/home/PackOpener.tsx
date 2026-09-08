"use client";
import { useEffect, useRef, useState } from "react";
import {
  SETS,
  ALL_CARDS,
  CARD_BY_ID,
  HIT_RARITIES,
  openBooster,
  randomFraction,
  imageFor,
  isHit,
  addPack,
  emptyCollection,
  restoreCollection,
  type SetId,
  type Pull,
  type Collection,
} from "@/lib/packs/model";
import styles from "./packs.module.css";

const SAVE_KEY = "tanmay-pokemon-binder-v1";
function CardArt({ pull, lazy = false }: { pull: Pull; lazy?: boolean }) {
  return (
    <span className={styles.cardArt} data-finish={pull.finish}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageFor(pull.card)}
        width="245"
        height="342"
        alt={`${pull.card.name}, ${pull.card.rarity}, number ${pull.card.number}${pull.finish === "reverse" ? ", reverse holo" : ""}`}
        loading={lazy ? "lazy" : "eager"}
        draggable={false}
      />
      {pull.finish !== "standard" && <i aria-hidden="true" />}
    </span>
  );
}
export default function PackOpener() {
  const [set, setSet] = useState<SetId>("sv5");
  const [art, setArt] = useState(0);
  const [pack, setPack] = useState<Pull[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [binder, setBinder] = useState(false);
  const [hitsOnly, setHitsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [inspected, setInspected] = useState<Pull | null>(null);
  const [collection, setCollection] = useState<Collection>(emptyCollection);
  const [ready, setReady] = useState(false);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const opened = useRef(false),
    tear = useRef<number | null>(null);
  const openedView = useRef<HTMLDivElement>(null);
  const binderView = useRef<HTMLDivElement>(null);
  const returningToPack = useRef(false);
  const packButton = useRef<HTMLButtonElement>(null),
    revealButton = useRef<HTMLButtonElement>(null);
  const selected = SETS[set];
  const fullyRevealed = !!pack && revealed === pack.length;
  const advance = () => {
    if (fullyRevealed) setComplete(true);
    else if (pack) setRevealed((v) => Math.min(v + 1, pack.length));
  };
  const visible = pack && revealed > 0 ? pack[revealed - 1] : null;
  useEffect(() => {
    try {
      setCollection(restoreCollection(localStorage.getItem(SAVE_KEY)));
    } catch {
      setSaveBlocked(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(collection));
    } catch {
      setSaveBlocked(true);
    }
  }, [collection, ready]);
  useEffect(() => {
    if (pack) revealButton.current?.focus({ preventScroll: true });
  }, [pack]);
  useEffect(() => {
    openedView.current?.scrollIntoView({ block: "start" });
  }, [pack, revealed, complete]);
  useEffect(() => {
    if (!pack && returningToPack.current) {
      returningToPack.current = false;
      packButton.current?.focus({ preventScroll: true });
      packButton.current?.scrollIntoView({ block: "center" });
    }
  }, [pack, set]);
  useEffect(() => {
    binderView.current?.scrollIntoView({ block: "start" });
  }, [binder, inspected, page, hitsOnly]);
  const resetPack = () => {
    returningToPack.current = true;
    opened.current = false;
    setPack(null);
    setRevealed(0);
    setComplete(false);
    setArt(Math.floor(randomFraction() * 4));
  };
  const open = () => {
    if (opened.current || !ready) return;
    opened.current = true;
    const result = openBooster(set);
    setPack([result[10], ...result.slice(0, 10)]);
    setRevealed(0);
    setComplete(false);
    setBinder(false);
    setInspected(null);
    setCollection((current) => addPack(current, set, result));
  };
  const changeSet = (next: SetId) => {
    setSet(next);
    setBinder(false);
    setInspected(null);
    setPage(0);
    resetPack();
  };
  const entries = Object.entries(collection.cards)
    .flatMap(([key, count]) => {
      const [id, finish] = key.split(":");
      const card = CARD_BY_ID.get(id);
      return card && id.startsWith(`${set}-`) && (!hitsOnly || isHit(card))
        ? [{ card, finish: finish as Pull["finish"], count }]
        : [];
    })
    .sort(
      (a, b) =>
        Number(a.card.number) - Number(b.card.number) ||
        a.finish.localeCompare(b.finish),
    );
  const unique = ALL_CARDS.filter(
    (card) =>
      card.id.startsWith(`${set}-`) &&
      ["standard", "reverse", "holo"].some(
        (finish) => collection.cards[`${card.id}:${finish}`],
      ),
  ).length;

  return (
    <section className={styles.opener} aria-label="Pokémon booster pack opener">
      <p className={styles.intro}>Pick a real set. See what turns up.</p>
      <div className={styles.sets} aria-label="Choose a Pokémon set">
        {(Object.keys(SETS) as SetId[]).map((id) => (
          <button
            key={id}
            onClick={() => changeSet(id)}
            aria-pressed={set === id}
          >
            {SETS[id].name}
          </button>
        ))}
      </div>
      <div className={styles.stats}>
        <span>{collection.packs[set]} packs opened</span>
        <button
          onClick={() => {
            setBinder((v) => !v);
            setInspected(null);
            setPage(0);
          }}
          aria-expanded={binder}
        >
          {unique}/{selected.total} in your binder
        </button>
      </div>

      {binder ? (
        <div ref={binderView} className={styles.binder}>
          <div className={styles.binderHead}>
            <h3>Your {selected.name} pulls</h3>
            <button
              onClick={() => {
                setBinder(false);
                setInspected(null);
              }}
            >
              Back to packs
            </button>
          </div>
          {inspected ? (
            <div className={styles.inspected}>
              <button onClick={() => setInspected(null)}>
                ← Back to your cards
              </button>
              <CardArt pull={inspected} />
              <p>
                {inspected.card.name} · {inspected.card.rarity}
                <br />
                {inspected.finish === "reverse" ? "Reverse holo · " : ""}#
                {inspected.card.number}
                {inspected.card.rarity !== "Basic Energy"
                  ? `/${selected.printed}`
                  : ""}
              </p>
            </div>
          ) : (
            <>
              <button
                className={styles.filter}
                aria-pressed={hitsOnly}
                onClick={() => {
                  setHitsOnly((v) => !v);
                  setPage(0);
                }}
              >
                {hitsOnly ? "Show all cards" : "Show higher-rarity pulls"}
              </button>
              {entries.length === 0 ? (
                <p className={styles.empty}>
                  {hitsOnly
                    ? "No higher-rarity pulls in this binder yet."
                    : "Your first pack is waiting."}
                </p>
              ) : (
                <div className={styles.binderGrid}>
                  {entries.slice(page * 12, page * 12 + 12).map((pull) => (
                    <button
                      key={`${pull.card.id}:${pull.finish}`}
                      onClick={() => setInspected(pull)}
                      aria-label={`Inspect ${pull.card.name}, ${pull.finish}, ${pull.count} copies`}
                    >
                      <CardArt pull={pull} lazy />
                      <span>
                        {pull.finish === "reverse"
                          ? "Reverse holo"
                          : "#" + pull.card.number}
                        <b>×{pull.count}</b>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {entries.length > 12 && (
                <div className={styles.pagination}>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    ← Previous
                  </button>
                  <span>
                    {page + 1}/{Math.ceil(entries.length / 12)}
                  </span>
                  <button
                    disabled={(page + 1) * 12 >= entries.length}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : !pack ? (
        <div className={styles.sealed}>
          <button
            ref={packButton}
            className={styles.pack}
            disabled={!ready}
            onClick={open}
            aria-label={`Open a ${selected.name} booster pack`}
            onPointerDown={(e) => {
              tear.current = e.clientX;
            }}
            onPointerMove={(e) => {
              if (
                tear.current !== null &&
                Math.abs(e.clientX - tear.current) > 65
              ) {
                tear.current = null;
                open();
              }
            }}
            onPointerUp={() => {
              tear.current = null;
            }}
            onPointerCancel={() => {
              tear.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/packs/${set}/pack-${art}.webp`}
              width="320"
              height="560"
              alt={`${selected.name} sealed booster pack artwork`}
              draggable={false}
            />
            <span>Tap to open · or swipe across</span>
          </button>
          <p>{selected.note}</p>
          <small>10 set cards + 1 Basic Energy</small>
        </div>
      ) : (
        <div ref={openedView} className={styles.opened}>
          <div className={styles.revealHeading}>
            <span>
              {complete
                ? "Your pack"
                : `Card ${Math.max(1, revealed)} / ${pack.length}`}
            </span>
            {!complete && !fullyRevealed && (
              <button
                onClick={() => {
                  setRevealed(pack.length);
                  setComplete(true);
                }}
              >
                Reveal all
              </button>
            )}
          </div>
          {!complete ? (
            <>
              <button
                ref={revealButton}
                className={styles.reveal}
                onClick={advance}
                aria-label={
                  fullyRevealed
                    ? "See the whole pack"
                    : `Reveal card ${revealed + 1} of ${pack.length}`
                }
              >
                {visible ? (
                  <span
                    key={revealed}
                    className={styles.turn}
                    data-hit={isHit(visible.card)}
                  >
                    <CardArt pull={visible} />
                  </span>
                ) : (
                  <span className={styles.cardBack}>
                    <span aria-hidden="true">◓</span>
                    <strong>{selected.name}</strong>
                    <small>What’s in this one?</small>
                  </span>
                )}
              </button>
              <div className={styles.pullLabel} aria-live="polite">
                {visible ? (
                  <>
                    <strong>{visible.card.name}</strong>
                    <span data-hit={isHit(visible.card)}>
                      {visible.finish === "reverse"
                        ? "Reverse holo"
                        : visible.card.rarity}{" "}
                      · #{visible.card.number}
                      {visible.card.rarity !== "Basic Energy"
                        ? `/${selected.printed}`
                        : ""}
                    </span>
                  </>
                ) : (
                  <p>Your pack is open.</p>
                )}
              </div>
              <button className={styles.primary} onClick={advance}>
                {fullyRevealed
                  ? "See the whole pack"
                  : revealed
                    ? "Next card"
                    : "Reveal the first card"}{" "}
                →
              </button>
            </>
          ) : (
            <>
              <p className={styles.packResult} role="status">
                {pack.some((p) => isHit(p.card))
                  ? `${pack.filter((p) => isHit(p.card)).length} higher-rarity ${pack.filter((p) => isHit(p.card)).length === 1 ? "pull" : "pulls"}. Into the binder.`
                  : "A quieter pack. Every card goes in the binder."}
              </p>
              <div className={styles.results}>
                {pack.map((pull, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setBinder(true);
                      setInspected(pull);
                    }}
                    aria-label={`Inspect ${pull.card.name}, ${pull.finish}`}
                  >
                    <CardArt pull={pull} lazy />
                    <span>
                      {pull.finish === "reverse"
                        ? "Reverse holo"
                        : pull.card.rarity}
                    </span>
                  </button>
                ))}
              </div>
              <button className={styles.primary} onClick={resetPack}>
                Pick up another pack ↶
              </button>
            </>
          )}
        </div>
      )}

      <p className={styles.saveNote}>
        {saveBlocked
          ? "Browser storage is unavailable; these pulls last for this visit."
          : "Just for fun. Your digital pulls stay in this browser."}
      </p>
      <details className={styles.odds}>
        <summary>Pull rates & what’s in a pack</summary>
        <p>
          Estimated per-pack rates from TCGplayer’s 8,000+ pack study for{" "}
          {selected.name}. These are observed rates, not official Pokémon odds.
        </p>
        <table>
          <caption>{selected.name} · model probabilities</caption>
          <thead>
            <tr>
              <th>Rarity</th>
              <th>Per pack</th>
            </tr>
          </thead>
          <tbody>
            {HIT_RARITIES.map((rarity) => (
              <tr key={rarity}>
                <td>{rarity}</td>
                <td>{(selected.rates[rarity] * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Four commons, three uncommons, two reverse-holo slots and one
          rare-or-better slot, plus Basic Energy. ACE SPEC can replace the first
          reverse; illustration, special illustration or hyper rare can replace
          the second. Double and ultra rares replace the rare slot.
        </p>
        <p>
          Slots are rolled independently. Cards within each rarity are equally
          likely. Common and reverse-holo selection is simplified; exact factory
          collation isn’t published. Multiple hits and packs with no
          higher-rarity hit are both possible. No boosted odds or guaranteed
          chase cards.
        </p>
        <a href={selected.source} target="_blank" rel="noreferrer">
          TCGplayer’s rates & methodology ↗
        </a>
        <a
          href="https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack"
          target="_blank"
          rel="noreferrer"
        >
          Pokémon’s pack contents ↗
        </a>
        <p>
          Unofficial simulator. No purchases, physical cards or redeemable TCG
          Live codes. Card art © Pokémon / Nintendo / Creatures / GAME FREAK.{" "}
          <a
            href="https://github.com/PokemonTCG/pokemon-tcg-data"
            target="_blank"
            rel="noreferrer"
          >
            Card data
          </a>{" "}
          ·{" "}
          <a
            href="https://www.pittpokeresearch.com/booster-pack-art-gallery"
            target="_blank"
            rel="noreferrer"
          >
            Pack artwork source
          </a>
        </p>
      </details>
    </section>
  );
}
