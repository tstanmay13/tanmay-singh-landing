'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import GamePlayCounter from '@/components/GamePlayCounter';

/* ================================================================
   TYPES
   ================================================================ */

interface Player {
  id: number;
  name: string;
  reputation: number;
  avatar: string;
  badges: string[];
}

interface FactPrompt {
  text: string;
  blank: string;
  answer: string;
  category: FactCategory;
}

type FactCategory =
  | 'history'
  | 'language'
  | 'hardware'
  | 'internet'
  | 'bugs'
  | 'culture'
  | 'stats';

interface SubmittedAnswer {
  playerId: number;
  text: string;
  isReal: boolean;
  votedBy: number[];
}

type GamePhase =
  | 'setup'
  | 'pass-phone'
  | 'writing'
  | 'vote-pass'
  | 'voting'
  | 'reveal'
  | 'round-summary'
  | 'final-results';

type GameMode = 'pass' | 'room';

/* ================================================================
   FACT PROMPT DATABASE (105 prompts)
   ================================================================ */

const FACT_PROMPTS: FactPrompt[] = [
  // ── Programming History (20) ──
  { text: 'JavaScript was created in just ___ days', blank: '___', answer: '10', category: 'history' },
  { text: 'The first computer bug was literally a ___ found in a relay', blank: '___', answer: 'moth', category: 'history' },
  { text: 'Git was created because ___', blank: '___', answer: 'Linus Torvalds hated every other VCS', category: 'history' },
  { text: 'Python is named after ___', blank: '___', answer: 'Monty Python', category: 'language' },
  { text: 'The first programmer in history was ___', blank: '___', answer: 'Ada Lovelace', category: 'history' },
  { text: 'Java was originally called ___', blank: '___', answer: 'Oak', category: 'language' },
  { text: 'The first computer virus was created in ___', blank: '___', answer: '1986', category: 'history' },
  { text: 'Before GitHub, Linus Torvalds managed Linux patches via ___', blank: '___', answer: 'email and tarballs', category: 'history' },
  { text: 'The first webcam was invented to monitor ___', blank: '___', answer: 'a coffee pot', category: 'history' },
  { text: 'COBOL was designed by a team led by ___', blank: '___', answer: 'Grace Hopper', category: 'history' },
  { text: 'The original name for Windows was ___', blank: '___', answer: 'Interface Manager', category: 'history' },
  { text: 'C++ was originally called ___', blank: '___', answer: 'C with Classes', category: 'language' },
  { text: 'The first email ever sent said ___', blank: '___', answer: 'QWERTYUIOP', category: 'history' },
  { text: 'FORTRAN stands for ___', blank: '___', answer: 'Formula Translation', category: 'language' },
  { text: 'The first hard drive (1956) weighed ___', blank: '___', answer: 'over a ton', category: 'hardware' },
  { text: 'Alan Turing\'s test for AI was inspired by ___', blank: '___', answer: 'a party game called the Imitation Game', category: 'history' },
  { text: 'The Bluetooth symbol is actually ___', blank: '___', answer: 'Viking runes for H and B', category: 'hardware' },
  { text: 'The first computer to beat a chess champion was ___', blank: '___', answer: 'Deep Blue', category: 'history' },
  { text: 'Linux\'s mascot Tux was chosen because Linus Torvalds ___', blank: '___', answer: 'was bitten by a penguin at a zoo', category: 'culture' },
  { text: 'The @ symbol was chosen for email because ___', blank: '___', answer: 'it was the least used key on the keyboard', category: 'history' },

  // ── Languages & Frameworks (15) ──
  { text: 'Ruby\'s creator chose the name because ___', blank: '___', answer: 'it was his friend\'s birthstone', category: 'language' },
  { text: 'PHP originally stood for ___', blank: '___', answer: 'Personal Home Page', category: 'language' },
  { text: 'Rust is named after ___', blank: '___', answer: 'a type of fungus', category: 'language' },
  { text: 'The Go gopher mascot was designed by ___', blank: '___', answer: 'Renee French', category: 'language' },
  { text: 'JavaScript has ___ reserved keywords', blank: '___', answer: '64', category: 'language' },
  { text: 'TypeScript was created at ___ in 2012', blank: '___', answer: 'Microsoft', category: 'language' },
  { text: 'Kotlin is named after ___', blank: '___', answer: 'an island near St. Petersburg', category: 'language' },
  { text: 'Swift was developed in secret for ___', blank: '___', answer: 'about 4 years', category: 'language' },
  { text: 'The creator of Node.js later said he regretted ___', blank: '___', answer: 'not using promises from the start', category: 'language' },
  { text: 'Perl\'s motto is ___', blank: '___', answer: 'There is more than one way to do it', category: 'language' },
  { text: 'The language Brainfuck has only ___ commands', blank: '___', answer: '8', category: 'language' },
  { text: 'Haskell is named after ___', blank: '___', answer: 'logician Haskell Curry', category: 'language' },
  { text: 'The C language was developed at ___', blank: '___', answer: 'Bell Labs', category: 'language' },
  { text: 'SQL was originally called ___', blank: '___', answer: 'SEQUEL', category: 'language' },
  { text: 'Scala combines ___ programming paradigms', blank: '___', answer: 'object-oriented and functional', category: 'language' },

  // ── Hardware & Tech (15) ──
  { text: 'The first computer mouse was made of ___', blank: '___', answer: 'wood', category: 'hardware' },
  { text: 'NASA\'s Apollo 11 computer had ___ KB of RAM', blank: '___', answer: '4', category: 'hardware' },
  { text: 'A single Google search uses enough energy to power a ___ for ___', blank: '___', answer: '60W light bulb for 17 seconds', category: 'hardware' },
  { text: 'The first 1GB hard drive cost ___', blank: '___', answer: 'about $40,000', category: 'hardware' },
  { text: 'The QWERTY keyboard layout was designed to ___', blank: '___', answer: 'prevent typewriter jams by separating common pairs', category: 'hardware' },
  { text: 'The first microprocessor (Intel 4004) had ___ transistors', blank: '___', answer: '2,300', category: 'hardware' },
  { text: 'A modern GPU has more transistors than ___', blank: '___', answer: 'the number of stars visible to the naked eye', category: 'hardware' },
  { text: 'The first iPhone had ___ MB of RAM', blank: '___', answer: '128', category: 'hardware' },
  { text: 'The original Game Boy had a CPU speed of ___', blank: '___', answer: '4.19 MHz', category: 'hardware' },
  { text: 'USB stands for ___', blank: '___', answer: 'Universal Serial Bus', category: 'hardware' },
  { text: 'The first laptop ever made weighed ___', blank: '___', answer: '24 pounds', category: 'hardware' },
  { text: 'A floppy disk could hold ___', blank: '___', answer: '1.44 MB', category: 'hardware' },
  { text: 'The world\'s first transistor was made of ___', blank: '___', answer: 'germanium', category: 'hardware' },
  { text: 'The Amazon Kindle was named after ___', blank: '___', answer: 'the idea of kindling a fire (starting knowledge)', category: 'hardware' },
  { text: 'The most expensive computer ever built cost ___', blank: '___', answer: 'over $1 billion (the SAGE system)', category: 'hardware' },

  // ── Internet & Web (20) ──
  { text: 'The first domain ever registered was ___', blank: '___', answer: 'symbolics.com', category: 'internet' },
  { text: 'The HTTP 418 status code means ___', blank: '___', answer: 'I\'m a teapot', category: 'internet' },
  { text: 'The first YouTube video was about ___', blank: '___', answer: 'elephants at the San Diego Zoo', category: 'internet' },
  { text: 'The first item sold on eBay was ___', blank: '___', answer: 'a broken laser pointer', category: 'internet' },
  { text: 'Google\'s original name was ___', blank: '___', answer: 'Backrub', category: 'internet' },
  { text: 'Amazon was almost named ___', blank: '___', answer: 'Cadabra', category: 'internet' },
  { text: 'The first tweet ever sent said ___', blank: '___', answer: 'just setting up my twttr', category: 'internet' },
  { text: 'The first website ever created was about ___', blank: '___', answer: 'the World Wide Web project itself', category: 'internet' },
  { text: 'WiFi doesn\'t actually stand for ___', blank: '___', answer: 'anything - it\'s a made-up brand name', category: 'internet' },
  { text: 'The total size of the internet is estimated at ___', blank: '___', answer: 'about 120 zettabytes', category: 'internet' },
  { text: 'The first banner ad on the internet was for ___', blank: '___', answer: 'AT&T', category: 'internet' },
  { text: 'The first emoji was created in ___ by ___', blank: '___', answer: '1999 by Shigetaka Kurita', category: 'internet' },
  { text: 'The most visited website in 1999 was ___', blank: '___', answer: 'AOL', category: 'internet' },
  { text: 'Tim Berners-Lee invented the web while working at ___', blank: '___', answer: 'CERN', category: 'internet' },
  { text: 'The term "surfing the internet" was coined by ___', blank: '___', answer: 'a librarian named Jean Armour Polly', category: 'internet' },
  { text: 'HTTP was first documented in version ___', blank: '___', answer: '0.9', category: 'internet' },
  { text: 'The first spam email was sent to promote ___', blank: '___', answer: 'a DEC computer presentation', category: 'internet' },
  { text: 'Netflix originally mailed ___', blank: '___', answer: 'DVDs', category: 'internet' },
  { text: 'The first thing ever purchased online was ___', blank: '___', answer: 'a Sting CD', category: 'internet' },
  { text: 'The world\'s first search engine was called ___', blank: '___', answer: 'Archie', category: 'internet' },

  // ── Bugs & Disasters (10) ──
  { text: 'The Y2K bug cost an estimated ___ to fix worldwide', blank: '___', answer: 'over $300 billion', category: 'bugs' },
  { text: 'A single misplaced ___ in Mariner 1\'s code destroyed the rocket', blank: '___', answer: 'hyphen', category: 'bugs' },
  { text: 'The Therac-25 radiation machine bug caused ___ due to a race condition', blank: '___', answer: 'massive radiation overdoses killing patients', category: 'bugs' },
  { text: 'Knight Capital lost ___ in 45 minutes due to a software bug', blank: '___', answer: '$440 million', category: 'bugs' },
  { text: 'The Ariane 5 rocket exploded because of ___', blank: '___', answer: 'a 64-bit to 16-bit integer overflow', category: 'bugs' },
  { text: 'The Northeast blackout of 2003 was partly caused by ___', blank: '___', answer: 'a software bug in the alarm system', category: 'bugs' },
  { text: 'A Boeing 787 had to be rebooted every ___ days or it would crash', blank: '___', answer: '248', category: 'bugs' },
  { text: 'Gangnam Style broke YouTube because the view counter was ___', blank: '___', answer: 'a 32-bit integer (max 2.1 billion)', category: 'bugs' },
  { text: 'The Morris Worm of 1988 infected about ___% of the internet', blank: '___', answer: '10', category: 'bugs' },
  { text: 'A Toyota recall for unintended acceleration was traced to ___', blank: '___', answer: 'spaghetti code with 10,000+ global variables', category: 'bugs' },

  // ── Culture & Stats (25) ──
  { text: 'The average developer mass-produces ___ bugs per 1000 lines of code', blank: '___', answer: '15 to 50', category: 'stats' },
  { text: 'Stack Overflow was founded in ___', blank: '___', answer: '2008', category: 'culture' },
  { text: 'The most popular programming language in 2024 is ___', blank: '___', answer: 'Python', category: 'stats' },
  { text: 'GitHub\'s Octocat mascot is actually named ___', blank: '___', answer: 'Mona', category: 'culture' },
  { text: 'The number of programming languages in existence is over ___', blank: '___', answer: '700', category: 'stats' },
  { text: 'The most upvoted Stack Overflow question is about ___', blank: '___', answer: 'undoing the most recent local commits in Git', category: 'culture' },
  { text: '"Lorem ipsum" placeholder text dates back to ___', blank: '___', answer: '45 BC (Cicero)', category: 'culture' },
  { text: 'The average salary for a senior developer in the US is about ___', blank: '___', answer: '$140,000', category: 'stats' },
  { text: 'The first open-source license was created by ___', blank: '___', answer: 'Richard Stallman (GNU GPL in 1989)', category: 'culture' },
  { text: 'The iconic "404 Not Found" error code was named after ___', blank: '___', answer: 'a room at CERN where the original web server was stored', category: 'internet' },
  { text: 'The most common password in 2024 is still ___', blank: '___', answer: '123456', category: 'stats' },
  { text: 'The emoji movie was released in ___ and scored ___% on Rotten Tomatoes', blank: '___', answer: '2017 and 6%', category: 'culture' },
  { text: 'The term "bug" in computing predates the moth incident by ___', blank: '___', answer: 'about 70 years (Thomas Edison used it in 1878)', category: 'history' },
  { text: 'The first video game ever created was ___', blank: '___', answer: 'Tennis for Two (1958)', category: 'culture' },
  { text: 'The concept of "the cloud" was first described in ___', blank: '___', answer: '1996 by Compaq', category: 'culture' },
  { text: 'The world record for fastest typing speed is ___ WPM', blank: '___', answer: '216', category: 'stats' },
  { text: 'The most expensive domain name ever sold was ___ for ___', blank: '___', answer: 'cars.com for $872 million', category: 'internet' },
  { text: 'The first computer science PhD was awarded in ___', blank: '___', answer: '1965', category: 'history' },
  { text: 'The average person spends ___ years of their life online', blank: '___', answer: 'about 7', category: 'stats' },
  { text: 'The world sends approximately ___ emails per day', blank: '___', answer: '333 billion', category: 'stats' },
  { text: 'There are approximately ___ websites on the internet', blank: '___', answer: '1.9 billion', category: 'stats' },
  { text: 'The first computer game Easter egg was hidden in ___', blank: '___', answer: 'Adventure for Atari 2600 (1980)', category: 'culture' },
  { text: 'The most lines of code in a single project is ___', blank: '___', answer: 'Google (over 2 billion lines)', category: 'stats' },
  { text: 'The creator of Python released it on ___ (a holiday)', blank: '___', answer: 'February 20, 1991 (not a holiday - it was a Wednesday)', category: 'language' },
  { text: 'Developers spend about ___% of their time reading code vs. writing it', blank: '___', answer: '70', category: 'stats' },
];

/* ================================================================
   CONSTANTS & HELPERS
   ================================================================ */

const AVATARS = [
  '\u{1F47E}', '\u{1F916}', '\u{1F47B}', '\u{1F435}', '\u{1F431}',
  '\u{1F436}', '\u{1F98A}', '\u{1F43B}',
];

const CATEGORY_LABELS: Record<FactCategory, string> = {
  history: 'TECH HISTORY',
  language: 'LANGUAGES',
  hardware: 'HARDWARE',
  internet: 'INTERNET',
  bugs: 'BUGS & DISASTERS',
  culture: 'DEV CULTURE',
  stats: 'WILD STATS',
};

const CATEGORY_COLORS: Record<FactCategory, string> = {
  history: 'var(--color-orange)',
  language: 'var(--color-accent)',
  hardware: 'var(--color-cyan)',
  internet: 'var(--color-blue)',
  bugs: 'var(--color-red)',
  culture: 'var(--color-purple)',
  stats: 'var(--color-pink)',
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;
const MAX_ANSWER_LENGTH = 60;
const TOTAL_ROUNDS = 5;

const BADGE_DEFS: Record<string, { label: string; icon: string; desc: string }> = {
  truth_seeker: { label: 'Truth Seeker', icon: '\u{1F50D}', desc: 'Found 3+ real answers' },
  master_bluffer: { label: 'Master Bluffer', icon: '\u{1F3AD}', desc: 'Fooled 5+ players total' },
  fooled_everyone: { label: 'Fooled Everyone', icon: '\u{1F451}', desc: 'Every player voted for your fake' },
  never_fooled: { label: 'Never Fooled', icon: '\u{1F9E0}', desc: 'Never voted for a fake answer' },
  hot_streak: { label: 'Hot Streak', icon: '\u{1F525}', desc: 'Found real answer 3 rounds in a row' },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function StackOverflowPage() {
  const [mounted, setMounted] = useState(false);

  // Setup
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(4);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPrompt, setCurrentPrompt] = useState<FactPrompt | null>(null);
  const [usedPrompts, setUsedPrompts] = useState<Set<number>>(new Set());

  // Writing
  const [currentWritingPlayer, setCurrentWritingPlayer] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);

  // Voting
  const [currentVotingPlayer, setCurrentVotingPlayer] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<SubmittedAnswer[]>([]);

  // Reveal
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [showAccepted, setShowAccepted] = useState(false);

  // Tracking for badges
  const [correctStreaks, setCorrectStreaks] = useState<Record<number, number>>({});
  const [totalCorrect, setTotalCorrect] = useState<Record<number, number>>({});
  const [totalFooled, setTotalFooled] = useState<Record<number, number>>({});
  const [everFooled, setEverFooled] = useState<Set<number>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if ((phase === 'writing' || phase === 'setup') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentWritingPlayer]);

  /* ── Reveal animation ── */
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (revealedIndex < shuffledAnswers.length - 1) {
      const timer = setTimeout(() => {
        setRevealedIndex((i) => i + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (revealedIndex === shuffledAnswers.length - 1 && !showAccepted) {
      const timer = setTimeout(() => {
        setShowAccepted(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, revealedIndex, shuffledAnswers.length, showAccepted]);

  /* ================================================================
     GAME LOGIC
     ================================================================ */

  const pickPrompt = useCallback((): FactPrompt => {
    const available = FACT_PROMPTS
      .map((p, i) => ({ prompt: p, index: i }))
      .filter(({ index }) => !usedPrompts.has(index));
    const pick = available[Math.floor(Math.random() * available.length)];
    setUsedPrompts((prev) => new Set(prev).add(pick.index));
    return pick.prompt;
  }, [usedPrompts]);

  const startGame = useCallback(() => {
    if (players.length < MIN_PLAYERS) return;
    const prompt = pickPrompt();
    setCurrentPrompt(prompt);
    setCurrentRound(1);
    setSubmittedAnswers([]);
    setCurrentWritingPlayer(0);
    setAnswerInput('');
    setCorrectStreaks({});
    setTotalCorrect({});
    setTotalFooled({});
    setEverFooled(new Set());

    if (gameMode === 'pass') {
      setPhase('pass-phone');
    } else {
      setPhase('writing');
    }
  }, [players, pickPrompt, gameMode]);

  const startWritingPhase = () => {
    setPhase('writing');
  };

  const handleSubmitAndPrepare = useCallback(() => {
    const text = answerInput.trim();
    if (!text) return;

    const player = players[currentWritingPlayer];
    const newAnswers = [
      ...submittedAnswers,
      { playerId: player.id, text, isReal: false, votedBy: [] },
    ];
    setSubmittedAnswers(newAnswers);
    setAnswerInput('');

    if (currentWritingPlayer < players.length - 1) {
      setCurrentWritingPlayer((c) => c + 1);
      if (gameMode === 'pass') {
        setPhase('pass-phone');
      }
    } else {
      // All submitted; add real answer and shuffle
      if (!currentPrompt) return;
      const realAnswer: SubmittedAnswer = {
        playerId: -1,
        text: currentPrompt.answer,
        isReal: true,
        votedBy: [],
      };
      const allShuffled = shuffle([...newAnswers, realAnswer]);
      setShuffledAnswers(allShuffled);
      setSubmittedAnswers(newAnswers);
      setCurrentVotingPlayer(0);

      if (gameMode === 'pass') {
        setPhase('vote-pass');
      } else {
        setPhase('voting');
      }
    }
  }, [answerInput, currentWritingPlayer, players, submittedAnswers, currentPrompt, gameMode]);

  const startVotingPhase = () => {
    setPhase('voting');
  };

  const castVote = useCallback(
    (answerIndex: number) => {
      const voter = players[currentVotingPlayer];
      const target = shuffledAnswers[answerIndex];

      // Can't vote for your own fake
      if (target.playerId === voter.id) return;

      setShuffledAnswers((prev) =>
        prev.map((a, i) =>
          i === answerIndex ? { ...a, votedBy: [...a.votedBy, voter.id] } : a
        )
      );

      if (currentVotingPlayer < players.length - 1) {
        setCurrentVotingPlayer((c) => c + 1);
        if (gameMode === 'pass') {
          setPhase('vote-pass');
        }
      } else {
        // All voted, go to reveal
        setRevealedIndex(-1);
        setShowAccepted(false);
        setPhase('reveal');
      }
    },
    [currentVotingPlayer, players, shuffledAnswers, gameMode]
  );

  const computeRoundResults = useCallback(() => {
    // Score: 1pt for guessing real, 1pt for each player fooled by your fake
    const newPlayers = [...players];
    const newCorrectStreaks = { ...correctStreaks };
    const newTotalCorrect = { ...totalCorrect };
    const newTotalFooled = { ...totalFooled };
    const newEverFooled = new Set(everFooled);

    shuffledAnswers.forEach((answer) => {
      if (answer.isReal) {
        // Players who found the truth get 1 rep
        answer.votedBy.forEach((voterId) => {
          const p = newPlayers.find((pl) => pl.id === voterId);
          if (p) {
            p.reputation += 1;
            newCorrectStreaks[voterId] = (newCorrectStreaks[voterId] || 0) + 1;
            newTotalCorrect[voterId] = (newTotalCorrect[voterId] || 0) + 1;
          }
        });
        // Players who didn't vote for real answer break their streak
        players.forEach((p) => {
          if (!answer.votedBy.includes(p.id)) {
            newCorrectStreaks[p.id] = 0;
            newEverFooled.add(p.id);
          }
        });
      } else {
        // Fake answer: author gets 1 rep per player fooled
        const author = newPlayers.find((p) => p.id === answer.playerId);
        if (author) {
          const fooledCount = answer.votedBy.length;
          author.reputation += fooledCount;
          newTotalFooled[author.id] = (newTotalFooled[author.id] || 0) + fooledCount;
        }
      }
    });

    // Check for "fooled everyone" badge this round
    shuffledAnswers.forEach((answer) => {
      if (!answer.isReal && answer.votedBy.length === players.length - 1) {
        const author = newPlayers.find((p) => p.id === answer.playerId);
        if (author && !author.badges.includes('fooled_everyone')) {
          author.badges.push('fooled_everyone');
        }
      }
    });

    setPlayers(newPlayers);
    setCorrectStreaks(newCorrectStreaks);
    setTotalCorrect(newTotalCorrect);
    setTotalFooled(newTotalFooled);
    setEverFooled(newEverFooled);
    setPhase('round-summary');
  }, [players, shuffledAnswers, correctStreaks, totalCorrect, totalFooled, everFooled]);

  const advanceRound = useCallback(() => {
    if (currentRound >= TOTAL_ROUNDS) {
      // Compute final badges
      const finalPlayers = [...players];
      finalPlayers.forEach((p) => {
        if ((totalCorrect[p.id] || 0) >= 3 && !p.badges.includes('truth_seeker')) {
          p.badges.push('truth_seeker');
        }
        if ((totalFooled[p.id] || 0) >= 5 && !p.badges.includes('master_bluffer')) {
          p.badges.push('master_bluffer');
        }
        if (!everFooled.has(p.id) && !p.badges.includes('never_fooled')) {
          p.badges.push('never_fooled');
        }
        if ((correctStreaks[p.id] || 0) >= 3 && !p.badges.includes('hot_streak')) {
          p.badges.push('hot_streak');
        }
      });
      setPlayers(finalPlayers);
      setPhase('final-results');
      return;
    }

    const prompt = pickPrompt();
    setCurrentPrompt(prompt);
    setCurrentRound((r) => r + 1);
    setSubmittedAnswers([]);
    setCurrentWritingPlayer(0);
    setAnswerInput('');
    setShuffledAnswers([]);
    setRevealedIndex(-1);
    setShowAccepted(false);

    if (gameMode === 'pass') {
      setPhase('pass-phone');
    } else {
      setPhase('writing');
    }
  }, [currentRound, pickPrompt, gameMode, players, totalCorrect, totalFooled, everFooled, correctStreaks]);

  const resetGame = () => {
    setPhase('setup');
    setGameMode(null);
    setPlayers([]);
    setPlayerCount(4);
    setCurrentRound(1);
    setCurrentPrompt(null);
    setUsedPrompts(new Set());
    setSubmittedAnswers([]);
    setShuffledAnswers([]);
    setCurrentWritingPlayer(0);
    setCurrentVotingPlayer(0);
    setAnswerInput('');
    setRevealedIndex(-1);
    setShowAccepted(false);
    setCorrectStreaks({});
    setTotalCorrect({});
    setTotalFooled({});
    setEverFooled(new Set());
  };

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

  if (!mounted) return null;

  const currentWriter = players[currentWritingPlayer];
  const currentVoter = players[currentVotingPlayer];

  const sortedPlayers = [...players].sort((a, b) => b.reputation - a.reputation);

  /* ── SETUP ── */
  if (phase === 'setup') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/games"
              className="pixel-text text-xs hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              &larr; BACK
            </Link>
            <GamePlayCounter slug="stack-overflow" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1
              className="pixel-text text-lg md:text-2xl mb-2"
              style={{ color: 'var(--color-orange)' }}
            >
              STACK OVERFLOW
            </h1>
            <p
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Real tech facts vs. convincing lies
            </p>
          </div>

          {/* Mode selection */}
          {!gameMode && (
            <div className="space-y-4 mb-8">
              <p
                className="pixel-text text-xs text-center mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                HOW ARE YOU PLAYING?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setGameMode('pass')}
                  className="pixel-border p-6 text-center transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-orange)',
                  }}
                >
                  <div className="text-3xl mb-2">{'\u{1F4F1}'}</div>
                  <div className="pixel-text text-xs mb-1" style={{ color: 'var(--color-orange)' }}>
                    PASS THE PHONE
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    One device, pass it around
                  </div>
                </button>
                <button
                  onClick={() => setGameMode('room')}
                  className="pixel-border p-6 text-center transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-purple)',
                  }}
                >
                  <div className="text-3xl mb-2">{'\u{1F4BB}'}</div>
                  <div className="pixel-text text-xs mb-1" style={{ color: 'var(--color-purple)' }}>
                    SAME SCREEN
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Everyone sees the same screen
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Player count + start */}
          {gameMode && (
            <>
              <div className="mb-6">
                <p
                  className="pixel-text text-xs mb-3 text-center"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  HOW MANY PLAYERS?
                </p>
                <div className="flex gap-2 justify-center flex-wrap mb-3">
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                    <button
                      key={n}
                      className="w-12 h-12 rounded-lg text-sm font-bold transition-all"
                      style={{
                        backgroundColor: playerCount === n ? 'var(--color-orange)' : 'var(--color-surface)',
                        color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                        border: `2px solid ${playerCount === n ? 'var(--color-orange)' : 'var(--color-border)'}`,
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

              {/* Start */}
              <button
                onClick={() => {
                  const generated = Array.from({ length: playerCount }, (_, i) => ({
                    id: i,
                    name: `Player ${i + 1}`,
                    reputation: 0,
                    avatar: AVATARS[i % AVATARS.length],
                    badges: [] as string[],
                  }));
                  setPlayers(generated);
                  const prompt = pickPrompt();
                  setCurrentPrompt(prompt);
                  setCurrentRound(1);
                  setSubmittedAnswers([]);
                  setCurrentWritingPlayer(0);
                  setAnswerInput('');
                  setCorrectStreaks({});
                  setTotalCorrect({});
                  setTotalFooled({});
                  setEverFooled(new Set());
                  if (gameMode === 'pass') {
                    setPhase('pass-phone');
                  } else {
                    setPhase('writing');
                  }
                }}
                className="w-full py-3 pixel-btn pixel-text text-sm transition-all"
                style={{
                  background: 'var(--color-orange)',
                  color: 'var(--color-bg)',
                  cursor: 'pointer',
                }}
              >
                START GAME
              </button>

              <button
                onClick={() => {
                  setGameMode(null);
                }}
                className="w-full mt-3 py-2 text-xs hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                &larr; Change mode
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── PASS THE PHONE SCREEN ── */
  if (phase === 'pass-phone') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">{currentWriter?.avatar}</div>
          <p
            className="pixel-text text-lg mb-2"
            style={{ color: 'var(--color-orange)' }}
          >
            {currentWriter?.name}
          </p>
          <p
            className="pixel-text text-xs mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            IT&apos;S YOUR TURN TO WRITE A FAKE ANSWER
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Make sure only {currentWriter?.name} can see the screen!
          </p>
          <button
            onClick={startWritingPhase}
            className="px-8 py-3 pixel-btn pixel-text text-sm"
            style={{
              background: 'var(--color-orange)',
              color: 'var(--color-bg)',
            }}
          >
            I&apos;M READY
          </button>
        </div>
      </div>
    );
  }

  /* ── WRITING PHASE ── */
  if (phase === 'writing') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Round indicator */}
          <div className="flex items-center justify-between mb-6">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ROUND {currentRound}/{TOTAL_ROUNDS}
            </span>
            {currentPrompt && (
              <span
                className="pixel-text text-xs px-2 py-1"
                style={{
                  color: CATEGORY_COLORS[currentPrompt.category],
                  border: `1px solid ${CATEGORY_COLORS[currentPrompt.category]}`,
                }}
              >
                {CATEGORY_LABELS[currentPrompt.category]}
              </span>
            )}
          </div>

          {/* The prompt */}
          <div
            className="pixel-border p-6 mb-8 text-center"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-orange)',
            }}
          >
            <p className="text-sm md:text-base leading-relaxed">
              {currentPrompt?.text.split('___').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span
                      className="pixel-text inline-block mx-1 px-2 py-0.5"
                      style={{
                        background: 'var(--color-orange)',
                        color: 'var(--color-bg)',
                      }}
                    >
                      ???
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>

          {/* Current writer */}
          {gameMode === 'pass' && (
            <div className="text-center mb-4">
              <span className="text-2xl">{currentWriter?.avatar}</span>
              <span
                className="pixel-text text-xs ml-2"
                style={{ color: 'var(--color-accent)' }}
              >
                {currentWriter?.name}&apos;s TURN
              </span>
            </div>
          )}

          {gameMode === 'room' && (
            <div className="text-center mb-4">
              <p className="pixel-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {currentWriter?.avatar} {currentWriter?.name} - TYPE YOUR FAKE ANSWER
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                (everyone else look away!)
              </p>
            </div>
          )}

          {/* Answer input */}
          <div className="space-y-3">
            <p
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              WRITE A CONVINCING FAKE ANSWER:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitAndPrepare();
              }}
              placeholder="Type something believable..."
              maxLength={MAX_ANSWER_LENGTH}
              className="w-full px-4 py-3 pixel-border text-sm"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)',
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {answerInput.length}/{MAX_ANSWER_LENGTH}
              </span>
              <button
                onClick={handleSubmitAndPrepare}
                disabled={!answerInput.trim()}
                className="px-6 py-2 pixel-btn pixel-text text-xs"
                style={{
                  background: answerInput.trim()
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-card)',
                  color: answerInput.trim()
                    ? 'var(--color-bg)'
                    : 'var(--color-text-muted)',
                  cursor: answerInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                SUBMIT
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {players.map((p, i) => (
              <div
                key={p.id}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  background:
                    i < currentWritingPlayer
                      ? 'var(--color-accent)'
                      : i === currentWritingPlayer
                      ? 'var(--color-orange)'
                      : 'var(--color-border)',
                }}
                title={p.name}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── VOTE PASS SCREEN ── */
  if (phase === 'vote-pass') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">{currentVoter?.avatar}</div>
          <p
            className="pixel-text text-lg mb-2"
            style={{ color: 'var(--color-blue)' }}
          >
            {currentVoter?.name}
          </p>
          <p
            className="pixel-text text-xs mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            TIME TO VOTE FOR THE REAL ANSWER
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Make sure only {currentVoter?.name} can see the screen!
          </p>
          <button
            onClick={startVotingPhase}
            className="px-8 py-3 pixel-btn pixel-text text-sm"
            style={{
              background: 'var(--color-blue)',
              color: 'var(--color-bg)',
            }}
          >
            I&apos;M READY
          </button>
        </div>
      </div>
    );
  }

  /* ── VOTING PHASE ── */
  if (phase === 'voting') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ROUND {currentRound}/{TOTAL_ROUNDS}
            </span>
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-blue)' }}
            >
              {currentVoter?.avatar} {currentVoter?.name} VOTING
            </span>
          </div>

          {/* Prompt reminder */}
          <div
            className="pixel-border p-4 mb-6 text-center"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {currentPrompt?.text}
            </p>
          </div>

          <p
            className="pixel-text text-xs text-center mb-6"
            style={{ color: 'var(--color-blue)' }}
          >
            WHICH ANSWER IS REAL? TAP TO VOTE
          </p>

          {/* Answer cards - Stack Overflow style */}
          <div className="space-y-3">
            {shuffledAnswers.map((answer, i) => {
              const isOwnAnswer = answer.playerId === currentVoter?.id;
              return (
                <button
                  key={i}
                  onClick={() => !isOwnAnswer && castVote(i)}
                  disabled={isOwnAnswer}
                  className="w-full text-left pixel-border p-4 transition-all"
                  style={{
                    background: isOwnAnswer
                      ? 'var(--color-bg-secondary)'
                      : 'var(--color-bg-card)',
                    borderColor: isOwnAnswer
                      ? 'var(--color-border)'
                      : 'var(--color-border-hover)',
                    opacity: isOwnAnswer ? 0.5 : 1,
                    cursor: isOwnAnswer ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Upvote arrow */}
                    <div
                      className="flex flex-col items-center pt-1"
                      style={{
                        color: isOwnAnswer
                          ? 'var(--color-text-muted)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                        <path d="M8 0L16 12H0L8 0Z" />
                      </svg>
                      <span className="text-xs mt-1">0</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{answer.text}</p>
                      {isOwnAnswer && (
                        <p
                          className="text-xs mt-1 italic"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          (your answer)
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Voter progress */}
          <div className="flex justify-center gap-2 mt-8">
            {players.map((p, i) => (
              <div
                key={p.id}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  background:
                    i < currentVotingPlayer
                      ? 'var(--color-blue)'
                      : i === currentVotingPlayer
                      ? 'var(--color-orange)'
                      : 'var(--color-border)',
                }}
                title={p.name}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── REVEAL PHASE ── */
  if (phase === 'reveal') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ROUND {currentRound}/{TOTAL_ROUNDS}
            </span>
          </div>

          {/* Prompt */}
          <div
            className="pixel-border p-4 mb-8 text-center"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-orange)',
            }}
          >
            <p className="text-sm">{currentPrompt?.text}</p>
          </div>

          <p
            className="pixel-text text-xs text-center mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            REVEALING ANSWERS...
          </p>

          {/* Answer cards with reveal */}
          <div className="space-y-3">
            {shuffledAnswers.map((answer, i) => {
              const isRevealed = i <= revealedIndex;
              const isReal = answer.isReal;
              const author = players.find((p) => p.id === answer.playerId);
              const fooledCount = answer.votedBy.length;
              const voters = answer.votedBy.map(
                (vid) => players.find((p) => p.id === vid)?.name || '?'
              );

              return (
                <div
                  key={i}
                  className="pixel-border p-4 transition-all"
                  style={{
                    background:
                      isRevealed && isReal && showAccepted
                        ? 'rgba(0, 255, 136, 0.1)'
                        : 'var(--color-bg-card)',
                    borderColor:
                      isRevealed && isReal && showAccepted
                        ? 'var(--color-accent)'
                        : isRevealed
                        ? 'var(--color-border-hover)'
                        : 'var(--color-border)',
                    opacity: isRevealed ? 1 : 0.3,
                    transform: isRevealed ? 'translateX(0)' : 'translateX(20px)',
                    transition: 'all 0.4s ease',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Vote count / checkmark */}
                    <div className="flex flex-col items-center pt-1 min-w-[24px]">
                      {isRevealed && isReal && showAccepted ? (
                        <div
                          className="text-lg"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {'\u2713'}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                            <path d="M8 0L16 12H0L8 0Z" />
                          </svg>
                          <span className="text-xs text-center block">
                            {isRevealed ? fooledCount : '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm mb-1">{answer.text}</p>
                      {isRevealed && (
                        <div className="mt-2">
                          {isReal ? (
                            showAccepted && (
                              <span
                                className="pixel-text text-xs px-2 py-1 inline-block"
                                style={{
                                  background: 'var(--color-accent)',
                                  color: 'var(--color-bg)',
                                }}
                              >
                                {'\u2713'} ACCEPTED ANSWER
                              </span>
                            )
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              Written by {author?.avatar} {author?.name}
                              {fooledCount > 0 && (
                                <span style={{ color: 'var(--color-orange)' }}>
                                  {' '}&middot; fooled {voters.join(', ')}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue button */}
          {showAccepted && (
            <div className="text-center mt-8 animate-fade-in-up">
              <button
                onClick={computeRoundResults}
                className="px-8 py-3 pixel-btn pixel-text text-sm"
                style={{
                  background: 'var(--color-orange)',
                  color: 'var(--color-bg)',
                }}
              >
                SEE SCORES
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── ROUND SUMMARY ── */
  if (phase === 'round-summary') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p
              className="pixel-text text-xs mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ROUND {currentRound} COMPLETE
            </p>
            <h2
              className="pixel-text text-lg"
              style={{ color: 'var(--color-orange)' }}
            >
              REPUTATION BOARD
            </h2>
          </div>

          {/* Leaderboard */}
          <div className="space-y-3 mb-8">
            {sortedPlayers.map((p, rank) => (
              <div
                key={p.id}
                className="pixel-border p-4 flex items-center justify-between"
                style={{
                  background:
                    rank === 0
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'var(--color-bg-card)',
                  borderColor:
                    rank === 0 ? 'var(--color-orange)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="pixel-text text-xs w-6 text-center"
                    style={{
                      color:
                        rank === 0
                          ? 'var(--color-orange)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    #{rank + 1}
                  </span>
                  <span className="text-xl">{p.avatar}</span>
                  <span className="text-sm">{p.name}</span>
                </div>
                <div className="text-right">
                  <span
                    className="pixel-text text-sm"
                    style={{ color: 'var(--color-orange)' }}
                  >
                    {p.reputation}
                  </span>
                  <span
                    className="text-xs ml-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    REP
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={advanceRound}
            className="w-full py-3 pixel-btn pixel-text text-sm"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
          >
            {currentRound >= TOTAL_ROUNDS ? 'FINAL RESULTS' : 'NEXT ROUND'}
          </button>
        </div>
      </div>
    );
  }

  /* ── FINAL RESULTS ── */
  if (phase === 'final-results') {
    const winner = sortedPlayers[0];
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2
              className="pixel-text text-xl md:text-2xl mb-2"
              style={{ color: 'var(--color-orange)' }}
            >
              GAME OVER
            </h2>
            <p
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              THE RESULTS ARE IN
            </p>
          </div>

          {/* Winner podium */}
          <div
            className="pixel-border p-8 text-center mb-8"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              borderColor: 'var(--color-orange)',
            }}
          >
            <div className="text-5xl mb-3">{winner?.avatar}</div>
            <p
              className="pixel-text text-lg mb-1"
              style={{ color: 'var(--color-orange)' }}
            >
              {winner?.name}
            </p>
            <p className="pixel-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              TOP CONTRIBUTOR
            </p>
            <p
              className="pixel-text text-2xl mt-3"
              style={{ color: 'var(--color-orange)' }}
            >
              {winner?.reputation}
              <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
                REP
              </span>
            </p>
          </div>

          {/* Full leaderboard */}
          <div className="space-y-2 mb-8">
            {sortedPlayers.map((p, rank) => (
              <div
                key={p.id}
                className="pixel-border p-3 flex items-center justify-between"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="pixel-text text-xs w-6 text-center"
                    style={{
                      color:
                        rank === 0
                          ? 'var(--color-orange)'
                          : rank === 1
                          ? 'var(--color-text-secondary)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    #{rank + 1}
                  </span>
                  <span className="text-lg">{p.avatar}</span>
                  <span className="text-sm">{p.name}</span>
                </div>
                <span
                  className="pixel-text text-sm"
                  style={{ color: 'var(--color-orange)' }}
                >
                  {p.reputation}
                </span>
              </div>
            ))}
          </div>

          {/* Badges */}
          {sortedPlayers.some((p) => p.badges.length > 0) && (
            <div className="mb-8">
              <p
                className="pixel-text text-xs text-center mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                BADGES EARNED
              </p>
              <div className="space-y-2">
                {sortedPlayers
                  .filter((p) => p.badges.length > 0)
                  .map((p) => (
                    <div key={p.id}>
                      {p.badges.map((b) => {
                        const def = BADGE_DEFS[b];
                        if (!def) return null;
                        return (
                          <div
                            key={b}
                            className="pixel-border p-3 flex items-center gap-3"
                            style={{
                              background: 'var(--color-bg-card)',
                              borderColor: 'var(--color-purple)',
                            }}
                          >
                            <span className="text-xl">{def.icon}</span>
                            <div>
                              <span className="text-sm">
                                {p.avatar} {p.name}
                              </span>
                              <span
                                className="pixel-text text-xs ml-2"
                                style={{ color: 'var(--color-purple)' }}
                              >
                                {def.label}
                              </span>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                {def.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                // Keep players, reset scores
                setPlayers((prev) =>
                  prev.map((p) => ({ ...p, reputation: 0, badges: [] }))
                );
                setUsedPrompts(new Set());
                const prompt = pickPrompt();
                setCurrentPrompt(prompt);
                setCurrentRound(1);
                setSubmittedAnswers([]);
                setShuffledAnswers([]);
                setCurrentWritingPlayer(0);
                setCurrentVotingPlayer(0);
                setAnswerInput('');
                setRevealedIndex(-1);
                setShowAccepted(false);
                setCorrectStreaks({});
                setTotalCorrect({});
                setTotalFooled({});
                setEverFooled(new Set());
                if (gameMode === 'pass') {
                  setPhase('pass-phone');
                } else {
                  setPhase('writing');
                }
              }}
              className="w-full py-3 pixel-btn pixel-text text-sm"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={resetGame}
              className="w-full py-3 pixel-btn pixel-text text-xs"
              style={{
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              NEW GAME (CHANGE PLAYERS)
            </button>
            <Link
              href="/games"
              className="block text-center py-2 text-xs hover:opacity-80"
              style={{ color: 'var(--color-text-muted)' }}
            >
              &larr; Back to Arcade
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
