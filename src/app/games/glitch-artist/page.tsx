'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────
interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  playerIndex: number;
}

interface Player {
  name: string;
  color: string;
  hasDrawn: boolean;
  votes: number;
}

type GamePhase =
  | 'setup'
  | 'peek'
  | 'drawing'
  | 'gallery'
  | 'vote'
  | 'reveal'
  | 'scores';

// ─── Player colors ──────────────────────────────────────────────
const PLAYER_COLORS = [
  '#ff4444', '#44aaff', '#ffcc00', '#44ff88',
  '#ff66cc', '#ff8833', '#aa66ff', '#00dddd',
  '#88ff44', '#ff6666',
];

// ─── Drawing prompts (120) ──────────────────────────────────────
const PROMPTS: string[] = [
  // Animals (20)
  'A cat', 'A dog', 'A fish', 'A bird', 'A snake',
  'A spider', 'A butterfly', 'An elephant', 'A penguin', 'A frog',
  'A shark', 'A turtle', 'A rabbit', 'A horse', 'An octopus',
  'A dinosaur', 'A whale', 'A monkey', 'A bear', 'A duck',
  // Food (20)
  'A pizza slice', 'A burger', 'An ice cream cone', 'A cupcake', 'A banana',
  'A taco', 'Sushi', 'A hot dog', 'A donut', 'A cookie',
  'An apple', 'A watermelon', 'A fried egg', 'A carrot', 'A pretzel',
  'A popsicle', 'A birthday cake', 'A bowl of ramen', 'A piece of cheese', 'A cherry',
  // Objects (20)
  'A rocket', 'A guitar', 'A bicycle', 'An umbrella', 'A clock',
  'A light bulb', 'A key', 'A camera', 'A pair of scissors', 'A book',
  'A sword', 'A crown', 'A diamond', 'A magnifying glass', 'A telescope',
  'A laptop', 'A phone', 'A candle', 'A trophy', 'A hammer',
  // Places (20)
  'A house', 'A castle', 'A volcano', 'A mountain', 'An island',
  'A bridge', 'A lighthouse', 'A tent', 'A skyscraper', 'A church',
  'A farm', 'A school', 'A hospital', 'A spaceship', 'A pirate ship',
  'A train station', 'A playground', 'A library', 'An igloo', 'A windmill',
  // Actions (20)
  'Swimming', 'Dancing', 'Sleeping', 'Cooking', 'Surfing',
  'Skiing', 'Fishing', 'Running', 'Flying a kite', 'Riding a horse',
  'Playing piano', 'Juggling', 'Skateboarding', 'Climbing a ladder', 'Painting',
  'Singing', 'Boxing', 'Snowboarding', 'Diving', 'Archery',
  // Abstract (20)
  'Lightning', 'A rainbow', 'A sunset', 'A tornado', 'Fire',
  'A ghost', 'An alien', 'A robot', 'A heart', 'A star',
  'A skull', 'Music notes', 'A bomb', 'A UFO', 'A dragon',
  'A wizard', 'A superhero', 'A zombie', 'A mermaid', 'An angel',
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Main Component ─────────────────────────────────────────────
export default function GlitchArtistPage() {
  const [mounted, setMounted] = useState(false);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(5);
  const [glitchIndex, setGlitchIndex] = useState(-1);
  const [prompt, setPrompt] = useState('');
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());
  const [currentPeekIndex, setCurrentPeekIndex] = useState(0);
  const [peekRevealed, setPeekRevealed] = useState(false);
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFinishedStroke, setHasFinishedStroke] = useState(false);
  const [votingPlayerIndex, setVotingPlayerIndex] = useState(0);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [glitchGuess, setGlitchGuess] = useState('');
  const [glitchGuessResult, setGlitchGuessResult] = useState<boolean | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [totalScores, setTotalScores] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [showPassScreen, setShowPassScreen] = useState(false);
  const [passTarget, setPassTarget] = useState('');
  const [passCallback, setPassCallback] = useState<(() => void) | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Canvas helpers ─────────────────────────────────────────
  const getCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const w = Math.min(containerRef.current.clientWidth - 16, 500);
      return { width: w, height: w };
    }
    return { width: 340, height: 340 };
  }, []);

  const redrawCanvas = useCallback((allStrokes: Stroke[], activeStroke?: Point[], activeColor?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all saved strokes
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Draw current active stroke
    if (activeStroke && activeStroke.length >= 2 && activeColor) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(activeStroke[0].x, activeStroke[0].y);
      for (let i = 1; i < activeStroke.length; i++) {
        ctx.lineTo(activeStroke[i].x, activeStroke[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Redraw when strokes change
  useEffect(() => {
    if (phase === 'drawing' || phase === 'gallery' || phase === 'vote' || phase === 'reveal') {
      redrawCanvas(strokes);
    }
  }, [strokes, phase, redrawCanvas]);

  // Resize canvas
  useEffect(() => {
    if (!mounted) return;
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = getCanvasSize();
      canvas.width = size.width;
      canvas.height = size.height;
      redrawCanvas(strokes);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted, getCanvasSize, redrawCanvas, strokes]);

  // Drawing timer countdown
  useEffect(() => {
    if (countdownTimer === null || countdownTimer <= 0) return;
    const interval = setInterval(() => {
      setCountdownTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownTimer]);

  // Auto-submit when timer runs out
  useEffect(() => {
    if (countdownTimer === 0 && phase === 'drawing' && !hasFinishedStroke) {
      handleFinishStroke();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownTimer]);

  // ─── Canvas drawing events ─────────────────────────────────
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (hasFinishedStroke || phase !== 'drawing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setCurrentStroke([pos]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || hasFinishedStroke || phase !== 'drawing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    setCurrentStroke(prev => {
      const updated = [...prev, pos];
      redrawCanvas(strokes, updated, players[currentDrawerIndex]?.color);
      return updated;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || phase !== 'drawing') return;
    setIsDrawing(false);
    if (currentStroke.length >= 2) {
      setHasFinishedStroke(true);
      // Redraw with the stroke locked
      redrawCanvas(strokes, currentStroke, players[currentDrawerIndex]?.color);
    }
  };

  // ─── Game logic ─────────────────────────────────────────────
  const COLOR_NAMES = ['Red', 'Blue', 'Gold', 'Green', 'Pink', 'Orange', 'Purple', 'Teal', 'Lime', 'Coral'];

  const startGame = () => {
    if (players.length < 4) return;
    const gi = Math.floor(Math.random() * players.length);
    setGlitchIndex(gi);

    // Pick a prompt not yet used
    let available = PROMPTS.filter(p => !usedPrompts.has(p));
    if (available.length === 0) {
      setUsedPrompts(new Set());
      available = [...PROMPTS];
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    setPrompt(chosen);
    setUsedPrompts(prev => new Set([...prev, chosen]));

    setStrokes([]);
    setCurrentPeekIndex(0);
    setPeekRevealed(false);
    setCurrentDrawerIndex(0);
    setVotes({});
    setVotingPlayerIndex(0);
    setGlitchGuess('');
    setGlitchGuessResult(null);
    setRound(prev => prev + 1);

    // Randomize draw order
    const shuffledIndices = shuffleArray(players.map((_, i) => i));
    setDrawOrder(shuffledIndices);

    setRoundScores(new Array(players.length).fill(0));
    if (totalScores.length !== players.length) {
      setTotalScores(new Array(players.length).fill(0));
    }

    // Reset players' hasDrawn
    setPlayers(prev => prev.map(p => ({ ...p, hasDrawn: false, votes: 0 })));

    setPhase('peek');
  };

  const [drawOrder, setDrawOrder] = useState<number[]>([]);

  // ─── Pass the phone screen ─────────────────────────────────
  const showPass = (targetName: string, callback: () => void) => {
    setPassTarget(targetName);
    setPassCallback(() => callback);
    setShowPassScreen(true);
  };

  const confirmPass = () => {
    setShowPassScreen(false);
    if (passCallback) passCallback();
  };

  // ─── Peek phase ─────────────────────────────────────────────
  const handlePeekReveal = () => {
    setPeekRevealed(true);
  };

  const handlePeekNext = () => {
    setPeekRevealed(false);
    const nextIndex = currentPeekIndex + 1;
    if (nextIndex >= players.length) {
      // All players have peeked; start drawing
      setCurrentDrawerIndex(0);
      setHasFinishedStroke(false);
      setCurrentStroke([]);
      setCountdownTimer(30);
      showPass(players[drawOrder[0]].name, () => {
        setPhase('drawing');
      });
    } else {
      setCurrentPeekIndex(nextIndex);
      showPass(players[nextIndex].name, () => {
        // stays in peek
      });
    }
  };

  // ─── Drawing phase ─────────────────────────────────────────
  const handleFinishStroke = () => {
    const drawerActualIndex = drawOrder[currentDrawerIndex];
    if (currentStroke.length >= 2) {
      const newStroke: Stroke = {
        points: [...currentStroke],
        color: players[drawerActualIndex].color,
        playerIndex: drawerActualIndex,
      };
      setStrokes(prev => [...prev, newStroke]);
    }

    const nextDrawer = currentDrawerIndex + 1;
    if (nextDrawer >= players.length) {
      // All players have drawn
      setPhase('gallery');
      setCountdownTimer(null);
    } else {
      setCurrentStroke([]);
      setHasFinishedStroke(false);
      setCurrentDrawerIndex(nextDrawer);
      setCountdownTimer(30);
      showPass(players[drawOrder[nextDrawer]].name, () => {
        // continues drawing phase
      });
    }
  };

  // ─── Voting phase ─────────────────────────────────────────
  const startVoting = () => {
    setVotingPlayerIndex(0);
    setVotes({});
    showPass(players[0].name, () => {
      setPhase('vote');
    });
  };

  const castVote = (votedForIndex: number) => {
    setVotes(prev => ({
      ...prev,
      [votedForIndex]: (prev[votedForIndex] || 0) + 1,
    }));

    const nextVoter = votingPlayerIndex + 1;
    if (nextVoter >= players.length) {
      // All votes cast, go to reveal
      calculateScores(votes, votedForIndex);
    } else {
      setVotingPlayerIndex(nextVoter);
      showPass(players[nextVoter].name, () => {
        // continues voting
      });
    }
  };

  const calculateScores = (currentVotes: Record<number, number>, lastVotedFor: number) => {
    // Include the last vote
    const finalVotes = { ...currentVotes };
    finalVotes[lastVotedFor] = (finalVotes[lastVotedFor] || 0) + 1;
    // Wait, we already added it above in castVote. Let me recount.
    // Actually castVote already sets votes, so we need final votes from state + the last one
    // But state may not have updated yet. Let's just use the finalVotes we built.
    // Actually the setVotes in castVote is async. We pass the accumulated votes here.
    // Let me just recompute: currentVotes doesn't include the last vote yet.
    // castVote does setVotes first, but the state won't be updated yet.
    // So finalVotes = currentVotes + lastVotedFor
    // That's what we have above. Good.

    const scores = new Array(players.length).fill(0);
    const glitchVotes = finalVotes[glitchIndex] || 0;
    const caught = glitchVotes > players.length / 2;

    if (caught) {
      // Glitch Artist was caught: everyone except glitch gets 2 points
      for (let i = 0; i < players.length; i++) {
        if (i !== glitchIndex) scores[i] += 2;
      }
    } else {
      // Glitch Artist escaped: glitch gets 3 points
      scores[glitchIndex] += 3;
    }

    setRoundScores(scores);

    // Update players with vote counts for display
    setPlayers(prev => prev.map((p, i) => ({
      ...p,
      votes: finalVotes[i] || 0,
    })));

    setPhase('reveal');
  };

  const handleGlitchGuess = () => {
    const guess = glitchGuess.trim().toLowerCase();
    const actual = prompt.toLowerCase().replace(/^(a |an |the )/, '');
    const guessClean = guess.replace(/^(a |an |the )/, '');
    const correct = actual.includes(guessClean) || guessClean.includes(actual);
    setGlitchGuessResult(correct);
    if (correct) {
      // Glitch Artist guessed correctly: they get 2 bonus points
      setRoundScores(prev => {
        const updated = [...prev];
        updated[glitchIndex] += 2;
        return updated;
      });
    }
  };

  const goToScores = () => {
    setTotalScores(prev => prev.map((s, i) => s + roundScores[i]));
    setPhase('scores');
  };

  const nextRound = () => {
    startGame();
  };

  const newGame = () => {
    setPlayers([]);
    setTotalScores([]);
    setRound(0);
    setUsedPrompts(new Set());
    setPhase('setup');
  };

  // ─── Render ─────────────────────────────────────────────────
  if (!mounted) return null;

  // ─── Pass the phone overlay ─────────────────────────────────
  if (showPassScreen) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-sm w-full">
          <div
            className="pixel-card rounded-lg p-8"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="pixel-text text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              PASS THE PHONE TO
            </p>
            <h2 className="pixel-text text-xl mb-8" style={{ color: 'var(--color-accent)' }}>
              {passTarget}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
              Make sure no one else is looking!
            </p>
            <button onClick={confirmPass} className="pixel-btn text-sm px-6 py-3">
              I&apos;m {passTarget} - Ready!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SETUP PHASE ──────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Arcade
          </Link>

          <h1 className="pixel-text text-xl md:text-2xl mb-2" style={{ color: 'var(--color-accent)' }}>
            GLITCH ARTIST
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Everyone draws. One fakes it. Spot the fraud.
          </p>

          {/* How to play */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-purple)' }}>
              HOW TO PLAY
            </h3>
            <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Add 4-10 players on one device</li>
              <li>Everyone peeks at their prompt (one sees &quot;???&quot;)</li>
              <li>Take turns drawing ONE stroke each</li>
              <li>Discuss and vote: who is the Glitch Artist?</li>
              <li>If caught, the Glitch Artist can guess the prompt to steal points!</li>
            </ol>
          </div>

          {/* Player count */}
          <div
            className="pixel-card rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h3 className="pixel-text text-xs mb-4 text-center" style={{ color: 'var(--color-text)' }}>
              HOW MANY PLAYERS?
            </h3>

            <div className="flex gap-2 justify-center flex-wrap mb-4">
              {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  className="w-12 h-12 rounded-lg text-sm font-bold transition-all"
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

            {/* Color preview */}
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: playerCount }, (_, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PLAYER_COLORS[i] }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{COLOR_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              const generated = Array.from({ length: playerCount }, (_, i) => ({
                name: COLOR_NAMES[i],
                color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                hasDrawn: false,
                votes: 0,
              }));
              setPlayers(generated);
              // Inline startGame since we need players set
              const gi = Math.floor(Math.random() * playerCount);
              setGlitchIndex(gi);
              let available = PROMPTS.filter(p => !usedPrompts.has(p));
              if (available.length === 0) {
                setUsedPrompts(new Set());
                available = [...PROMPTS];
              }
              const chosen = available[Math.floor(Math.random() * available.length)];
              setPrompt(chosen);
              setUsedPrompts(prev => new Set([...prev, chosen]));
              setStrokes([]);
              setCurrentPeekIndex(0);
              setPeekRevealed(false);
              setCurrentDrawerIndex(0);
              setVotes({});
              setVotingPlayerIndex(0);
              setGlitchGuess('');
              setGlitchGuessResult(null);
              setRound(prev => prev + 1);
              const shuffledIndices = shuffleArray(Array.from({ length: playerCount }, (_, i) => i));
              setDrawOrder(shuffledIndices);
              setRoundScores(new Array(playerCount).fill(0));
              setTotalScores(prev => prev.length !== playerCount ? new Array(playerCount).fill(0) : prev);
              setPhase('peek');
            }}
            className="pixel-btn w-full py-3"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  // ─── PEEK PHASE ───────────────────────────────────────────
  if (phase === 'peek') {
    const isGlitch = currentPeekIndex === glitchIndex;
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center max-w-sm w-full">
          <div
            className="pixel-card rounded-lg p-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              ROUND {round} - PEEK
            </p>
            <h2 className="pixel-text text-lg mb-6" style={{ color: players[currentPeekIndex].color }}>
              {players[currentPeekIndex].name}
            </h2>

            {!peekRevealed ? (
              <button onClick={handlePeekReveal} className="pixel-btn text-sm px-6 py-3">
                TAP TO PEEK
              </button>
            ) : (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {isGlitch ? 'You are the...' : 'Draw this:'}
                </p>
                <div
                  className="pixel-card rounded-lg p-4 mb-6"
                  style={{
                    backgroundColor: isGlitch ? 'rgba(239,68,68,0.15)' : 'rgba(0,255,136,0.1)',
                    border: isGlitch ? '2px solid var(--color-red)' : '2px solid var(--color-accent)',
                  }}
                >
                  <p
                    className="pixel-text text-lg"
                    style={{ color: isGlitch ? 'var(--color-red)' : 'var(--color-accent)' }}
                  >
                    {isGlitch ? 'GLITCH ARTIST' : prompt}
                  </p>
                  {isGlitch && (
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      You don&apos;t know the prompt. Fake it!
                    </p>
                  )}
                </div>
                <button onClick={handlePeekNext} className="pixel-btn text-sm px-6 py-3">
                  GOT IT - NEXT
                </button>
              </div>
            )}

            <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              {currentPeekIndex + 1} / {players.length}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── DRAWING PHASE ────────────────────────────────────────
  if (phase === 'drawing') {
    const drawerActualIndex = drawOrder[currentDrawerIndex];
    const drawerPlayer = players[drawerActualIndex];
    return (
      <div
        className="min-h-screen p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: drawerPlayer.color }} />
              <span className="pixel-text text-xs" style={{ color: drawerPlayer.color }}>
                {drawerPlayer.name}
              </span>
            </div>
            <span className="pixel-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {currentDrawerIndex + 1}/{players.length}
            </span>
          </div>

          {/* Timer */}
          {countdownTimer !== null && (
            <div className="flex justify-center mb-3">
              <span
                className="pixel-text text-sm"
                style={{
                  color: countdownTimer <= 10 ? 'var(--color-red)' : 'var(--color-orange)',
                }}
              >
                {countdownTimer}s
              </span>
            </div>
          )}

          {/* Canvas */}
          <div
            ref={containerRef}
            className="flex justify-center mb-4"
          >
            <canvas
              ref={canvasRef}
              className="rounded-lg touch-none"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '3px solid var(--color-border)',
                maxWidth: '100%',
                cursor: hasFinishedStroke ? 'default' : 'crosshair',
              }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>

          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {hasFinishedStroke
              ? 'Stroke complete! Tap Done to pass the phone.'
              : 'Draw ONE continuous stroke. Lift to finish.'}
          </p>

          <div className="flex gap-3 justify-center">
            {hasFinishedStroke ? (
              <button onClick={handleFinishStroke} className="pixel-btn text-sm px-6 py-3">
                DONE - PASS PHONE
              </button>
            ) : (
              <button
                onClick={() => {
                  // Skip drawing (submit empty stroke)
                  setHasFinishedStroke(true);
                  handleFinishStroke();
                }}
                className="text-xs px-4 py-2 rounded transition-colors"
                style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              >
                SKIP
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── GALLERY PHASE ────────────────────────────────────────
  if (phase === 'gallery') {
    return (
      <div
        className="min-h-screen p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto text-center">
          <h2 className="pixel-text text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
            THE MASTERPIECE
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Discuss! Who seems suspicious?
          </p>

          {/* Canvas display */}
          <div ref={containerRef} className="flex justify-center mb-4">
            <canvas
              ref={canvasRef}
              className="rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '3px solid var(--color-border)',
                maxWidth: '100%',
              }}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {drawOrder.map((playerIdx, drawIdx) => (
              <div key={drawIdx} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: players[playerIdx].color }} />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {players[playerIdx].name}
                </span>
              </div>
            ))}
          </div>

          <button onClick={startVoting} className="pixel-btn text-sm px-6 py-3">
            START VOTING
          </button>
        </div>
      </div>
    );
  }

  // ─── VOTE PHASE ───────────────────────────────────────────
  if (phase === 'vote') {
    return (
      <div
        className="min-h-screen p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto text-center">
          <p className="pixel-text text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            VOTE - {players[votingPlayerIndex].name}
          </p>
          <h2 className="pixel-text text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
            Who is the Glitch Artist?
          </h2>

          <div className="space-y-3 max-w-sm mx-auto">
            {players.map((player, i) => {
              if (i === votingPlayerIndex) return null; // Can't vote for yourself
              return (
                <button
                  key={i}
                  onClick={() => castVote(i)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '2px solid var(--color-border)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = player.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  }}
                >
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: player.color }} />
                  <span className="text-sm">{player.name}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            {votingPlayerIndex + 1} / {players.length}
          </p>
        </div>
      </div>
    );
  }

  // ─── REVEAL PHASE ─────────────────────────────────────────
  if (phase === 'reveal') {
    const glitchPlayer = players[glitchIndex];
    const glitchVotes = glitchPlayer.votes;
    const caught = glitchVotes > players.length / 2;

    return (
      <div
        className="min-h-screen p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto text-center">
          <h2 className="pixel-text text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
            THE REVEAL
          </h2>

          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            The prompt was: <span className="pixel-text text-xs" style={{ color: 'var(--color-orange)' }}>&quot;{prompt}&quot;</span>
          </p>

          <div
            className="pixel-card rounded-lg p-6 mb-6"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: `3px solid ${caught ? 'var(--color-accent)' : 'var(--color-red)'}`,
            }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              The Glitch Artist was...
            </p>
            <h3 className="pixel-text text-lg mb-3" style={{ color: glitchPlayer.color }}>
              {glitchPlayer.name}
            </h3>
            <p className="text-sm" style={{ color: caught ? 'var(--color-accent)' : 'var(--color-red)' }}>
              {caught
                ? `CAUGHT! (${glitchVotes} votes)`
                : `ESCAPED! Only ${glitchVotes} vote${glitchVotes !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Vote breakdown */}
          <div className="mb-6">
            <h4 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              VOTE BREAKDOWN
            </h4>
            <div className="space-y-2 max-w-sm mx-auto">
              {players
                .map((p, i) => ({ ...p, originalIndex: i }))
                .sort((a, b) => b.votes - a.votes)
                .map(player => (
                  <div
                    key={player.originalIndex}
                    className="flex items-center justify-between px-3 py-2 rounded"
                    style={{
                      backgroundColor: player.originalIndex === glitchIndex
                        ? 'rgba(239,68,68,0.15)'
                        : 'var(--color-surface)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: player.color }} />
                      <span className="text-sm">
                        {player.name}
                        {player.originalIndex === glitchIndex && (
                          <span className="pixel-text text-xs ml-2" style={{ color: 'var(--color-red)' }}>
                            GLITCH
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="mono-text text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {player.votes} vote{player.votes !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Glitch Artist guess (only if caught) */}
          {caught && glitchGuessResult === null && (
            <div
              className="pixel-card rounded-lg p-4 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <p className="pixel-text text-xs mb-3" style={{ color: 'var(--color-purple)' }}>
                LAST CHANCE
              </p>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {glitchPlayer.name}, guess the prompt for +2 bonus points!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={glitchGuess}
                  onChange={e => setGlitchGuess(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && glitchGuess.trim() && handleGlitchGuess()}
                  placeholder="What was the prompt?"
                  className="flex-1 px-3 py-2 rounded text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-border)',
                  }}
                />
                <button
                  onClick={handleGlitchGuess}
                  disabled={!glitchGuess.trim()}
                  className="pixel-btn text-xs px-4 py-2 disabled:opacity-30"
                >
                  GUESS
                </button>
              </div>
              <button
                onClick={() => setGlitchGuessResult(false)}
                className="text-xs mt-2 px-3 py-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Skip guess
              </button>
            </div>
          )}

          {glitchGuessResult !== null && (
            <div
              className="pixel-card rounded-lg p-4 mb-6"
              style={{
                backgroundColor: glitchGuessResult ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
                border: `2px solid ${glitchGuessResult ? 'var(--color-accent)' : 'var(--color-red)'}`,
              }}
            >
              <p
                className="pixel-text text-xs"
                style={{ color: glitchGuessResult ? 'var(--color-accent)' : 'var(--color-red)' }}
              >
                {glitchGuessResult ? 'CORRECT GUESS! +2 POINTS' : 'WRONG GUESS!'}
              </p>
            </div>
          )}

          {/* Only show Continue when guess is resolved or not caught */}
          {(!caught || glitchGuessResult !== null) && (
            <button onClick={goToScores} className="pixel-btn text-sm px-6 py-3">
              SEE SCORES
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── SCORES PHASE ─────────────────────────────────────────
  if (phase === 'scores') {
    const sortedPlayers = players
      .map((p, i) => ({ ...p, index: i, total: totalScores[i], roundPts: roundScores[i] }))
      .sort((a, b) => b.total - a.total);

    return (
      <div
        className="min-h-screen p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-lg mx-auto text-center">
          <h2 className="pixel-text text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
            SCOREBOARD
          </h2>
          <p className="pixel-text text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            ROUND {round}
          </p>

          <div className="space-y-3 max-w-sm mx-auto mb-8">
            {sortedPlayers.map((player, rank) => (
              <div
                key={player.index}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: rank === 0 ? 'rgba(0,255,136,0.1)' : 'var(--color-bg-card)',
                  border: rank === 0 ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    #{rank + 1}
                  </span>
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: player.color }} />
                  <span className="text-sm">{player.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {player.roundPts > 0 && (
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                      +{player.roundPts}
                    </span>
                  )}
                  <span className="pixel-text text-sm mono-text" style={{ color: 'var(--color-text)' }}>
                    {player.total}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={nextRound} className="pixel-btn text-sm px-6 py-3">
              NEXT ROUND
            </button>
            <button
              onClick={newGame}
              className="text-sm px-6 py-3 rounded transition-colors"
              style={{ color: 'var(--color-text-secondary)', border: '2px solid var(--color-border)' }}
            >
              NEW GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
