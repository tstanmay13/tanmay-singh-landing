'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

interface CensusQuestion {
  id: string;
  label: string;
  answer: string;
  hint?: string;
  type: 'text' | 'select';
  options?: string[];
}

interface Planet {
  id: string;
  name: string;
  icon: string;
  region: string;
  difficulty: number; // 1-5
  description: string;
  questions: CensusQuestion[];
}

interface PlanetProgress {
  visited: boolean;
  score: number; // 0-5
  answers: Record<string, string>;
}

type GameScreen = 'menu' | 'map' | 'planet' | 'results';

// ============================================================
// PLANET DATA (30 planets)
// ============================================================

const PLANETS: Planet[] = [
  {
    id: 'zorblatix-7',
    name: 'Zorblatix-7',
    icon: '🪨',
    region: 'Sigma Quadrant',
    difficulty: 1,
    description: `The Zorblatians are a silicon-based species who communicate exclusively through carefully arranged rock formations. A typical conversation takes about three days, which the Zorblatians consider "rushing things." Their society recognizes exactly 3.7 genders — the 0.7 is a temporal gender that only exists on Tuesdays. They measure distance in "thoughtspans," defined as the distance a particularly bored Zorblatian can think about walking before giving up (approximately 2.3 kilometers, for the metrically inclined).

Their primary export is "crystallized regret," a mineral that forms when Zorblatians spend too long contemplating past decisions. It tastes like cinnamon to humans, which has made it an unexpected hit in Earth's spice trade. The planetary population stands at approximately 8 billion, though 2 billion of these are legally classified as "very convincing rocks" due to a census error in the year 4,207 that nobody has bothered to correct.

The Zorblatians have two moons, both of which they consider to be "disappointing." Their government is a constitutional geology, where laws are literally carved in stone, and amendments require finding a bigger stone. The current head of state is a particularly articulate boulder named Grnk, who won the last election by a landslide (literally — the other candidate was buried).`,
    questions: [
      { id: 'q1', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q2', label: 'Gender spectrum cardinality:', answer: '3.7', type: 'text' },
      { id: 'q3', label: 'Standard unit of spatial measurement:', answer: 'thoughtspans', type: 'text' },
      { id: 'q4', label: 'Primary economic output (Category B-7):', answer: 'crystallized regret', type: 'text' },
      { id: 'q5', label: 'Population (exclude non-sentient entities):', answer: '6 billion', type: 'text' },
      { id: 'q6', label: 'Number of natural satellites:', answer: '2', type: 'text' },
      { id: 'q7', label: 'Year of last census:', answer: '4207', type: 'text' },
    ],
  },
  {
    id: 'fwoomba-prime',
    name: 'Fwoomba Prime',
    icon: '💨',
    region: 'Sigma Quadrant',
    difficulty: 1,
    description: `The Fwoombans are a gaseous species who exist as sentient clouds of methane and self-importance. They communicate by changing color — red for anger, blue for sadness, and a very specific shade of mauve for "I disagree with your restaurant recommendation." Their average lifespan is 900 Earth years, though they experience time backwards on weekends, which makes scheduling brunch extremely complicated.

Fwoomba Prime has no solid surface, so the Fwoombans measure everything by volume rather than area. The planet's population is 12 million clouds, organized into 4 political parties: the Condensers, the Evaporators, the Dew Pointers, and the surprisingly militant Fog Caucus. They have 5 moons, but only acknowledge 3 of them due to an ongoing diplomatic incident.

The primary industry is "emotional weather forecasting" — predicting how the collective mood of the population will affect atmospheric conditions tomorrow. Their chief export is "bottled ambivalence," a gas that makes anyone who inhales it completely unable to choose between two options. They reproduce by splitting, which they consider deeply embarrassing and never discuss at dinner parties. The planet orbits a binary star system, and the Fwoombans worship both stars equally, calling them "the Bright Disappointment" and "the Other Bright Disappointment."`,
    questions: [
      { id: 'q1', label: 'Species base composition:', answer: 'gas', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q2', label: 'Average lifespan (standard Earth years):', answer: '900', type: 'text' },
      { id: 'q3', label: 'Population count:', answer: '12 million', type: 'text' },
      { id: 'q4', label: 'Number of recognized political factions:', answer: '4', type: 'text' },
      { id: 'q5', label: 'Acknowledged natural satellites:', answer: '3', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'bottled ambivalence', type: 'text' },
      { id: 'q7', label: 'Number of host stars:', answer: '2', type: 'text' },
    ],
  },
  {
    id: 'glimthar-9',
    name: 'Glimthar-9',
    icon: '🍄',
    region: 'Sigma Quadrant',
    difficulty: 2,
    description: `Glimthar-9 is entirely covered by a single fungal organism named Gerald. Gerald is sentient, highly opinionated about jazz music, and technically counts as a civilization of one — though Gerald insists on being counted as 14 billion individuals because that's how many distinct neural nodes make up Gerald's network. The Galactic Council compromised and officially lists the population as "1, but argumentative about it."

Gerald communicates through spore releases. A light dusting means "hello," a thick cloud means "I have concerns about your methodology," and a full planetary spore storm means Gerald has been reminded that smooth jazz exists. Gerald's preferred state of matter is "moist solid," which is not an official category but Gerald has filed 47 complaints about this.

Gerald measures time in "growth cycles," each approximately 3 Earth days. Gerald's primary export is medicinal compounds — specifically, an antifungal cream that Gerald produces and considers "deeply ironic." Gerald inhabits exactly 3 spatial dimensions but claims to perceive a 4th dimension that Gerald describes as "like depth, but sadder." Gerald reproduces asexually, recognizes 0 genders, and considers the entire concept "a bit much." Gerald's only moon is named Steve, after a space explorer Gerald once consumed by accident.`,
    questions: [
      { id: 'q1', label: 'Official population (Galactic Council record):', answer: '1', type: 'text' },
      { id: 'q2', label: 'Species classification:', answer: 'fungal network', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Preferred state of matter:', answer: 'moist solid', type: 'text' },
      { id: 'q5', label: 'Number of spatial dimensions inhabited:', answer: '3', type: 'text' },
      { id: 'q6', label: 'Gender spectrum cardinality:', answer: '0', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'medicinal compounds', type: 'text' },
      { id: 'q8', label: 'Standard unit of temporal measurement:', answer: 'growth cycles', type: 'text' },
    ],
  },
  {
    id: 'quantum-flickle',
    name: 'Quantum Flickle',
    icon: '⚛️',
    region: 'Paradox Nebula',
    difficulty: 3,
    description: `The Flickleons exist in a state of quantum superposition, meaning each individual simultaneously exists and doesn't exist until observed by a census taker — which makes your job here particularly important and philosophically distressing. The population is officially listed as "between 0 and 50 million, depending on who's looking." For tax purposes, they settled on 25 million.

Flickleons communicate through probability waves, which means every conversation has a 30% chance of being a completely different conversation. They experience 2 genders, but each individual is simultaneously both until they fill out a form, which they consider a violation of their civil rights. Their average lifespan is "undefined" in the traditional sense, but for bureaucratic purposes they use 200 years.

The planet has no moons — or rather, it has a moon that exists only when observed. The Flickleons' primary export is "uncertainty," which they bottle and sell to philosophy departments across the galaxy. They measure distance in "probabilities" — for example, the capital city is "0.7 probabilities from the spaceport," meaning you have a 70% chance of arriving there if you walk in a straight line. Their government is a democracy where every vote simultaneously passes and fails until counted.`,
    questions: [
      { id: 'q1', label: 'Population (for tax purposes):', answer: '25 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Average lifespan (bureaucratic standard, Earth years):', answer: '200', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'uncertainty', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'probabilities', type: 'text' },
      { id: 'q7', label: 'Form of governance:', answer: 'democracy', type: 'select', options: ['monarchy', 'democracy', 'hive consensus', 'anarchy', 'constitutional geology', 'theocracy'] },
    ],
  },
  {
    id: 'thermox-beta',
    name: 'Thermox Beta',
    icon: '🌡️',
    region: 'Paradox Nebula',
    difficulty: 2,
    description: `The Thermoxians are sentient weather patterns. Each individual is a self-sustaining storm system with thoughts, feelings, and strong opinions about meteorology degrees ("glorified guessing," they say). There are approximately 800 Thermoxians on the planet, each spanning about 500 kilometers in diameter.

They communicate through lightning patterns — 1 bolt means "yes," 2 bolts mean "no," and a sustained electrical storm lasting several hours means "let me tell you about my weekend." They recognize 6 genders, each corresponding to a different type of precipitation: Rain, Snow, Hail, Sleet, Fog, and the controversial sixth gender, "Partly Cloudy With A Chance Of Existential Dread."

Thermoxians measure time in "storm cycles," approximately 14 Earth days each. Their primary export is "renewable energy" — they literally are renewable energy, and they find the whole arrangement somewhat demeaning. They reproduce by merging two storm systems during monsoon season, which they refer to as "the romantic season" with exactly zero romance involved. The planet has 7 moons, and the Thermoxians have named them all "Steve" because they ran out of ideas during their first naming convention.`,
    questions: [
      { id: 'q1', label: 'Species classification:', answer: 'sentient weather', type: 'text' },
      { id: 'q2', label: 'Population count:', answer: '800', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '6', type: 'text' },
      { id: 'q5', label: 'Standard unit of temporal measurement:', answer: 'storm cycles', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'renewable energy', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '7', type: 'text' },
    ],
  },
  {
    id: 'bzzk-taal',
    name: "Bzzk'taal",
    icon: '🐝',
    region: 'Sigma Quadrant',
    difficulty: 2,
    description: `The Bzzk'taali are a hive mind of 30 billion insectoid organisms who collectively form a single consciousness named Kkrzzt. Kkrzzt is generally pleasant to talk to, if a bit distracted — imagine having a conversation with someone who is simultaneously doing 30 billion things. For census purposes, the Galactic Council counts Kkrzzt as a single entity with "a lot of bodies."

Kkrzzt communicates through pheromone clouds and interpretive dance. The dances are surprisingly graceful for beings with 8 legs each (that's 8 load-bearing appendages per unit, plus 4 decorative antennae). Kkrzzt has no concept of gender, preferring the designation "The Swarm," but for form purposes lists gender as "collective."

Kkrzzt's primary export is "precision manufacturing" — when you have 30 billion bodies that move in perfect synchronization, you can build things at an atomic level. They measure distance in "wingbeats," approximately 3 centimeters each. Kkrzzt's average lifespan is theoretically infinite, as individual bodies die and are replaced, but the consciousness persists. For paperwork, they put down 10,000 years, which is how long the current iteration of Kkrzzt has existed. The planet has 1 moon, which Kkrzzt has covered entirely in honeycomb structures.`,
    questions: [
      { id: 'q1', label: 'Population (sentient entities):', answer: '1', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only, per unit):', answer: '8', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: 'collective', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'precision manufacturing', type: 'text' },
      { id: 'q6', label: 'Average lifespan (bureaucratic standard, Earth years):', answer: '10000', type: 'text' },
      { id: 'q7', label: 'Standard unit of spatial measurement:', answer: 'wingbeats', type: 'text' },
    ],
  },
  {
    id: 'numbria',
    name: 'Numbria',
    icon: '🔢',
    region: 'Paradox Nebula',
    difficulty: 3,
    description: `The Numbrians are mathematical entities — literally living equations that gained sentience during a particularly intense university lecture 12,000 years ago. They don't have physical bodies; instead, they exist as self-propagating mathematical proofs floating through a dimension of pure logic. Population: exactly 1,000,000 (they find round numbers aesthetically pleasing and will exile anyone who reproduces without authorization).

Numbrians communicate by modifying each other's variables — essentially rewriting parts of each other's equations, which they consider either flirting or warfare depending on which variable gets changed. They recognize exactly pi (3.14159...) genders, and are extremely smug about it. They have no need for physical measurements, but when forced to specify a unit of distance, they use "proof-lengths" — the conceptual distance between a theorem's hypothesis and its conclusion.

Their primary export is "computational power" — other civilizations rent Numbrian brainpower for complex calculations. They experience time as a series of discrete logical steps rather than continuous flow, with each step taking approximately 0.001 Earth seconds. The planet itself doesn't physically exist in 3 dimensions — it occupies 5 spatial dimensions, which Numbrians consider "barely adequate." They have 0 moons because moons are, quote, "geometrically unimaginative."`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '1000000', type: 'text' },
      { id: 'q2', label: 'Species base composition:', answer: 'abstract concept', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: 'pi', type: 'text' },
      { id: 'q4', label: 'Standard unit of spatial measurement:', answer: 'proof-lengths', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'computational power', type: 'text' },
      { id: 'q6', label: 'Number of spatial dimensions inhabited:', answer: '5', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '0', type: 'text' },
    ],
  },
  {
    id: 'plorp',
    name: 'Plorp',
    icon: '🫧',
    region: 'Outer Fringe',
    difficulty: 1,
    description: `The Plorpians are a liquid species — imagine sentient puddles with dreams and aspirations. They communicate by splashing, with different splash patterns conveying different meanings. A gentle ripple means "hello," a vigorous splash means "I love you," and evaporating slightly means "this meeting could have been an email."

There are approximately 5 billion Plorpians on the planet, though exact counts are difficult because they frequently merge and split. They recognize 1 gender, which they call "wet." Their average lifespan is 50 Earth years, after which they evaporate and rain back down as a new individual (they do not consider this reincarnation, but rather "aggressive recycling").

The Plorpians measure distance in "flow-lengths," the distance a Plorpian can flow downhill in one minute. Their primary export is "ultra-pure solvent" — essentially, well-educated Plorpians who volunteer to dissolve things for scientific purposes abroad. They inhabit 3 spatial dimensions and find this perfectly sufficient. The planet has 4 moons, all of which cause tides that the Plorpians consider a form of entertainment. Their government is a "fluid democracy" (they are very proud of this pun and will bring it up constantly).`,
    questions: [
      { id: 'q1', label: 'Species base composition:', answer: 'liquid', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q2', label: 'Population count:', answer: '5 billion', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '50', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'flow-lengths', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'ultra-pure solvent', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '4', type: 'text' },
    ],
  },
  {
    id: 'chrona-shift',
    name: 'Chrona Shift',
    icon: '⏳',
    region: 'Paradox Nebula',
    difficulty: 4,
    description: `The Chronans experience time in reverse. They are born with complete knowledge of their lives and slowly forget everything until they die in a state of blissful ignorance. This makes census-taking extraordinarily confusing, as every Chronan you meet already knows what you're going to ask and is deeply bored by it.

The population is 3 million, though since Chronans experience time backwards, they insist the population "will be" 3 million and currently "was" 7 million (from their perspective, the population is shrinking because births haven't happened yet). For official records, use 3 million. They communicate through temporal echoes — essentially, they speak words that arrive before they're said. They recognize 4 genders: Past, Present, Future, and Pluperfect.

Their average lifespan is 150 Earth years (experienced in reverse). They measure distance in "temporal strides," which is confusing because it's actually a unit of time that they use for distance. Their primary export is "precognitive consulting" — since they remember the future, they sell predictions, though they find the whole enterprise tedious since they already know you're going to buy it. The planet has 3 moons, and the Chronans claim there used to be 5, which will happen next century.`,
    questions: [
      { id: 'q1', label: 'Population (current official record):', answer: '3 million', type: 'text' },
      { id: 'q2', label: 'Average lifespan (standard Earth years):', answer: '150', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '4', type: 'text' },
      { id: 'q4', label: 'Standard unit of spatial measurement:', answer: 'temporal strides', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'precognitive consulting', type: 'text' },
      { id: 'q6', label: 'Number of natural satellites (current):', answer: '3', type: 'text' },
      { id: 'q7', label: 'Average lifespan (specify temporal direction):', answer: 'reverse', type: 'select', options: ['forward', 'reverse', 'sideways', 'all directions simultaneously', 'time is a suggestion'] },
    ],
  },
  {
    id: 'skreelix',
    name: 'Skreelix',
    icon: '🦠',
    region: 'Outer Fringe',
    difficulty: 2,
    description: `The Skreelians are a microscopic civilization — each individual is about 0.003 millimeters tall, making them completely invisible to the naked eye. What appears to be an empty, rocky planet is actually home to 900 trillion Skreelians living in elaborate nano-cities carved into individual grains of sand. They are extremely sensitive about their size and have filed 2,847 formal complaints about the phrase "it's a small world."

Skreelians communicate through bioluminescent pulses — they glow in patterns to convey meaning. Each Skreelian has 6 appendages, all load-bearing (they're shaped like tiny hexapods). They recognize 2 genders and find larger species' gender complexities "an absurd waste of space, which they certainly have plenty of." Their average lifespan is 2 Earth days, during which they accomplish an astonishing amount.

The primary export of Skreelix is "nano-engineering services." They measure distance in "microleaps," each about 0.001 millimeters. Their government is a meritocratic republic with elections every 6 hours (about a quarter of their lifespan). The planet has 1 moon, which the Skreelians have been slowly colonizing for the past century. They inhabit 3 spatial dimensions but have theoretical models for 11.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '900 trillion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '6', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth days):', answer: '2', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'nano-engineering services', type: 'text' },
      { id: 'q7', label: 'Standard unit of spatial measurement:', answer: 'microleaps', type: 'text' },
    ],
  },
  {
    id: 'solarius-zen',
    name: 'Solarius Zen',
    icon: '☀️',
    region: 'Inner Core',
    difficulty: 3,
    description: `The Solarii are plasma beings who live inside their sun. Yes, inside it. They find the concept of living on a planet's surface hilariously exposed and refer to planet-dwellers as "those poor creatures who live in the weather." There are 40,000 Solarii, each a swirling vortex of superheated plasma about 10,000 kilometers across.

Solarii communicate through magnetic field fluctuations, which unfortunately causes solar flares that occasionally disrupt electronics on nearby planets (they've received 156 noise complaints and counting). They recognize 8 genders, each corresponding to a different type of nuclear fusion reaction. Their average lifespan is 1 billion Earth years, making them among the longest-lived species in the galaxy, and also among the most insufferably patient.

They measure distance in "flux-radii," a unit based on their sun's magnetic field lines. Their primary export is, well, nothing — getting anything out of a star is logistically challenging. However, they do provide "stellar consultation services" to civilizations that need help managing their own stars. They inhabit 3 spatial dimensions and consider this "cozy." The star they live in has 0 moons (it's a star), but 6 planets orbit it, none of which the Solarii consider worth visiting.

Does the species experience "fun"? The Solarii spent 10,000 years debating this question and concluded: "INSUFFICIENT_DATA."`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '40000', type: 'text' },
      { id: 'q2', label: 'Species base composition:', answer: 'plasma', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '8', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '1 billion', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'flux-radii', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'stellar consultation services', type: 'text' },
      { id: 'q7', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'INSUFFICIENT_DATA', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
    ],
  },
  {
    id: 'verdanthos',
    name: 'Verdanthos',
    icon: '🌿',
    region: 'Inner Core',
    difficulty: 1,
    description: `Verdanthos is a lush jungle planet whose dominant species are sentient trees called the Verdanti. They are extremely slow-moving (top speed: 2 meters per year) but remarkably intelligent, having developed philosophy, mathematics, and a surprisingly competitive bowling league over the past 50,000 years. Population: 200 million trees, each between 30 and 500 years old, with an average lifespan of 400 Earth years.

The Verdanti communicate through root networks — chemical signals passed underground, essentially a biological internet. They call it the "Rootweb" and are very proud of never having invented social media on it. They recognize 3 genders: Pollen-Producer, Seed-Bearer, and Photosynthesizer (the last being a non-reproductive gender focused entirely on energy production and "vibes").

They have 0 load-bearing appendages (they're trees) but do have an average of 47 branches per individual. Their primary export is "oxygen" (they're trees, it's what they do) and "philosophical timber" — wood that, when burned, releases profound thoughts into the air. They measure distance in "root-reaches," approximately 10 meters. The planet has 2 moons, both of which the Verdanti have named after types of soil.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '200 million', type: 'text' },
      { id: 'q2', label: 'Average lifespan (standard Earth years):', answer: '400', type: 'text' },
      { id: 'q3', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '3', type: 'text' },
      { id: 'q5', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'oxygen', type: 'text' },
      { id: 'q7', label: 'Standard unit of spatial measurement:', answer: 'root-reaches', type: 'text' },
    ],
  },
  {
    id: 'mirrorax',
    name: 'Mirrorax',
    icon: '🪞',
    region: 'Outer Fringe',
    difficulty: 4,
    description: `The Mirroraxians are beings made of living reflective surfaces. Each individual is essentially a mobile, sentient mirror that reflects not just light, but also emotions, memories, and tax obligations. Looking at a Mirroraxian shows you not your face, but your deepest bureaucratic anxiety — which, for a census taker, is a profoundly unsettling experience.

There are 15 million Mirroraxians, though counting them is nightmarish because they constantly reflect each other, creating apparent duplicates. The "true" population was determined by counting them in complete darkness, which they found offensive. They communicate through reflected light patterns — essentially, they flash images at each other. This counts as 1 communication modality, though they argue it should count as "infinity" since each reflection contains infinite regression.

Mirroraxians recognize 2 genders: Convex and Concave. They reproduce by "shattering" — an individual breaks into fragments, each of which grows into a new Mirroraxian. Average lifespan: 75 Earth years, unless cracked, which is considered both a medical condition and a social faux pas. Their primary export is "truth serum" — not a liquid, but a service where you stand in front of a Mirroraxian and they reflect your true motivations. They measure distance in "reflections," defined as the distance light travels between two facing Mirroraxians before the image becomes unreadable. They inhabit 3 spatial dimensions. The planet has 0 moons — any moon that formed would be immediately reflected into aesthetic confusion.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '15 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '75', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'truth serum', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'reflections', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '0', type: 'text' },
      { id: 'q8', label: 'Number of spatial dimensions inhabited:', answer: '3', type: 'text' },
    ],
  },
  {
    id: 'grumblor',
    name: 'Grumblor',
    icon: '😤',
    region: 'Inner Core',
    difficulty: 2,
    description: `The Grumblorians are carbon-based bipeds who are perpetually annoyed. Not angry — just mildly, constantly irritated by everything. Their entire civilization was built on complaints. Their constitution begins with "We, the Inconvenienced..." and their national anthem is just 4 minutes of sighing.

There are 2.5 billion Grumblorians. They communicate through a spoken language called "Grumblish," which has 47 words for "unsatisfactory" and no word for "delightful." They have 2 load-bearing legs and 4 arms (2 are dedicated entirely to gesticulating disapproval). They recognize 5 genders, each of which considers itself the most put-upon.

Average lifespan is 120 Earth years, which every Grumblorian considers "not long enough to complain about everything." Their primary export is "quality assurance reviews" — they are the galaxy's most effective product testers because they will find something wrong with literally anything. They measure distance in "stomps," approximately 0.8 meters. The planet has 3 moons, and the Grumblorians have filed noise complaints about all of them (tidal forces, apparently). Their government is a "complainocracy" where the being with the most valid grievances becomes Supreme Grumbler.

Does the species experience "fun"? N. They experience "slightly less annoyance," which is as close as they get.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '2.5 billion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '5', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '120', type: 'text' },
      { id: 'q5', label: 'Primary economic output (Category B-7):', answer: 'quality assurance reviews', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'stomps', type: 'text' },
      { id: 'q7', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'N', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
    ],
  },
  {
    id: 'melodyne',
    name: 'Melodyne',
    icon: '🎵',
    region: 'Inner Core',
    difficulty: 3,
    description: `The Melodynes are beings made entirely of sound waves. They don't have bodies in any traditional sense — each Melodyne is a self-sustaining harmonic frequency that persists through the planet's thick atmosphere. You can't see them, but you can hear them: each individual is a unique chord that moves through the air with purpose and, occasionally, a catchy beat.

Population: 6 million distinct harmonic entities. They communicate by harmonizing with each other — adding notes to create meaning. A major chord means agreement, a minor chord means disagreement, and a diminished seventh means "I'd like to speak to your manager." They recognize 12 genders, corresponding to the 12 notes of the chromatic scale. Their average lifespan is 500 Earth years, after which they "resolve" (their word for death) into silence.

They measure distance in "wavelengths," calibrated to the planet's atmospheric resonance frequency. Their primary export is "therapeutic harmonics" — essentially, music that can cure specific diseases, though it's terrible to listen to. They inhabit 3 spatial dimensions but experience sound in 4, which they claim gives music a "depth" that other species simply cannot comprehend. The planet has 1 moon that orbits at a frequency that creates a perpetual low hum, which the Melodynes consider "the bass line of existence."`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '6 million', type: 'text' },
      { id: 'q2', label: 'Species base composition:', answer: 'abstract concept', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '12', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '500', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'wavelengths', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'therapeutic harmonics', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '1', type: 'text' },
    ],
  },
  {
    id: 'graviton-well',
    name: 'Graviton Well',
    icon: '🕳️',
    region: 'Deep Void',
    difficulty: 5,
    description: `Graviton Well isn't a planet — it's a sentient gravitational anomaly. The "inhabitants" are fluctuations in spacetime itself, each one a localized distortion in the fabric of reality. There are exactly 42 of them, and they consider this number cosmically significant for reasons they refuse to explain but will giggle about if asked (gravitational giggling sounds like distant thunder).

The Gravitons communicate by warping spacetime — bending light around themselves in specific patterns. This is technically 1 communication modality, but each message also slightly alters the flow of time for anyone nearby, so conversations tend to age you. They don't have genders, appendages, or physical form — when the census form asks for "preferred state of matter," they answer "I am the reason matter has state." For filing purposes, their gender cardinality is listed as "not applicable" and their preferred state of matter is "force."

Their average lifespan is the age of the universe — approximately 13.8 billion Earth years. They've been around since the Big Bang and find everything since "a bit derivative." They measure distance in "curvatures," a unit that describes how much spacetime bends rather than linear distance. Primary export: "gravitational anchoring services" for civilizations that want to keep their planets in stable orbits. They inhabit 4 spatial dimensions, plus time, plus 2 dimensions they invented and refuse to share. Their "planet" has 0 moons because anything that gets close enough gets spaghettified.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '42', type: 'text' },
      { id: 'q2', label: 'Preferred state of matter:', answer: 'force', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: 'not applicable', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '13.8 billion', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'curvatures', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'gravitational anchoring services', type: 'text' },
      { id: 'q7', label: 'Number of spatial dimensions inhabited:', answer: '4', type: 'text' },
      { id: 'q8', label: 'Number of natural satellites:', answer: '0', type: 'text' },
    ],
  },
  {
    id: 'duplica',
    name: 'Duplica',
    icon: '👥',
    region: 'Outer Fringe',
    difficulty: 3,
    description: `The Duplicans are a species that reproduces by exact self-copying. Every Duplican is genetically, mentally, and aesthetically identical to every other Duplican. There are currently 100 million of them, and they are all named "Dex." This creates obvious administrative challenges, so each Dex is also assigned a serial number, which they all secretly resent.

All 100 million Dexes communicate through telepathy — they share a partial hive mind that lets them transmit thoughts, though each individual retains independent consciousness (and independent opinions about being named Dex). They recognize 1 gender, which they call "Dex." Each Dex has 2 load-bearing legs and 2 arms, all perfectly proportioned and utterly identical to every other Dex's limbs.

Average lifespan: 80 Earth years. When a Dex dies, the others feel a moment of discomfort, like cosmic indigestion. Their primary export is "diplomatic arbitration" — since every Dex is identical, they are considered perfectly unbiased mediators (though critics point out they always side with whichever party reminds them most of themselves, which is everyone). They measure distance in "dex-strides," approximately 1.2 meters. The planet has 2 moons, both of which are exactly the same size. The Duplicans did not cause this but consider it "validating."`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '100 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth years):', answer: '80', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'diplomatic arbitration', type: 'text' },
      { id: 'q7', label: 'Standard unit of spatial measurement:', answer: 'dex-strides', type: 'text' },
    ],
  },
  {
    id: 'volcara',
    name: 'Volcara',
    icon: '🌋',
    region: 'Deep Void',
    difficulty: 3,
    description: `The Volcarans are molten silicon entities who live inside active volcanoes. Each Volcaran is essentially a blob of intelligent lava, approximately 5 meters in diameter, with a core temperature of 1,200 degrees Celsius. They think of room temperature the way humans think of deep space — hostile and absurdly cold.

Population: 500,000, spread across the planet's 12,000 active volcanoes (roughly 42 per volcano, forming small communities). They communicate by creating specific patterns in their thermal radiation — essentially, they speak in heat. They recognize 3 genders: Magmatic, Volcanic, and Igneous, though they insist the distinctions are "more of a temperature thing."

Volcarans have 0 load-bearing appendages — they flow rather than walk, using "heat-flows" as their unit of distance measurement (about 4 meters). Average lifespan: 10,000 Earth years, during which they slowly cool. A Volcaran's death is called "solidifying," and it's considered the worst insult to tell someone they look "a bit solid today."

Their primary export is "geothermal engineering expertise." They inhabit 3 spatial dimensions. The planet has 1 moon, which is volcanically active and serves as a popular retirement destination. Does the species experience "fun"? Y — they find eruptions absolutely hilarious.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '500000', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '3', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '10000', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'heat-flows', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'geothermal engineering expertise', type: 'text' },
      { id: 'q7', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'Y', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
      { id: 'q8', label: 'Number of natural satellites:', answer: '1', type: 'text' },
    ],
  },
  {
    id: 'wibblesworth',
    name: 'Wibblesworth',
    icon: '🎩',
    region: 'Sigma Quadrant',
    difficulty: 2,
    description: `The Wibblesians are carbon-based bipeds who evolved an obsession with bureaucracy as a survival mechanism. While other species developed claws or speed, the Wibblesians developed forms. In triplicate. Their planet is essentially one enormous government office, with 4 billion inhabitants who all hold at least 3 administrative positions simultaneously.

They communicate through "formal written correspondence," even when standing right next to each other. Every conversation begins with "Dear Sir/Madam/Other (circle one)" and ends with "Yours in Administrative Compliance." This makes casual conversation take approximately 45 minutes, which they consider efficient. They recognize 7 genders, each with its own dedicated bathroom form.

Each Wibblesian has 2 load-bearing legs and 2 arms, though they've evolved an additional small arm specifically for stamping documents (3 arms total, but only the legs are load-bearing). Average lifespan: 95 Earth years, with mandatory retirement at 94 ("one year to process your own death paperwork"). They measure distance in "form-lengths," approximately the length of a standard Galactic Census Form (0.3 meters). Primary export: "bureaucratic consulting" — they help other civilizations build impenetrable administrative systems. The planet has 2 moons, both requiring separate visitor visas.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '4 billion', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '7', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth years):', answer: '95', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'form-lengths', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'bureaucratic consulting', type: 'text' },
    ],
  },
  {
    id: 'ecliptar-void',
    name: 'Ecliptar Void',
    icon: '🌑',
    region: 'Deep Void',
    difficulty: 4,
    description: `The Ecliptari are beings of pure darkness — not shadow, not absence of light, but sentient darkness itself. They exist in the spaces between photons, and they find light deeply offensive. Census takers are asked to conduct all interviews with their flashlights off, which makes filling out forms something of a challenge.

There are 7 million Ecliptari, though they're naturally impossible to count since you can't see them. The official census was conducted by asking each one to make a sound, which they did reluctantly (they communicate primarily through "darkness modulation" — varying the intensity of the darkness they project, which non-Ecliptari cannot perceive). For the census, they used audible clicking as a temporary accommodation, making their modalities technically 2 during census periods, but officially 1.

They recognize 0 genders. They reproduce by "dimming" — a region of space spontaneously becomes darker until it achieves sentience, a process that takes about 10 years. Average lifespan: 5,000 Earth years. They have 0 load-bearing appendages — they don't walk, they "spread." They measure distance in "shades," based on the gradations of darkness between pure black and very dark gray. Primary export: "light absorption services" for civilizations that need controlled darkness environments. The planet (which orbits no star — it's a rogue planet) has 0 moons. They inhabit 3 spatial dimensions and 1 "darkness dimension" that physicists insist doesn't exist but the Ecliptari will argue about passionately.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '7 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '0', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '5000', type: 'text' },
      { id: 'q5', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'shades', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'light absorption services', type: 'text' },
      { id: 'q8', label: 'Number of spatial dimensions inhabited:', answer: '3', type: 'text' },
    ],
  },
  {
    id: 'festiva-prime',
    name: 'Festiva Prime',
    icon: '🎉',
    region: 'Inner Core',
    difficulty: 1,
    description: `The Festivans are a carbon-based species whose entire culture revolves around celebrations. They have a holiday for everything — literally everything. "It's Tuesday" is a holiday. "Someone sneezed" is a holiday. "We ran out of holidays" is, paradoxically, also a holiday. This means the Festivans have never actually done a day of work in recorded history, and yet their civilization thrives because their celebrations have become so elaborate they accidentally generate economic output.

Population: 10 billion extremely cheerful beings. They communicate through song — every sentence is sung, often with improvised harmonics. Their language has no word for "boring" but has 200 words for different types of confetti. Each Festivan has 2 legs and 2 arms, plus a prehensile tail used exclusively for holding drinks at parties.

They recognize 2 genders: "Party" and "After-Party." Average lifespan: 60 Earth years, and their funerals are the best parties on the planet. They measure distance in "dance-steps," approximately 0.5 meters. Primary export: "celebration consulting" — other civilizations hire Festivans to plan events, though the results tend to be more festive than anticipated. The planet has 5 moons, each dedicated to a different type of celebration. Does the species experience "fun"? Asking a Festivan this question would be like asking a fish if it experiences water.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '10 billion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '60', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'dance-steps', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'celebration consulting', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '5', type: 'text' },
    ],
  },
  {
    id: 'paradoxia',
    name: 'Paradoxia',
    icon: '🔄',
    region: 'Paradox Nebula',
    difficulty: 5,
    description: `Paradoxia is a planet where everything is simultaneously true and false. The inhabitants, known as Paradoxians, exist in a perpetual state of logical contradiction. They are alive and dead, here and not here, filling out their census forms and not filling out their census forms, all at once. This is not quantum mechanics — they're just very committed to being difficult.

The population is both 0 and 20 million. For bureaucratic purposes, the Galactic Council threw up its hands and recorded "10 million (compromise)." They communicate by stating the opposite of what they mean, but also sometimes they don't, and knowing which is which is the primary challenge of interacting with them. This counts as 1 communication modality: "contradiction."

They recognize 1 gender, which they describe as "the opposite of whatever you just said." Average lifespan: they claim both 0 and infinity, so the compromise is 1,000 Earth years. They measure distance in "paradox-spans," which get shorter the farther you travel (this breaks several laws of physics, which the Paradoxians consider "more of a suggestion"). Primary export: "logical defense systems" — no invading army can conquer a planet where the front gate is simultaneously open and closed.

The planet has 4 moons that both exist and don't. The Galactic Council counts 4. They inhabit 3 spatial dimensions, which they also inhabit 0 of. Does the species experience "fun"? Both Y and N, recorded as "Y" because the census taker just wanted to go home.`,
    questions: [
      { id: 'q1', label: 'Population (bureaucratic compromise):', answer: '10 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Average lifespan (bureaucratic compromise, Earth years):', answer: '1000', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'paradox-spans', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'logical defense systems', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites (official count):', answer: '4', type: 'text' },
      { id: 'q8', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'Y', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
    ],
  },
  {
    id: 'symbiox',
    name: 'Symbiox',
    icon: '🤝',
    region: 'Inner Core',
    difficulty: 3,
    description: `Symbiox is home to not one but two sentient species that share every single body: the Sym and the Biox. Every individual on the planet is actually two beings in one — the Sym controls the left half, the Biox controls the right half, and they spend most of their time arguing about which direction to walk. There are 300 million bodies, meaning 600 million sentient individuals, though the census form only has room for one population number so they went with 600 million.

The Sym communicate through verbal speech (left mouth), while the Biox communicate through sign language (right hand). Each body has 2 load-bearing legs (1 controlled by each species) and 2 arms. They recognize a combined total of 3 genders across both species (the Sym have 2, the Biox have 1, and they've agreed to pool their genders for simplicity).

Average lifespan: 90 Earth years per body (both inhabitants die simultaneously, which they handle with surprising grace). They measure distance in "half-steps," approximately 0.3 meters — the distance the body moves when only one side is walking. Primary export: "conflict resolution therapy," since every Symbioxian has been negotiating with a roommate literally since birth. The planet has 2 moons, one named by the Sym ("Leftia") and one by the Biox ("Rightmund").`,
    questions: [
      { id: 'q1', label: 'Population (total sentient individuals):', answer: '600 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '2', type: 'text' },
      { id: 'q3', label: 'Appendage count (load-bearing only, per body):', answer: '2', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality (combined):', answer: '3', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth years):', answer: '90', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'half-steps', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'conflict resolution therapy', type: 'text' },
    ],
  },
  {
    id: 'dreamscape-eta',
    name: 'Dreamscape Eta',
    icon: '💤',
    region: 'Deep Void',
    difficulty: 4,
    description: `The Dreamers of Eta don't exist in the waking world. They are sentient dreams — thoughts that escaped from the sleeping minds of an ancient, now-extinct species and took on lives of their own. Each Dreamer is a self-sustaining narrative that experiences reality as a story being told. There are 50 million Dreamers, though they insist the number is "whatever makes for a better plot."

Dreamers communicate through "narrative insertion" — they add scenes to each other's ongoing stories. This is 1 communication modality that feels like 1,000 because a single message can contain entire plotlines. They recognize 4 genders: Protagonist, Antagonist, Supporting Character, and Narrator. Average lifespan: technically infinite, but Dreamers "end" when their narrative reaches a satisfying conclusion, which averages about 300 Earth years.

They don't have physical forms, so appendages are 0. Their preferred state of matter is "narrative" (filed under "abstract concept" on official forms). They measure distance in "chapters" — the conceptual distance between two plot points. Primary export: "dream therapy" — they enter the dreams of other species and fix recurring nightmares, for a fee. They inhabit 2 spatial dimensions (stories are flat, they argue) and a "narrative dimension" that literature professors across the galaxy are still arguing about. The "planet" has 1 moon, which is actually a recurring dream about a moon that became self-sustaining.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '50 million', type: 'text' },
      { id: 'q2', label: 'Species base composition:', answer: 'abstract concept', type: 'select', options: ['solid', 'liquid', 'gas', 'plasma', 'abstract concept'] },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '4', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '300', type: 'text' },
      { id: 'q5', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'chapters', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'dream therapy', type: 'text' },
      { id: 'q8', label: 'Number of spatial dimensions inhabited:', answer: '2', type: 'text' },
    ],
  },
  {
    id: 'crunchtopia',
    name: 'Crunchtopia',
    icon: '🦀',
    region: 'Outer Fringe',
    difficulty: 2,
    description: `The Crunchtopians are crustacean-like beings whose entire society is organized around an elaborate system of shell-based social hierarchy. The bigger your shell, the more important you are. The current president has a shell approximately the size of a small house and requires 12 attendants just to help them turn around.

Population: 8 billion Crunchtopians, each with 10 load-bearing legs and 2 large claws (the claws are not load-bearing but are essential for the national pastime: competitive claw-snapping). They communicate through a combination of claw clicks and bubble patterns in water, giving them 2 distinct communication modalities. They recognize 2 genders: Soft-Shell and Hard-Shell, which are not biological genders but molting stages that alternate throughout life.

Average lifespan: 35 Earth years, though they molt and grow a new shell every 5 years, which they consider a birthday, a funeral, and a home renovation all at once. They measure distance in "scuttles," approximately 0.2 meters. Primary export: "structural engineering" — their shell-building expertise translates remarkably well to architecture. The planet is 90% ocean, and the Crunchtopians live exclusively underwater. They have 3 moons, all of which cause tides they use for transportation. They inhabit 3 spatial dimensions and experience fun — specifically, the fun of watching someone trip over their own legs (with 10 legs, this happens often).`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '8 billion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '10', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth years):', answer: '35', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'scuttles', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'structural engineering', type: 'text' },
    ],
  },
  {
    id: 'amnesia-prime',
    name: 'Amnesia Prime',
    icon: '🧠',
    region: 'Deep Void',
    difficulty: 5,
    description: `The Amnesians are a silicon-based species with a unique cognitive quirk: they forget everything every 24 Earth hours. Every morning, each Amnesian wakes up with no memories whatsoever. Their entire civilization is built around elaborate systems of notes, signs, and automated reminders. The first thing every Amnesian reads each morning is a document titled "WHO YOU ARE AND WHY YOU SHOULDN'T PANIC" (they panic anyway, approximately 60% of the time).

Population: 2 billion, though they recount every single day because nobody remembers yesterday's count. They communicate through written symbols (spoken language is pointless when you forget the dictionary daily), giving them 1 communication modality. They recognize 3 genders, helpfully tattooed on each individual at birth.

Average lifespan: 70 Earth years, none of which they remember. They have 4 load-bearing legs and 2 arms. They measure distance in "walks" — defined by signs posted along every road saying "you are 1 walk from the city center" (approximately 1 kilometer). Primary export: "secure data destruction" — no one destroys information more thoroughly than a species that forgets it exists.

The planet has 3 moons, which the Amnesians rediscover and rename every night. Current moon names change daily and are recorded in a log that now contains over 25 million unique names. Does the species experience "fun"? Every day is their first day, so: Y, but they won't remember it.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '2 billion', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '3', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '70', type: 'text' },
      { id: 'q5', label: 'Appendage count (load-bearing only):', answer: '4', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'walks', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'secure data destruction', type: 'text' },
      { id: 'q8', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'Y', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
    ],
  },
  {
    id: 'magnetar-zyx',
    name: 'Magnetar-ZYX',
    icon: '🧲',
    region: 'Sigma Quadrant',
    difficulty: 3,
    description: `The Magnetari are beings made of organized electromagnetic fields. They look like beautiful, shimmering auroras and are magnetically attracted to (and deeply annoyed by) any metallic objects in their vicinity. Census takers are required to leave all metal equipment at the orbital station and conduct interviews using wooden clipboards, which the Magnetari find charmingly primitive.

Population: 18 million field entities. They communicate through electromagnetic pulse patterns — modulated EM waves that carry complex information. They recognize 2 genders: Positive and Negative, and romantic relationships can only form between opposing polarities (same-polarity relationships are physically impossible as they literally repel each other).

Each Magnetari has 0 load-bearing appendages — they hover and drift through magnetic field lines. Average lifespan: 2,000 Earth years, after which they dissipate into background radiation in a process called "the Final Pulse," which is considered beautiful by all who witness it. They measure distance in "field-lines," approximately 100 meters each. Primary export: "data storage solutions" — a single Magnetari can store more information in their field structure than most planetary databases. They inhabit 3 spatial dimensions. The planet has 1 moon with an unusually strong magnetic field, which serves as a pilgrimage site.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '18 million', type: 'text' },
      { id: 'q2', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q3', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '2000', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'field-lines', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'data storage solutions', type: 'text' },
      { id: 'q7', label: 'Number of natural satellites:', answer: '1', type: 'text' },
    ],
  },
  {
    id: 'slumberon',
    name: 'Slumberon',
    icon: '😴',
    region: 'Outer Fringe',
    difficulty: 2,
    description: `The Slumberonians are a species that spends 23 hours of every 24-hour cycle asleep. Their one waking hour is an absolute frenzy of activity — they eat, socialize, govern, innovate, and argue about politics all in 60 minutes, then immediately pass out again. Their civilization has achieved remarkable things in cumulative 15-minute increments.

Population: 1.5 billion extremely drowsy beings. They communicate through a rapid-fire spoken language called "Speed-Mumble," where entire conversations happen in under 30 seconds. Each Slumberonian has 2 load-bearing legs and 2 arms, though they've evolved especially soft, pillow-like body tissue for comfortable sleeping on any surface.

They recognize 2 genders: "Early Bird" and "Night Owl" (both misnomers, as neither wakes up early or stays up late). Average lifespan: 200 Earth years, approximately 192 of which are spent sleeping. They measure distance in "sleep-rolls," the distance an average Slumberonian rolls in their sleep (about 2 meters). Primary export: "sleep technology" — their mattresses, pillows, and sleep-optimization devices are legendary across the galaxy. The planet has 3 moons, which they've never actually seen because they're always asleep when the moons are visible. Does the species experience "fun"? INSUFFICIENT_DATA — they're always too busy or too asleep to answer the question.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '1.5 billion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard Earth years):', answer: '200', type: 'text' },
      { id: 'q5', label: 'Standard unit of spatial measurement:', answer: 'sleep-rolls', type: 'text' },
      { id: 'q6', label: 'Primary economic output (Category B-7):', answer: 'sleep technology', type: 'text' },
      { id: 'q7', label: 'Does species experience "fun"? (Y/N/INSUFFICIENT_DATA):', answer: 'INSUFFICIENT_DATA', type: 'select', options: ['Y', 'N', 'INSUFFICIENT_DATA'] },
    ],
  },
  {
    id: 'fractalia',
    name: 'Fractalia',
    icon: '🔷',
    region: 'Paradox Nebula',
    difficulty: 4,
    description: `The Fractalians are geometric entities — each individual is a living, self-replicating fractal pattern that exists at every scale simultaneously. Zoom in on a Fractalian and you see smaller Fractalians; zoom out and the Fractalian is part of a larger Fractalian. This makes population counting a philosophical nightmare. The official count is 1 million at "standard observation scale," but at any given zoom level, the number is different.

They communicate through geometric transformation — rotating, scaling, and reflecting their patterns to create meaning. A 90-degree rotation means "hello," a mirror reflection means "I disagree," and a Mandelbrot set transformation means "this is getting too complex." This constitutes 1 communication modality. They recognize 3 genders: Symmetric, Asymmetric, and Self-Similar.

Average lifespan: infinite at the macro scale, but individual iterations at standard scale persist for about 600 Earth years. They have 0 appendages — they exist as pure geometry. They measure distance in "iterations," which is the number of times you need to zoom in before a specific detail becomes visible. Primary export: "architectural design" — Fractalian buildings are both infinitely detailed and structurally perfect. They inhabit exactly 2.7 spatial dimensions (fractal dimension), which drives integer-dimension species absolutely crazy. The planet has 1 moon that is, predictably, a perfect sphere — the Fractalians consider it "boring" and "disappointingly Euclidean."`,
    questions: [
      { id: 'q1', label: 'Population (standard observation scale):', answer: '1 million', type: 'text' },
      { id: 'q2', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q3', label: 'Gender spectrum cardinality:', answer: '3', type: 'text' },
      { id: 'q4', label: 'Average lifespan (standard scale, Earth years):', answer: '600', type: 'text' },
      { id: 'q5', label: 'Appendage count (load-bearing only):', answer: '0', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'iterations', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'architectural design', type: 'text' },
      { id: 'q8', label: 'Number of spatial dimensions inhabited:', answer: '2.7', type: 'text' },
    ],
  },
  {
    id: 'appetite-9',
    name: 'Appetite-9',
    icon: '🍕',
    region: 'Sigma Quadrant',
    difficulty: 1,
    description: `The Appetitians are a carbon-based species whose entire biology, culture, and economy revolves around food. They have 3 stomachs, 2 mouths, and an average body composition that is 40% taste bud. Every holiday is a food holiday. Every law is a food law. Their supreme court once spent 8 years deliberating whether a hot dog is a sandwich (verdict: classified information).

Population: 6 billion very well-fed beings. They communicate through flavor — they secrete specific taste compounds that other Appetitians can read by licking the air, which humans find deeply unsettling. This is 1 communication modality. They have 2 load-bearing legs and 2 arms, plus a specialized tongue appendage about 1 meter long (not load-bearing).

They recognize 2 genders: "Sweet" and "Savory." Average lifespan: 85 Earth years, with mandatory retirement to an all-you-can-eat buffet at age 80. They measure distance in "bites," defined as the distance between two standard food stalls (about 5 meters). Primary export: "exotic cuisine" — Appetitian cooking is renowned galaxy-wide, though most dishes require digestive systems that other species don't have. The planet has 2 moons, one of which appears to have cheese-like surface deposits, causing a theological schism that has lasted 400 years.`,
    questions: [
      { id: 'q1', label: 'Population count:', answer: '6 billion', type: 'text' },
      { id: 'q2', label: 'Appendage count (load-bearing only):', answer: '2', type: 'text' },
      { id: 'q3', label: 'Number of distinct communication modalities:', answer: '1', type: 'text' },
      { id: 'q4', label: 'Gender spectrum cardinality:', answer: '2', type: 'text' },
      { id: 'q5', label: 'Average lifespan (standard Earth years):', answer: '85', type: 'text' },
      { id: 'q6', label: 'Standard unit of spatial measurement:', answer: 'bites', type: 'text' },
      { id: 'q7', label: 'Primary economic output (Category B-7):', answer: 'exotic cuisine', type: 'text' },
    ],
  },
];

// ============================================================
// REGIONS for the galaxy map
// ============================================================

const REGIONS = ['Sigma Quadrant', 'Paradox Nebula', 'Outer Fringe', 'Inner Core', 'Deep Void'];

const REGION_COLORS: Record<string, string> = {
  'Sigma Quadrant': 'var(--color-accent)',
  'Paradox Nebula': 'var(--color-purple)',
  'Outer Fringe': 'var(--color-cyan)',
  'Inner Core': 'var(--color-orange)',
  'Deep Void': 'var(--color-pink)',
};

const DIFFICULTY_LABELS = ['', 'Rookie', 'Cadet', 'Agent', 'Senior', 'Legendary'];

// ============================================================
// ANSWER MATCHING
// ============================================================

function normalizeAnswer(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]/g, '').trim();
}

function scoreAnswers(questions: CensusQuestion[], answers: Record<string, string>): number {
  let correct = 0;
  for (const q of questions) {
    const userAnswer = normalizeAnswer(answers[q.id] || '');
    const correctAnswer = normalizeAnswer(q.answer);
    if (userAnswer === correctAnswer) {
      correct++;
    }
  }
  // Map to 0-5 stars
  const ratio = correct / questions.length;
  if (ratio >= 0.95) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.2) return 1;
  return 0;
}

function countCorrect(questions: CensusQuestion[], answers: Record<string, string>): number {
  let correct = 0;
  for (const q of questions) {
    const userAnswer = normalizeAnswer(answers[q.id] || '');
    const correctAnswer = normalizeAnswer(q.answer);
    if (userAnswer === correctAnswer) correct++;
  }
  return correct;
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

const STORAGE_KEY = 'galactic-census-progress';

function loadProgress(): Record<string, PlanetProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveProgress(progress: Record<string, PlanetProgress>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

// ============================================================
// STAR RATING COMPONENT
// ============================================================

function StarRating({ score, size = 'text-2xl' }: { score: number; size?: string }) {
  return (
    <span className={`${size} inline-flex gap-1`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            color: i <= score ? 'var(--color-orange)' : 'var(--color-text-muted)',
            textShadow: i <= score ? '0 0 8px var(--color-orange)' : 'none',
            transition: 'all 0.3s ease',
            transitionDelay: `${i * 100}ms`,
          }}
        >
          {i <= score ? '\u2605' : '\u2606'}
        </span>
      ))}
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function GalacticCensusPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, PlanetProgress>>({});
  const [lastScore, setLastScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [filterRegion, setFilterRegion] = useState<string>('all');

  useEffect(() => {
    setMounted(true);
    setProgress(loadProgress());
  }, []);

  const updateProgress = useCallback((planetId: string, score: number, ans: Record<string, string>) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        [planetId]: { visited: true, score: Math.max(prev[planetId]?.score || 0, score), answers: ans },
      };
      saveProgress(next);
      return next;
    });
  }, []);

  const visitedCount = Object.values(progress).filter((p) => p.visited).length;
  const totalStars = Object.values(progress).reduce((sum, p) => sum + p.score, 0);
  const averageRating = visitedCount > 0 ? (totalStars / visitedCount).toFixed(1) : '0.0';

  const handleSubmitCensus = useCallback(() => {
    if (!selectedPlanet) return;
    const score = scoreAnswers(selectedPlanet.questions, answers);
    const correct = countCorrect(selectedPlanet.questions, answers);
    setLastScore(score);
    setLastCorrect(correct);
    updateProgress(selectedPlanet.id, score, answers);
    setShowResults(true);
    setScreen('results');
  }, [selectedPlanet, answers, updateProgress]);

  const goToMap = useCallback(() => {
    setScreen('map');
    setSelectedPlanet(null);
    setAnswers({});
    setShowResults(false);
  }, []);

  const selectPlanet = useCallback((planet: Planet) => {
    setSelectedPlanet(planet);
    setAnswers({});
    setShowResults(false);
    setScreen('planet');
  }, []);

  const resetAllProgress = useCallback(() => {
    setProgress({});
    saveProgress({});
  }, []);

  if (!mounted) return null;

  // ============================================================
  // MENU SCREEN
  // ============================================================
  if (screen === 'menu') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <Link
            href="/games"
            className="inline-block mb-8 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Games
          </Link>

          <div className="pixel-card rounded-lg p-6 md:p-10" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="text-6xl mb-4">🛸</div>
            <h1 className="pixel-text text-lg md:text-2xl mb-4" style={{ color: 'var(--color-accent)' }}>
              GALACTIC CENSUS
            </h1>
            <p className="text-sm md:text-base mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              You are a census taker for the Intergalactic Bureau of Statistics.
            </p>
            <p className="text-sm md:text-base mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Visit alien planets. Read their descriptions. Fill out the forms.
              <br />
              Try not to cause a diplomatic incident.
            </p>

            <div
              className="inline-block rounded-lg px-4 py-2 mb-6 text-xs"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>
                {PLANETS.length} planets to survey &middot; {visitedCount} visited &middot; Avg rating: {averageRating}
              </span>
            </div>

            <div className="flex flex-col gap-3 items-center">
              <button onClick={() => setScreen('map')} className="pixel-btn text-sm px-8 py-3">
                {visitedCount > 0 ? 'CONTINUE MISSION' : 'BEGIN MISSION'}
              </button>
              {visitedCount > 0 && (
                <button
                  onClick={resetAllProgress}
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Reset all progress
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <p>FORM IB-7742-G | AUTHORIZED PERSONNEL ONLY</p>
            <p>Intergalactic Bureau of Statistics &middot; Est. Year 2,847</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // GALAXY MAP SCREEN
  // ============================================================
  if (screen === 'map') {
    const filteredPlanets = filterRegion === 'all' ? PLANETS : PLANETS.filter((p) => p.region === filterRegion);

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {/* Header */}
        <div
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setScreen('menu')}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                &larr; Mission HQ
              </button>
              <div className="text-right">
                <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                  {visitedCount}/{PLANETS.length}
                </span>
                <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>planets surveyed</span>
              </div>
            </div>
            <h1 className="pixel-text text-xs md:text-sm" style={{ color: 'var(--color-accent)' }}>
              GALAXY MAP
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Avg rating: {averageRating}</span>
              <span>&middot;</span>
              <span>Total stars: {totalStars}/{visitedCount * 5 || 0}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(visitedCount / PLANETS.length) * 100}%`,
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 0 8px var(--color-accent)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Region filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilterRegion('all')}
              className="text-xs px-3 py-1 rounded-full border transition-all"
              style={{
                borderColor: filterRegion === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
                color: filterRegion === 'all' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                backgroundColor: filterRegion === 'all' ? 'var(--color-accent-glow)' : 'transparent',
              }}
            >
              All Regions
            </button>
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setFilterRegion(region)}
                className="text-xs px-3 py-1 rounded-full border transition-all"
                style={{
                  borderColor: filterRegion === region ? REGION_COLORS[region] : 'var(--color-border)',
                  color: filterRegion === region ? REGION_COLORS[region] : 'var(--color-text-muted)',
                  backgroundColor: filterRegion === region ? `color-mix(in srgb, ${REGION_COLORS[region]} 15%, transparent)` : 'transparent',
                }}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Planet grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredPlanets.map((planet) => {
              const prog = progress[planet.id];
              const visited = prog?.visited || false;
              const score = prog?.score || 0;

              return (
                <button
                  key={planet.id}
                  onClick={() => selectPlanet(planet)}
                  className="pixel-card rounded-lg p-3 md:p-4 text-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: visited ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
                    border: visited ? `1px solid ${REGION_COLORS[planet.region]}` : '1px solid var(--color-border)',
                  }}
                >
                  <div className="text-3xl md:text-4xl mb-2">{planet.icon}</div>
                  <h3 className="pixel-text text-[8px] md:text-[10px] leading-tight mb-1" style={{ color: REGION_COLORS[planet.region] }}>
                    {planet.name}
                  </h3>
                  <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {planet.region}
                  </div>
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="text-[10px]"
                        style={{ color: i <= planet.difficulty ? 'var(--color-orange)' : 'var(--color-text-muted)' }}
                      >
                        {i <= planet.difficulty ? '\u2605' : '\u2606'}
                      </span>
                    ))}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {DIFFICULTY_LABELS[planet.difficulty]}
                  </div>
                  {visited && (
                    <div className="mt-1">
                      <StarRating score={score} size="text-xs" />
                    </div>
                  )}
                  {!visited && (
                    <div className="text-[9px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      UNVISITED
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PLANET + CENSUS FORM SCREEN
  // ============================================================
  if (screen === 'planet' && selectedPlanet) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {/* Header */}
        <div
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={goToMap}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                &larr; Galaxy Map
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedPlanet.icon}</span>
                <div>
                  <h1 className="pixel-text text-xs md:text-sm" style={{ color: REGION_COLORS[selectedPlanet.region] }}>
                    {selectedPlanet.name}
                  </h1>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedPlanet.region} &middot; Difficulty: {DIFFICULTY_LABELS[selectedPlanet.difficulty]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Planet Description */}
            <div>
              <h2
                className="pixel-text text-xs mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-accent)' }}
              >
                <span>📡</span> PLANET BRIEFING
              </h2>
              <div
                className="pixel-card rounded-lg p-4 md:p-5 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  maxHeight: '70vh',
                  lineHeight: '1.7',
                }}
              >
                {selectedPlanet.description.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-sm mb-3 last:mb-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </div>

            {/* Census Form */}
            <div>
              <h2
                className="pixel-text text-xs mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-orange)' }}
              >
                <span>📋</span> CENSUS FORM IB-7742-G
              </h2>
              <div
                className="pixel-card rounded-lg p-4 md:p-5"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-orange)',
                }}
              >
                <div className="text-[10px] mb-4 pb-3 border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  INTERGALACTIC BUREAU OF STATISTICS &middot; AUTHORIZED FORM &middot; {selectedPlanet.questions.length} FIELDS REQUIRED
                </div>

                <div className="space-y-4">
                  {selectedPlanet.questions.map((q, idx) => (
                    <div key={q.id}>
                      <label
                        className="block text-xs mb-1 mono-text"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {idx + 1}. {q.label}
                      </label>
                      {q.type === 'select' && q.options ? (
                        <select
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full px-3 py-2 rounded text-sm mono-text outline-none transition-colors"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                          }}
                        >
                          <option value="">-- Select --</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Enter answer..."
                          className="w-full px-3 py-2 rounded text-sm mono-text outline-none transition-colors"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button onClick={handleSubmitCensus} className="pixel-btn text-sm px-6 py-2">
                    SUBMIT CENSUS FORM
                  </button>
                </div>

                <div className="text-[9px] mt-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  WARNING: Incorrect submissions may result in bureaucratic consequences
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RESULTS SCREEN
  // ============================================================
  if (screen === 'results' && selectedPlanet && showResults) {
    const totalQ = selectedPlanet.questions.length;

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="pixel-card rounded-lg p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{selectedPlanet.icon}</div>
              <h2 className="pixel-text text-sm md:text-lg mb-1" style={{ color: REGION_COLORS[selectedPlanet.region] }}>
                {selectedPlanet.name}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>CENSUS EVALUATION REPORT</p>
            </div>

            <div className="text-center mb-6">
              <div className="mb-2">
                <StarRating score={lastScore} size="text-3xl" />
              </div>
              <p className="pixel-text text-xs" style={{ color: 'var(--color-orange)' }}>
                {lastScore === 5 ? 'PERFECT CENSUS!' : lastScore >= 4 ? 'EXCELLENT WORK!' : lastScore >= 3 ? 'ACCEPTABLE' : lastScore >= 2 ? 'NEEDS IMPROVEMENT' : lastScore >= 1 ? 'POOR PERFORMANCE' : 'TOTAL FAILURE'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {lastCorrect} / {totalQ} fields correct
              </p>
            </div>

            {/* Answer breakdown */}
            <div className="space-y-3 mb-6">
              {selectedPlanet.questions.map((q, idx) => {
                const userAns = answers[q.id] || '';
                const isCorrect = normalizeAnswer(userAns) === normalizeAnswer(q.answer);
                return (
                  <div
                    key={q.id}
                    className="rounded-lg p-3 text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: `1px solid ${isCorrect ? 'var(--color-accent)' : 'var(--color-red)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="mono-text text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {idx + 1}. {q.label}
                      </span>
                      <span className="text-xs flex-shrink-0">
                        {isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="mono-text text-xs">
                        <span style={{ color: 'var(--color-text-muted)' }}>Your answer: </span>
                        <span style={{ color: isCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}>
                          {userAns || '(blank)'}
                        </span>
                      </span>
                      {!isCorrect && (
                        <span className="mono-text text-xs">
                          <span style={{ color: 'var(--color-text-muted)' }}>Correct: </span>
                          <span style={{ color: 'var(--color-accent)' }}>{q.answer}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => selectPlanet(selectedPlanet)} className="pixel-btn text-sm px-4 py-2">
                RETRY PLANET
              </button>
              <button onClick={goToMap} className="pixel-btn text-sm px-4 py-2">
                GALAXY MAP
              </button>
            </div>
          </div>

          <div className="text-center mt-4 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Your best score for this planet is saved. You can retry for a higher rating.
          </div>
        </div>
      </div>
    );
  }

  // Fallback — go to menu
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <button onClick={() => setScreen('menu')} className="pixel-btn">
        Return to Menu
      </button>
    </div>
  );
}
