'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

interface LocationRole {
  location: string;
  emoji: string;
  roles: string[];
}

type GamePhase =
  | 'menu'
  | 'lobby'
  | 'role-reveal'
  | 'questioning'
  | 'vote-called'
  | 'voting'
  | 'spy-guess'
  | 'round-results'
  | 'game-over';

type GameMode = 'pass-the-phone' | 'room-code';

interface RoundState {
  location: LocationRole;
  spyId: string;
  playerRoles: Record<string, string>;
  questioner: number; // index of current questioner
  accusedId: string | null;
  votes: Record<string, string>; // voterId -> votedForId
  calledBy: string | null;
  spyGuess: string | null;
  roundWinners: string[]; // player IDs who scored this round
}

// ============================================
// Location Data (40+ dev-themed locations)
// ============================================

const LOCATIONS: LocationRole[] = [
  {
    location: 'The Sprint Planning Meeting',
    emoji: '\ud83d\udccb',
    roles: ['Scrum Master', 'Backend Dev', 'Product Manager', 'The One Who\'s Muted', 'The Multitasker', 'The Blocker', 'The Intern Taking Notes'],
  },
  {
    location: 'The Server Room at 3am',
    emoji: '\ud83d\udda5\ufe0f',
    roles: ['On-Call Engineer', 'Security Guard', 'SRE Lead', 'The Coffee Runner', 'Panicking Manager', 'The One Who Caused the Outage'],
  },
  {
    location: 'A Hackathon',
    emoji: '\ud83d\ude80',
    roles: ['Team Lead', 'UI Designer', 'Backend Hacker', 'The Pizza Orderer', 'The One Still Setting Up', 'Judge', 'Sponsor Rep'],
  },
  {
    location: 'The AWS Console',
    emoji: '\u2601\ufe0f',
    roles: ['DevOps Engineer', 'Cost Optimizer', 'IAM Admin', 'The Accidental Root User', 'Lambda Function', 'S3 Bucket'],
  },
  {
    location: 'A Code Review',
    emoji: '\ud83d\udd0d',
    roles: ['Reviewer', 'PR Author', 'Nitpicker', 'The Approver', 'The Ghost Reviewer', 'The "LGTM" Bot', 'Tech Lead'],
  },
  {
    location: 'The Slack #random Channel',
    emoji: '\ud83d\udcac',
    roles: ['Meme Poster', 'Thread Hijacker', 'Emoji Reactor', 'The Lurker', 'GIF Responder', 'The One Who Posts in Wrong Channel'],
  },
  {
    location: 'A Technical Interview',
    emoji: '\ud83c\udfaf',
    roles: ['Interviewer', 'Candidate', 'Hiring Manager', 'The Whiteboard', 'Silent Observer', 'HR Coordinator'],
  },
  {
    location: 'The Production Database',
    emoji: '\ud83d\uddc4\ufe0f',
    roles: ['DBA', 'Backend Dev Running Queries', 'The One Who Forgot WHERE Clause', 'Read Replica', 'Migration Script', 'Backup Scheduler'],
  },
  {
    location: 'A Git Merge Conflict',
    emoji: '\ud83d\udca5',
    roles: ['Feature Branch Dev', 'Main Branch Guardian', 'The Rebaser', 'The Force Pusher', 'The One Who Uses GUI', 'Cherry Picker'],
  },
  {
    location: 'Stack Overflow',
    emoji: '\ud83d\udcda',
    roles: ['Question Asker', 'Answer Sniper', 'Duplicate Flagger', 'Comment Warrior', 'Badge Collector', 'The "Marked as Duplicate" Victim'],
  },
  {
    location: 'The Docker Container',
    emoji: '\ud83d\udc33',
    roles: ['DevOps Engineer', 'The Dockerfile', 'Orphaned Volume', 'Alpine Linux', 'The Build Cache', 'Port 8080'],
  },
  {
    location: 'A Kubernetes Cluster',
    emoji: '\u2699\ufe0f',
    roles: ['Cluster Admin', 'Pod That Keeps Crashing', 'Horizontal Autoscaler', 'ConfigMap', 'The Ingress Controller', 'Node Drainer'],
  },
  {
    location: "The CEO's Demo Day",
    emoji: '\ud83c\udfac',
    roles: ['CEO', 'Presenting Dev', 'The Clicker', 'VIP Investor', 'The Demo That Crashes', 'Marketing Lead', 'Note Taker'],
  },
  {
    location: 'A Standup That Should Have Been an Email',
    emoji: '\ud83d\udce7',
    roles: ['Facilitator', 'The Rambler', 'The "Same as Yesterday"', 'The Late Joiner', 'The Multitasker', 'The Blocker Reporter'],
  },
  {
    location: 'The Legacy Codebase',
    emoji: '\ud83c\udfda\ufe0f',
    roles: ['Archaeologist Dev', 'Original Author (Long Gone)', 'The jQuery', 'Undocumented Function', 'TODO from 2014', 'The Intern Who Has to Fix It'],
  },
  {
    location: 'npm install',
    emoji: '\ud83d\udce6',
    roles: ['Package Manager', 'node_modules Folder', 'Deprecated Dependency', 'Security Vulnerability', 'The Lock File', 'Left-Pad'],
  },
  {
    location: 'The CI/CD Pipeline',
    emoji: '\ud83d\ude87',
    roles: ['Pipeline Config', 'Flaky Test', 'Build Agent', 'The Green Checkmark', 'Deployment Trigger', 'The Failed Step'],
  },
  {
    location: "A Senior Dev's .vimrc",
    emoji: '\ud83d\udcdd',
    roles: ['Vim Enthusiast', 'Confused Onlooker', 'Plugin Manager', 'Key Binding', 'The Escape Key', 'Color Scheme'],
  },
  {
    location: "GitHub Copilot's Brain",
    emoji: '\ud83e\udd16',
    roles: ['AI Model', 'Training Data', 'Suggestion Ghost', 'The Tab Key', 'Hallucinated Import', 'Copyright Lawyer'],
  },
  {
    location: "The Intern's First PR",
    emoji: '\ud83c\udf31',
    roles: ['The Intern', 'Mentor', 'Gentle Reviewer', 'The 847 Changed Files', 'The Commit Message "fix"', 'CI Bot'],
  },
  {
    location: 'A Zoom Call With Camera Off',
    emoji: '\ud83d\udcf7',
    roles: ['Meeting Host', 'The Black Rectangle', 'Screen Sharer', 'The Echo', 'Chat Typer', 'The One Cooking Lunch'],
  },
  {
    location: 'The Staging Environment',
    emoji: '\ud83c\udfad',
    roles: ['QA Engineer', 'Staging Data', 'The "Works on My Machine" Dev', 'Feature Flag', 'Test Account', 'The Broken Seed Data'],
  },
  {
    location: 'A Bug Bounty',
    emoji: '\ud83d\udc1b',
    roles: ['Security Researcher', 'Bug Reporter', 'Triager', 'The Duplicate Reporter', 'The Critical Vuln', 'Bounty Payer'],
  },
  {
    location: "The Tech Lead's Whiteboard",
    emoji: '\ud83d\udcca',
    roles: ['Tech Lead', 'Architecture Diagram', 'The Box-and-Arrow', 'Dry Erase Marker', 'Confused Junior', 'The Eraser'],
  },
  {
    location: 'Jira Board Hell',
    emoji: '\ud83d\udccc',
    roles: ['Project Manager', 'Stuck Ticket', 'The Backlog', 'Sprint Velocity', 'Story Point Debater', 'The "In Progress" Ticket from Last Sprint'],
  },
  {
    location: 'The On-Call Rotation',
    emoji: '\ud83d\udcdf',
    roles: ['On-Call Engineer', 'PagerDuty Alert', 'The Escalation Policy', 'Runbook', 'The 3am Incident', 'The Snooze Button'],
  },
  {
    location: 'A Blockchain Startup Pitch',
    emoji: '\u26d3\ufe0f',
    roles: ['Founder', 'VC Partner', 'The Whitepaper', 'Skeptical Engineer', 'Token Holder', 'The Buzzword Generator'],
  },
  {
    location: 'The Microservices Architecture Diagram',
    emoji: '\ud83d\udee0\ufe0f',
    roles: ['Architect', 'Service Mesh', 'API Gateway', 'The Service That Does Too Much', 'Message Queue', 'The Orphaned Endpoint'],
  },
  {
    location: 'A Developer Conference',
    emoji: '\ud83c\udfa4',
    roles: ['Keynote Speaker', 'Swag Collector', 'Hallway Track Networker', 'Live Demo Coder', 'Sponsor Booth Rep', 'The One at the After-Party'],
  },
  {
    location: 'The Open Floor Plan Office',
    emoji: '\ud83c\udfe2',
    roles: ['Noise-Canceling Headphones Wearer', 'The Loud Talker', 'Standing Desk User', 'Snack Kitchen Visitor', 'The Ping Pong Player', 'Hot Desk Nomad'],
  },
  {
    location: 'Friday Deploy',
    emoji: '\ud83d\ude31',
    roles: ['The Deployer', 'The Nervous Manager', 'The "YOLO" Engineer', 'The Rollback Button', 'The Monitoring Dashboard', 'Weekend Plans (Cancelled)'],
  },
  {
    location: 'The Retrospective',
    emoji: '\ud83d\udd04',
    roles: ['Facilitator', 'The Complainer', 'The Optimist', 'Action Item Writer', 'The Silent One', 'The "Let\'s Time-Box This"'],
  },
  {
    location: 'A 1:1 With Your Manager',
    emoji: '\ud83e\udd1d',
    roles: ['Engineering Manager', 'Direct Report', 'Career Growth Discussion', 'The Awkward Feedback', 'Meeting Notes Doc', 'The Promo Packet'],
  },
  {
    location: 'The Monolith',
    emoji: '\ud83d\uddff',
    roles: ['Legacy Maintainer', 'The 50k-Line File', 'God Object', 'The "We Should Refactor" Voice', 'Circular Dependency', 'The Test Suite (0% Coverage)'],
  },
  {
    location: 'A Load Balancer',
    emoji: '\u2696\ufe0f',
    roles: ['Round Robin Algorithm', 'Health Check', 'SSL Terminator', 'The 502 Bad Gateway', 'Sticky Session', 'The Traffic Spike'],
  },
  {
    location: 'The Development Branch',
    emoji: '\ud83c\udf33',
    roles: ['Feature Dev', 'The Stale Branch', 'The Merge Commit', 'Branch Protection Rule', 'The Squash Merge Advocate', 'Commit Hash'],
  },
  {
    location: 'A Pair Programming Session',
    emoji: '\ud83d\udc65',
    roles: ['Driver', 'Navigator', 'The Backseat Coder', 'The Keyboard Hog', 'The One Checking Slack', 'Rubber Duck'],
  },
  {
    location: "The QA Team's Bug List",
    emoji: '\ud83d\udcdd',
    roles: ['QA Lead', 'Bug Reporter', 'The "Cannot Reproduce"', 'P0 Critical Bug', 'Regression Test', 'The Edge Case'],
  },
  {
    location: 'An Incident Post-Mortem',
    emoji: '\ud83d\udd25',
    roles: ['Incident Commander', 'Root Cause', 'The Timeline', 'Blameless Culture Enforcer', 'Action Item Owner', 'The Customer Who Noticed First'],
  },
  {
    location: 'The Coffee Machine Near Engineering',
    emoji: '\u2615',
    roles: ['Espresso Enthusiast', 'Decaf Drinker', 'The Machine That\'s Always Broken', 'Queue Waiter', 'The Tea Person', 'Gossip Exchangers'],
  },
  {
    location: 'A VS Code Workspace',
    emoji: '\ud83d\udcbb',
    roles: ['Extension Manager', 'Theme Changer', 'The 47 Open Tabs', 'Terminal Panel', 'GitLens Blame', 'Settings.json Tinkerer'],
  },
  {
    location: 'The Company All-Hands',
    emoji: '\ud83c\udfe6',
    roles: ['CEO Presenting', 'CTO with Slides', 'Employee #1', 'The Q&A Asker', 'Remote Attendee', 'The One Asking About Snacks'],
  },
  {
    location: 'A GitHub Issue',
    emoji: '\ud83d\udee0\ufe0f',
    roles: ['Issue Author', 'Assignee', 'The Commenter', 'The Bot That Labels', 'The "me too" Reactor', 'Stale Bot'],
  },
  {
    location: 'The Redis Cache',
    emoji: '\u26a1',
    roles: ['Cache Hit', 'Cache Miss', 'TTL Timer', 'The Eviction Policy', 'Pub/Sub Channel', 'The Memory Limit'],
  },
];

// ============================================
// Timer Settings
// ============================================

const TIMER_OPTIONS = [
  { label: '5 MIN', value: 300 },
  { label: '6 MIN', value: 360 },
  { label: '7 MIN', value: 420 },
  { label: '8 MIN', value: 480 },
];

const ROUNDS_OPTIONS = [1, 2, 3, 4, 5];

// ============================================
// Utility Functions
// ============================================

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================
// Sub-Components
// ============================================

function Timer({ seconds, isUrgent, onExpired }: { seconds: number; isUrgent: boolean; onExpired: () => void }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const expiredRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpired();
    }
  }, [seconds, onExpired]);

  return (
    <div
      className="text-center"
      style={{
        animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
      }}
    >
      <span
        className="mono-text text-4xl md:text-6xl font-bold tracking-wider"
        style={{
          color: isUrgent ? 'var(--color-red)' : 'var(--color-accent)',
          textShadow: isUrgent
            ? '0 0 20px var(--color-red), 0 0 40px var(--color-red)'
            : '0 0 10px var(--color-accent)',
        }}
      >
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function PlayerCard({
  player,
  isActive,
  isSpy,
  showSpy,
  onClick,
  selected,
  disabled,
  score,
}: {
  player: Player;
  isActive?: boolean;
  isSpy?: boolean;
  showSpy?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  score?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className="w-full p-3 rounded-lg border-2 transition-all duration-200 text-left"
      style={{
        backgroundColor: selected
          ? 'var(--color-red)'
          : isActive
            ? 'var(--color-bg-card-hover)'
            : 'var(--color-bg-card)',
        borderColor: selected
          ? 'var(--color-red)'
          : showSpy && isSpy
            ? 'var(--color-red)'
            : isActive
              ? 'var(--color-accent)'
              : 'var(--color-border)',
        opacity: disabled ? 0.5 : 1,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        color: selected ? '#fff' : 'var(--color-text)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {showSpy && isSpy ? '\ud83d\udd75\ufe0f' : '\ud83d\udc64'}
          </span>
          <span className="text-sm font-semibold">{player.name}</span>
          {isActive && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
            >
              ASKING
            </span>
          )}
        </div>
        {typeof score === 'number' && (
          <span
            className="mono-text text-xs font-bold"
            style={{ color: 'var(--color-orange)' }}
          >
            {score}pts
          </span>
        )}
      </div>
      {showSpy && isSpy && (
        <span
          className="pixel-text text-xs mt-1 block"
          style={{ color: 'var(--color-red)' }}
        >
          SPY!
        </span>
      )}
    </button>
  );
}

function LocationGrid({
  locations,
  currentLocation,
  onGuess,
  showResult,
}: {
  locations: LocationRole[];
  currentLocation?: string;
  onGuess?: (location: string) => void;
  showResult?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {locations.map((loc) => {
        const isCorrect = showResult !== undefined && loc.location === currentLocation;
        const isWrongGuess = showResult === loc.location && loc.location !== currentLocation;
        return (
          <button
            key={loc.location}
            onClick={() => onGuess?.(loc.location)}
            disabled={!onGuess}
            className="p-2 rounded border text-left text-xs transition-all duration-200"
            style={{
              backgroundColor: isCorrect
                ? 'rgba(0, 255, 136, 0.15)'
                : isWrongGuess
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'var(--color-bg-card)',
              borderColor: isCorrect
                ? 'var(--color-accent)'
                : isWrongGuess
                  ? 'var(--color-red)'
                  : 'var(--color-border)',
              cursor: onGuess ? 'pointer' : 'default',
              color: 'var(--color-text)',
            }}
          >
            <span className="mr-1">{loc.emoji}</span>
            <span className="leading-tight">{loc.location}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function SpyfallDevPage() {
  const [mounted, setMounted] = useState(false);

  // Game setup
  const [mode, setMode] = useState<GameMode>('pass-the-phone');
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [timerDuration, setTimerDuration] = useState(360);
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [roomCode, setRoomCode] = useState('');

  // Round state
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Pass-the-phone role reveal
  const [revealIndex, setRevealIndex] = useState(0);
  const [roleVisible, setRoleVisible] = useState(false);

  // Used locations tracking (to avoid repeats)
  const [usedLocations, setUsedLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // ============================================
  // Game Logic
  // ============================================

  const startNewRound = useCallback(() => {
    const available = LOCATIONS.filter((l) => !usedLocations.has(l.location));
    const pool = available.length > 0 ? available : LOCATIONS;
    const location = pool[Math.floor(Math.random() * pool.length)];

    setUsedLocations((prev) => new Set([...prev, location.location]));

    // Pick spy
    const spyIndex = Math.floor(Math.random() * players.length);
    const spyId = players[spyIndex].id;

    // Assign roles to non-spy players
    const shuffledRoles = shuffleArray(location.roles);
    const playerRoles: Record<string, string> = {};
    let roleIdx = 0;
    players.forEach((p) => {
      if (p.id === spyId) {
        playerRoles[p.id] = 'THE SPY';
      } else {
        playerRoles[p.id] = shuffledRoles[roleIdx % shuffledRoles.length];
        roleIdx++;
      }
    });

    // Random starting questioner (not the spy for fairness)
    const nonSpyIndices = players.map((_, i) => i).filter((i) => players[i].id !== spyId);
    const startQuestioner = nonSpyIndices[Math.floor(Math.random() * nonSpyIndices.length)];

    setRoundState({
      location,
      spyId,
      playerRoles,
      questioner: startQuestioner,
      accusedId: null,
      votes: {},
      calledBy: null,
      spyGuess: null,
      roundWinners: [],
    });

    setRevealIndex(0);
    setRoleVisible(false);
    setPhase('role-reveal');
  }, [players, usedLocations]);

  const startQuestioning = useCallback(() => {
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setPhase('questioning');
  }, [timerDuration]);

  const nextQuestioner = useCallback(() => {
    if (!roundState) return;
    setRoundState((prev) => {
      if (!prev) return prev;
      const next = (prev.questioner + 1) % players.length;
      return { ...prev, questioner: next };
    });
  }, [roundState, players.length]);

  const callVote = useCallback(
    (callerId: string) => {
      if (!roundState) return;
      setTimerActive(false);
      setRoundState((prev) => (prev ? { ...prev, calledBy: callerId, votes: {}, accusedId: null } : prev));
      setPhase('vote-called');
    },
    [roundState]
  );

  const selectAccused = useCallback(
    (accusedId: string) => {
      if (!roundState) return;
      setRoundState((prev) => (prev ? { ...prev, accusedId: accusedId, votes: {} } : prev));
      setPhase('voting');
    },
    [roundState]
  );

  const castVote = useCallback(
    (voterId: string, votedForId: string) => {
      if (!roundState) return;
      setRoundState((prev) => {
        if (!prev) return prev;
        const newVotes = { ...prev.votes, [voterId]: votedForId };
        return { ...prev, votes: newVotes };
      });
    },
    [roundState]
  );

  const resolveVote = useCallback(() => {
    if (!roundState || !roundState.accusedId) return;

    const guiltyVotes = Object.values(roundState.votes).filter(
      (v) => v === roundState.accusedId
    ).length;
    const majority = Math.ceil(players.length / 2);
    const accusedIsSpy = roundState.accusedId === roundState.spyId;

    if (guiltyVotes >= majority) {
      // Majority voted guilty
      if (accusedIsSpy) {
        // Spy caught! But spy gets a last guess
        setPhase('spy-guess');
      } else {
        // Wrong accusation - spy wins!
        const roundWinners = [roundState.spyId];
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === roundState.spyId ? { ...p, score: p.score + 4 } : p
          )
        );
        setRoundState((prev) => (prev ? { ...prev, roundWinners } : prev));
        setPhase('round-results');
      }
    } else {
      // No majority - resume questioning
      setTimeLeft((prev) => Math.max(prev, 30)); // At least 30s
      setTimerActive(true);
      setPhase('questioning');
    }
  }, [roundState, players.length]);

  const handleSpyGuess = useCallback(
    (guessedLocation: string) => {
      if (!roundState) return;
      const correct = guessedLocation === roundState.location.location;
      const roundWinners: string[] = [];

      if (correct) {
        // Spy guessed correctly - spy wins
        roundWinners.push(roundState.spyId);
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === roundState.spyId ? { ...p, score: p.score + 4 } : p
          )
        );
      } else {
        // Spy caught and guessed wrong - voters win
        const votersWhoWereRight = Object.entries(roundState.votes)
          .filter(([, voted]) => voted === roundState.spyId)
          .map(([voterId]) => voterId);
        roundWinners.push(...votersWhoWereRight);
        setPlayers((prev) =>
          prev.map((p) =>
            votersWhoWereRight.includes(p.id) ? { ...p, score: p.score + 2 } : p
          )
        );
      }

      setRoundState((prev) =>
        prev ? { ...prev, spyGuess: guessedLocation, roundWinners } : prev
      );
      setPhase('round-results');
    },
    [roundState]
  );

  const handleTimerExpired = useCallback(() => {
    if (!roundState) return;
    // Timer expired - spy survives, spy wins
    const roundWinners = [roundState.spyId];
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === roundState.spyId ? { ...p, score: p.score + 4 } : p
      )
    );
    setRoundState((prev) => (prev ? { ...prev, roundWinners } : prev));
    setPhase('round-results');
  }, [roundState]);

  const nextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      setPhase('game-over');
    } else {
      setCurrentRound((prev) => prev + 1);
      startNewRound();
    }
  }, [currentRound, totalRounds, startNewRound]);

  const resetGame = useCallback(() => {
    setPhase('menu');
    setPlayers([]);
    setPlayerNames(['', '', '', '']);
    setCurrentRound(1);
    setRoundState(null);
    setUsedLocations(new Set());
    setTimerActive(false);
    setRoomCode('');
  }, []);

  // ============================================
  // Lobby Handlers
  // ============================================

  const addPlayerSlot = useCallback(() => {
    if (playerNames.length >= 10) return;
    setPlayerNames((prev) => [...prev, '']);
  }, [playerNames.length]);

  const removePlayerSlot = useCallback(
    (index: number) => {
      if (playerNames.length <= 4) return;
      setPlayerNames((prev) => prev.filter((_, i) => i !== index));
    },
    [playerNames.length]
  );

  const updatePlayerName = useCallback((index: number, name: string) => {
    setPlayerNames((prev) => prev.map((n, i) => (i === index ? name : n)));
  }, []);

  const handleStartGame = useCallback(() => {
    const names = playerNames.map((n) => n.trim()).filter(Boolean);
    if (names.length < 4) return;

    const gamePlayers: Player[] = names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      score: 0,
      isHost: i === 0,
    }));

    setPlayers(gamePlayers);
    setRoomCode(generateRoomCode());
    setCurrentRound(1);
    setUsedLocations(new Set());

    // Immediately trigger round start after players are set
    // We need to use the gamePlayers directly since state won't update yet
    const available = LOCATIONS.filter((l) => !usedLocations.has(l.location));
    const pool = available.length > 0 ? available : LOCATIONS;
    const location = pool[Math.floor(Math.random() * pool.length)];

    setUsedLocations(new Set([location.location]));

    const spyIndex = Math.floor(Math.random() * gamePlayers.length);
    const spyId = gamePlayers[spyIndex].id;

    const shuffledRoles = shuffleArray(location.roles);
    const playerRoles: Record<string, string> = {};
    let roleIdx = 0;
    gamePlayers.forEach((p) => {
      if (p.id === spyId) {
        playerRoles[p.id] = 'THE SPY';
      } else {
        playerRoles[p.id] = shuffledRoles[roleIdx % shuffledRoles.length];
        roleIdx++;
      }
    });

    const nonSpyIndices = gamePlayers.map((_, i) => i).filter((i) => gamePlayers[i].id !== spyId);
    const startQuestioner = nonSpyIndices[Math.floor(Math.random() * nonSpyIndices.length)];

    setRoundState({
      location,
      spyId,
      playerRoles,
      questioner: startQuestioner,
      accusedId: null,
      votes: {},
      calledBy: null,
      spyGuess: null,
      roundWinners: [],
    });

    setRevealIndex(0);
    setRoleVisible(false);
    setPhase('role-reveal');
  }, [playerNames, usedLocations]);

  // ============================================
  // Render
  // ============================================

  if (!mounted) return null;

  // ---- MENU ----
  if (phase === 'menu') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full text-center">
          <Link
            href="/games"
            className="text-sm transition-colors hover:opacity-80 inline-block mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          <div className="mb-8">
            <span className="text-6xl block mb-4">{'\ud83d\udd75\ufe0f'}</span>
            <h1
              className="pixel-text text-base md:text-lg mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              SPYFALL
            </h1>
            <h2
              className="pixel-text text-xs mb-4"
              style={{ color: 'var(--color-purple)' }}
            >
              DEV EDITION
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              You all know where you work. Except the spy.
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => {
                setMode('pass-the-phone');
                setPhase('lobby');
              }}
              className="pixel-btn w-full py-4 text-sm"
            >
              {'\ud83d\udcf1'} PASS THE PHONE
            </button>
            <button
              onClick={() => {
                setMode('room-code');
                setPhase('lobby');
              }}
              className="pixel-btn w-full py-4 text-sm"
              style={{ borderColor: 'var(--color-purple)', color: 'var(--color-purple)' }}
            >
              {'\ud83c\udf10'} ROOM CODE
            </button>
          </div>

          {/* How to Play */}
          <div
            className="pixel-card rounded-lg p-4 text-left"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-orange)' }}
            >
              HOW TO PLAY
            </h3>
            <ol
              className="space-y-2 text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <li>1. Everyone gets a secret location + role... except the spy</li>
              <li>2. Take turns asking each other questions verbally</li>
              <li>3. Try to figure out who the spy is</li>
              <li>4. The spy tries to figure out the location</li>
              <li>5. Call a vote when you think you know the spy</li>
              <li>6. Spy wins by not getting caught OR guessing the location</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ---- LOBBY ----
  if (phase === 'lobby') {
    const validNames = playerNames.map((n) => n.trim()).filter(Boolean);
    const canStart = validNames.length >= 4;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full">
          <button
            onClick={() => setPhase('menu')}
            className="text-sm transition-colors hover:opacity-80 mb-6 inline-block"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back
          </button>

          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">{'\ud83d\udd75\ufe0f'}</span>
            <h2
              className="pixel-text text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              {mode === 'pass-the-phone' ? 'PASS THE PHONE' : 'ROOM CODE'} MODE
            </h2>
          </div>

          {/* Player Names */}
          <div className="space-y-2 mb-4">
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="pixel-text w-6 text-right flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)', fontSize: '0.5rem' }}
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updatePlayerName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  maxLength={16}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-border)',
                    outline: 'none',
                  }}
                />
                {playerNames.length > 4 && (
                  <button
                    onClick={() => removePlayerSlot(i)}
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ color: 'var(--color-red)' }}
                  >
                    &#10005;
                  </button>
                )}
              </div>
            ))}
          </div>

          {playerNames.length < 10 && (
            <button
              onClick={addPlayerSlot}
              className="w-full py-2 rounded border text-sm mb-6 transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                borderStyle: 'dashed',
              }}
            >
              + Add Player ({playerNames.length}/10)
            </button>
          )}

          {/* Settings */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-orange)' }}
            >
              SETTINGS
            </h3>

            {/* Timer */}
            <div className="mb-4">
              <label className="text-xs block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Round Timer
              </label>
              <div className="flex gap-2 flex-wrap">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTimerDuration(opt.value)}
                    className="px-3 py-1.5 rounded border text-xs transition-all"
                    style={{
                      borderColor:
                        timerDuration === opt.value ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor:
                        timerDuration === opt.value ? 'var(--color-accent-glow)' : 'transparent',
                      color:
                        timerDuration === opt.value ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <label className="text-xs block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Number of Rounds
              </label>
              <div className="flex gap-2">
                {ROUNDS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTotalRounds(r)}
                    className="w-10 h-10 rounded border text-sm transition-all"
                    style={{
                      borderColor:
                        totalRounds === r ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor:
                        totalRounds === r ? 'var(--color-accent-glow)' : 'transparent',
                      color:
                        totalRounds === r ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className="pixel-btn w-full py-3 text-sm"
            style={{
              opacity: canStart ? 1 : 0.4,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            START GAME ({validNames.length} players)
          </button>

          {!canStart && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--color-red)' }}>
              Need at least 4 players
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- ROLE REVEAL (Pass the Phone) ----
  if (phase === 'role-reveal' && roundState) {
    const currentPlayer = players[revealIndex];
    const role = roundState.playerRoles[currentPlayer.id];
    const isSpy = currentPlayer.id === roundState.spyId;
    const isLastPlayer = revealIndex >= players.length - 1;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full text-center">
          {/* Round info */}
          <div className="mb-4">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ROUND {currentRound} OF {totalRounds}
            </span>
            {roomCode && (
              <span
                className="mono-text text-xs block mt-1"
                style={{ color: 'var(--color-purple)' }}
              >
                Room: {roomCode}
              </span>
            )}
          </div>

          {!roleVisible ? (
            // Privacy screen
            <div className="animate-fade-in-up">
              <div
                className="pixel-card rounded-lg p-8 mb-6"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                <span className="text-5xl block mb-4">{'\ud83d\udcf1'}</span>
                <h2
                  className="pixel-text text-sm mb-2"
                  style={{ color: 'var(--color-accent)' }}
                >
                  PASS TO
                </h2>
                <p
                  className="pixel-text text-lg mb-6"
                  style={{ color: 'var(--color-text)' }}
                >
                  {currentPlayer.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Make sure only {currentPlayer.name} can see the screen
                </p>
              </div>

              <button
                onClick={() => setRoleVisible(true)}
                className="pixel-btn w-full py-4 text-sm"
              >
                {'\ud83d\udc41\ufe0f'} REVEAL MY ROLE
              </button>
            </div>
          ) : (
            // Role card
            <div className="animate-scale-in">
              <div
                className="pixel-card rounded-lg p-8 mb-6 border-2"
                style={{
                  backgroundColor: isSpy ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-card)',
                  borderColor: isSpy ? 'var(--color-red)' : 'var(--color-accent)',
                  boxShadow: isSpy
                    ? '0 0 30px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(239, 68, 68, 0.1)'
                    : '0 0 20px var(--color-accent-glow)',
                }}
              >
                {isSpy ? (
                  <>
                    <span className="text-6xl block mb-4">{'\ud83d\udd75\ufe0f'}</span>
                    <h2
                      className="pixel-text text-lg mb-2"
                      style={{
                        color: 'var(--color-red)',
                        textShadow: '0 0 20px var(--color-red)',
                      }}
                    >
                      YOU ARE
                    </h2>
                    <h1
                      className="pixel-text text-xl mb-4"
                      style={{
                        color: 'var(--color-red)',
                        textShadow: '0 0 30px var(--color-red)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    >
                      THE SPY
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      You don&apos;t know the location.
                      <br />
                      Figure it out from the questions!
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl block mb-3">{roundState.location.emoji}</span>
                    <label
                      className="text-xs block mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      LOCATION
                    </label>
                    <h2
                      className="pixel-text text-sm mb-4"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {roundState.location.location}
                    </h2>
                    <label
                      className="text-xs block mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      YOUR ROLE
                    </label>
                    <h3
                      className="pixel-text text-xs"
                      style={{ color: 'var(--color-purple)' }}
                    >
                      {role}
                    </h3>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  if (isLastPlayer) {
                    startQuestioning();
                  } else {
                    setRevealIndex((prev) => prev + 1);
                    setRoleVisible(false);
                  }
                }}
                className="pixel-btn w-full py-3 text-sm"
              >
                {isLastPlayer ? 'START ROUND' : 'GOT IT - NEXT PLAYER'}
              </button>
            </div>
          )}

          {/* Player progress */}
          <div className="flex justify-center gap-1 mt-6">
            {players.map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  backgroundColor:
                    i < revealIndex
                      ? 'var(--color-accent)'
                      : i === revealIndex
                        ? 'var(--color-orange)'
                        : 'var(--color-border)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- QUESTIONING PHASE ----
  if (phase === 'questioning' && roundState) {
    const isUrgent = timeLeft <= 30;
    const questioner = players[roundState.questioner];

    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-50 border-b backdrop-blur-md px-4 py-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ROUND {currentRound}/{totalRounds}
              </span>
              {roomCode && (
                <span className="mono-text text-xs" style={{ color: 'var(--color-purple)' }}>
                  {roomCode}
                </span>
              )}
            </div>
            <Timer seconds={timeLeft} isUrgent={isUrgent} onExpired={handleTimerExpired} />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Current Questioner */}
          <div
            className="pixel-card rounded-lg p-4 mb-4 text-center"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderLeft: '4px solid var(--color-accent)',
            }}
          >
            <span className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              ASKING A QUESTION
            </span>
            <span
              className="pixel-text text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              {questioner.name}
            </span>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Ask any player a question to find the spy!
            </p>
          </div>

          {/* Players */}
          <div className="space-y-2 mb-4">
            {players.map((player, i) => (
              <PlayerCard
                key={player.id}
                player={player}
                isActive={i === roundState.questioner}
                score={player.score}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={nextQuestioner}
              className="flex-1 py-3 rounded border text-sm transition-all"
              style={{
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)',
                backgroundColor: 'transparent',
              }}
            >
              NEXT QUESTIONER &rarr;
            </button>
            <button
              onClick={() => callVote(questioner.id)}
              className="flex-1 py-3 rounded border text-sm font-bold transition-all"
              style={{
                borderColor: 'var(--color-red)',
                color: 'var(--color-red)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              }}
            >
              {'\ud83d\udea8'} CALL VOTE
            </button>
          </div>

          {/* Location List (for spy reference) */}
          <details
            className="pixel-card rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <summary
              className="p-3 cursor-pointer text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {'\ud83d\uddfa\ufe0f'} ALL LOCATIONS ({LOCATIONS.length})
            </summary>
            <div className="p-3 pt-0">
              <LocationGrid locations={LOCATIONS} />
            </div>
          </details>
        </div>
      </div>
    );
  }

  // ---- VOTE CALLED ----
  if (phase === 'vote-called' && roundState) {
    const caller = players.find((p) => p.id === roundState.calledBy);

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full">
          <div className="text-center mb-6 animate-scale-in">
            <span className="text-5xl block mb-3">{'\ud83d\udea8'}</span>
            <h2
              className="pixel-text text-sm mb-1"
              style={{ color: 'var(--color-red)' }}
            >
              VOTE CALLED!
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {caller?.name} called a vote. Who do you accuse?
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onClick={() => selectAccused(player.id)}
              />
            ))}
          </div>

          <button
            onClick={() => {
              // Cancel vote, resume
              setTimeLeft((prev) => Math.max(prev, 30));
              setTimerActive(true);
              setPhase('questioning');
            }}
            className="w-full py-2 text-xs rounded border transition-all"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            CANCEL VOTE
          </button>
        </div>
      </div>
    );
  }

  // ---- VOTING ----
  if (phase === 'voting' && roundState && roundState.accusedId) {
    const accused = players.find((p) => p.id === roundState.accusedId);
    const allVoted = Object.keys(roundState.votes).length === players.length;
    const guiltyCount = Object.values(roundState.votes).filter(
      (v) => v === roundState.accusedId
    ).length;
    const innocentCount = Object.values(roundState.votes).filter(
      (v) => v !== roundState.accusedId
    ).length;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <h2
              className="pixel-text text-sm mb-2"
              style={{ color: 'var(--color-red)' }}
            >
              IS {accused?.name.toUpperCase()} THE SPY?
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Pass the phone. Each player votes.
            </p>
          </div>

          {/* Voting for each player */}
          <div className="space-y-3 mb-6">
            {players.map((player) => {
              const hasVoted = roundState.votes[player.id] !== undefined;
              const votedGuilty = roundState.votes[player.id] === roundState.accusedId;

              return (
                <div
                  key={player.id}
                  className="pixel-card rounded-lg p-3"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{player.name}</span>
                    {hasVoted ? (
                      <span
                        className="pixel-text text-xs"
                        style={{ color: votedGuilty ? 'var(--color-red)' : 'var(--color-accent)' }}
                      >
                        {votedGuilty ? 'GUILTY' : 'INNOCENT'}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => castVote(player.id, roundState.accusedId!)}
                          className="px-3 py-1 rounded border text-xs"
                          style={{
                            borderColor: 'var(--color-red)',
                            color: 'var(--color-red)',
                          }}
                        >
                          GUILTY
                        </button>
                        <button
                          onClick={() => castVote(player.id, '')}
                          className="px-3 py-1 rounded border text-xs"
                          style={{
                            borderColor: 'var(--color-accent)',
                            color: 'var(--color-accent)',
                          }}
                        >
                          INNOCENT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote Tally */}
          <div
            className="pixel-card rounded-lg p-4 mb-4 text-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <div className="flex justify-center gap-8">
              <div>
                <span
                  className="mono-text text-2xl font-bold block"
                  style={{ color: 'var(--color-red)' }}
                >
                  {guiltyCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Guilty
                </span>
              </div>
              <div>
                <span
                  className="mono-text text-2xl font-bold block"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {innocentCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Innocent
                </span>
              </div>
            </div>
          </div>

          {allVoted && (
            <button
              onClick={resolveVote}
              className="pixel-btn w-full py-3 text-sm animate-fade-in-up"
            >
              REVEAL RESULTS
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- SPY GUESS ----
  if (phase === 'spy-guess' && roundState) {
    const spy = players.find((p) => p.id === roundState.spyId);

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full">
          <div className="text-center mb-6 animate-scale-in">
            <span className="text-5xl block mb-3">{'\ud83d\udd75\ufe0f'}</span>
            <h2
              className="pixel-text text-sm mb-1"
              style={{ color: 'var(--color-red)' }}
            >
              SPY CAUGHT!
            </h2>
            <p
              className="pixel-text text-lg mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              {spy?.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              But the spy gets one last chance!
              <br />
              Guess the correct location to still win.
            </p>
          </div>

          <div className="mb-4">
            <h3
              className="pixel-text text-xs mb-3 text-center"
              style={{ color: 'var(--color-orange)' }}
            >
              CHOOSE THE LOCATION
            </h3>
            <LocationGrid
              locations={LOCATIONS}
              onGuess={handleSpyGuess}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- ROUND RESULTS ----
  if (phase === 'round-results' && roundState) {
    const spy = players.find((p) => p.id === roundState.spyId);
    const spySurvived = roundState.roundWinners.includes(roundState.spyId);
    const spyGuessedCorrectly =
      roundState.spyGuess === roundState.location.location;

    let resultTitle = '';
    let resultSubtitle = '';
    let resultColor = 'var(--color-accent)';

    if (spySurvived && spyGuessedCorrectly) {
      resultTitle = 'SPY WINS!';
      resultSubtitle = `${spy?.name} guessed the location correctly!`;
      resultColor = 'var(--color-red)';
    } else if (spySurvived && !roundState.spyGuess) {
      resultTitle = 'SPY WINS!';
      resultSubtitle = timeLeft <= 0
        ? `Time ran out! ${spy?.name} survived!`
        : `Wrong accusation! ${spy?.name} was not the spy!`;
      resultColor = 'var(--color-red)';
    } else if (spySurvived) {
      resultTitle = 'SPY WINS!';
      resultSubtitle = `${spy?.name} outsmarted everyone!`;
      resultColor = 'var(--color-red)';
    } else {
      resultTitle = 'SPY CAUGHT!';
      resultSubtitle = `${spy?.name} failed to guess the location!`;
      resultColor = 'var(--color-accent)';
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full text-center">
          <div className="animate-scale-in">
            <span className="text-6xl block mb-4">
              {spySurvived ? '\ud83d\udd75\ufe0f' : '\ud83c\udfc6'}
            </span>
            <h2
              className="pixel-text text-lg mb-2"
              style={{ color: resultColor, textShadow: `0 0 20px ${resultColor}` }}
            >
              {resultTitle}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {resultSubtitle}
            </p>
          </div>

          {/* Location Reveal */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderLeft: '4px solid var(--color-accent)',
            }}
          >
            <span className="text-3xl block mb-2">{roundState.location.emoji}</span>
            <label className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>
              THE LOCATION WAS
            </label>
            <p
              className="pixel-text text-xs"
              style={{ color: 'var(--color-accent)' }}
            >
              {roundState.location.location}
            </p>
          </div>

          {/* Spy Guess Result */}
          {roundState.spyGuess && (
            <div
              className="pixel-card rounded-lg p-3 mb-4"
              style={{
                backgroundColor: spyGuessedCorrectly
                  ? 'rgba(0, 255, 136, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              }}
            >
              <span
                className="text-xs"
                style={{
                  color: spyGuessedCorrectly ? 'var(--color-accent)' : 'var(--color-red)',
                }}
              >
                Spy guessed: &quot;{roundState.spyGuess}&quot;
                {spyGuessedCorrectly ? ' - CORRECT!' : ' - WRONG!'}
              </span>
            </div>
          )}

          {/* Scoreboard */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-orange)' }}
            >
              SCOREBOARD
            </h3>
            <div className="space-y-2">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((player, i) => {
                  const wonThisRound = roundState.roundWinners.includes(player.id);
                  const wasSpy = player.id === roundState.spyId;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded"
                      style={{
                        backgroundColor: wonThisRound
                          ? 'var(--color-accent-glow)'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {i === 0 ? '\ud83e\udd47' : i === 1 ? '\ud83e\udd48' : i === 2 ? '\ud83e\udd49' : '\u2003'}
                        </span>
                        <span className="text-sm">{player.name}</span>
                        {wasSpy && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: 'var(--color-red)',
                            }}
                          >
                            SPY
                          </span>
                        )}
                        {wonThisRound && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            +{wasSpy ? '4' : '2'}
                          </span>
                        )}
                      </div>
                      <span
                        className="mono-text text-sm font-bold"
                        style={{ color: 'var(--color-orange)' }}
                      >
                        {player.score}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <button onClick={nextRound} className="pixel-btn w-full py-3 text-sm">
            {currentRound >= totalRounds ? 'FINAL RESULTS' : `ROUND ${currentRound + 1} OF ${totalRounds}`}
          </button>
        </div>
      </div>
    );
  }

  // ---- GAME OVER ----
  if (phase === 'game-over') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-md w-full text-center">
          <div className="animate-scale-in mb-8">
            <span className="text-6xl block mb-4">{'\ud83c\udfc6'}</span>
            <h1
              className="pixel-text text-lg mb-2"
              style={{
                color: 'var(--color-accent)',
                textShadow: '0 0 20px var(--color-accent)',
              }}
            >
              GAME OVER
            </h1>
            <h2
              className="pixel-text text-sm mb-1"
              style={{ color: 'var(--color-orange)' }}
            >
              WINNER
            </h2>
            <p
              className="pixel-text text-xl"
              style={{
                color: 'var(--color-accent)',
                textShadow: '0 0 15px var(--color-accent)',
              }}
            >
              {winner.name}
            </p>
            <p
              className="mono-text text-2xl font-bold mt-2"
              style={{ color: 'var(--color-orange)' }}
            >
              {winner.score} POINTS
            </p>
          </div>

          {/* Final Standings */}
          <div
            className="pixel-card rounded-lg p-4 mb-8"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3
              className="pixel-text text-xs mb-4"
              style={{ color: 'var(--color-orange)' }}
            >
              FINAL STANDINGS
            </h3>
            <div className="space-y-3">
              {sorted.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      i === 0 ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                    border: i === 0 ? '1px solid var(--color-accent)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {i === 0
                        ? '\ud83e\udd47'
                        : i === 1
                          ? '\ud83e\udd48'
                          : i === 2
                            ? '\ud83e\udd49'
                            : `#${i + 1}`}
                    </span>
                    <span className="text-sm font-semibold">{player.name}</span>
                  </div>
                  <span
                    className="mono-text text-lg font-bold"
                    style={{ color: 'var(--color-orange)' }}
                  >
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={resetGame} className="pixel-btn w-full py-3 text-sm">
              PLAY AGAIN
            </button>
            <Link
              href="/games"
              className="block text-center text-sm py-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              &larr; Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
