'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// TYPES & INTERFACES
// ============================================

type OrganismType = 'producer' | 'herbivore' | 'predator' | 'decomposer' | 'special';
type Biome = 'grassland' | 'ocean' | 'desert' | 'forest';
type GameScreen = 'menu' | 'mode-select' | 'simulation' | 'results';
type SimSpeed = 0 | 1 | 2 | 5 | 10;
type GameMode = 'sandbox' | 'challenge';
type EventType = 'drought' | 'flood' | 'disease' | 'mutation' | 'bloom';

interface OrganismDef {
  id: string;
  name: string;
  emoji: string;
  type: OrganismType;
  color: string;
  energy: number;
  maxEnergy: number;
  reproductionRate: number;
  speed: number;
  diet: string[];
  maxAge: number;
  description: string;
}

interface Organism {
  id: number;
  defId: string;
  x: number;
  y: number;
  energy: number;
  age: number;
  cooldown: number;
}

interface PopSnapshot {
  gen: number;
  counts: Record<string, number>;
}

interface GameEvent {
  type: EventType;
  message: string;
  generation: number;
  duration: number;
  remaining: number;
}

interface ChallengeResult {
  survived: number;
  speciesCount: number;
  totalOrganisms: number;
  passed: boolean;
}

// ============================================
// ORGANISM CATALOG
// ============================================

const ORGANISM_DEFS: OrganismDef[] = [
  // Producers
  { id: 'grass', name: 'Grass', emoji: '🌱', type: 'producer', color: '#22c55e', energy: 20, maxEnergy: 30, reproductionRate: 0.06, speed: 0, diet: [], maxAge: 80, description: 'Hardy plant, spreads quickly' },
  { id: 'flower', name: 'Flower', emoji: '🌸', type: 'producer', color: '#f472b6', energy: 15, maxEnergy: 25, reproductionRate: 0.04, speed: 0, diet: [], maxAge: 60, description: 'Attracts pollinators' },
  { id: 'tree', name: 'Tree', emoji: '🌳', type: 'producer', color: '#15803d', energy: 50, maxEnergy: 80, reproductionRate: 0.015, speed: 0, diet: [], maxAge: 300, description: 'Long-lived, slow to spread' },
  { id: 'algae', name: 'Algae', emoji: '🟢', type: 'producer', color: '#4ade80', energy: 10, maxEnergy: 15, reproductionRate: 0.09, speed: 0, diet: [], maxAge: 40, description: 'Fastest reproducer' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', type: 'producer', color: '#a78bfa', energy: 12, maxEnergy: 20, reproductionRate: 0.03, speed: 0, diet: [], maxAge: 50, description: 'Thrives in dark forests' },

  // Herbivores
  { id: 'rabbit', name: 'Rabbit', emoji: '🐇', type: 'herbivore', color: '#fbbf24', energy: 30, maxEnergy: 50, reproductionRate: 0.045, speed: 2, diet: ['grass', 'flower', 'mushroom'], maxAge: 100, description: 'Fast breeder, eats plants' },
  { id: 'deer', name: 'Deer', emoji: '🦌', type: 'herbivore', color: '#d97706', energy: 45, maxEnergy: 70, reproductionRate: 0.02, speed: 2, diet: ['grass', 'flower', 'tree', 'mushroom'], maxAge: 150, description: 'Graceful grazer' },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', type: 'herbivore', color: '#a3e635', energy: 15, maxEnergy: 25, reproductionRate: 0.05, speed: 1, diet: ['grass', 'flower', 'tree'], maxAge: 60, description: 'Slow but hungry' },
  { id: 'fish', name: 'Fish', emoji: '🐟', type: 'herbivore', color: '#38bdf8', energy: 25, maxEnergy: 40, reproductionRate: 0.04, speed: 2, diet: ['algae'], maxAge: 80, description: 'Feeds on algae' },
  { id: 'turtle', name: 'Turtle', emoji: '🐢', type: 'herbivore', color: '#65a30d', energy: 35, maxEnergy: 60, reproductionRate: 0.015, speed: 1, diet: ['grass', 'algae', 'flower'], maxAge: 250, description: 'Slow, lives forever' },

  // Predators
  { id: 'wolf', name: 'Wolf', emoji: '🐺', type: 'predator', color: '#94a3b8', energy: 50, maxEnergy: 80, reproductionRate: 0.02, speed: 3, diet: ['rabbit', 'deer', 'turtle', 'caterpillar'], maxAge: 130, description: 'Pack hunter, fast' },
  { id: 'hawk', name: 'Hawk', emoji: '🦅', type: 'predator', color: '#78716c', energy: 40, maxEnergy: 65, reproductionRate: 0.02, speed: 3, diet: ['rabbit', 'fish', 'caterpillar', 'snake'], maxAge: 120, description: 'Swoops from above' },
  { id: 'snake', name: 'Snake', emoji: '🐍', type: 'predator', color: '#059669', energy: 35, maxEnergy: 55, reproductionRate: 0.025, speed: 2, diet: ['rabbit', 'caterpillar', 'fish', 'worm'], maxAge: 100, description: 'Silent striker' },
  { id: 'shark', name: 'Shark', emoji: '🦈', type: 'predator', color: '#475569', energy: 60, maxEnergy: 100, reproductionRate: 0.01, speed: 3, diet: ['fish', 'turtle'], maxAge: 200, description: 'Apex ocean predator' },
  { id: 'spider', name: 'Spider', emoji: '🕷️', type: 'predator', color: '#1c1917', energy: 20, maxEnergy: 35, reproductionRate: 0.035, speed: 1, diet: ['caterpillar', 'worm', 'bacteria'], maxAge: 70, description: 'Tiny but effective' },

  // Decomposers
  { id: 'fungi', name: 'Fungi', emoji: '🦠', type: 'decomposer', color: '#c084fc', energy: 15, maxEnergy: 25, reproductionRate: 0.04, speed: 0, diet: ['grass', 'flower', 'tree', 'mushroom'], maxAge: 60, description: 'Breaks down dead matter' },
  { id: 'bacteria', name: 'Bacteria', emoji: '🔬', type: 'decomposer', color: '#fb923c', energy: 8, maxEnergy: 12, reproductionRate: 0.08, speed: 1, diet: ['grass', 'flower', 'mushroom', 'algae'], maxAge: 30, description: 'Microscopic recycler' },
  { id: 'worm', name: 'Worm', emoji: '🪱', type: 'decomposer', color: '#b45309', energy: 12, maxEnergy: 20, reproductionRate: 0.05, speed: 1, diet: ['grass', 'flower', 'mushroom'], maxAge: 50, description: 'Enriches the soil' },

  // Special
  { id: 'kudzu', name: 'Invasive Kudzu', emoji: '🌿', type: 'special', color: '#16a34a', energy: 25, maxEnergy: 35, reproductionRate: 0.12, speed: 0, diet: [], maxAge: 100, description: 'Spreads rapidly, chokes others' },
  { id: 'apex', name: 'Apex Predator', emoji: '🐲', type: 'special', color: '#dc2626', energy: 80, maxEnergy: 120, reproductionRate: 0.008, speed: 3, diet: ['rabbit', 'deer', 'wolf', 'hawk', 'snake', 'shark', 'fish', 'turtle', 'caterpillar', 'spider'], maxAge: 250, description: 'Eats everything that moves' },
];

const BIOME_COLORS: Record<Biome, { bg: string; grid: string; name: string }> = {
  grassland: { bg: '#1a3a1a', grid: '#224422', name: 'Grassland' },
  ocean: { bg: '#0a1a3a', grid: '#102844', name: 'Ocean' },
  desert: { bg: '#3a2a1a', grid: '#443322', name: 'Desert' },
  forest: { bg: '#0a2a0a', grid: '#143314', name: 'Forest' },
};

const TYPE_LABELS: Record<OrganismType, string> = {
  producer: 'PRODUCERS',
  herbivore: 'HERBIVORES',
  predator: 'PREDATORS',
  decomposer: 'DECOMPOSERS',
  special: 'SPECIAL',
};

const GRID_SIZE = 40;
const CELL_SIZE_BASE = 10;
const EVENT_TYPES: EventType[] = ['drought', 'flood', 'disease', 'mutation', 'bloom'];

// ============================================
// HELPER FUNCTIONS
// ============================================

let nextId = 1;

function createOrganism(defId: string, x: number, y: number): Organism {
  const def = ORGANISM_DEFS.find(d => d.id === defId)!;
  return {
    id: nextId++,
    defId,
    x,
    y,
    energy: def.energy,
    age: 0,
    cooldown: 0,
  };
}

function dist(a: Organism, b: Organism): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ============================================
// SIMULATION ENGINE
// ============================================

function simulateTick(
  organisms: Organism[],
  _generation: number,
  activeEvents: GameEvent[],
): Organism[] {
  const defMap = new Map<string, OrganismDef>();
  ORGANISM_DEFS.forEach(d => defMap.set(d.id, d));

  const isDrought = activeEvents.some(e => e.type === 'drought' && e.remaining > 0);
  const isFlood = activeEvents.some(e => e.type === 'flood' && e.remaining > 0);
  const isDisease = activeEvents.some(e => e.type === 'disease' && e.remaining > 0);
  const isBloom = activeEvents.some(e => e.type === 'bloom' && e.remaining > 0);

  // Build spatial grid for fast neighbor lookups
  const spatialGrid: Map<string, Organism[]> = new Map();
  for (const org of organisms) {
    const key = `${Math.floor(org.x / 4)},${Math.floor(org.y / 4)}`;
    if (!spatialGrid.has(key)) spatialGrid.set(key, []);
    spatialGrid.get(key)!.push(org);
  }

  function getNearby(x: number, y: number, range: number): Organism[] {
    const result: Organism[] = [];
    const cellRange = Math.ceil(range / 4);
    const cx = Math.floor(x / 4);
    const cy = Math.floor(y / 4);
    for (let dx = -cellRange; dx <= cellRange; dx++) {
      for (let dy = -cellRange; dy <= cellRange; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = spatialGrid.get(key);
        if (cell) result.push(...cell);
      }
    }
    return result;
  }

  const newOrganisms: Organism[] = [];
  const deadIds = new Set<number>();

  for (const org of organisms) {
    if (deadIds.has(org.id)) continue;

    const def = defMap.get(org.defId);
    if (!def) continue;

    org.age++;
    if (org.cooldown > 0) org.cooldown--;

    // Age death
    if (org.age >= def.maxAge) {
      deadIds.add(org.id);
      continue;
    }

    // Energy drain
    let drain = def.type === 'producer' ? 0.3 : (def.speed * 0.4 + 0.5);
    if (isDrought && def.type === 'producer') drain *= 2.5;
    if (isFlood && (def.type === 'herbivore' || def.type === 'predator')) drain *= 1.8;
    if (isDisease) drain *= 1.5;

    // Producers gain energy from sun
    if (def.type === 'producer' || (def.type === 'special' && def.diet.length === 0)) {
      let gain = 1.2;
      if (isDrought) gain *= 0.3;
      if (isBloom) gain *= 2.5;
      org.energy = Math.min(def.maxEnergy, org.energy + gain);
    }

    org.energy -= drain;

    if (org.energy <= 0) {
      deadIds.add(org.id);
      continue;
    }

    // Movement for non-producers
    if (def.speed > 0) {
      const nearby = getNearby(org.x, org.y, 6);
      let targetX = org.x;
      let targetY = org.y;
      let foundFood = false;
      let fleeing = false;

      // Flee from predators
      for (const other of nearby) {
        if (deadIds.has(other.id) || other.id === org.id) continue;
        const otherDef = defMap.get(other.defId);
        if (!otherDef) continue;
        if (otherDef.diet.includes(org.defId) && dist(org, other) < 5) {
          const dx = org.x - other.x;
          const dy = org.y - other.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          targetX = org.x + (dx / d) * def.speed;
          targetY = org.y + (dy / d) * def.speed;
          fleeing = true;
          break;
        }
      }

      // Seek food
      if (!fleeing && def.diet.length > 0) {
        let closestDist = Infinity;
        for (const other of nearby) {
          if (deadIds.has(other.id) || other.id === org.id) continue;
          if (def.diet.includes(other.defId)) {
            const d = dist(org, other);
            if (d < closestDist) {
              closestDist = d;
              const dx = other.x - org.x;
              const dy = other.y - org.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              targetX = org.x + (dx / len) * def.speed;
              targetY = org.y + (dy / len) * def.speed;
              foundFood = true;
            }
          }
        }
      }

      // Random movement if nothing to do
      if (!fleeing && !foundFood) {
        targetX = org.x + (Math.random() - 0.5) * def.speed * 2;
        targetY = org.y + (Math.random() - 0.5) * def.speed * 2;
      }

      org.x = clamp(targetX, 0, GRID_SIZE - 1);
      org.y = clamp(targetY, 0, GRID_SIZE - 1);

      // Eat nearby food
      if (def.diet.length > 0) {
        const nearbyFood = getNearby(org.x, org.y, 2);
        for (const prey of nearbyFood) {
          if (deadIds.has(prey.id) || prey.id === org.id) continue;
          if (def.diet.includes(prey.defId) && dist(org, prey) < 1.8) {
            const preyDef = defMap.get(prey.defId);
            if (preyDef) {
              org.energy = Math.min(def.maxEnergy, org.energy + preyDef.energy * 0.6);
              deadIds.add(prey.id);
              break;
            }
          }
        }
      }
    }

    // Kudzu special: kills nearby non-kudzu producers
    if (org.defId === 'kudzu') {
      const nearby = getNearby(org.x, org.y, 2);
      for (const other of nearby) {
        if (deadIds.has(other.id) || other.id === org.id) continue;
        const otherDef = defMap.get(other.defId);
        if (otherDef && otherDef.type === 'producer' && other.defId !== 'kudzu' && dist(org, other) < 1.5) {
          deadIds.add(other.id);
          org.energy = Math.min(def.maxEnergy, org.energy + 5);
        }
      }
    }

    // Reproduction
    let reproRate = def.reproductionRate;
    if (isBloom && def.type === 'producer') reproRate *= 2;
    if (isDisease) reproRate *= 0.4;

    if (org.energy > def.maxEnergy * 0.6 && org.cooldown <= 0 && Math.random() < reproRate) {
      // Check local density to prevent overpopulation
      const nearby = getNearby(org.x, org.y, 3);
      const sameSpecies = nearby.filter(n => n.defId === org.defId && !deadIds.has(n.id)).length;
      const maxLocal = def.type === 'producer' ? 8 : 5;

      if (sameSpecies < maxLocal && organisms.length + newOrganisms.length < 2000) {
        const offsetX = (Math.random() - 0.5) * 3;
        const offsetY = (Math.random() - 0.5) * 3;
        const nx = clamp(org.x + offsetX, 0, GRID_SIZE - 1);
        const ny = clamp(org.y + offsetY, 0, GRID_SIZE - 1);
        const child = createOrganism(org.defId, nx, ny);
        child.energy = def.energy * 0.7;
        newOrganisms.push(child);
        org.energy -= def.energy * 0.35;
        org.cooldown = def.type === 'producer' ? 5 : 10;
      }
    }
  }

  const surviving = organisms.filter(o => !deadIds.has(o.id));
  return [...surviving, ...newOrganisms];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EcosystemArchitectPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [mode, setMode] = useState<GameMode>('sandbox');
  const [biome, setBiome] = useState<Biome>('grassland');
  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [generation, setGeneration] = useState(0);
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [selectedOrganism, setSelectedOrganism] = useState<string>('grass');
  const [popHistory, setPopHistory] = useState<PopSnapshot[]>([]);
  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [eventNotification, setEventNotification] = useState<string | null>(null);
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [toolbarCategory, setToolbarCategory] = useState<OrganismType>('producer');
  const [bestScore, setBestScore] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const organismsRef = useRef<Organism[]>([]);
  const generationRef = useRef(0);
  const eventsRef = useRef<GameEvent[]>([]);
  const speedRef = useRef<SimSpeed>(1);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const popHistoryRef = useRef<PopSnapshot[]>([]);
  const runningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ecosystem-best');
      if (saved) setBestScore(parseInt(saved));
    } catch { /* ignore */ }
  }, []);

  // Keep refs in sync
  useEffect(() => { organismsRef.current = organisms; }, [organisms]);
  useEffect(() => { generationRef.current = generation; }, [generation]);
  useEffect(() => { eventsRef.current = activeEvents; }, [activeEvents]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { popHistoryRef.current = popHistory; }, [popHistory]);

  // Get unique species in current simulation
  const getSpeciesCounts = useCallback((orgs: Organism[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const o of orgs) {
      counts[o.defId] = (counts[o.defId] || 0) + 1;
    }
    return counts;
  }, []);

  // Start simulation
  const startGame = useCallback((m: GameMode, b: Biome) => {
    setMode(m);
    setBiome(b);
    setOrganisms([]);
    setGeneration(0);
    setPopHistory([]);
    setActiveEvents([]);
    setChallengeResult(null);
    setEventNotification(null);
    setSpeed(0);
    organismsRef.current = [];
    generationRef.current = 0;
    eventsRef.current = [];
    popHistoryRef.current = [];
    nextId = 1;
    setScreen('simulation');
  }, []);

  // Random events
  const maybeSpawnEvent = useCallback((gen: number, currentEvents: GameEvent[]): GameEvent | null => {
    if (gen < 50) return null;
    if (currentEvents.some(e => e.remaining > 0)) return null;
    if (Math.random() > 0.008) return null;

    const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const messages: Record<EventType, string> = {
      drought: 'DROUGHT! Plants are withering!',
      flood: 'FLOOD! Animals struggle to move!',
      disease: 'DISEASE OUTBREAK! All organisms weakened!',
      mutation: 'MUTATION! A random species gets a boost!',
      bloom: 'ALGAL BLOOM! Producers thrive!',
    };
    const duration = 30 + Math.floor(Math.random() * 40);

    return {
      type,
      message: messages[type],
      generation: gen,
      duration,
      remaining: duration,
    };
  }, []);

  // Handle mutation event
  const applyMutation = useCallback((orgs: Organism[]): Organism[] => {
    const species = Array.from(new Set(orgs.map(o => o.defId)));
    if (species.length === 0) return orgs;
    const lucky = species[Math.floor(Math.random() * species.length)];
    return orgs.map(o => {
      if (o.defId === lucky) {
        const def = ORGANISM_DEFS.find(d => d.id === lucky)!;
        return { ...o, energy: Math.min(def.maxEnergy, o.energy + 15) };
      }
      return o;
    });
  }, []);

  // Main simulation loop
  const simLoop = useCallback(() => {
    if (!runningRef.current) return;

    const now = performance.now();
    const spd = speedRef.current;
    if (spd === 0) {
      animFrameRef.current = requestAnimationFrame(simLoop);
      return;
    }

    const interval = 1000 / (spd * 8);
    if (now - lastTickRef.current < interval) {
      animFrameRef.current = requestAnimationFrame(simLoop);
      return;
    }
    lastTickRef.current = now;

    let orgs = organismsRef.current;
    let gen = generationRef.current;
    let events = [...eventsRef.current];

    // Try to spawn event
    const newEvent = maybeSpawnEvent(gen, events);
    if (newEvent) {
      events.push(newEvent);
      if (newEvent.type === 'mutation') {
        orgs = applyMutation(orgs);
      }
      setEventNotification(newEvent.message);
      setTimeout(() => setEventNotification(null), 3000);
    }

    // Tick down events
    events = events.map(e => ({ ...e, remaining: e.remaining - 1 })).filter(e => e.remaining > -1);

    // Simulate
    orgs = simulateTick(orgs, gen, events);
    gen++;

    // Record population every 5 gens
    let history = popHistoryRef.current;
    if (gen % 5 === 0) {
      const counts = getSpeciesCounts(orgs);
      const snapshot: PopSnapshot = { gen, counts };
      history = [...history.slice(-199), snapshot];
      popHistoryRef.current = history;
      setPopHistory(history);
    }

    organismsRef.current = orgs;
    generationRef.current = gen;
    eventsRef.current = events;
    setOrganisms(orgs);
    setGeneration(gen);
    setActiveEvents(events);

    // Challenge mode check
    if (mode === 'challenge') {
      const species = new Set(orgs.map(o => o.defId));
      if (gen >= 500) {
        runningRef.current = false;
        const result: ChallengeResult = {
          survived: gen,
          speciesCount: species.size,
          totalOrganisms: orgs.length,
          passed: species.size >= 5 && orgs.length > 0,
        };
        setChallengeResult(result);
        if (result.passed && gen > bestScore) {
          setBestScore(gen);
          try { localStorage.setItem('ecosystem-best', gen.toString()); } catch { /* ignore */ }
        }
        setScreen('results');
        return;
      }
      // Fail early if no organisms left
      if (orgs.length === 0 && gen > 10) {
        runningRef.current = false;
        setChallengeResult({
          survived: gen,
          speciesCount: 0,
          totalOrganisms: 0,
          passed: false,
        });
        setScreen('results');
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(simLoop);
  }, [mode, maybeSpawnEvent, applyMutation, getSpeciesCounts, bestScore]);

  // Start/stop loop
  useEffect(() => {
    if (screen === 'simulation') {
      runningRef.current = true;
      lastTickRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(simLoop);
    }
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [screen, simLoop]);

  // Render canvas
  useEffect(() => {
    if (screen !== 'simulation') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const biomeCol = BIOME_COLORS[biome];
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / GRID_SIZE;
    const cellH = h / GRID_SIZE;

    // Background
    ctx.fillStyle = biomeCol.bg;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = biomeCol.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(w, i * cellH);
      ctx.stroke();
    }

    // Draw organisms
    const defMap = new Map<string, OrganismDef>();
    ORGANISM_DEFS.forEach(d => defMap.set(d.id, d));

    for (const org of organisms) {
      const def = defMap.get(org.defId);
      if (!def) continue;

      const px = org.x * cellW;
      const py = org.y * cellH;

      ctx.fillStyle = def.color;
      const size = def.type === 'producer' || def.type === 'decomposer' ? cellW * 0.7 : cellW * 0.9;
      const offset = (cellW - size) / 2;

      if (def.type === 'predator' || def.type === 'special') {
        // Diamond shape for predators
        ctx.beginPath();
        ctx.moveTo(px + cellW / 2, py + offset);
        ctx.lineTo(px + cellW - offset, py + cellH / 2);
        ctx.lineTo(px + cellW / 2, py + cellH - offset);
        ctx.lineTo(px + offset, py + cellH / 2);
        ctx.closePath();
        ctx.fill();
      } else if (def.type === 'herbivore') {
        // Circle for herbivores
        ctx.beginPath();
        ctx.arc(px + cellW / 2, py + cellH / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Square for producers/decomposers
        ctx.fillRect(px + offset, py + offset, size, size);
      }
    }

    // Draw event overlay
    if (activeEvents.some(e => e.type === 'drought' && e.remaining > 0)) {
      ctx.fillStyle = 'rgba(200, 100, 0, 0.1)';
      ctx.fillRect(0, 0, w, h);
    } else if (activeEvents.some(e => e.type === 'flood' && e.remaining > 0)) {
      ctx.fillStyle = 'rgba(0, 50, 200, 0.1)';
      ctx.fillRect(0, 0, w, h);
    } else if (activeEvents.some(e => e.type === 'disease' && e.remaining > 0)) {
      ctx.fillStyle = 'rgba(200, 0, 0, 0.08)';
      ctx.fillRect(0, 0, w, h);
    } else if (activeEvents.some(e => e.type === 'bloom' && e.remaining > 0)) {
      ctx.fillStyle = 'rgba(0, 200, 50, 0.08)';
      ctx.fillRect(0, 0, w, h);
    }
  }, [organisms, screen, biome, activeEvents]);

  // Render population graph
  useEffect(() => {
    if (screen !== 'simulation') return;
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
    ctx.fillRect(0, 0, w, h);

    if (popHistory.length < 2) {
      ctx.fillStyle = '#555570';
      ctx.font = '10px monospace';
      ctx.fillText('Waiting for data...', 10, h / 2);
      return;
    }

    // Find all species that ever appeared
    const allSpeciesSet = new Set<string>();
    popHistory.forEach(s => Object.keys(s.counts).forEach(k => allSpeciesSet.add(k)));
    const allSpecies = Array.from(allSpeciesSet);

    // Find max population
    let maxPop = 1;
    popHistory.forEach(s => {
      Object.values(s.counts).forEach(c => { if (c > maxPop) maxPop = c; });
    });

    const padding = { top: 10, right: 10, bottom: 20, left: 35 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Axes
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#8888a0';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(maxPop.toString(), padding.left - 4, padding.top + 8);
    ctx.fillText('0', padding.left - 4, h - padding.bottom);

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText(`Gen ${popHistory[popHistory.length - 1]?.gen || 0}`, w / 2, h - 3);

    // Draw lines for each species
    const defMap = new Map<string, OrganismDef>();
    ORGANISM_DEFS.forEach(d => defMap.set(d.id, d));

    for (const species of allSpecies) {
      const def = defMap.get(species);
      if (!def) continue;

      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < popHistory.length; i++) {
        const snap = popHistory[i];
        const count = snap.counts[species] || 0;
        const x = padding.left + (i / (popHistory.length - 1)) * plotW;
        const y = padding.top + plotH - (count / maxPop) * plotH;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }, [popHistory, screen]);

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / GRID_SIZE;
    const gx = cx / cellW;
    const gy = cy / cellH;

    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      const newOrg = createOrganism(selectedOrganism, gx, gy);
      const updated = [...organismsRef.current, newOrg];
      organismsRef.current = updated;
      setOrganisms(updated);
    }
  }, [selectedOrganism]);

  // Touch handler for mobile
  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (touch.clientX - rect.left) * scaleX;
    const cy = (touch.clientY - rect.top) * scaleY;
    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / GRID_SIZE;
    const gx = cx / cellW;
    const gy = cy / cellH;

    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      const newOrg = createOrganism(selectedOrganism, gx, gy);
      const updated = [...organismsRef.current, newOrg];
      organismsRef.current = updated;
      setOrganisms(updated);
    }
  }, [selectedOrganism]);

  // Scatter placement helper
  const scatterOrganisms = useCallback((defId: string, count: number) => {
    const newOrgs: Organism[] = [];
    for (let i = 0; i < count; i++) {
      newOrgs.push(createOrganism(defId, Math.random() * GRID_SIZE, Math.random() * GRID_SIZE));
    }
    const updated = [...organismsRef.current, ...newOrgs];
    organismsRef.current = updated;
    setOrganisms(updated);
  }, []);

  const speciesCounts = getSpeciesCounts(organisms);
  const uniqueSpecies = Object.keys(speciesCounts).length;
  const canvasSize = GRID_SIZE * CELL_SIZE_BASE;

  if (!mounted) return null;

  // ============================================
  // MENU SCREEN
  // ============================================
  if (screen === 'menu') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Link href="/games" className="absolute top-4 left-4 pixel-text text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>
          &lt; BACK TO ARCADE
        </Link>

        <div className="text-center max-w-2xl animate-fade-in-up">
          <div className="text-5xl md:text-6xl mb-6">🌍</div>
          <h1 className="pixel-text text-xl md:text-3xl mb-4" style={{ color: 'var(--color-accent)' }}>
            ECOSYSTEM ARCHITECT
          </h1>
          <p className="text-sm md:text-base mb-8 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Design ecosystems by placing organisms into a simulated world.
            Watch population dynamics emerge as predators hunt prey, plants compete
            for sunlight, and diseases spread. Can you build a stable ecosystem?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => { setMode('sandbox'); setScreen('mode-select'); }}
              className="pixel-border rounded-lg p-6 text-left transition-all duration-200 hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-accent)' }}
            >
              <div className="pixel-text text-sm mb-2" style={{ color: 'var(--color-accent)' }}>SANDBOX</div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Unlimited experimentation. Place any organisms, adjust speed, and watch chaos unfold. No goals, just science.
              </p>
            </button>

            <button
              onClick={() => { setMode('challenge'); setScreen('mode-select'); }}
              className="pixel-border rounded-lg p-6 text-left transition-all duration-200 hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-orange)' }}
            >
              <div className="pixel-text text-sm mb-2" style={{ color: 'var(--color-orange)' }}>CHALLENGE</div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Create an ecosystem with at least 5 species that survives 500 generations. Place organisms, then hit play!
              </p>
              {bestScore > 0 && (
                <p className="text-xs mt-2 pixel-text" style={{ color: 'var(--color-purple)' }}>
                  BEST: {bestScore} GEN
                </p>
              )}
            </button>
          </div>

          <div className="pixel-border rounded-lg p-4 text-left" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="pixel-text text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>LEGEND</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3" style={{ backgroundColor: '#22c55e' }} /> Producers
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} /> Herbivores
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rotate-45" style={{ backgroundColor: '#94a3b8' }} /> Predators
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3" style={{ backgroundColor: '#c084fc' }} /> Decomposers
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // BIOME SELECT SCREEN
  // ============================================
  if (screen === 'mode-select') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <button
          onClick={() => setScreen('menu')}
          className="absolute top-4 left-4 pixel-text text-xs hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          &lt; BACK
        </button>

        <div className="text-center max-w-xl animate-fade-in-up">
          <h2 className="pixel-text text-lg md:text-xl mb-2" style={{ color: 'var(--color-accent)' }}>
            SELECT BIOME
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {mode === 'challenge' ? 'Choose your biome, then build a 5+ species ecosystem that survives 500 generations.' : 'Choose a biome for your ecosystem.'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(BIOME_COLORS) as Biome[]).map((b) => (
              <button
                key={b}
                onClick={() => startGame(mode, b)}
                className="pixel-border rounded-lg p-6 transition-all duration-200 hover:scale-[1.02]"
                style={{ backgroundColor: BIOME_COLORS[b].bg, borderColor: 'var(--color-border)' }}
              >
                <div className="text-3xl mb-2">
                  {b === 'grassland' ? '🌾' : b === 'ocean' ? '🌊' : b === 'desert' ? '🏜️' : '🌲'}
                </div>
                <div className="pixel-text text-xs" style={{ color: 'var(--color-text)' }}>
                  {BIOME_COLORS[b].name.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RESULTS SCREEN
  // ============================================
  if (screen === 'results' && challengeResult) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="text-5xl mb-4">{challengeResult.passed ? '🏆' : '💀'}</div>
          <h2 className="pixel-text text-lg md:text-xl mb-2" style={{ color: challengeResult.passed ? 'var(--color-accent)' : 'var(--color-red)' }}>
            {challengeResult.passed ? 'ECOSYSTEM STABLE!' : 'ECOSYSTEM COLLAPSED!'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {challengeResult.passed
              ? `Your ecosystem survived all 500 generations with ${challengeResult.speciesCount} species!`
              : challengeResult.totalOrganisms === 0
                ? `All life perished at generation ${challengeResult.survived}.`
                : `Only ${challengeResult.speciesCount} species survived. You need at least 5.`
            }
          </p>

          <div className="pixel-border rounded-lg p-4 mb-6 text-left" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: 'var(--color-text-secondary)' }}>Generations</span>
              <span className="mono-text" style={{ color: 'var(--color-accent)' }}>{challengeResult.survived}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: 'var(--color-text-secondary)' }}>Species</span>
              <span className="mono-text" style={{ color: 'var(--color-accent)' }}>{challengeResult.speciesCount}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Organisms</span>
              <span className="mono-text" style={{ color: 'var(--color-accent)' }}>{challengeResult.totalOrganisms}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Best Score</span>
              <span className="mono-text" style={{ color: 'var(--color-purple)' }}>{bestScore} GEN</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startGame(mode, biome)}
              className="pixel-btn px-6 py-3 rounded pixel-text text-xs"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              RETRY
            </button>
            <button
              onClick={() => setScreen('menu')}
              className="pixel-btn px-6 py-3 rounded pixel-text text-xs"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', border: '2px solid var(--color-border)' }}
            >
              MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // SIMULATION SCREEN
  // ============================================
  const filteredOrganisms = ORGANISM_DEFS.filter(d => d.type === toolbarCategory);
  const selectedDef = ORGANISM_DEFS.find(d => d.id === selectedOrganism);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-wrap gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <button
          onClick={() => { runningRef.current = false; setScreen('menu'); }}
          className="pixel-text text-xs hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          &lt; EXIT
        </button>
        <div className="flex items-center gap-4">
          <span className="pixel-text text-xs" style={{ color: 'var(--color-orange)' }}>
            GEN {generation}
          </span>
          <span className="text-xs mono-text hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
            {organisms.length} organisms | {uniqueSpecies} species
          </span>
          {mode === 'challenge' && (
            <span className="pixel-text text-xs" style={{ color: 'var(--color-purple)' }}>
              CHALLENGE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {([0, 1, 2, 5, 10] as SimSpeed[]).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="px-2 py-1 rounded text-xs mono-text transition-colors"
              style={{
                backgroundColor: speed === s ? 'var(--color-accent)' : 'var(--color-bg-card)',
                color: speed === s ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {s === 0 ? '||' : `${s}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Event notification */}
      {eventNotification && (
        <div
          className="text-center py-2 pixel-text text-xs animate-fade-in-up"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-red)',
            borderBottom: '2px solid var(--color-red)',
          }}
        >
          {eventNotification}
        </div>
      )}

      {/* Active events bar */}
      {activeEvents.filter(e => e.remaining > 0).length > 0 && (
        <div className="flex gap-2 px-3 py-1" style={{ backgroundColor: 'var(--color-surface)' }}>
          {activeEvents.filter(e => e.remaining > 0).map((e, i) => (
            <span key={i} className="text-xs mono-text px-2 py-0.5 rounded" style={{
              backgroundColor: e.type === 'drought' ? 'rgba(200,100,0,0.2)' :
                e.type === 'flood' ? 'rgba(0,100,200,0.2)' :
                e.type === 'disease' ? 'rgba(200,0,0,0.2)' :
                e.type === 'mutation' ? 'rgba(160,0,255,0.2)' :
                'rgba(0,200,50,0.2)',
              color: 'var(--color-text)',
            }}>
              {e.type.toUpperCase()} ({e.remaining})
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Organism Toolbar */}
        <div className="lg:w-56 border-b lg:border-b-0 lg:border-r overflow-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          {/* Category tabs */}
          <div className="flex lg:flex-wrap gap-0.5 p-1 overflow-x-auto">
            {(Object.keys(TYPE_LABELS) as OrganismType[]).map(t => (
              <button
                key={t}
                onClick={() => setToolbarCategory(t)}
                className="px-2 py-1 rounded text-xs whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: toolbarCategory === t ? 'var(--color-accent)' : 'transparent',
                  color: toolbarCategory === t ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '7px',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Organism list */}
          <div className="flex lg:flex-col gap-1 p-1 overflow-x-auto lg:overflow-x-hidden">
            {filteredOrganisms.map(def => (
              <button
                key={def.id}
                onClick={() => setSelectedOrganism(def.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors min-w-max lg:min-w-0 lg:w-full"
                style={{
                  backgroundColor: selectedOrganism === def.id ? 'var(--color-bg-card-hover)' : 'transparent',
                  border: selectedOrganism === def.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                }}
              >
                <span className="text-base">{def.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{def.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>{def.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected organism info */}
          {selectedDef && (
            <div className="hidden lg:block p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="mono-text">E:{selectedDef.energy}</span>
                <span className="mono-text ml-2">SPD:{selectedDef.speed}</span>
                <span className="mono-text ml-2">AGE:{selectedDef.maxAge}</span>
              </div>
              {selectedDef.diet.length > 0 && (
                <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>
                  Eats: {selectedDef.diet.join(', ')}
                </div>
              )}
              <button
                onClick={() => scatterOrganisms(selectedDef.id, 10)}
                className="mt-2 w-full px-2 py-1 rounded text-xs mono-text transition-colors"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
              >
                SCATTER x10
              </button>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasTouch}
              className="border rounded cursor-crosshair"
              style={{
                borderColor: 'var(--color-border)',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: '1 / 1',
                imageRendering: 'pixelated',
              }}
            />
          </div>

          {/* Mobile scatter button */}
          <div className="lg:hidden flex items-center gap-2 px-3 py-1" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedDef?.emoji} {selectedDef?.name}
            </span>
            <button
              onClick={() => selectedDef && scatterOrganisms(selectedDef.id, 10)}
              className="px-3 py-1 rounded text-xs mono-text ml-auto"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
            >
              SCATTER x10
            </button>
          </div>

          {/* Bottom panel: graph + stats */}
          <div className="flex flex-col md:flex-row border-t" style={{ borderColor: 'var(--color-border)' }}>
            {/* Population graph */}
            <div className="flex-1 p-2">
              <div className="pixel-text text-xs mb-1" style={{ color: 'var(--color-text-secondary)', fontSize: '7px' }}>
                POPULATION OVER TIME
              </div>
              <canvas
                ref={graphCanvasRef}
                width={400}
                height={120}
                className="w-full rounded"
                style={{ border: '1px solid var(--color-border)', maxHeight: '120px' }}
              />
            </div>

            {/* Species stats */}
            <div className="md:w-56 p-2 border-t md:border-t-0 md:border-l overflow-auto" style={{ borderColor: 'var(--color-border)', maxHeight: '160px' }}>
              <div className="pixel-text text-xs mb-1" style={{ color: 'var(--color-text-secondary)', fontSize: '7px' }}>
                SPECIES COUNT
              </div>
              {Object.entries(speciesCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([id, count]) => {
                  const def = ORGANISM_DEFS.find(d => d.id === id);
                  if (!def) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <span
                          className="inline-block w-2 h-2 rounded-sm"
                          style={{ backgroundColor: def.color }}
                        />
                        <span style={{ color: 'var(--color-text)' }}>{def.name}</span>
                      </span>
                      <span className="mono-text ml-2" style={{ color: 'var(--color-accent)' }}>{count}</span>
                    </div>
                  );
                })}
              {uniqueSpecies === 0 && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Click the grid to place organisms
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
