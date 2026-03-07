'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import GamePlayCounter from '@/components/GamePlayCounter';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ================================================================
   TYPES
   ================================================================ */

interface Player {
  id: number;
  name: string;
  score: number;
  avatar: string;
}

/** Online player (each person on their own device) */
interface OnlinePlayer {
  id: string;          // UUID
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
}

type PromptCategory = 'dev' | 'general' | 'wyr' | 'blank' | 'mega';

interface Prompt {
  text: string;
  category: PromptCategory;
}

interface Answer {
  playerId: number;
  text: string;
  votes: number;
}

/** Online answer keyed by player UUID */
interface OnlineAnswer {
  playerId: string;
  text: string;
  votes: number;
}

type GamePhase =
  | 'setup'
  | 'writing'
  | 'revealing'
  | 'voting'
  | 'results'
  | 'round-summary'
  | 'mega-intro'
  | 'final-results';

type GameMode = 'pass' | 'room' | 'online';

type OnlineLobbyPhase = 'choice' | 'create' | 'join' | 'waiting';

/* ================================================================
   ONLINE BROADCAST EVENT TYPES
   ================================================================ */

type BroadcastEvent =
  | { type: 'player_joined'; player: OnlinePlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'phase_change'; phase: GamePhase; prompt: Prompt | null; round: number; promptIndex: number; roundPrompts: Prompt[] }
  | { type: 'answer_submitted'; playerId: string }
  | { type: 'reveal_next'; count: number }
  | { type: 'vote_cast'; playerId: string }
  | { type: 'scores_update'; players: OnlinePlayer[]; answers: OnlineAnswer[]; winner: OnlinePlayer | null }
  | { type: 'all_answers'; answers: OnlineAnswer[] }
  | { type: 'game_started'; prompt: Prompt; round: number; roundPrompts: Prompt[] }
  | { type: 'mega_start'; prompt: Prompt };

/* ================================================================
   PROMPT DATABASE  (150+)
   ================================================================ */

const PROMPTS: Prompt[] = [
  // ── Dev Humor (40) ──
  { text: 'The error message nobody wants to see at 2am', category: 'dev' },
  { text: 'A programming language designed by your cat', category: 'dev' },
  { text: 'The worst variable name for a production database', category: 'dev' },
  { text: 'A commit message that gets you fired', category: 'dev' },
  { text: 'What Stack Overflow would say if it could talk', category: 'dev' },
  { text: 'The worst name for a startup', category: 'dev' },
  { text: 'A feature request from your most annoying user', category: 'dev' },
  { text: 'What your code thinks about you', category: 'dev' },
  { text: 'The worst way to explain recursion', category: 'dev' },
  { text: 'A bug so bad it becomes a feature', category: 'dev' },
  { text: 'The title of a TED talk given by a semicolon', category: 'dev' },
  { text: 'What a rubber duck really thinks during debugging', category: 'dev' },
  { text: 'A rejected name for JavaScript', category: 'dev' },
  { text: 'The worst thing to put in a README', category: 'dev' },
  { text: 'What your terminal history says about you', category: 'dev' },
  { text: 'A password that somehow passes every validation', category: 'dev' },
  { text: 'The scariest thing in a production log', category: 'dev' },
  { text: 'An API endpoint that should never exist', category: 'dev' },
  { text: 'What the cloud is actually made of', category: 'dev' },
  { text: 'A Slack message that causes a company-wide panic', category: 'dev' },
  { text: 'The worst advice for a junior developer', category: 'dev' },
  { text: 'A CSS property that would fix your life', category: 'dev' },
  { text: 'What Docker containers talk about at night', category: 'dev' },
  { text: 'The worst tech interview question ever', category: 'dev' },
  { text: 'A Chrome extension nobody asked for', category: 'dev' },
  { text: 'The real reason your build is failing', category: 'dev' },
  { text: 'An honest LinkedIn headline for a developer', category: 'dev' },
  { text: 'What happens when you mass-reply-all at a FAANG', category: 'dev' },
  { text: 'A function name that makes everyone uncomfortable', category: 'dev' },
  { text: 'The tooltip text on a "Delete Production" button', category: 'dev' },
  { text: 'What AI thinks programmers do all day', category: 'dev' },
  { text: 'A new HTTP status code and what it means', category: 'dev' },
  { text: 'The worst way to handle null', category: 'dev' },
  { text: 'What your IDE judges you for the most', category: 'dev' },
  { text: 'A package on npm that definitely should not exist', category: 'dev' },
  { text: 'The most useless microservice', category: 'dev' },
  { text: 'What your Wi-Fi router would say if it could speak', category: 'dev' },
  { text: 'A GitHub repo name that raises HR concerns', category: 'dev' },
  { text: 'The error message you see in the afterlife', category: 'dev' },
  { text: 'What "it works on my machine" really means', category: 'dev' },

  // ── General Funny (40) ──
  { text: 'The worst superhero power', category: 'general' },
  { text: 'A rejected ice cream flavor', category: 'general' },
  { text: 'What you\'d say if you could text your pet', category: 'general' },
  { text: 'The worst thing to yell on a roller coaster', category: 'general' },
  { text: 'A fortune cookie that ruins your day', category: 'general' },
  { text: 'The worst theme for a birthday party', category: 'general' },
  { text: 'Something you should never say at a funeral', category: 'general' },
  { text: 'A product that doesn\'t need a "smart" version', category: 'general' },
  { text: 'The worst way to start a wedding toast', category: 'general' },
  { text: 'A reality TV show that went too far', category: 'general' },
  { text: 'The worst thing to find in your Airbnb', category: 'general' },
  { text: 'An honest dating profile bio', category: 'general' },
  { text: 'The worst motivational poster', category: 'general' },
  { text: 'Something a villain would say at a job interview', category: 'general' },
  { text: 'A children\'s book that should not exist', category: 'general' },
  { text: 'The worst thing to name your WiFi network', category: 'general' },
  { text: 'A Netflix category that\'s way too specific', category: 'general' },
  { text: 'The worst name for a band', category: 'general' },
  { text: 'Something you should never Google', category: 'general' },
  { text: 'The worst thing to monogram', category: 'general' },
  { text: 'A Yelp review for the Bermuda Triangle', category: 'general' },
  { text: 'The worst flavor of La Croix', category: 'general' },
  { text: 'An invention nobody needs but everyone wants', category: 'general' },
  { text: 'The worst slogan for a hospital', category: 'general' },
  { text: 'A bumper sticker that gets you pulled over', category: 'general' },
  { text: 'The worst thing to automate', category: 'general' },
  { text: 'Something you should not 3D print', category: 'general' },
  { text: 'The most suspicious thing to buy at a gas station', category: 'general' },
  { text: 'A voicemail that guarantees nobody calls back', category: 'general' },
  { text: 'The worst item to find in a time capsule', category: 'general' },
  { text: 'An emoji that should exist but doesn\'t', category: 'general' },
  { text: 'The worst name for a yoga pose', category: 'general' },
  { text: 'A gym class that would make people actually go', category: 'general' },
  { text: 'The worst candle scent', category: 'general' },
  { text: 'Something you should never put on a resume', category: 'general' },
  { text: 'The worst thing to whisper to someone', category: 'general' },
  { text: 'A self-help book title that screams red flag', category: 'general' },
  { text: 'The worst elevator pitch', category: 'general' },
  { text: 'Something aliens would say about humans', category: 'general' },
  { text: 'The worst thing to engrave on a trophy', category: 'general' },

  // ── Would You Rather (30) ──
  { text: 'Would you rather: debug CSS for eternity OR write documentation for fun?', category: 'wyr' },
  { text: 'Would you rather: only code in Comic Sans OR only use a trackpad?', category: 'wyr' },
  { text: 'Would you rather: have your browser history shown at a meeting OR your Spotify wrapped?', category: 'wyr' },
  { text: 'Would you rather: fight 100 duck-sized bugs OR 1 bug-sized duck?', category: 'wyr' },
  { text: 'Would you rather: never use Google again OR never use StackOverflow again?', category: 'wyr' },
  { text: 'Would you rather: have every email CC your mom OR every Slack message be public?', category: 'wyr' },
  { text: 'Would you rather: only speak in code OR only speak in memes?', category: 'wyr' },
  { text: 'Would you rather: have no backspace key OR no copy-paste?', category: 'wyr' },
  { text: 'Would you rather: do every standup as a rap OR as a TikTok dance?', category: 'wyr' },
  { text: 'Would you rather: use Internet Explorer forever OR a flip phone forever?', category: 'wyr' },
  { text: 'Would you rather: give up coffee OR give up Wi-Fi?', category: 'wyr' },
  { text: 'Would you rather: have your code reviewed by Gordon Ramsay OR Simon Cowell?', category: 'wyr' },
  { text: 'Would you rather: only use light mode OR only use 800x600 resolution?', category: 'wyr' },
  { text: 'Would you rather: pair program with a ghost OR with your high school self?', category: 'wyr' },
  { text: 'Would you rather: live in a world without tabs OR without spaces?', category: 'wyr' },
  { text: 'Would you rather: have unlimited storage OR unlimited bandwidth?', category: 'wyr' },
  { text: 'Would you rather: always have your mic on OR always have your camera on?', category: 'wyr' },
  { text: 'Would you rather: eat only vending machine food OR only airport food?', category: 'wyr' },
  { text: 'Would you rather: have Clippy as your manager OR Alexa?', category: 'wyr' },
  { text: 'Would you rather: deploy on Fridays forever OR never deploy at all?', category: 'wyr' },
  { text: 'Would you rather: lose all your saved passwords OR all your bookmarks?', category: 'wyr' },
  { text: 'Would you rather: attend meetings all day OR write regex all day?', category: 'wyr' },
  { text: 'Would you rather: have Jira track your personal life OR never use Jira again but use sticky notes?', category: 'wyr' },
  { text: 'Would you rather: code only while standing OR only while walking?', category: 'wyr' },
  { text: 'Would you rather: have no IDE autocomplete OR no syntax highlighting?', category: 'wyr' },
  { text: 'Would you rather: work in an open office with drummers OR in a closet alone?', category: 'wyr' },
  { text: 'Would you rather: every PR needs 10 approvals OR zero code review ever?', category: 'wyr' },
  { text: 'Would you rather: your boss reads your DMs OR your DMs are your commit messages?', category: 'wyr' },
  { text: 'Would you rather: code with boxing gloves OR with oven mitts?', category: 'wyr' },
  { text: 'Would you rather: be mass-tagged in every PR OR never get any notifications?', category: 'wyr' },

  // ── Fill in the Blank (20) ──
  { text: 'The secret ingredient in grandma\'s code is ___', category: 'blank' },
  { text: 'My code works because ___', category: 'blank' },
  { text: 'I got fired because I accidentally ___', category: 'blank' },
  { text: 'The CEO\'s password is probably ___', category: 'blank' },
  { text: 'The real reason the internet was invented: ___', category: 'blank' },
  { text: 'Breaking news: developer discovers ___ in production', category: 'blank' },
  { text: 'The last thing you want to hear from IT: ___', category: 'blank' },
  { text: 'My therapist said I need to stop ___', category: 'blank' },
  { text: 'The sequel nobody asked for: ___ 2', category: 'blank' },
  { text: 'The WiFi password at the White House is ___', category: 'blank' },
  { text: 'If Monday had a catchphrase: ___', category: 'blank' },
  { text: 'The next big crypto coin will be called ___', category: 'blank' },
  { text: 'My code review comment: "Why does this ___?"', category: 'blank' },
  { text: 'The first rule of code club: never ___', category: 'blank' },
  { text: 'Scientists just discovered that ___ improves productivity by 300%', category: 'blank' },
  { text: 'Dear diary, today my pull request ___', category: 'blank' },
  { text: 'The unwritten rule of every office: ___', category: 'blank' },
  { text: 'The real reason we have microservices: ___', category: 'blank' },
  { text: 'I dropped out of college to pursue my dream of ___', category: 'blank' },
  { text: 'The universe runs on ___ and ___', category: 'blank' },

  // ── Mega Round (20) ──
  { text: 'Write the LinkedIn post that gets you fired', category: 'mega' },
  { text: 'The acceptance speech for winning "World\'s Okay-est Developer"', category: 'mega' },
  { text: 'Your resignation letter written as a haiku', category: 'mega' },
  { text: 'A one-star review of planet Earth', category: 'mega' },
  { text: 'Your autobiography title and first sentence', category: 'mega' },
  { text: 'A Tinder bio that scares everyone away', category: 'mega' },
  { text: 'The commencement speech for "Meh University"', category: 'mega' },
  { text: 'A new holiday and how people celebrate it', category: 'mega' },
  { text: 'The loading screen tip for the game of life', category: 'mega' },
  { text: 'Write a patch note for the latest human update', category: 'mega' },
  { text: 'Your last words, knowing they\'ll be on a T-shirt', category: 'mega' },
  { text: 'The warning label for your personality', category: 'mega' },
  { text: 'A motivational quote from the world\'s laziest person', category: 'mega' },
  { text: 'The terms and conditions of being your friend', category: 'mega' },
  { text: 'A product recall notice for your love life', category: 'mega' },
  { text: 'The CEO announcement email nobody wants to read', category: 'mega' },
  { text: 'Write the fortune cookie that changes someone\'s life (badly)', category: 'mega' },
  { text: 'A Yelp review for your last relationship', category: 'mega' },
  { text: 'The warning sign at the entrance to your home', category: 'mega' },
  { text: 'A bedtime story for insomniac developers', category: 'mega' },
];

const AVATARS = [
  '\u{1F47E}', '\u{1F916}', '\u{1F47B}', '\u{1F435}', '\u{1F431}',
  '\u{1F436}', '\u{1F98A}', '\u{1F43B}', '\u{1F42F}', '\u{1F981}',
];

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  dev: 'DEV HUMOR',
  general: 'WILD CARD',
  wyr: 'WOULD YOU RATHER',
  blank: 'FILL IN THE BLANK',
  mega: 'MEGA ROUND',
};

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  dev: 'var(--color-accent)',
  general: 'var(--color-blue)',
  wyr: 'var(--color-purple)',
  blank: 'var(--color-orange)',
  mega: 'var(--color-pink)',
};

/* ================================================================
   CONSTANTS
   ================================================================ */

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const PROMPTS_PER_ROUND = 2;
const TOTAL_ROUNDS = 3;
const WRITING_TIME = 60;
const REVEAL_DELAY = 1500;
const MEGA_MULTIPLIER = 2;
const MAX_ANSWER_LENGTH = 100;
const ONLINE_MIN_PLAYERS = 3;
const ONLINE_MAX_PLAYERS = 10;

/* ================================================================
   HELPERS
   ================================================================ */

function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('pr_session_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('pr_session_token', token);
  }
  return token;
}

function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pr_display_name') || '';
}

function storeName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pr_display_name', name);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickPrompts(count: number, category?: PromptCategory, used?: Set<string>): Prompt[] {
  const pool = PROMPTS.filter(
    (p) => (!category || p.category === category) && (!used || !used.has(p.text))
  );
  return shuffle(pool).slice(0, count);
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function PromptRoulettePage() {
  const [mounted, setMounted] = useState(false);

  // Setup state
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(4);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [roundPrompts, setRoundPrompts] = useState<Prompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());

  // Writing phase
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentWritingPlayer, setCurrentWritingPlayer] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(WRITING_TIME);

  // Revealing phase
  const [revealedCount, setRevealedCount] = useState(0);

  // Voting phase
  const [currentVotingPlayer, setCurrentVotingPlayer] = useState(0);
  const [, setHasVoted] = useState<Set<number>>(new Set());

  // Results
  const [roundWinner, setRoundWinner] = useState<Player | null>(null);

  // Animation states
  const [showConfetti, setShowConfetti] = useState(false);
  const [megaIntroVisible, setMegaIntroVisible] = useState(false);

  // ── Online multiplayer state ──
  const [onlineLobbyPhase, setOnlineLobbyPhase] = useState<OnlineLobbyPhase>('choice');
  const [onlineDisplayName, setOnlineDisplayName] = useState('');
  const [onlineJoinCode, setOnlineJoinCode] = useState('');
  const [onlineRoomCode, setOnlineRoomCode] = useState('');
  const [onlineMyId, setOnlineMyId] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [onlineAnswers, setOnlineAnswers] = useState<OnlineAnswer[]>([]);
  const [onlineMyAnswerSubmitted, setOnlineMyAnswerSubmitted] = useState(false);
  const [onlineSubmittedIds, setOnlineSubmittedIds] = useState<Set<string>>(new Set());
  const [onlineVotedIds, setOnlineVotedIds] = useState<Set<string>>(new Set());
  const [onlineMyVoteCast, setOnlineMyVoteCast] = useState(false);
  const [onlineRoundWinner, setOnlineRoundWinner] = useState<OnlinePlayer | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineIsCreating, setOnlineIsCreating] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnline = gameMode === 'online';
  const amHost = isOnline && onlinePlayers.find(p => p.id === onlineMyId)?.isHost === true;

  useEffect(() => {
    setMounted(true);
    setOnlineDisplayName(getStoredName());
  }, []);

  /* ── Online: broadcast helper ── */
  const broadcast = useCallback((event: BroadcastEvent) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_event',
      payload: event,
    });
  }, []);

  /* ── Online: subscribe to room channel ── */
  useEffect(() => {
    if (!isOnline || !onlineRoomCode) return;

    const channel = supabase.channel(`room:${onlineRoomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'game_event' }, ({ payload }) => {
        const evt = payload as BroadcastEvent;

        switch (evt.type) {
          case 'player_joined':
            setOnlinePlayers(prev => {
              if (prev.find(p => p.id === evt.player.id)) return prev;
              return [...prev, evt.player];
            });
            break;

          case 'player_left':
            setOnlinePlayers(prev => prev.filter(p => p.id !== evt.playerId));
            break;

          case 'game_started':
            setCurrentPrompt(evt.prompt);
            setRoundPrompts(evt.roundPrompts);
            setCurrentRound(evt.round);
            setCurrentPromptIndex(0);
            setOnlineAnswers([]);
            setOnlineMyAnswerSubmitted(false);
            setOnlineSubmittedIds(new Set());
            setOnlineVotedIds(new Set());
            setOnlineMyVoteCast(false);
            setAnswerInput('');
            setTimeLeft(WRITING_TIME);
            setPhase('writing');
            setOnlineLobbyPhase('waiting');
            break;

          case 'phase_change':
            setPhase(evt.phase);
            if (evt.prompt) setCurrentPrompt(evt.prompt);
            setCurrentRound(evt.round);
            setCurrentPromptIndex(evt.promptIndex);
            setRoundPrompts(evt.roundPrompts);
            if (evt.phase === 'writing') {
              setOnlineAnswers([]);
              setOnlineMyAnswerSubmitted(false);
              setOnlineSubmittedIds(new Set());
              setOnlineVotedIds(new Set());
              setOnlineMyVoteCast(false);
              setAnswerInput('');
              setTimeLeft(WRITING_TIME);
              setRevealedCount(0);
              setOnlineRoundWinner(null);
            }
            if (evt.phase === 'mega-intro') {
              setMegaIntroVisible(true);
            }
            break;

          case 'answer_submitted':
            setOnlineSubmittedIds(prev => new Set(prev).add(evt.playerId));
            break;

          case 'all_answers':
            setOnlineAnswers(evt.answers);
            setRevealedCount(0);
            setPhase('revealing');
            break;

          case 'reveal_next':
            setRevealedCount(evt.count);
            break;

          case 'vote_cast':
            setOnlineVotedIds(prev => new Set(prev).add(evt.playerId));
            break;

          case 'scores_update':
            setOnlinePlayers(evt.players);
            setOnlineAnswers(evt.answers);
            setOnlineRoundWinner(evt.winner);
            setPhase('results');
            break;

          case 'mega_start':
            setCurrentPrompt(evt.prompt);
            setRoundPrompts([evt.prompt]);
            setCurrentPromptIndex(0);
            setMegaIntroVisible(false);
            setOnlineAnswers([]);
            setOnlineMyAnswerSubmitted(false);
            setOnlineSubmittedIds(new Set());
            setOnlineVotedIds(new Set());
            setOnlineMyVoteCast(false);
            setAnswerInput('');
            setTimeLeft(WRITING_TIME);
            setRevealedCount(0);
            setOnlineRoundWinner(null);
            setPhase('writing');
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [isOnline, onlineRoomCode]);

  /* ── Timer ── */
  useEffect(() => {
    if (phase === 'writing' && (gameMode === 'room' || gameMode === 'online')) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, gameMode, currentPrompt]);

  // Auto-submit when timer runs out (room / online mode)
  useEffect(() => {
    if (timeLeft === 0 && phase === 'writing' && gameMode === 'room') {
      handleFinishWriting();
    }
    if (timeLeft === 0 && phase === 'writing' && gameMode === 'online') {
      handleOnlineAutoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /* ── Focus input ── */
  useEffect(() => {
    if (phase === 'writing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentWritingPlayer]);

  /* ── Reveal animation ── */
  useEffect(() => {
    if (isOnline) {
      // Online: host drives reveals via broadcast
      const totalAnswers = onlineAnswers.length;
      if (phase === 'revealing' && amHost && revealedCount < totalAnswers) {
        const timer = setTimeout(() => {
          const next = revealedCount + 1;
          broadcast({ type: 'reveal_next', count: next });
        }, REVEAL_DELAY);
        return () => clearTimeout(timer);
      }
      if (phase === 'revealing' && amHost && revealedCount >= totalAnswers && totalAnswers > 0) {
        setTimeout(() => {
          broadcast({ type: 'phase_change', phase: 'voting', prompt: currentPrompt, round: currentRound, promptIndex: currentPromptIndex, roundPrompts });
        }, 800);
      }
      return;
    }
    // Offline modes
    if (phase === 'revealing' && revealedCount < answers.length) {
      const timer = setTimeout(() => {
        setRevealedCount((c) => c + 1);
      }, REVEAL_DELAY);
      return () => clearTimeout(timer);
    }
    if (phase === 'revealing' && revealedCount >= answers.length && answers.length > 0) {
      setTimeout(() => {
        setCurrentVotingPlayer(0);
        setHasVoted(new Set());
        setPhase('voting');
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealedCount, answers.length, onlineAnswers.length, isOnline, amHost]);

  /* ================================================================
     GAME LOGIC
     ================================================================ */

  const startGame = useCallback(() => {
    if (players.length < MIN_PLAYERS && playerCount < MIN_PLAYERS) return;
    const prompts = pickPrompts(PROMPTS_PER_ROUND, undefined, usedPrompts);
    const newUsed = new Set(usedPrompts);
    prompts.forEach((p) => newUsed.add(p.text));
    setUsedPrompts(newUsed);
    setRoundPrompts(prompts);
    setCurrentPromptIndex(0);
    setCurrentPrompt(prompts[0]);
    setCurrentRound(1);
    setAnswers([]);
    setCurrentWritingPlayer(0);
    setTimeLeft(WRITING_TIME);
    setPhase('writing');
    setAnswerInput('');
  }, [players, usedPrompts]);

  const submitAnswer = useCallback(() => {
    const text = answerInput.trim();
    if (!text) return;

    const player = players[currentWritingPlayer];
    setAnswers((prev) => [...prev, { playerId: player.id, text, votes: 0 }]);
    setAnswerInput('');

    if (gameMode === 'pass') {
      // Pass the phone: next player writes
      if (currentWritingPlayer < players.length - 1) {
        setCurrentWritingPlayer((c) => c + 1);
        setTimeLeft(WRITING_TIME);
      } else {
        // All players submitted, reveal
        startReveal();
      }
    }
  }, [answerInput, currentWritingPlayer, players, gameMode]);

  const handleFinishWriting = useCallback(() => {
    // For room mode: all players done or time up
    // Fill in blank answers for those who didn't submit
    const submitted = new Set(answers.map((a) => a.playerId));
    const finalAnswers = [...answers];
    players.forEach((p) => {
      if (!submitted.has(p.id)) {
        finalAnswers.push({ playerId: p.id, text: '...', votes: 0 });
      }
    });
    setAnswers(finalAnswers);
    startReveal();
  }, [answers, players]);

  const startReveal = () => {
    setRevealedCount(0);
    setPhase('revealing');
  };

  const showPromptResults = useCallback(() => {
    // Award points
    const isMega = currentPrompt?.category === 'mega';
    const multiplier = isMega ? MEGA_MULTIPLIER : 1;

    const maxVotes = Math.max(...answers.map((a) => a.votes));

    setPlayers((prev) =>
      prev.map((p) => {
        const myAnswer = answers.find((a) => a.playerId === p.id);
        const points = myAnswer ? myAnswer.votes * multiplier : 0;
        return { ...p, score: p.score + points };
      })
    );

    // Find winner of this prompt
    const winnerAnswer = answers.find((a) => a.votes === maxVotes && maxVotes > 0);
    if (winnerAnswer) {
      const w = players.find((p) => p.id === winnerAnswer.playerId) || null;
      setRoundWinner(w);
    } else {
      setRoundWinner(null);
    }

    setPhase('results');
  }, [answers, currentPrompt, players]);

  const castVote = useCallback(
    (answerId: number) => {
      const voter = players[currentVotingPlayer];
      // Can't vote for own answer
      if (answers[answerId].playerId === voter.id) return;

      setAnswers((prev) =>
        prev.map((a, i) => (i === answerId ? { ...a, votes: a.votes + 1 } : a))
      );
      setHasVoted((prev) => new Set(prev).add(voter.id));

      // Next voter
      if (currentVotingPlayer < players.length - 1) {
        setCurrentVotingPlayer((c) => c + 1);
      } else {
        // All voted, show results
        setTimeout(() => showPromptResults(), 300);
      }
    },
    [currentVotingPlayer, players, answers, showPromptResults]
  );

  const advanceToNext = useCallback(() => {
    const nextPromptIdx = currentPromptIndex + 1;

    if (currentPrompt?.category === 'mega') {
      // Game over
      setShowConfetti(true);
      setPhase('final-results');
      return;
    }

    if (nextPromptIdx < roundPrompts.length) {
      // Next prompt in current round
      setCurrentPromptIndex(nextPromptIdx);
      setCurrentPrompt(roundPrompts[nextPromptIdx]);
      resetForNewPrompt();
    } else if (currentRound < TOTAL_ROUNDS) {
      // Next round
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      const prompts = pickPrompts(PROMPTS_PER_ROUND, undefined, usedPrompts);
      const newUsed = new Set(usedPrompts);
      prompts.forEach((p) => newUsed.add(p.text));
      setUsedPrompts(newUsed);
      setRoundPrompts(prompts);
      setCurrentPromptIndex(0);
      setCurrentPrompt(prompts[0]);
      resetForNewPrompt();
      setPhase('round-summary');
    } else {
      // All rounds done, mega round
      setPhase('mega-intro');
      setMegaIntroVisible(true);
      setTimeout(() => {
        const megaPrompt = pickPrompts(1, 'mega', usedPrompts)[0];
        if (megaPrompt) {
          const newUsed = new Set(usedPrompts);
          newUsed.add(megaPrompt.text);
          setUsedPrompts(newUsed);
          setCurrentPrompt(megaPrompt);
          setRoundPrompts([megaPrompt]);
          setCurrentPromptIndex(0);
        }
      }, 100);
    }
  }, [currentPromptIndex, currentRound, roundPrompts, usedPrompts, currentPrompt]);

  const startMegaRound = () => {
    setMegaIntroVisible(false);
    resetForNewPrompt();
  };

  const resetForNewPrompt = () => {
    setAnswers([]);
    setCurrentWritingPlayer(0);
    setAnswerInput('');
    setTimeLeft(WRITING_TIME);
    setRevealedCount(0);
    setHasVoted(new Set());
    setRoundWinner(null);
    setPhase('writing');
  };

  const resetGame = () => {
    setPhase('setup');
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setCurrentRound(1);
    setCurrentPromptIndex(0);
    setUsedPrompts(new Set());
    setAnswers([]);
    setShowConfetti(false);
    if (isOnline && channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setOnlineLobbyPhase('choice');
    setOnlineRoomCode('');
    setOnlineMyId('');
    setOnlinePlayers([]);
    setOnlineAnswers([]);
    setOnlineError(null);
    setGameMode(null);
  };

  /* ================================================================
     ONLINE GAME LOGIC
     ================================================================ */

  const handleOnlineCreateRoom = useCallback(async () => {
    const name = onlineDisplayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    if (!name) { setOnlineError('Please enter a name'); return; }
    storeName(name);
    setOnlineIsCreating(true);
    setOnlineError(null);
    try {
      const res = await fetch('/api/games/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: 'prompt-roulette',
          display_name: name,
          mode: 'online',
          max_players: ONLINE_MAX_PLAYERS,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create room');
      }
      const data = await res.json();
      const myId = data.player.id as string;
      const code = data.room.code as string;
      setOnlineRoomCode(code);
      setOnlineMyId(myId);
      const me: OnlinePlayer = {
        id: myId,
        name,
        avatar: AVATARS[0],
        score: 0,
        isHost: true,
      };
      setOnlinePlayers([me]);
      setOnlineLobbyPhase('waiting');
      // Broadcast will happen after channel connects (useEffect handles subscription)
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setOnlineIsCreating(false);
    }
  }, [onlineDisplayName]);

  const handleOnlineJoinRoom = useCallback(async () => {
    const name = onlineDisplayName.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 16).trim();
    const code = onlineJoinCode.trim().toUpperCase();
    if (!name) { setOnlineError('Please enter a name'); return; }
    if (code.length !== 6) { setOnlineError('Room code must be 6 characters'); return; }
    storeName(name);
    setOnlineIsCreating(true);
    setOnlineError(null);
    try {
      const res = await fetch(`/api/games/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to join room');
      }
      const data = await res.json();
      const myId = data.player.id as string;
      setOnlineRoomCode(code);
      setOnlineMyId(myId);
      // Build OnlinePlayer list from API response
      const playersList: OnlinePlayer[] = (data.players || []).map((p: { id: string; display_name: string; avatar_seed: string; is_host: boolean; score: number }, idx: number) => ({
        id: p.id,
        name: p.display_name,
        avatar: AVATARS[idx % AVATARS.length],
        score: p.score || 0,
        isHost: p.is_host,
      }));
      setOnlinePlayers(playersList);
      setOnlineLobbyPhase('waiting');

      // After channel connects, broadcast that we joined
      setTimeout(() => {
        const me = playersList.find((p: OnlinePlayer) => p.id === myId);
        if (me) {
          // We'll use broadcast once channel is ready - the useEffect handles subscription
          // Use a small delay to ensure channel is subscribed
          const tryBroadcast = () => {
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'game_event',
                payload: { type: 'player_joined', player: me } as BroadcastEvent,
              });
            } else {
              setTimeout(tryBroadcast, 200);
            }
          };
          tryBroadcast();
        }
      }, 100);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setOnlineIsCreating(false);
    }
  }, [onlineDisplayName, onlineJoinCode]);

  /** Host starts the online game */
  const handleOnlineStartGame = useCallback(() => {
    if (!amHost || onlinePlayers.length < ONLINE_MIN_PLAYERS) return;
    const prompts = pickPrompts(PROMPTS_PER_ROUND, undefined, usedPrompts);
    const newUsed = new Set(usedPrompts);
    prompts.forEach(p => newUsed.add(p.text));
    setUsedPrompts(newUsed);

    broadcast({
      type: 'game_started',
      prompt: prompts[0],
      round: 1,
      roundPrompts: prompts,
    });
  }, [amHost, onlinePlayers, usedPrompts, broadcast]);

  /** Submit answer in online mode */
  const handleOnlineSubmitAnswer = useCallback(() => {
    const text = answerInput.trim();
    if (!text || onlineMyAnswerSubmitted) return;
    setOnlineMyAnswerSubmitted(true);
    setAnswerInput('');

    // Send answer to host via API state (we use broadcast for simplicity)
    const sessionToken = getSessionToken();
    // Broadcast that this player submitted (everyone sees progress)
    broadcast({ type: 'answer_submitted', playerId: onlineMyId });

    // Store answer in API game state so host can collect
    fetch(`/api/games/rooms/${onlineRoomCode}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state_data: { [`answer_${onlineMyId}`]: text, session: sessionToken },
        expected_version: 0,
      }),
    }).catch(() => {
      // Fallback: broadcast the answer directly (less secure but works)
    });

    // Also broadcast the answer encrypted-ish (only host collects)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer_data',
      payload: { playerId: onlineMyId, text },
    });
  }, [answerInput, onlineMyAnswerSubmitted, onlineMyId, onlineRoomCode, broadcast]);

  /** Auto-submit blank when timer expires (online) */
  const handleOnlineAutoSubmit = useCallback(() => {
    if (onlineMyAnswerSubmitted) return;
    setOnlineMyAnswerSubmitted(true);
    broadcast({ type: 'answer_submitted', playerId: onlineMyId });
    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer_data',
      payload: { playerId: onlineMyId, text: '...' },
    });
  }, [onlineMyAnswerSubmitted, onlineMyId, broadcast]);

  /** Host: collect answers from broadcast and trigger reveal */
  const onlineCollectedAnswersRef = useRef<Map<string, string>>(new Map());

  // Listen for individual answers (host collects them)
  useEffect(() => {
    if (!isOnline || !onlineRoomCode) return;

    const channel = supabase.channel(`room:${onlineRoomCode}:answers`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'answer_data' }, ({ payload }) => {
        const { playerId, text } = payload as { playerId: string; text: string };
        onlineCollectedAnswersRef.current.set(playerId, text);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOnline, onlineRoomCode]);

  /** Host triggers reveal when enough answers are in or they click reveal */
  const handleOnlineReveal = useCallback(() => {
    if (!amHost) return;
    const collected = onlineCollectedAnswersRef.current;
    const allAnswers: OnlineAnswer[] = onlinePlayers.map(p => ({
      playerId: p.id,
      text: collected.get(p.id) || '...',
      votes: 0,
    }));
    // Shuffle to anonymize order
    const shuffled = [...allAnswers].sort(() => Math.random() - 0.5);
    onlineCollectedAnswersRef.current = new Map();
    broadcast({ type: 'all_answers', answers: shuffled });
  }, [amHost, onlinePlayers, broadcast]);

  /** Online vote */
  const handleOnlineVote = useCallback((answerIndex: number) => {
    if (onlineMyVoteCast) return;
    const answer = onlineAnswers[answerIndex];
    if (!answer || answer.playerId === onlineMyId) return;
    setOnlineMyVoteCast(true);

    // Broadcast vote
    broadcast({ type: 'vote_cast', playerId: onlineMyId });

    // Send vote data to host
    channelRef.current?.send({
      type: 'broadcast',
      event: 'vote_data',
      payload: { voterId: onlineMyId, answerIndex },
    });
  }, [onlineMyVoteCast, onlineAnswers, onlineMyId, broadcast]);

  // Host collects votes
  const onlineCollectedVotesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!isOnline || !onlineRoomCode) return;

    const channel = supabase.channel(`room:${onlineRoomCode}:votes`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'vote_data' }, ({ payload }) => {
        const { voterId, answerIndex } = payload as { voterId: string; answerIndex: number };
        onlineCollectedVotesRef.current.set(voterId, answerIndex);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOnline, onlineRoomCode]);

  /** Host tallies votes and broadcasts scores */
  const handleOnlineTallyVotes = useCallback(() => {
    if (!amHost) return;
    const votes = onlineCollectedVotesRef.current;
    const isMega = currentPrompt?.category === 'mega';
    const multiplier = isMega ? MEGA_MULTIPLIER : 1;

    // Tally votes per answer
    const voteCounts = new Array(onlineAnswers.length).fill(0);
    votes.forEach((answerIdx) => {
      if (answerIdx >= 0 && answerIdx < onlineAnswers.length) {
        voteCounts[answerIdx]++;
      }
    });

    const updatedAnswers = onlineAnswers.map((a, i) => ({
      ...a,
      votes: voteCounts[i],
    }));

    // Award points
    const maxVotes = Math.max(...voteCounts, 0);
    const updatedPlayers = onlinePlayers.map(p => {
      const myAnswer = updatedAnswers.find(a => a.playerId === p.id);
      const points = myAnswer ? myAnswer.votes * multiplier : 0;
      return { ...p, score: p.score + points };
    });

    const winnerAnswer = updatedAnswers.find(a => a.votes === maxVotes && maxVotes > 0);
    const winner = winnerAnswer ? updatedPlayers.find(p => p.id === winnerAnswer.playerId) || null : null;

    onlineCollectedVotesRef.current = new Map();

    broadcast({
      type: 'scores_update',
      players: updatedPlayers,
      answers: updatedAnswers,
      winner,
    });
  }, [amHost, onlineAnswers, onlinePlayers, currentPrompt, broadcast]);

  // Auto-tally when all online votes are in
  useEffect(() => {
    if (!isOnline || !amHost || phase !== 'voting') return;
    if (onlineVotedIds.size >= onlinePlayers.length) {
      setTimeout(() => handleOnlineTallyVotes(), 300);
    }
  }, [isOnline, amHost, phase, onlineVotedIds.size, onlinePlayers.length, handleOnlineTallyVotes]);

  // Auto-reveal when all answers submitted (host)
  useEffect(() => {
    if (!isOnline || !amHost || phase !== 'writing') return;
    if (onlineSubmittedIds.size >= onlinePlayers.length) {
      setTimeout(() => handleOnlineReveal(), 500);
    }
  }, [isOnline, amHost, phase, onlineSubmittedIds.size, onlinePlayers.length, handleOnlineReveal]);

  /** Host advances to next prompt/round (online) */
  const handleOnlineAdvanceToNext = useCallback(() => {
    if (!amHost) return;

    if (currentPrompt?.category === 'mega') {
      setShowConfetti(true);
      broadcast({ type: 'phase_change', phase: 'final-results', prompt: currentPrompt, round: currentRound, promptIndex: currentPromptIndex, roundPrompts });
      return;
    }

    const nextPromptIdx = currentPromptIndex + 1;

    if (nextPromptIdx < roundPrompts.length) {
      broadcast({
        type: 'phase_change',
        phase: 'writing',
        prompt: roundPrompts[nextPromptIdx],
        round: currentRound,
        promptIndex: nextPromptIdx,
        roundPrompts,
      });
    } else if (currentRound < TOTAL_ROUNDS) {
      const nextRound = currentRound + 1;
      const prompts = pickPrompts(PROMPTS_PER_ROUND, undefined, usedPrompts);
      const newUsed = new Set(usedPrompts);
      prompts.forEach(p => newUsed.add(p.text));
      setUsedPrompts(newUsed);

      broadcast({
        type: 'phase_change',
        phase: 'round-summary',
        prompt: prompts[0],
        round: nextRound,
        promptIndex: 0,
        roundPrompts: prompts,
      });
    } else {
      // Mega round intro
      const megaPrompt = pickPrompts(1, 'mega', usedPrompts)[0];
      if (megaPrompt) {
        const newUsed = new Set(usedPrompts);
        newUsed.add(megaPrompt.text);
        setUsedPrompts(newUsed);
        broadcast({
          type: 'phase_change',
          phase: 'mega-intro',
          prompt: megaPrompt,
          round: currentRound,
          promptIndex: 0,
          roundPrompts: [megaPrompt],
        });
      }
    }
  }, [amHost, currentPrompt, currentPromptIndex, currentRound, roundPrompts, usedPrompts, broadcast]);

  /** Host starts mega round writing (online) */
  const handleOnlineStartMega = useCallback(() => {
    if (!amHost || !currentPrompt) return;
    broadcast({ type: 'mega_start', prompt: currentPrompt });
  }, [amHost, currentPrompt, broadcast]);

  /** Host starts next round writing after round-summary (online) */
  const handleOnlineStartNextRound = useCallback(() => {
    if (!amHost) return;
    broadcast({
      type: 'phase_change',
      phase: 'writing',
      prompt: currentPrompt,
      round: currentRound,
      promptIndex: currentPromptIndex,
      roundPrompts,
    });
  }, [amHost, currentPrompt, currentRound, currentPromptIndex, roundPrompts, broadcast]);

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

  if (!mounted) return null;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  /* ── Confetti ── */
  const ConfettiEffect = () => {
    if (!showConfetti) return null;
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              backgroundColor: [
                'var(--color-accent)',
                'var(--color-purple)',
                'var(--color-pink)',
                'var(--color-blue)',
                'var(--color-orange)',
                'var(--color-cyan)',
              ][i % 6],
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
        <style>{`
          @keyframes fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-fall { animation: fall linear forwards; }
        `}</style>
      </div>
    );
  };

  /* ── Timer display ── */
  const TimerBar = () => (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="pixel-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          TIME
        </span>
        <span
          className="mono-text text-lg font-bold"
          style={{ color: timeLeft <= 10 ? 'var(--color-red)' : 'var(--color-accent)' }}
        >
          {timeLeft}s
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${(timeLeft / WRITING_TIME) * 100}%`,
            backgroundColor: timeLeft <= 10 ? 'var(--color-red)' : 'var(--color-accent)',
            boxShadow: `0 0 8px ${timeLeft <= 10 ? 'var(--color-red)' : 'var(--color-accent)'}`,
          }}
        />
      </div>
    </div>
  );

  /* ── Scoreboard ── */
  const Scoreboard = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`pixel-card rounded-lg ${compact ? 'p-3' : 'p-4 md:p-6'}`}
      style={{ backgroundColor: 'var(--color-bg-card)' }}
    >
      <h3
        className={`pixel-text ${compact ? 'text-xs' : 'text-sm'} mb-3`}
        style={{ color: 'var(--color-accent)' }}
      >
        SCOREBOARD
      </h3>
      <div className="space-y-2">
        {sortedPlayers.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: i === 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
                {i === 0 ? '\u{1F451}' : `#${i + 1}`}
              </span>
              <span className="text-lg">{p.avatar}</span>
              <span
                className={compact ? 'text-xs' : 'text-sm'}
                style={{ color: 'var(--color-text)' }}
              >
                {p.name}
              </span>
            </div>
            <span
              className="mono-text font-bold"
              style={{ color: 'var(--color-accent)' }}
            >
              {p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Header ── */
  const Header = () => (
    <div
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back
          </Link>
          <h1 className="pixel-text text-xs md:text-sm" style={{ color: 'var(--color-pink)' }}>
            PROMPT ROULETTE
          </h1>
          <GamePlayCounter slug="prompt-roulette" onPlay />
        </div>
        {phase !== 'setup' && phase !== 'final-results' && (
          <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>
              {currentPrompt?.category === 'mega'
                ? 'MEGA ROUND'
                : `Round ${currentRound}/${TOTAL_ROUNDS}`}
            </span>
            <span>
              Prompt {currentPromptIndex + 1}/{roundPrompts.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  /* ================================================================
     PHASE: SETUP
     ================================================================ */

  if (phase === 'setup') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-8">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="text-5xl md:text-6xl mb-4">{'\u{1F3B0}'}</div>
            <h2
              className="pixel-text text-lg md:text-xl mb-2"
              style={{ color: 'var(--color-pink)' }}
            >
              PROMPT ROULETTE
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Write the funniest answer. Everyone votes. Chaos ensues.
            </p>
          </div>

          {/* Mode Selection */}
          {!gameMode && (
            <div className="space-y-3 mb-8">
              <p className="pixel-text text-xs text-center mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                HOW ARE YOU PLAYING?
              </p>
              <button
                onClick={() => setGameMode('online')}
                className="pixel-card rounded-lg p-4 w-full text-left transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-cyan)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{'\u{1F30D}'}</span>
                  <div>
                    <span className="pixel-text text-xs block mb-1" style={{ color: 'var(--color-cyan)' }}>
                      ONLINE
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Everyone plays on their own device with a room code.
                    </span>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setGameMode('pass')}
                className="pixel-card rounded-lg p-4 w-full text-left transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{'\u{1F4F1}'}</span>
                  <div>
                    <span className="pixel-text text-xs block mb-1" style={{ color: 'var(--color-accent)' }}>
                      PASS THE PHONE
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      One device, pass it around. Perfect for parties.
                    </span>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setGameMode('room')}
                className="pixel-card rounded-lg p-4 w-full text-left transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{'\u{1F310}'}</span>
                  <div>
                    <span className="pixel-text text-xs block mb-1" style={{ color: 'var(--color-purple)' }}>
                      SAME SCREEN
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Everyone watches, take turns on one screen.
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Online Lobby */}
          {gameMode === 'online' && onlineLobbyPhase === 'choice' && (
            <div className="space-y-3 mb-8">
              <button
                onClick={() => setGameMode(null)}
                className="text-xs hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
              >
                &larr; Change mode
              </button>
              <div className="space-y-3">
                <button
                  onClick={() => setOnlineLobbyPhase('create')}
                  className="pixel-btn w-full py-3 text-sm"
                  style={{ borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' }}
                >
                  CREATE ROOM
                </button>
                <button
                  onClick={() => setOnlineLobbyPhase('join')}
                  className="w-full py-3 text-sm rounded border transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-bg-card)',
                  }}
                >
                  JOIN ROOM
                </button>
              </div>
            </div>
          )}

          {/* Online: Create or Join form */}
          {gameMode === 'online' && (onlineLobbyPhase === 'create' || onlineLobbyPhase === 'join') && (
            <div className="space-y-4 mb-8">
              <button
                onClick={() => { setOnlineLobbyPhase('choice'); setOnlineError(null); }}
                className="text-xs hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
              >
                &larr; Back
              </button>
              <h3 className="pixel-text text-xs text-center" style={{ color: 'var(--color-cyan)' }}>
                {onlineLobbyPhase === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
              </h3>
              <div>
                <label className="pixel-text block mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}>
                  YOUR NAME
                </label>
                <input
                  type="text"
                  value={onlineDisplayName}
                  onChange={(e) => setOnlineDisplayName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={16}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-border)',
                    outline: 'none',
                  }}
                />
              </div>
              {onlineLobbyPhase === 'join' && (
                <div>
                  <label className="pixel-text block mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}>
                    ROOM CODE
                  </label>
                  <input
                    type="text"
                    value={onlineJoinCode}
                    onChange={(e) => setOnlineJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ABC123"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-lg text-center pixel-text text-lg tracking-widest"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-cyan)',
                      border: '2px solid var(--color-border)',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
              {onlineError && (
                <p className="text-xs text-center" style={{ color: 'var(--color-red)' }}>{onlineError}</p>
              )}
              <button
                onClick={onlineLobbyPhase === 'create' ? handleOnlineCreateRoom : handleOnlineJoinRoom}
                disabled={onlineIsCreating}
                className="pixel-btn w-full py-3 text-sm"
                style={{
                  borderColor: 'var(--color-cyan)',
                  color: 'var(--color-cyan)',
                  opacity: onlineIsCreating ? 0.6 : 1,
                }}
              >
                {onlineIsCreating ? 'LOADING...' : onlineLobbyPhase === 'create' ? 'CREATE' : 'JOIN'}
              </button>
            </div>
          )}

          {/* Online: Waiting Room / Lobby */}
          {gameMode === 'online' && onlineLobbyPhase === 'waiting' && phase === 'setup' && (
            <div className="space-y-4 mb-8">
              {/* Room Code Display */}
              <div className="text-center">
                <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  ROOM CODE
                </p>
                <div
                  className="inline-block px-6 py-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-cyan)',
                  }}
                >
                  <span
                    className="pixel-text text-2xl tracking-[0.3em]"
                    style={{ color: 'var(--color-cyan)' }}
                  >
                    {onlineRoomCode}
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Share this code with friends
                </p>
              </div>

              {/* Player List */}
              <div
                className="pixel-card rounded-lg p-4"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                <h4
                  className="pixel-text text-xs mb-3"
                  style={{ color: 'var(--color-text-secondary)', fontSize: '0.5rem' }}
                >
                  PLAYERS ({onlinePlayers.length}/{ONLINE_MAX_PLAYERS})
                </h4>
                <div className="space-y-2">
                  {onlinePlayers.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-lg">{p.avatar}</span>
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {p.name}
                      </span>
                      {p.isHost && (
                        <span
                          className="pixel-text text-xs px-2 py-0.5 rounded"
                          style={{ color: 'var(--color-orange)', border: '1px solid var(--color-orange)', fontSize: '0.45rem' }}
                        >
                          HOST
                        </span>
                      )}
                      {p.id === onlineMyId && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(you)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start / Waiting */}
              {amHost ? (
                <div className="text-center">
                  <button
                    onClick={handleOnlineStartGame}
                    disabled={onlinePlayers.length < ONLINE_MIN_PLAYERS}
                    className="pixel-btn text-sm px-8 py-3"
                    style={{
                      borderColor: 'var(--color-cyan)',
                      color: 'var(--color-cyan)',
                      opacity: onlinePlayers.length >= ONLINE_MIN_PLAYERS ? 1 : 0.4,
                      cursor: onlinePlayers.length >= ONLINE_MIN_PLAYERS ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {onlinePlayers.length >= ONLINE_MIN_PLAYERS
                      ? 'START GAME'
                      : `WAITING FOR PLAYERS (${onlinePlayers.length}/${ONLINE_MIN_PLAYERS} min)`}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="pixel-text text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                    Waiting for host to start...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Player Count + Start (pass/room modes only) */}
          {gameMode && gameMode !== 'online' && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="pixel-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    HOW MANY PLAYERS?
                  </p>
                  <button
                    onClick={() => setGameMode(null)}
                    className="text-xs hover:opacity-80"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Change mode
                  </button>
                </div>
                <div className="flex gap-2 justify-center flex-wrap mb-3">
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                    <button
                      key={n}
                      className="w-12 h-12 rounded-lg text-sm font-bold transition-all"
                      style={{
                        backgroundColor: playerCount === n ? 'var(--color-pink)' : 'var(--color-surface)',
                        color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                        border: `2px solid ${playerCount === n ? 'var(--color-pink)' : 'var(--color-border)'}`,
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

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={() => {
                    const generated = Array.from({ length: playerCount }, (_, i) => ({
                      id: i,
                      name: `Player ${i + 1}`,
                      score: 0,
                      avatar: AVATARS[i % AVATARS.length],
                    }));
                    setPlayers(generated);
                    // Inline startGame logic since players state won't be set yet
                    const prompts = pickPrompts(PROMPTS_PER_ROUND, undefined, usedPrompts);
                    const newUsed = new Set(usedPrompts);
                    prompts.forEach((p) => newUsed.add(p.text));
                    setUsedPrompts(newUsed);
                    setRoundPrompts(prompts);
                    setCurrentPromptIndex(0);
                    setCurrentPrompt(prompts[0]);
                    setCurrentRound(1);
                    setAnswers([]);
                    setCurrentWritingPlayer(0);
                    setTimeLeft(WRITING_TIME);
                    setPhase('writing');
                    setAnswerInput('');
                  }}
                  className="pixel-btn text-sm px-8 py-3"
                  style={{
                    borderColor: 'var(--color-pink)',
                    color: 'var(--color-pink)',
                  }}
                >
                  START GAME
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: WRITING
     ================================================================ */

  if (phase === 'writing') {
    const writer = players[currentWritingPlayer];
    const isMega = currentPrompt?.category === 'mega';

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-6">
          {/* Category Badge */}
          {currentPrompt && (
            <div className="text-center mb-2">
              <span
                className="pixel-text text-xs px-3 py-1 rounded-full inline-block"
                style={{
                  color: CATEGORY_COLORS[currentPrompt.category],
                  border: `1px solid ${CATEGORY_COLORS[currentPrompt.category]}`,
                }}
              >
                {CATEGORY_LABELS[currentPrompt.category]}
              </span>
            </div>
          )}

          {/* Prompt */}
          <div
            className="pixel-card rounded-lg p-6 mb-6 text-center"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: isMega ? 'var(--color-pink)' : undefined,
              boxShadow: isMega ? '0 0 20px rgba(236, 72, 153, 0.3)' : undefined,
            }}
          >
            <p
              className="text-lg md:text-xl font-semibold leading-relaxed"
              style={{ color: 'var(--color-text)' }}
            >
              {currentPrompt?.text}
            </p>
            {isMega && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-pink)' }}>
                DOUBLE POINTS
              </p>
            )}
          </div>

          {/* Timer (room / online mode) */}
          {(gameMode === 'room' || gameMode === 'online') && <TimerBar />}

          {/* Online: private writing */}
          {gameMode === 'online' && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="pixel-text text-xs" style={{ color: 'var(--color-cyan)' }}>
                  {onlineMyAnswerSubmitted ? 'ANSWER SUBMITTED' : 'WRITE YOUR ANSWER'}
                </span>
              </div>
              {onlineMyAnswerSubmitted && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for other players...
                </p>
              )}
            </div>
          )}

          {/* Current Writer Info (pass mode) */}
          {gameMode === 'pass' && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="text-xl">{writer.avatar}</span>
                <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                  {writer.name}&apos;S TURN
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  ({currentWritingPlayer + 1}/{players.length})
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Don&apos;t let others see your answer!
              </p>
            </div>
          )}

          {/* Answer Input */}
          <div className="space-y-3">
            {/* Hide input if online and already submitted */}
            {!(isOnline && onlineMyAnswerSubmitted) && (
              <>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && answerInput.trim()) {
                        if (isOnline) handleOnlineSubmitAnswer();
                        else submitAnswer();
                      }
                    }}
                    placeholder="Write your answer..."
                    maxLength={MAX_ANSWER_LENGTH}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none border transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 mono-text text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {answerInput.length}/{MAX_ANSWER_LENGTH}
                  </span>
                </div>
                <button
                  onClick={isOnline ? handleOnlineSubmitAnswer : submitAnswer}
                  disabled={!answerInput.trim()}
                  className="pixel-btn w-full text-sm py-3"
                  style={{
                    opacity: !answerInput.trim() ? 0.4 : 1,
                    borderColor: isOnline ? 'var(--color-cyan)' : 'var(--color-accent)',
                    color: isOnline ? 'var(--color-cyan)' : 'var(--color-accent)',
                  }}
                >
                  {isOnline
                    ? 'SUBMIT ANSWER'
                    : gameMode === 'pass'
                    ? currentWritingPlayer < players.length - 1
                      ? 'SUBMIT & PASS'
                      : 'SUBMIT & REVEAL'
                    : 'SUBMIT ANSWER'}
                </button>
              </>
            )}

            {/* Online: show who has submitted */}
            {isOnline && (
              <div className="text-center mt-4">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {onlineSubmittedIds.size}/{onlinePlayers.length} answers submitted
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {onlinePlayers.map((p) => (
                    <span
                      key={p.id}
                      className="text-lg transition-opacity"
                      style={{ opacity: onlineSubmittedIds.has(p.id) ? 1 : 0.3 }}
                      title={p.name}
                    >
                      {p.avatar}
                    </span>
                  ))}
                </div>
                {amHost && onlineSubmittedIds.size >= 2 && (
                  <button
                    onClick={handleOnlineReveal}
                    className="pixel-btn text-xs mt-3 px-4"
                    style={{ borderColor: 'var(--color-orange)', color: 'var(--color-orange)' }}
                  >
                    REVEAL ANSWERS
                  </button>
                )}
              </div>
            )}

            {/* Room mode: show who has submitted */}
            {gameMode === 'room' && (
              <div className="text-center mt-4">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {answers.length}/{players.length} answers submitted
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {players.map((p) => {
                    const submitted = answers.some((a) => a.playerId === p.id);
                    return (
                      <span
                        key={p.id}
                        className="text-lg transition-opacity"
                        style={{ opacity: submitted ? 1 : 0.3 }}
                        title={p.name}
                      >
                        {p.avatar}
                      </span>
                    );
                  })}
                </div>
                {answers.length >= 2 && (
                  <button
                    onClick={handleFinishWriting}
                    className="pixel-btn text-xs mt-3 px-4"
                    style={{ borderColor: 'var(--color-orange)', color: 'var(--color-orange)' }}
                  >
                    REVEAL ANSWERS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: REVEALING
     ================================================================ */

  if (phase === 'revealing') {
    const displayAnswers = isOnline ? onlineAnswers : answers;

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-6">
          {/* Prompt reminder */}
          <div className="text-center mb-6">
            <span
              className="pixel-text text-xs"
              style={{ color: CATEGORY_COLORS[currentPrompt?.category || 'general'] }}
            >
              {CATEGORY_LABELS[currentPrompt?.category || 'general']}
            </span>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {currentPrompt?.text}
            </p>
          </div>

          {/* Answer Cards */}
          <div className="space-y-3">
            {displayAnswers.map((answer, i) => (
              <div
                key={i}
                className="transition-all duration-500"
                style={{
                  opacity: i < revealedCount ? 1 : 0,
                  transform: i < revealedCount ? 'translateY(0) rotateX(0)' : 'translateY(20px) rotateX(-90deg)',
                }}
              >
                <div
                  className="pixel-card rounded-lg p-4"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <p className="text-sm md:text-base" style={{ color: 'var(--color-text)' }}>
                    &ldquo;{answer.text}&rdquo;
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    &mdash; ???
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <span className="pixel-text text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
              REVEALING ANSWERS...
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: VOTING
     ================================================================ */

  if (phase === 'voting') {
    // Online voting: each player votes on their own device
    if (isOnline) {
      return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <Header />
          <div className="max-w-xl mx-auto px-4 py-6">
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {currentPrompt?.text}
              </p>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="pixel-text text-xs" style={{ color: 'var(--color-purple)' }}>
                  {onlineMyVoteCast ? 'VOTE CAST' : 'PICK YOUR FAVORITE'}
                </span>
              </div>
              {onlineMyVoteCast && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for other votes... ({onlineVotedIds.size}/{onlinePlayers.length})
                </p>
              )}
            </div>

            {!onlineMyVoteCast && (
              <div className="space-y-3">
                {onlineAnswers.map((answer, i) => {
                  const isOwn = answer.playerId === onlineMyId;
                  return (
                    <button
                      key={i}
                      onClick={() => !isOwn && handleOnlineVote(i)}
                      disabled={isOwn}
                      className="pixel-card rounded-lg p-4 w-full text-left transition-all"
                      style={{
                        backgroundColor: 'var(--color-bg-card)',
                        opacity: isOwn ? 0.35 : 1,
                        cursor: isOwn ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <p className="text-sm md:text-base" style={{ color: 'var(--color-text)' }}>
                        &ldquo;{answer.text}&rdquo;
                      </p>
                      {isOwn && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          (your answer)
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {onlineMyVoteCast && (
              <div className="flex justify-center gap-2 flex-wrap mt-4">
                {onlinePlayers.map((p) => (
                  <span
                    key={p.id}
                    className="text-lg transition-opacity"
                    style={{ opacity: onlineVotedIds.has(p.id) ? 1 : 0.3 }}
                    title={p.name}
                  >
                    {p.avatar}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Offline voting (pass-the-phone / room)
    const voter = players[currentVotingPlayer];

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-6">
          <div className="text-center mb-4">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {currentPrompt?.text}
            </p>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: 'var(--color-surface)' }}>
              <span className="text-xl">{voter.avatar}</span>
              <span className="pixel-text text-xs" style={{ color: 'var(--color-purple)' }}>
                {voter.name}, VOTE!
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Tap your favorite answer (you can&apos;t vote for your own)
            </p>
          </div>

          <div className="space-y-3">
            {answers.map((answer, i) => {
              const isOwnAnswer = answer.playerId === voter.id;
              return (
                <button
                  key={i}
                  onClick={() => !isOwnAnswer && castVote(i)}
                  disabled={isOwnAnswer}
                  className="pixel-card rounded-lg p-4 w-full text-left transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    opacity: isOwnAnswer ? 0.35 : 1,
                    cursor: isOwnAnswer ? 'not-allowed' : 'pointer',
                    borderColor: isOwnAnswer ? 'var(--color-border)' : undefined,
                  }}
                >
                  <p className="text-sm md:text-base" style={{ color: 'var(--color-text)' }}>
                    &ldquo;{answer.text}&rdquo;
                  </p>
                  {isOwnAnswer && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      (your answer)
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-center mt-4">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Vote {currentVotingPlayer + 1} of {players.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: RESULTS (per prompt)
     ================================================================ */

  if (phase === 'results') {
    const isMega = currentPrompt?.category === 'mega';

    if (isOnline) {
      const displayAnswers = onlineAnswers;
      const maxVotes = Math.max(...displayAnswers.map(a => a.votes), 1);
      const onlineSorted = [...onlinePlayers].sort((a, b) => b.score - a.score);

      return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <Header />
          <div className="max-w-xl mx-auto px-4 py-6">
            <div className="text-center mb-6">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {currentPrompt?.text}
              </p>
            </div>

            {onlineRoundWinner && (
              <div className="text-center mb-6 animate-scale-in">
                <span className="text-4xl">{'\u{1F451}'}</span>
                <p className="pixel-text text-sm mt-1" style={{ color: 'var(--color-orange)' }}>
                  {onlineRoundWinner.name} WINS!
                </p>
              </div>
            )}

            <div className="space-y-3">
              {[...displayAnswers]
                .sort((a, b) => b.votes - a.votes)
                .map((answer, i) => {
                  const author = onlinePlayers.find(p => p.id === answer.playerId);
                  const barWidth = maxVotes > 0 ? (answer.votes / maxVotes) * 100 : 0;
                  const isWinner = answer.votes === maxVotes && answer.votes > 0;
                  return (
                    <div
                      key={i}
                      className="pixel-card rounded-lg p-4 animate-fade-in-up"
                      style={{
                        backgroundColor: 'var(--color-bg-card)',
                        animationDelay: `${i * 100}ms`,
                        borderColor: isWinner ? 'var(--color-orange)' : undefined,
                        boxShadow: isWinner ? '0 0 12px rgba(245, 158, 11, 0.2)' : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm md:text-base flex-1" style={{ color: 'var(--color-text)' }}>
                          &ldquo;{answer.text}&rdquo;
                        </p>
                        <span className="mono-text text-sm font-bold ml-3" style={{ color: 'var(--color-accent)' }}>
                          +{answer.votes * (isMega ? MEGA_MULTIPLIER : 1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: isWinner ? 'var(--color-orange)' : 'var(--color-accent)',
                              boxShadow: isWinner ? '0 0 8px var(--color-orange)' : undefined,
                            }}
                          />
                        </div>
                        <span className="text-xs mono-text" style={{ color: 'var(--color-text-muted)' }}>
                          {answer.votes}v
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-sm">{author?.avatar}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {author?.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Mini scoreboard */}
            <div className="pixel-card rounded-lg p-3 mt-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <div className="space-y-1">
                {onlineSorted.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: i === 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
                        {i === 0 ? '\u{1F451}' : `#${i + 1}`}
                      </span>
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    </div>
                    <span className="mono-text text-xs font-bold" style={{ color: 'var(--color-accent)' }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {amHost && (
              <div className="text-center mt-8">
                <button
                  onClick={handleOnlineAdvanceToNext}
                  className="pixel-btn text-sm px-8 py-3"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  {currentPrompt?.category === 'mega'
                    ? 'FINAL RESULTS'
                    : currentPromptIndex + 1 < roundPrompts.length
                    ? 'NEXT PROMPT'
                    : currentRound < TOTAL_ROUNDS
                    ? 'NEXT ROUND'
                    : 'MEGA ROUND'}
                </button>
              </div>
            )}
            {!amHost && (
              <div className="text-center mt-8">
                <p className="pixel-text text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for host...
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Offline results
    const maxVotes = Math.max(...answers.map((a) => a.votes), 1);

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {currentPrompt?.text}
            </p>
          </div>

          {roundWinner && (
            <div className="text-center mb-6 animate-scale-in">
              <span className="text-4xl">{'\u{1F451}'}</span>
              <p className="pixel-text text-sm mt-1" style={{ color: 'var(--color-orange)' }}>
                {roundWinner.name} WINS!
              </p>
            </div>
          )}

          <div className="space-y-3">
            {[...answers]
              .sort((a, b) => b.votes - a.votes)
              .map((answer, i) => {
                const author = players.find((p) => p.id === answer.playerId);
                const barWidth = maxVotes > 0 ? (answer.votes / maxVotes) * 100 : 0;
                const isWinner = answer.votes === maxVotes && answer.votes > 0;

                return (
                  <div
                    key={i}
                    className="pixel-card rounded-lg p-4 animate-fade-in-up"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      animationDelay: `${i * 100}ms`,
                      borderColor: isWinner ? 'var(--color-orange)' : undefined,
                      boxShadow: isWinner ? '0 0 12px rgba(245, 158, 11, 0.2)' : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm md:text-base flex-1" style={{ color: 'var(--color-text)' }}>
                        &ldquo;{answer.text}&rdquo;
                      </p>
                      <span className="mono-text text-sm font-bold ml-3" style={{ color: 'var(--color-accent)' }}>
                        +{answer.votes * (isMega ? MEGA_MULTIPLIER : 1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className="flex-1 h-3 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-surface)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: isWinner ? 'var(--color-orange)' : 'var(--color-accent)',
                            boxShadow: isWinner ? '0 0 8px var(--color-orange)' : undefined,
                          }}
                        />
                      </div>
                      <span className="text-xs mono-text" style={{ color: 'var(--color-text-muted)' }}>
                        {answer.votes}v
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-sm">{author?.avatar}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {author?.name}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={advanceToNext}
              className="pixel-btn text-sm px-8 py-3"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              {currentPrompt?.category === 'mega'
                ? 'FINAL RESULTS'
                : currentPromptIndex + 1 < roundPrompts.length
                ? 'NEXT PROMPT'
                : currentRound < TOTAL_ROUNDS
                ? 'NEXT ROUND'
                : 'MEGA ROUND'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: ROUND SUMMARY
     ================================================================ */

  if (phase === 'round-summary') {
    // Online scoreboard for round summary
    const OnlineScoreboardInline = () => {
      const sorted = [...onlinePlayers].sort((a, b) => b.score - a.score);
      return (
        <div className="pixel-card rounded-lg p-4 md:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <h3 className="pixel-text text-sm mb-3" style={{ color: 'var(--color-accent)' }}>SCOREBOARD</h3>
          <div className="space-y-2">
            {sorted.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: i === 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
                    {i === 0 ? '\u{1F451}' : `#${i + 1}`}
                  </span>
                  <span className="text-lg">{p.avatar}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                </div>
                <span className="mono-text font-bold" style={{ color: 'var(--color-accent)' }}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Header />
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="text-center mb-8 animate-scale-in">
            <span className="text-5xl">{'\u{1F3AE}'}</span>
            <h2
              className="pixel-text text-lg mt-4 mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              ROUND {currentRound}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Here are the standings so far...
            </p>
          </div>

          {isOnline ? <OnlineScoreboardInline /> : <Scoreboard />}

          <div className="text-center mt-8">
            {isOnline ? (
              amHost ? (
                <button
                  onClick={handleOnlineStartNextRound}
                  className="pixel-btn text-sm px-8 py-3"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  LET&apos;S GO!
                </button>
              ) : (
                <p className="pixel-text text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for host...
                </p>
              )
            ) : (
              <button
                onClick={resetForNewPrompt}
                className="pixel-btn text-sm px-8 py-3"
                style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
              >
                LET&apos;S GO!
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: MEGA INTRO
     ================================================================ */

  if (phase === 'mega-intro') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className={`text-center px-4 ${megaIntroVisible ? 'animate-scale-in' : ''}`}>
          <div className="text-6xl md:text-8xl mb-6">{'\u{1F525}'}</div>
          <h2
            className="pixel-text text-xl md:text-3xl mb-4"
            style={{
              color: 'var(--color-pink)',
              textShadow: '0 0 20px rgba(236, 72, 153, 0.5)',
            }}
          >
            MEGA ROUND
          </h2>
          <p className="text-sm md:text-base mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            One prompt to rule them all.
          </p>
          <p
            className="pixel-text text-xs mb-8"
            style={{ color: 'var(--color-orange)' }}
          >
            DOUBLE POINTS!
          </p>

          {isOnline ? (
            <div className="pixel-card rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <h3 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-accent)' }}>SCOREBOARD</h3>
              <div className="space-y-2">
                {[...onlinePlayers].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: i === 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
                        {i === 0 ? '\u{1F451}' : `#${i + 1}`}
                      </span>
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    </div>
                    <span className="mono-text text-xs font-bold" style={{ color: 'var(--color-accent)' }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Scoreboard compact />
          )}

          <div className="mt-8">
            {isOnline ? (
              amHost ? (
                <button
                  onClick={handleOnlineStartMega}
                  className="pixel-btn text-sm px-8 py-3"
                  style={{
                    borderColor: 'var(--color-pink)',
                    color: 'var(--color-pink)',
                    boxShadow: '0 0 16px rgba(236, 72, 153, 0.3)',
                  }}
                >
                  BRING IT ON
                </button>
              ) : (
                <p className="pixel-text text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for host...
                </p>
              )
            ) : (
              <button
                onClick={startMegaRound}
                className="pixel-btn text-sm px-8 py-3"
                style={{
                  borderColor: 'var(--color-pink)',
                  color: 'var(--color-pink)',
                  boxShadow: '0 0 16px rgba(236, 72, 153, 0.3)',
                }}
              >
                BRING IT ON
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     PHASE: FINAL RESULTS
     ================================================================ */

  if (phase === 'final-results') {
    const onlineSorted = isOnline ? [...onlinePlayers].sort((a, b) => b.score - a.score) : [];
    const winner = isOnline ? onlineSorted[0] : sortedPlayers[0];
    const runnerUp = isOnline ? onlineSorted[1] : sortedPlayers[1];
    const third = isOnline ? onlineSorted[2] : sortedPlayers[2];

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <ConfettiEffect />
        <Header />
        <div className="max-w-xl mx-auto px-4 py-8">
          {/* Winner Announcement */}
          <div className="text-center mb-8 animate-scale-in">
            <span className="text-6xl md:text-7xl block mb-4">{'\u{1F3C6}'}</span>
            <h2
              className="pixel-text text-xl md:text-2xl mb-2"
              style={{
                color: 'var(--color-orange)',
                textShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
              }}
            >
              {winner.name} WINS!
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              The funniest player in the room
            </p>
          </div>

          {/* Podium */}
          <div className="flex items-end justify-center gap-2 md:gap-4 mb-8">
            {/* 2nd Place */}
            {runnerUp && (
              <div className="text-center flex-1 max-w-[120px]">
                <span className="text-3xl block mb-2">{runnerUp.avatar}</span>
                <div
                  className="rounded-t-lg p-3"
                  style={{ backgroundColor: 'var(--color-bg-card)', height: '100px' }}
                >
                  <span className="pixel-text text-xs block" style={{ color: 'var(--color-text-secondary)' }}>
                    2ND
                  </span>
                  <span className="text-xs block mt-1" style={{ color: 'var(--color-text)' }}>
                    {runnerUp.name}
                  </span>
                  <span className="mono-text text-sm font-bold block mt-1" style={{ color: 'var(--color-accent)' }}>
                    {runnerUp.score}
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            <div className="text-center flex-1 max-w-[120px]">
              <span className="text-4xl block mb-2">{winner.avatar}</span>
              <div
                className="rounded-t-lg p-3"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  height: '140px',
                  borderColor: 'var(--color-orange)',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.2)',
                }}
              >
                <span className="text-xl block">{'\u{1F451}'}</span>
                <span className="pixel-text text-xs block" style={{ color: 'var(--color-orange)' }}>
                  1ST
                </span>
                <span className="text-xs block mt-1" style={{ color: 'var(--color-text)' }}>
                  {winner.name}
                </span>
                <span className="mono-text text-lg font-bold block mt-1" style={{ color: 'var(--color-accent)' }}>
                  {winner.score}
                </span>
              </div>
            </div>

            {/* 3rd Place */}
            {third && (
              <div className="text-center flex-1 max-w-[120px]">
                <span className="text-2xl block mb-2">{third.avatar}</span>
                <div
                  className="rounded-t-lg p-3"
                  style={{ backgroundColor: 'var(--color-bg-card)', height: '70px' }}
                >
                  <span className="pixel-text text-xs block" style={{ color: 'var(--color-text-secondary)' }}>
                    3RD
                  </span>
                  <span className="text-xs block mt-1" style={{ color: 'var(--color-text)' }}>
                    {third.name}
                  </span>
                  <span className="mono-text text-sm font-bold block mt-1" style={{ color: 'var(--color-accent)' }}>
                    {third.score}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Full Scoreboard */}
          {isOnline ? (
            <div className="pixel-card rounded-lg p-4 md:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <h3 className="pixel-text text-sm mb-3" style={{ color: 'var(--color-accent)' }}>SCOREBOARD</h3>
              <div className="space-y-2">
                {onlineSorted.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: i === 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
                        {i === 0 ? '\u{1F451}' : `#${i + 1}`}
                      </span>
                      <span className="text-lg">{p.avatar}</span>
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    </div>
                    <span className="mono-text font-bold" style={{ color: 'var(--color-accent)' }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Scoreboard />
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={resetGame}
              className="pixel-btn text-sm px-6 py-3"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              PLAY AGAIN
            </button>
            <Link
              href="/games"
              className="pixel-btn text-sm px-6 py-3 inline-block"
              style={{ borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' }}
            >
              MORE GAMES
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
