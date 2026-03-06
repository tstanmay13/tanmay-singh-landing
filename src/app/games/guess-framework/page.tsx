"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Snippet {
  code: string;
  answer: string;
  distractors: string[];
}

interface RoundResult {
  snippet: Snippet;
  chosen: string | null; // null = timeout
  correct: boolean;
  timeLeft: number;
}

type Screen = "menu" | "playing" | "results";

// ---------------------------------------------------------------------------
// Snippet bank (25+)
// ---------------------------------------------------------------------------

const ALL_SNIPPETS: Snippet[] = [
  {
    code: `const [count, setCount] = useState(0);`,
    answer: "React",
    distractors: ["Vue", "Solid", "Svelte"],
  },
  {
    code: `<script setup>\nconst count = ref(0)\n</script>`,
    answer: "Vue",
    distractors: ["React", "Svelte", "Angular"],
  },
  {
    code: `{#each items as item}\n  <li>{item}</li>\n{/each}`,
    answer: "Svelte",
    distractors: ["Vue", "Angular", "React"],
  },
  {
    code: `@Component({\n  selector: 'app-root',\n  templateUrl: './app.component.html'\n})`,
    answer: "Angular",
    distractors: ["React", "Vue", "Nuxt"],
  },
  {
    code: `const [count, setCount] = createSignal(0);`,
    answer: "Solid",
    distractors: ["React", "Svelte", "Vue"],
  },
  {
    code: `export async function getServerSideProps(ctx) {\n  return { props: { data } };\n}`,
    answer: "Next.js",
    distractors: ["Nuxt", "Svelte", "React"],
  },
  {
    code: `<template>\n  <div>{{ msg }}</div>\n</template>`,
    answer: "Vue",
    distractors: ["Angular", "Svelte", "React"],
  },
  {
    code: `export function load({ params }) {\n  return { id: params.id };\n}`,
    answer: "Svelte",
    distractors: ["Next.js", "Nuxt", "React"],
  },
  {
    code: `<div *ngFor="let item of items">\n  {{ item.name }}\n</div>`,
    answer: "Angular",
    distractors: ["Vue", "React", "Svelte"],
  },
  {
    code: `export default defineNuxtConfig({\n  modules: ['@nuxtjs/tailwindcss']\n})`,
    answer: "Nuxt",
    distractors: ["Next.js", "Vue", "Svelte"],
  },
  {
    code: `createEffect(() => {\n  console.log(count());\n});`,
    answer: "Solid",
    distractors: ["React", "Svelte", "Vue"],
  },
  {
    code: `const router = useRouter();\nrouter.push('/dashboard');`,
    answer: "Next.js",
    distractors: ["Nuxt", "React", "Vue"],
  },
  {
    code: `<script>\n  let count = 0;\n  $: doubled = count * 2;\n</script>`,
    answer: "Svelte",
    distractors: ["Vue", "React", "Solid"],
  },
  {
    code: `@Injectable({ providedIn: 'root' })\nexport class DataService {}`,
    answer: "Angular",
    distractors: ["React", "Next.js", "Vue"],
  },
  {
    code: `const count = useSignal(0);\nreturn <div>{count.value}</div>;`,
    answer: "Solid",
    distractors: ["React", "Vue", "Svelte"],
  },
  {
    code: `export default defineNuxtRouteMiddleware((to, from) => {\n  if (!isAuthenticated()) return navigateTo('/login');\n})`,
    answer: "Nuxt",
    distractors: ["Next.js", "Angular", "Vue"],
  },
  {
    code: `const fetcher = (url) => fetch(url).then(r => r.json());\nconst { data } = useSWR('/api/user', fetcher);`,
    answer: "React",
    distractors: ["Next.js", "Vue", "Solid"],
  },
  {
    code: `<input\n  [ngModel]="name"\n  (ngModelChange)="name = $event"\n/>`,
    answer: "Angular",
    distractors: ["Vue", "Svelte", "React"],
  },
  {
    code: `const { data } = await useFetch('/api/posts');`,
    answer: "Nuxt",
    distractors: ["Next.js", "React", "Svelte"],
  },
  {
    code: `export const metadata: Metadata = {\n  title: 'My App',\n  description: 'Built with App Router'\n};`,
    answer: "Next.js",
    distractors: ["Nuxt", "React", "Angular"],
  },
  {
    code: `<script>\n  import { onMount } from 'svelte';\n  onMount(() => console.log('mounted'));\n</script>`,
    answer: "Svelte",
    distractors: ["Vue", "React", "Angular"],
  },
  {
    code: `const app = createApp(App);\napp.use(router);\napp.mount('#app');`,
    answer: "Vue",
    distractors: ["React", "Angular", "Solid"],
  },
  {
    code: `export default function Page() {\n  return <h1>Hello from App Router</h1>;\n}`,
    answer: "Next.js",
    distractors: ["React", "Solid", "Nuxt"],
  },
  {
    code: `const items = createMemo(() =>\n  list().filter(i => i.done)\n);`,
    answer: "Solid",
    distractors: ["React", "Vue", "Svelte"],
  },
  {
    code: `<script setup>\nconst route = useRoute();\nconst id = route.params.id;\n</script>`,
    answer: "Nuxt",
    distractors: ["Vue", "Next.js", "Svelte"],
  },
  {
    code: `pipe(\n  switchMap(action => this.http.get(url)),\n  map(res => new LoadSuccess(res))\n)`,
    answer: "Angular",
    distractors: ["React", "Solid", "Vue"],
  },
  {
    code: `{#if loading}\n  <Spinner />\n{:else}\n  <Content {data} />\n{/if}`,
    answer: "Svelte",
    distractors: ["Vue", "React", "Angular"],
  },
  {
    code: `watch(() => state.count, (newVal) => {\n  console.log('count changed:', newVal);\n});`,
    answer: "Vue",
    distractors: ["React", "Solid", "Svelte"],
  },
  {
    code: `export async function generateStaticParams() {\n  const posts = await getPosts();\n  return posts.map(p => ({ slug: p.slug }));\n}`,
    answer: "Next.js",
    distractors: ["Nuxt", "Svelte", "React"],
  },
  {
    code: `<Show when={loggedIn()} fallback={<Login />}>\n  <Dashboard />\n</Show>`,
    answer: "Solid",
    distractors: ["React", "Vue", "Svelte"],
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROUNDS_PER_GAME = 15;
const TIMER_SECONDS = 3;
const POINTS_PER_CORRECT = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRounds(): Snippet[] {
  return shuffle(ALL_SNIPPETS).slice(0, ROUNDS_PER_GAME);
}

function buildOptions(snippet: Snippet): string[] {
  return shuffle([snippet.answer, ...snippet.distractors]);
}

/** Very small regex-based syntax highlighter. Returns HTML string. */
function highlight(code: string): string {
  // order matters -- do strings first so keywords inside strings aren't colored
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // strings (single, double, backtick)
  html = html.replace(
    /(&quot;|&#39;|`)(.*?)(\1)/g,
    '<span style="color:var(--color-accent)">$1$2$3</span>'
  );
  html = html.replace(
    /(["'`])(.*?)(\1)/g,
    '<span style="color:var(--color-accent)">$1$2$3</span>'
  );

  // keywords
  const kw =
    /\b(const|let|var|function|return|export|default|async|await|import|from|new|class|if|else|this)\b/g;
  html = html.replace(
    kw,
    '<span style="color:var(--color-purple)">$1</span>'
  );

  // angular / svelte directives / decorators
  html = html.replace(
    /(@\w+)/g,
    '<span style="color:var(--color-orange)">$1</span>'
  );

  // brackets & parens
  html = html.replace(
    /([{}()[\]])/g,
    '<span style="color:var(--color-cyan)">$1</span>'
  );

  // arrow
  html = html.replace(
    /=&gt;/g,
    '<span style="color:var(--color-pink)">=&gt;</span>'
  );

  return html;
}

function getRating(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "FRAMEWORK WIZARD", color: "var(--color-accent)" };
  if (pct >= 70) return { label: "SENIOR DEV", color: "var(--color-cyan)" };
  if (pct >= 50) return { label: "MID-LEVEL", color: "var(--color-orange)" };
  if (pct >= 30) return { label: "JUNIOR DEV", color: "var(--color-pink)" };
  return { label: "INTERN", color: "var(--color-red)" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuessFrameworkPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");

  // game state
  const [rounds, setRounds] = useState<Snippet[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // timer
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(false);

  // mount guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // ------- timer logic -------
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopTimer();

    const snippet = rounds[roundIndex];
    const result: RoundResult = {
      snippet,
      chosen: null,
      correct: false,
      timeLeft: 0,
    };

    setStreak(0);
    setResults((prev) => [...prev, result]);

    setTimeout(() => {
      if (roundIndex + 1 < ROUNDS_PER_GAME) {
        advanceRound(roundIndex + 1);
      } else {
        setScreen("results");
      }
    }, 1500);
  }, [rounds, roundIndex, stopTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = useCallback(() => {
    setTimeLeft(TIMER_SECONDS);
    answeredRef.current = false;
    stopTimer();

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeout();
      }
    }, 50);
  }, [stopTimer, handleTimeout]);

  // cleanup
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ------- game flow -------
  const startGame = () => {
    const picked = pickRounds();
    setRounds(picked);
    setRoundIndex(0);
    setOptions(buildOptions(picked[0]));
    setResults([]);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setScreen("playing");
    // timer will start via effect below
  };

  // start timer when round changes while playing
  useEffect(() => {
    if (screen === "playing" && rounds.length > 0) {
      startTimer();
    }
  }, [screen, roundIndex, rounds.length, startTimer]);

  const advanceRound = (next: number) => {
    setRoundIndex(next);
    setOptions(buildOptions(rounds[next]));
  };

  const handleAnswer = (choice: string) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopTimer();

    const snippet = rounds[roundIndex];
    const correct = choice === snippet.answer;

    const result: RoundResult = {
      snippet,
      chosen: choice,
      correct,
      timeLeft,
    };

    if (correct) {
      const streakBonus = streak * 10;
      setScore((s) => s + POINTS_PER_CORRECT + streakBonus);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }

    setResults((prev) => [...prev, result]);

    setTimeout(() => {
      if (roundIndex + 1 < ROUNDS_PER_GAME) {
        advanceRound(roundIndex + 1);
      } else {
        setScreen("results");
      }
    }, 1200);
  };

  // ------- rendering helpers -------
  const currentSnippet = rounds[roundIndex] as Snippet | undefined;
  const lastResult = results[results.length - 1] as RoundResult | undefined;
  const showingFeedback = answeredRef.current && lastResult && roundIndex === results.length - 1;

  if (!mounted) return null;

  // ======================== MENU ========================
  if (screen === "menu") {
    return (
      <div
        className="min-h-screen relative flex flex-col items-center justify-center px-4"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

        <div className="relative z-10 text-center max-w-lg">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block mb-10 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            &lt; BACK TO GAMES
          </Link>

          <div className="text-6xl mb-6">{"</>"}</div>

          <h1
            className="pixel-text text-2xl sm:text-3xl mb-4"
            style={{ color: "var(--color-accent)" }}
          >
            GUESS THE FRAMEWORK
          </h1>

          <p
            className="mono-text text-sm mb-8 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            A code snippet appears. You have 3 seconds to identify
            which JavaScript framework or library it belongs to.
            {" "}15 rounds. Can you tell React from Solid?
          </p>

          <div
            className="pixel-card p-5 mb-8 text-left"
          >
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              HOW TO PLAY
            </p>
            <ul
              className="mono-text text-xs space-y-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <li>{"// Read the code snippet carefully"}</li>
              <li>{"// Pick the correct framework from 4 options"}</li>
              <li>{"// Answer within 3 seconds or lose the round"}</li>
              <li>{"// Build streaks for bonus points"}</li>
              <li>{"// +100 pts per correct answer + streak bonus"}</li>
            </ul>
          </div>

          <button onClick={startGame} className="pixel-btn text-sm px-8 py-4">
            START GAME
          </button>
        </div>
      </div>
    );
  }

  // ======================== RESULTS ========================
  if (screen === "results") {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = Math.round((correctCount / ROUNDS_PER_GAME) * 100);
    const rating = getRating(pct);

    return (
      <div
        className="min-h-screen relative px-4 py-10"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="pixel-text text-xs mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              GAME OVER
            </p>
            <h1
              className="pixel-text text-3xl sm:text-4xl mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              {score} PTS
            </h1>
            <p
              className="pixel-text text-sm mb-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {correctCount}/{ROUNDS_PER_GAME} CORRECT ({pct}%)
            </p>
            <p
              className="pixel-text text-sm mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              BEST STREAK: {bestStreak}
            </p>
            <p
              className="pixel-text text-lg mt-4"
              style={{ color: rating.color }}
            >
              {rating.label}
            </p>
          </div>

          {/* Per-round breakdown */}
          <div className="space-y-2 mb-10">
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              ROUND BREAKDOWN
            </p>
            {results.map((r, i) => (
              <div
                key={i}
                className="pixel-card p-3 flex items-center gap-3"
                style={{
                  borderColor: r.correct
                    ? "var(--color-accent)"
                    : "var(--color-red)",
                }}
              >
                <span
                  className="pixel-text text-[10px] w-8 shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="mono-text text-xs truncate flex-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {r.snippet.code.split("\n")[0].slice(0, 40)}
                  {r.snippet.code.split("\n")[0].length > 40 ? "..." : ""}
                </span>
                <span
                  className="pixel-text text-[10px] shrink-0"
                  style={{
                    color: r.correct
                      ? "var(--color-accent)"
                      : "var(--color-red)",
                  }}
                >
                  {r.correct
                    ? r.snippet.answer
                    : r.chosen
                      ? `${r.chosen} (${r.snippet.answer})`
                      : `TIMEOUT (${r.snippet.answer})`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={startGame} className="pixel-btn text-xs px-6 py-3">
              PLAY AGAIN
            </button>
            <Link href="/games" className="pixel-btn inline-block text-xs px-6 py-3">
              BACK TO GAMES
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ======================== PLAYING ========================
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor =
    timeLeft > 2
      ? "var(--color-accent)"
      : timeLeft > 1
        ? "var(--color-orange)"
        : "var(--color-red)";

  return (
    <div
      className="min-h-screen relative px-4 py-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Timer bar */}
        <div
          className="w-full h-2 mb-6 overflow-hidden"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="h-full transition-none"
            style={{
              width: `${timerPct}%`,
              background: timerColor,
              boxShadow: `0 0 8px ${timerColor}`,
            }}
          />
        </div>

        {/* Stats row */}
        <div className="flex justify-between items-center mb-6">
          <span
            className="pixel-text text-[10px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            ROUND {roundIndex + 1}/{ROUNDS_PER_GAME}
          </span>
          <span
            className="pixel-text text-[10px]"
            style={{ color: "var(--color-accent)" }}
          >
            {score} PTS
          </span>
          <span
            className="pixel-text text-[10px]"
            style={{ color: streak > 0 ? "var(--color-orange)" : "var(--color-text-muted)" }}
          >
            STREAK: {streak}
          </span>
        </div>

        {/* Code snippet */}
        {currentSnippet && (
          <div
            className="p-5 mb-6 overflow-x-auto"
            style={{
              background: "var(--color-bg-secondary)",
              border: "2px solid var(--color-border)",
              borderRadius: 0,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-red)" }}
              />
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-orange)" }}
              />
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-accent)" }}
              />
              <span
                className="pixel-text text-[8px] ml-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                snippet.tsx
              </span>
            </div>
            <pre
              className="mono-text text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: highlight(currentSnippet.code),
              }}
            />
          </div>
        )}

        {/* Feedback overlay */}
        {showingFeedback && lastResult && (
          <div
            className="text-center mb-4 py-3 px-4 pixel-text text-xs"
            style={{
              background: lastResult.correct
                ? "rgba(0,255,136,0.1)"
                : "rgba(239,68,68,0.1)",
              border: `2px solid ${lastResult.correct ? "var(--color-accent)" : "var(--color-red)"}`,
              color: lastResult.correct
                ? "var(--color-accent)"
                : "var(--color-red)",
            }}
          >
            {lastResult.correct
              ? `CORRECT! +${POINTS_PER_CORRECT + (streak - 1) * 10} PTS`
              : lastResult.chosen
                ? `WRONG! IT WAS ${lastResult.snippet.answer.toUpperCase()}`
                : `TIME'S UP! IT WAS ${lastResult.snippet.answer.toUpperCase()}`}
          </div>
        )}

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isChosen = showingFeedback && lastResult?.chosen === opt;
            const isCorrectAnswer =
              showingFeedback && opt === currentSnippet?.answer;
            const isWrongChosen = isChosen && !lastResult?.correct;

            let btnBorder = "var(--color-border)";
            let btnBg = "var(--color-bg-card)";
            let btnColor = "var(--color-text)";

            if (showingFeedback) {
              if (isCorrectAnswer) {
                btnBorder = "var(--color-accent)";
                btnBg = "rgba(0,255,136,0.15)";
                btnColor = "var(--color-accent)";
              } else if (isWrongChosen) {
                btnBorder = "var(--color-red)";
                btnBg = "rgba(239,68,68,0.15)";
                btnColor = "var(--color-red)";
              }
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answeredRef.current}
                className="pixel-text text-xs sm:text-sm py-4 px-3 border-2 transition-all duration-150 cursor-pointer hover:translate-y-[-2px]"
                style={{
                  borderColor: btnBorder,
                  background: btnBg,
                  color: btnColor,
                  boxShadow:
                    isCorrectAnswer && showingFeedback
                      ? "0 0 15px var(--color-accent-glow)"
                      : "none",
                }}
              >
                {opt.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
