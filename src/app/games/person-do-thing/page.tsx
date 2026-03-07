'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── The 34 allowed words ───────────────────────────────────────
const ALLOWED_WORDS = [
  'I', 'you', 'it', 'this', 'that', 'the', 'a',
  'is', 'do', 'go', 'make', 'have', 'want', 'not',
  'big', 'small', 'good', 'bad',
  'up', 'down', 'in', 'out', 'on', 'off',
  'hot', 'cold', 'fast', 'slow', 'old', 'new',
  'thing', 'person', 'place', 'time',
] as const;

// ─── Target words by difficulty ─────────────────────────────────
interface TargetWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const TARGET_WORDS: TargetWord[] = [
  // EASY (60)
  { word: 'Dog', difficulty: 'easy' },
  { word: 'Cat', difficulty: 'easy' },
  { word: 'Car', difficulty: 'easy' },
  { word: 'Rain', difficulty: 'easy' },
  { word: 'Sun', difficulty: 'easy' },
  { word: 'Phone', difficulty: 'easy' },
  { word: 'Pizza', difficulty: 'easy' },
  { word: 'Sleep', difficulty: 'easy' },
  { word: 'Dance', difficulty: 'easy' },
  { word: 'Swimming', difficulty: 'easy' },
  { word: 'Teacher', difficulty: 'easy' },
  { word: 'Baby', difficulty: 'easy' },
  { word: 'Music', difficulty: 'easy' },
  { word: 'Fire', difficulty: 'easy' },
  { word: 'Snow', difficulty: 'easy' },
  { word: 'Book', difficulty: 'easy' },
  { word: 'Hospital', difficulty: 'easy' },
  { word: 'School', difficulty: 'easy' },
  { word: 'Kitchen', difficulty: 'easy' },
  { word: 'Birthday', difficulty: 'easy' },
  { word: 'Morning', difficulty: 'easy' },
  { word: 'Night', difficulty: 'easy' },
  { word: 'Movie', difficulty: 'easy' },
  { word: 'Beach', difficulty: 'easy' },
  { word: 'Running', difficulty: 'easy' },
  { word: 'Eating', difficulty: 'easy' },
  { word: 'Water', difficulty: 'easy' },
  { word: 'Mountain', difficulty: 'easy' },
  { word: 'Garden', difficulty: 'easy' },
  { word: 'Doctor', difficulty: 'easy' },
  { word: 'Crying', difficulty: 'easy' },
  { word: 'Laughing', difficulty: 'easy' },
  { word: 'Singing', difficulty: 'easy' },
  { word: 'Football', difficulty: 'easy' },
  { word: 'Painting', difficulty: 'easy' },
  { word: 'Cooking', difficulty: 'easy' },
  { word: 'Driving', difficulty: 'easy' },
  { word: 'Flying', difficulty: 'easy' },
  { word: 'Shopping', difficulty: 'easy' },
  { word: 'Winter', difficulty: 'easy' },
  { word: 'Summer', difficulty: 'easy' },
  { word: 'Wedding', difficulty: 'easy' },
  { word: 'Fishing', difficulty: 'easy' },
  { word: 'Dentist', difficulty: 'easy' },
  { word: 'Circus', difficulty: 'easy' },
  { word: 'Camping', difficulty: 'easy' },
  { word: 'Bicycle', difficulty: 'easy' },
  { word: 'Airplane', difficulty: 'easy' },
  { word: 'Train', difficulty: 'easy' },
  { word: 'Spider', difficulty: 'easy' },
  { word: 'Ghost', difficulty: 'easy' },
  { word: 'Pirate', difficulty: 'easy' },
  { word: 'Jungle', difficulty: 'easy' },
  { word: 'Robot', difficulty: 'easy' },
  { word: 'Castle', difficulty: 'easy' },
  { word: 'Storm', difficulty: 'easy' },
  { word: 'Farmer', difficulty: 'easy' },
  { word: 'Island', difficulty: 'easy' },
  { word: 'Rocket', difficulty: 'easy' },
  { word: 'Homework', difficulty: 'easy' },

  // MEDIUM (80)
  { word: 'Astronaut', difficulty: 'medium' },
  { word: 'Volcano', difficulty: 'medium' },
  { word: 'Democracy', difficulty: 'medium' },
  { word: 'Photosynthesis', difficulty: 'medium' },
  { word: 'Procrastination', difficulty: 'medium' },
  { word: 'Gravity', difficulty: 'medium' },
  { word: 'Addiction', difficulty: 'medium' },
  { word: 'Evolution', difficulty: 'medium' },
  { word: 'Recycling', difficulty: 'medium' },
  { word: 'Nostalgia', difficulty: 'medium' },
  { word: 'Jealousy', difficulty: 'medium' },
  { word: 'Marathon', difficulty: 'medium' },
  { word: 'Earthquake', difficulty: 'medium' },
  { word: 'Vaccination', difficulty: 'medium' },
  { word: 'Hibernation', difficulty: 'medium' },
  { word: 'Meditation', difficulty: 'medium' },
  { word: 'Telescope', difficulty: 'medium' },
  { word: 'Submarine', difficulty: 'medium' },
  { word: 'Architecture', difficulty: 'medium' },
  { word: 'Bankruptcy', difficulty: 'medium' },
  { word: 'Orchestra', difficulty: 'medium' },
  { word: 'Firefighter', difficulty: 'medium' },
  { word: 'Electricity', difficulty: 'medium' },
  { word: 'Archaeology', difficulty: 'medium' },
  { word: 'Immigration', difficulty: 'medium' },
  { word: 'Perspective', difficulty: 'medium' },
  { word: 'Superstition', difficulty: 'medium' },
  { word: 'Blacksmith', difficulty: 'medium' },
  { word: 'Parachute', difficulty: 'medium' },
  { word: 'Diplomacy', difficulty: 'medium' },
  { word: 'Conspiracy', difficulty: 'medium' },
  { word: 'Ventriloquist', difficulty: 'medium' },
  { word: 'Acupuncture', difficulty: 'medium' },
  { word: 'Deforestation', difficulty: 'medium' },
  { word: 'Hallucination', difficulty: 'medium' },
  { word: 'Sleepwalking', difficulty: 'medium' },
  { word: 'Photography', difficulty: 'medium' },
  { word: 'Pollution', difficulty: 'medium' },
  { word: 'Claustrophobia', difficulty: 'medium' },
  { word: 'Renaissance', difficulty: 'medium' },
  { word: 'Ecosystem', difficulty: 'medium' },
  { word: 'Propaganda', difficulty: 'medium' },
  { word: 'Camouflage', difficulty: 'medium' },
  { word: 'Metabolism', difficulty: 'medium' },
  { word: 'Vegetarian', difficulty: 'medium' },
  { word: 'Adrenaline', difficulty: 'medium' },
  { word: 'Avalanche', difficulty: 'medium' },
  { word: 'Censorship', difficulty: 'medium' },
  { word: 'Chameleon', difficulty: 'medium' },
  { word: 'Contagious', difficulty: 'medium' },
  { word: 'Dictatorship', difficulty: 'medium' },
  { word: 'Endangered', difficulty: 'medium' },
  { word: 'Fundraiser', difficulty: 'medium' },
  { word: 'Hypnosis', difficulty: 'medium' },
  { word: 'Inflation', difficulty: 'medium' },
  { word: 'Kaleidoscope', difficulty: 'medium' },
  { word: 'Labyrinth', difficulty: 'medium' },
  { word: 'Magnetism', difficulty: 'medium' },
  { word: 'Negotiation', difficulty: 'medium' },
  { word: 'Origami', difficulty: 'medium' },
  { word: 'Parasailing', difficulty: 'medium' },
  { word: 'Quarantine', difficulty: 'medium' },
  { word: 'Revolution', difficulty: 'medium' },
  { word: 'Scholarship', difficulty: 'medium' },
  { word: 'Tattooing', difficulty: 'medium' },
  { word: 'Unemployment', difficulty: 'medium' },
  { word: 'Volunteering', difficulty: 'medium' },
  { word: 'Whistleblower', difficulty: 'medium' },
  { word: 'Xenophobia', difficulty: 'medium' },
  { word: 'Yodeling', difficulty: 'medium' },
  { word: 'Zodiac', difficulty: 'medium' },
  { word: 'Amnesia', difficulty: 'medium' },
  { word: 'Bartering', difficulty: 'medium' },
  { word: 'Composting', difficulty: 'medium' },
  { word: 'Debugging', difficulty: 'medium' },
  { word: 'Escapism', difficulty: 'medium' },
  { word: 'Fossilization', difficulty: 'medium' },
  { word: 'Gentrification', difficulty: 'medium' },
  { word: 'Heatstroke', difficulty: 'medium' },
  { word: 'Insomnia', difficulty: 'medium' },

  // HARD (60)
  { word: 'Cryptocurrency', difficulty: 'hard' },
  { word: 'Existentialism', difficulty: 'hard' },
  { word: 'Bioluminescence', difficulty: 'hard' },
  { word: 'Gerrymandering', difficulty: 'hard' },
  { word: 'Neurodivergence', difficulty: 'hard' },
  { word: 'Schadenfreude', difficulty: 'hard' },
  { word: 'Filibuster', difficulty: 'hard' },
  { word: 'Paradox', difficulty: 'hard' },
  { word: 'Bureaucracy', difficulty: 'hard' },
  { word: 'Cognitive Dissonance', difficulty: 'hard' },
  { word: 'Gaslighting', difficulty: 'hard' },
  { word: 'Entropy', difficulty: 'hard' },
  { word: 'Solipsism', difficulty: 'hard' },
  { word: 'Nihilism', difficulty: 'hard' },
  { word: 'Plutocracy', difficulty: 'hard' },
  { word: 'Pseudoscience', difficulty: 'hard' },
  { word: 'Quantum Entanglement', difficulty: 'hard' },
  { word: 'Recidivism', difficulty: 'hard' },
  { word: 'Sycophancy', difficulty: 'hard' },
  { word: 'Totalitarianism', difficulty: 'hard' },
  { word: 'Utilitarianism', difficulty: 'hard' },
  { word: 'Vestigial', difficulty: 'hard' },
  { word: 'Whistleblowing', difficulty: 'hard' },
  { word: 'Xenotransplantation', difficulty: 'hard' },
  { word: 'Zeitgeist', difficulty: 'hard' },
  { word: 'Anthropomorphism', difficulty: 'hard' },
  { word: 'Bioethics', difficulty: 'hard' },
  { word: 'Catharsis', difficulty: 'hard' },
  { word: 'Determinism', difficulty: 'hard' },
  { word: 'Epistemology', difficulty: 'hard' },
  { word: 'Feudalism', difficulty: 'hard' },
  { word: 'Globalization', difficulty: 'hard' },
  { word: 'Hegemony', difficulty: 'hard' },
  { word: 'Imperialism', difficulty: 'hard' },
  { word: 'Juxtaposition', difficulty: 'hard' },
  { word: 'Kleptocracy', difficulty: 'hard' },
  { word: 'Libertarianism', difficulty: 'hard' },
  { word: 'Machiavellianism', difficulty: 'hard' },
  { word: 'Nepotism', difficulty: 'hard' },
  { word: 'Oligarchy', difficulty: 'hard' },
  { word: 'Philanthropy', difficulty: 'hard' },
  { word: 'Quintessence', difficulty: 'hard' },
  { word: 'Relativity', difficulty: 'hard' },
  { word: 'Synesthesia', difficulty: 'hard' },
  { word: 'Transhumanism', difficulty: 'hard' },
  { word: 'Ubiquity', difficulty: 'hard' },
  { word: 'Verisimilitude', difficulty: 'hard' },
  { word: 'Whataboutism', difficulty: 'hard' },
  { word: 'Antidisestablishmentarianism', difficulty: 'hard' },
  { word: 'Cryptocurrency Mining', difficulty: 'hard' },
  { word: 'Dark Matter', difficulty: 'hard' },
  { word: 'Electoral College', difficulty: 'hard' },
  { word: 'False Equivalence', difficulty: 'hard' },
  { word: 'Greenhouse Effect', difficulty: 'hard' },
  { word: 'Herd Immunity', difficulty: 'hard' },
  { word: 'Impostor Syndrome', difficulty: 'hard' },
  { word: 'Jury Nullification', difficulty: 'hard' },
  { word: 'Stockholm Syndrome', difficulty: 'hard' },
  { word: 'Planned Obsolescence', difficulty: 'hard' },
];

// ─── Types ──────────────────────────────────────────────────────
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

type GamePhase =
  | 'setup'           // Player count + difficulty selection
  | 'pass'            // Pass the phone screen
  | 'describe'        // Active player describes
  | 'turn-result'     // Show result after turn
  | 'final-results';  // Game over, show all scores

interface Player {
  name: string;
  score: number;
}

interface TurnResult {
  playerIndex: number;
  word: string;
  guessedCorrectly: boolean;
  timeUsed: number;
  pointsEarned: number;
}

const TURN_DURATION = 60; // seconds
const ROUNDS_PER_PLAYER = 2;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getWordsForDifficulty(difficulty: Difficulty): TargetWord[] {
  if (difficulty === 'mixed') return shuffleArray(TARGET_WORDS);
  return shuffleArray(TARGET_WORDS.filter((w) => w.difficulty === difficulty));
}

function calculatePoints(timeRemaining: number): number {
  // Faster guesses = more points. Max 100, min 10
  return Math.max(10, Math.round(10 + (timeRemaining / TURN_DURATION) * 90));
}

// ─── Component ──────────────────────────────────────────────────
export default function PersonDoThingPage() {
  const [mounted, setMounted] = useState(false);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [wordQueue, setWordQueue] = useState<TargetWord[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);

  // Turn state
  const [currentWord, setCurrentWord] = useState<string>('');
  const [sentence, setSentence] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [turnActive, setTurnActive] = useState(false);
  const [lastTurnResult, setLastTurnResult] = useState<TurnResult | null>(null);
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [skippedWords, setSkippedWords] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer
  useEffect(() => {
    if (turnActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setTurnActive(false);
            handleTimeUp();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnActive]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const result: TurnResult = {
      playerIndex: currentPlayerIndex,
      word: currentWord,
      guessedCorrectly: false,
      timeUsed: TURN_DURATION,
      pointsEarned: 0,
    };
    setTurnResults((prev) => [...prev, result]);
    setLastTurnResult(result);
    setPhase('turn-result');
  }, [currentPlayerIndex, currentWord]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const words = getWordsForDifficulty(diff);
    setWordQueue(words);
    setWordIndex(0);
    setCurrentPlayerIndex(0);
    setCurrentRound(0);
    setTurnResults([]);
    setPhase('pass');
  };

  const startTurn = () => {
    const word = wordQueue[wordIndex];
    if (!word) return;
    setCurrentWord(word.word);
    setSentence([]);
    setTimeLeft(TURN_DURATION);
    setTurnActive(true);
    setSkippedWords([]);
    setPhase('describe');
  };

  const handleCorrectGuess = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTurnActive(false);
    const timeUsed = TURN_DURATION - timeLeft;
    const points = calculatePoints(timeLeft);
    const result: TurnResult = {
      playerIndex: currentPlayerIndex,
      word: currentWord,
      guessedCorrectly: true,
      timeUsed,
      pointsEarned: points,
    };
    setPlayers((prev) =>
      prev.map((p, i) => (i === currentPlayerIndex ? { ...p, score: p.score + points } : p))
    );
    setTurnResults((prev) => [...prev, result]);
    setLastTurnResult(result);
    setScoreAnimation(true);
    setTimeout(() => setScoreAnimation(false), 1500);
    setPhase('turn-result');
  };

  const skipWord = () => {
    if (!turnActive) return;
    setSkippedWords((prev) => [...prev, currentWord]);
    const nextIdx = wordIndex + 1;
    if (nextIdx < wordQueue.length) {
      setWordIndex(nextIdx);
      setCurrentWord(wordQueue[nextIdx].word);
      setSentence([]);
    }
  };

  const nextTurn = () => {
    const nextWordIdx = wordIndex + 1;
    setWordIndex(nextWordIdx);

    const totalTurns = turnResults.length;
    const turnsPerRound = players.length;
    const completedRounds = Math.floor(totalTurns / turnsPerRound);

    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setPhase('pass');
    } else if (completedRounds + 1 < ROUNDS_PER_PLAYER) {
      setCurrentRound(completedRounds + 1);
      setCurrentPlayerIndex(0);
      setPhase('pass');
    } else {
      setPhase('final-results');
    }
  };

  const resetGame = () => {
    setPhase('setup');
    setPlayers([]);
    setPlayerCount(4);
    setTurnResults([]);
    setCurrentPlayerIndex(0);
    setCurrentRound(0);
    setWordIndex(0);
  };

  const addWordToSentence = (word: string) => {
    setSentence((prev) => [...prev, word]);
  };

  const removeWordFromSentence = (index: number) => {
    setSentence((prev) => prev.filter((_, i) => i !== index));
  };

  const getTimerColor = (): string => {
    if (timeLeft > 30) return 'var(--color-accent)';
    if (timeLeft > 15) return 'var(--color-orange)';
    return 'var(--color-red)';
  };

  const getDifficultyColor = (diff: string): string => {
    switch (diff) {
      case 'easy': return 'var(--color-accent)';
      case 'medium': return 'var(--color-orange)';
      case 'hard': return 'var(--color-red)';
      default: return 'var(--color-purple)';
    }
  };

  if (!mounted) return null;

  // ─── Setup Phase: Player Count + Difficulty (Combined) ────────
  if (phase === 'setup') {
    const difficulties: { key: Difficulty; label: string; desc: string; color: string }[] = [
      { key: 'easy', label: 'EASY', desc: 'Common everyday words', color: getDifficultyColor('easy') },
      { key: 'medium', label: 'MEDIUM', desc: 'Bigger concepts & ideas', color: getDifficultyColor('medium') },
      { key: 'hard', label: 'HARD', desc: 'Abstract & complex terms', color: getDifficultyColor('hard') },
      { key: 'mixed', label: 'MIXED', desc: 'All difficulties combined', color: getDifficultyColor('mixed') },
    ];

    const handleStart = (diff: Difficulty) => {
      const generatedPlayers = Array.from({ length: playerCount }, (_, i) => ({
        name: `Player ${i + 1}`,
        score: 0,
      }));
      setPlayers(generatedPlayers);
      startGame(diff);
    };

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          <div className="text-center mb-8">
            <h1
              className="pixel-text text-lg md:text-xl mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              PERSON DO THING
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Describe anything. Use only 34 words.
            </p>
          </div>

          <div
            className="pixel-card rounded-lg p-6 mb-4"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xs mb-4 text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              HOW MANY PLAYERS?
            </h2>

            <div className="flex gap-2 justify-center flex-wrap mb-2">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <button
                  key={n}
                  className="w-11 h-11 rounded-lg text-sm font-bold transition-all"
                  style={{
                    backgroundColor: playerCount === n ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                    border: `2px solid ${playerCount === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                  onClick={() => setPlayerCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              Players will be Player 1, Player 2, Player 3...
            </p>
          </div>

          <div
            className="pixel-card rounded-lg p-6 mb-4"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2
              className="pixel-text text-xs mb-4 text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              PICK DIFFICULTY & START
            </h2>

            <div className="space-y-3">
              {difficulties.map(({ key, label, desc, color }) => (
                <button
                  key={key}
                  onClick={() => handleStart(key)}
                  className="pixel-card rounded-lg p-4 w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="pixel-text text-xs" style={{ color }}>
                        {label}
                      </span>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {desc}
                      </p>
                    </div>
                    <span className="text-2xl" style={{ color }}>&gt;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* How to play */}
          <div
            className="pixel-card rounded-lg p-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-orange)' }}
            >
              HOW TO PLAY
            </h3>
            <ol className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li>1. You get a word to describe to other players</li>
              <li>2. BUT you can only tap from 34 basic words</li>
              <li>3. Others shout their guesses out loud</li>
              <li>4. Tap &quot;GOT IT!&quot; when someone guesses right</li>
              <li>5. Faster guesses = more points</li>
              <li>6. Pass the phone to the next player</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pass the Phone Screen ────────────────────────────────────
  if (phase === 'pass') {
    const currentPlayer = players[currentPlayerIndex];
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-sm w-full">
          <div
            className="pixel-text text-xs mb-1"
            style={{ color: getDifficultyColor(difficulty) }}
          >
            {difficulty.toUpperCase()} MODE
          </div>
          <div
            className="pixel-text text-sm mb-2"
            style={{ color: 'var(--color-orange)' }}
          >
            ROUND {currentRound + 1}/{ROUNDS_PER_PLAYER}
          </div>
          <div
            className="text-6xl mb-6"
            style={{ lineHeight: 1.4 }}
          >
            &#128241;
          </div>
          <h2
            className="pixel-text text-base md:text-lg mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            PASS THE PHONE
          </h2>
          <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Hand the phone to
          </p>
          <div
            className="pixel-card rounded-lg p-4 mb-8 inline-block"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <span
              className="pixel-text text-lg"
              style={{ color: 'var(--color-purple)' }}
            >
              {currentPlayer.name}
            </span>
          </div>
          <p
            className="text-xs mb-8 block"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Only {currentPlayer.name} should look at the screen!
          </p>
          <button
            onClick={startTurn}
            className="pixel-btn text-sm px-8 py-3"
          >
            I&apos;M READY
          </button>
        </div>
      </div>
    );
  }

  // ─── Describe Phase: Active Player's Turn ─────────────────────
  if (phase === 'describe') {
    const timerPercent = (timeLeft / TURN_DURATION) * 100;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        {/* Timer Bar */}
        <div
          className="w-full h-2 shrink-0"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${timerPercent}%`,
              backgroundColor: getTimerColor(),
              boxShadow: `0 0 8px ${getTimerColor()}`,
            }}
          />
        </div>

        {/* Header */}
        <div
          className="px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {players[currentPlayerIndex].name}&apos;s turn
            </span>
            <span
              className="pixel-text text-sm mono-text"
              style={{ color: getTimerColor() }}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4 overflow-hidden">
          {/* Target Word */}
          <div className="text-center mb-3 shrink-0">
            <p
              className="text-xs mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              DESCRIBE THIS:
            </p>
            <h2
              className="pixel-text text-base md:text-lg"
              style={{ color: 'var(--color-accent)' }}
            >
              {currentWord}
            </h2>
          </div>

          {/* Built Sentence Display */}
          <div
            className="rounded-lg p-3 mb-3 min-h-[60px] border shrink-0"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            {sentence.length === 0 ? (
              <p
                className="text-sm text-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Tap words below to build your description...
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sentence.map((word, i) => (
                  <button
                    key={i}
                    onClick={() => removeWordFromSentence(i)}
                    className="px-2 py-1 rounded text-sm transition-all hover:opacity-70 border"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent)',
                    }}
                    title="Tap to remove"
                  >
                    {word}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Word Bank Grid */}
          <div className="flex-1 overflow-y-auto mb-3">
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
              {ALLOWED_WORDS.map((word) => (
                <button
                  key={word}
                  onClick={() => addWordToSentence(word)}
                  className="px-1.5 py-2 rounded text-xs sm:text-sm font-medium transition-all active:scale-95 border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 shrink-0 pb-2">
            <button
              onClick={skipWord}
              className="flex-1 py-3 rounded-lg border text-sm font-semibold transition-all active:scale-95"
              style={{
                borderColor: 'var(--color-orange)',
                color: 'var(--color-orange)',
                backgroundColor: 'transparent',
              }}
            >
              SKIP WORD
            </button>
            <button
              onClick={handleCorrectGuess}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 pixel-btn"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-bg)',
                borderColor: 'var(--color-accent)',
              }}
            >
              GOT IT!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Turn Result ──────────────────────────────────────────────
  if (phase === 'turn-result' && lastTurnResult) {
    const player = players[lastTurnResult.playerIndex];
    const isCorrect = lastTurnResult.guessedCorrectly;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-sm w-full">
          <div
            className="text-6xl mb-4"
            style={{ lineHeight: 1.4 }}
          >
            {isCorrect ? '\u2705' : '\u274C'}
          </div>

          <h2
            className="pixel-text text-base md:text-lg mb-2"
            style={{ color: isCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
          >
            {isCorrect ? 'CORRECT!' : 'TIME\'S UP!'}
          </h2>

          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            The word was
          </p>
          <p
            className="pixel-text text-sm mb-4"
            style={{ color: 'var(--color-purple)' }}
          >
            {lastTurnResult.word}
          </p>

          {isCorrect && (
            <div className={`mb-4 ${scoreAnimation ? 'animate-scale-in' : ''}`}>
              <span
                className="pixel-text text-2xl"
                style={{ color: 'var(--color-accent)' }}
              >
                +{lastTurnResult.pointsEarned}
              </span>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {lastTurnResult.timeUsed}s to guess
              </p>
            </div>
          )}

          {skippedWords.length > 0 && (
            <div className="mb-4">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Skipped: {skippedWords.join(', ')}
              </p>
            </div>
          )}

          <div
            className="pixel-card rounded-lg p-3 mb-6 inline-block"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {player.name}&apos;s total:{' '}
            </span>
            <span
              className="pixel-text text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              {player.score} pts
            </span>
          </div>

          <div className="block">
            <button
              onClick={nextTurn}
              className="pixel-btn text-sm px-8 py-3"
            >
              NEXT TURN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Final Results ────────────────────────────────────────────
  if (phase === 'final-results') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const topScore = sorted[0]?.score || 0;

    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4" style={{ lineHeight: 1.4 }}>
              &#127942;
            </div>
            <h1
              className="pixel-text text-lg md:text-xl mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              GAME OVER
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {ROUNDS_PER_PLAYER} rounds &middot; {difficulty.toUpperCase()} mode
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {sorted.map((player, i) => {
              const isWinner = player.score === topScore && topScore > 0;
              return (
                <div
                  key={player.name}
                  className="pixel-card rounded-lg p-4 flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: isWinner ? 'var(--color-accent)' : undefined,
                    borderWidth: isWinner ? '2px' : undefined,
                    borderStyle: isWinner ? 'solid' : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="pixel-text text-sm w-8"
                      style={{
                        color:
                          i === 0
                            ? 'var(--color-orange)'
                            : i === 1
                              ? 'var(--color-text-secondary)'
                              : i === 2
                                ? 'var(--color-orange)'
                                : 'var(--color-text-muted)',
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span className="text-sm">{player.name}</span>
                    {isWinner && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{
                        backgroundColor: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                      }}>
                        WINNER
                      </span>
                    )}
                  </div>
                  <span
                    className="pixel-text text-sm mono-text"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Turn History */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              TURN HISTORY
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {turnResults.map((result, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-1 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {players[result.playerIndex]?.name}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {result.word}
                  </span>
                  <span
                    style={{
                      color: result.guessedCorrectly
                        ? 'var(--color-accent)'
                        : 'var(--color-red)',
                    }}
                  >
                    {result.guessedCorrectly ? `+${result.pointsEarned}` : 'MISS'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={resetGame} className="pixel-btn text-sm px-6">
              NEW GAME
            </button>
            <Link
              href="/games"
              className="pixel-btn text-sm px-6 inline-flex items-center"
              style={{
                borderColor: 'var(--color-text-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ARCADE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
