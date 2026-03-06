'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

// ============================================
// Types
// ============================================

type ElementCategory = 'base' | 'nature' | 'weather' | 'tech' | 'civilization' | 'material' | 'food';

interface GameElement {
  id: string;
  name: string;
  emoji: string;
  category: ElementCategory;
}

// ============================================
// Element Definitions
// ============================================

const ALL_ELEMENTS: Record<string, GameElement> = {
  fire:       { id: 'fire',       name: 'Fire',       emoji: '\uD83D\uDD25', category: 'base' },
  water:      { id: 'water',      name: 'Water',      emoji: '\uD83D\uDCA7', category: 'base' },
  earth:      { id: 'earth',      name: 'Earth',      emoji: '\uD83C\uDF0D', category: 'base' },
  air:        { id: 'air',        name: 'Air',        emoji: '\uD83D\uDCA8', category: 'base' },

  steam:      { id: 'steam',      name: 'Steam',      emoji: '\u2668\uFE0F', category: 'weather' },
  lava:       { id: 'lava',       name: 'Lava',       emoji: '\uD83C\uDF0B', category: 'nature' },
  lightning:  { id: 'lightning',   name: 'Lightning',  emoji: '\u26A1',       category: 'weather' },
  plant:      { id: 'plant',      name: 'Plant',      emoji: '\uD83C\uDF31', category: 'nature' },
  cloud:      { id: 'cloud',      name: 'Cloud',      emoji: '\u2601\uFE0F', category: 'weather' },
  mountain:   { id: 'mountain',   name: 'Mountain',   emoji: '\uD83C\uDFD4\uFE0F', category: 'nature' },

  mud:        { id: 'mud',        name: 'Mud',        emoji: '\uD83C\uDFD6\uFE0F', category: 'nature' },
  rain:       { id: 'rain',       name: 'Rain',       emoji: '\uD83C\uDF27\uFE0F', category: 'weather' },
  stone:      { id: 'stone',      name: 'Stone',      emoji: '\uD83E\uDEA8', category: 'material' },
  ash:        { id: 'ash',        name: 'Ash',        emoji: '\uD83C\uDF2B\uFE0F', category: 'material' },
  plasma:     { id: 'plasma',     name: 'Plasma',     emoji: '\uD83D\uDD2E', category: 'tech' },
  crystal:    { id: 'crystal',    name: 'Crystal',    emoji: '\uD83D\uDD2E', category: 'material' },

  charcoal:   { id: 'charcoal',   name: 'Charcoal',   emoji: '\uD83C\uDF3E', category: 'material' },
  tree:       { id: 'tree',       name: 'Tree',       emoji: '\uD83C\uDF33', category: 'nature' },
  garden:     { id: 'garden',     name: 'Garden',     emoji: '\uD83C\uDF3B', category: 'nature' },
  sun:        { id: 'sun',        name: 'Sun',        emoji: '\u2600\uFE0F', category: 'weather' },
  fog:        { id: 'fog',        name: 'Fog',        emoji: '\uD83C\uDF2B\uFE0F', category: 'weather' },
  river:      { id: 'river',      name: 'River',      emoji: '\uD83C\uDF0A', category: 'nature' },
  rainbow:    { id: 'rainbow',    name: 'Rainbow',    emoji: '\uD83C\uDF08', category: 'weather' },
  metal:      { id: 'metal',      name: 'Metal',      emoji: '\uD83D\uDD29', category: 'material' },
  island:     { id: 'island',     name: 'Island',     emoji: '\uD83C\uDFDD\uFE0F', category: 'nature' },

  wood:       { id: 'wood',       name: 'Wood',       emoji: '\uD83E\uDEB5', category: 'material' },
  house:      { id: 'house',      name: 'House',      emoji: '\uD83C\uDFE0', category: 'civilization' },
  flower:     { id: 'flower',     name: 'Flower',     emoji: '\uD83C\uDF38', category: 'nature' },
  prism:      { id: 'prism',      name: 'Prism',      emoji: '\uD83C\uDF08', category: 'material' },
  robot:      { id: 'robot',      name: 'Robot',      emoji: '\uD83E\uDD16', category: 'tech' },
  sword:      { id: 'sword',      name: 'Sword',      emoji: '\u2694\uFE0F', category: 'civilization' },
  valley:     { id: 'valley',     name: 'Valley',     emoji: '\uD83C\uDFDE\uFE0F', category: 'nature' },
  ruins:      { id: 'ruins',      name: 'Ruins',      emoji: '\uD83C\uDFDA\uFE0F', category: 'civilization' },
  honey:      { id: 'honey',      name: 'Honey',      emoji: '\uD83C\uDF6F', category: 'food' },

  ai:         { id: 'ai',         name: 'AI',         emoji: '\uD83E\uDDE0', category: 'tech' },
  king:       { id: 'king',       name: 'King',       emoji: '\uD83D\uDC51', category: 'civilization' },
  campfire:   { id: 'campfire',   name: 'Campfire',   emoji: '\uD83D\uDD25', category: 'nature' },
  snow:       { id: 'snow',       name: 'Snow',       emoji: '\u2744\uFE0F', category: 'weather' },
  meltwater:  { id: 'meltwater',  name: 'Meltwater',  emoji: '\uD83D\uDCA7', category: 'nature' },
  paradise:   { id: 'paradise',   name: 'Paradise',   emoji: '\uD83C\uDFDD\uFE0F', category: 'nature' },
  internet:   { id: 'internet',   name: 'Internet',   emoji: '\uD83C\uDF10', category: 'tech' },
  castle:     { id: 'castle',     name: 'Castle',     emoji: '\uD83C\uDFF0', category: 'civilization' },
  diamond:    { id: 'diamond',    name: 'Diamond',    emoji: '\uD83D\uDC8E', category: 'material' },
  storm:      { id: 'storm',      name: 'Storm',      emoji: '\uD83C\uDF29\uFE0F', category: 'weather' },
  tsunami:    { id: 'tsunami',    name: 'Tsunami',    emoji: '\uD83C\uDF0A', category: 'weather' },
  wheat:      { id: 'wheat',      name: 'Wheat',      emoji: '\uD83C\uDF3E', category: 'food' },
  bread:      { id: 'bread',      name: 'Bread',      emoji: '\uD83C\uDF5E', category: 'food' },
  soup:       { id: 'soup',       name: 'Soup',       emoji: '\uD83C\uDF72', category: 'food' },
  ring:       { id: 'ring',       name: 'Ring',       emoji: '\uD83D\uDC8D', category: 'civilization' },
  kingdom:    { id: 'kingdom',    name: 'Kingdom',    emoji: '\uD83D\uDC78', category: 'civilization' },
  bridge:     { id: 'bridge',     name: 'Bridge',     emoji: '\uD83C\uDF09', category: 'civilization' },
  game:       { id: 'game',       name: 'Game',       emoji: '\uD83C\uDFAE', category: 'tech' },

  // Additional elements to reach 50+
  glass:      { id: 'glass',      name: 'Glass',      emoji: '\uD83E\uDEA9', category: 'material' },
  brick:      { id: 'brick',      name: 'Brick',      emoji: '\uD83E\uDDF1', category: 'material' },
  volcano:    { id: 'volcano',    name: 'Volcano',    emoji: '\uD83C\uDF0B', category: 'nature' },
  lake:       { id: 'lake',       name: 'Lake',       emoji: '\uD83C\uDFDE\uFE0F', category: 'nature' },
  swamp:      { id: 'swamp',      name: 'Swamp',      emoji: '\uD83E\uDDDF', category: 'nature' },
  ice:        { id: 'ice',        name: 'Ice',        emoji: '\uD83E\uDDCA', category: 'material' },
  desert:     { id: 'desert',     name: 'Desert',     emoji: '\uD83C\uDFDC\uFE0F', category: 'nature' },
  oasis:      { id: 'oasis',      name: 'Oasis',      emoji: '\uD83C\uDF34', category: 'nature' },
  electricity:{ id: 'electricity', name: 'Electricity', emoji: '\uD83D\uDD0C', category: 'tech' },
  computer:   { id: 'computer',   name: 'Computer',   emoji: '\uD83D\uDCBB', category: 'tech' },
  phone:      { id: 'phone',      name: 'Phone',      emoji: '\uD83D\uDCF1', category: 'tech' },
  armor:      { id: 'armor',      name: 'Armor',      emoji: '\uD83D\uDEE1\uFE0F', category: 'civilization' },
  crown:      { id: 'crown',      name: 'Crown',      emoji: '\uD83D\uDC51', category: 'civilization' },
};

// ============================================
// Combination Recipes (sorted key pairs)
// ============================================

function makeKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

const RECIPES: Record<string, string> = {
  // Base combinations (Tier 1)
  [makeKey('fire', 'water')]:      'steam',
  [makeKey('fire', 'earth')]:      'lava',
  [makeKey('fire', 'air')]:        'lightning',
  [makeKey('water', 'earth')]:     'plant',
  [makeKey('water', 'air')]:       'cloud',
  [makeKey('earth', 'air')]:       'mountain',

  // Tier 2
  [makeKey('steam', 'earth')]:     'mud',
  [makeKey('steam', 'air')]:       'rain',
  [makeKey('lava', 'water')]:      'stone',
  [makeKey('lava', 'air')]:        'ash',
  [makeKey('lightning', 'water')]: 'plasma',
  [makeKey('lightning', 'earth')]: 'crystal',
  [makeKey('plant', 'fire')]:      'charcoal',
  [makeKey('plant', 'water')]:     'tree',
  [makeKey('plant', 'earth')]:     'garden',
  [makeKey('cloud', 'fire')]:      'sun',
  [makeKey('cloud', 'earth')]:     'fog',
  [makeKey('rain', 'earth')]:      'river',
  [makeKey('rain', 'fire')]:       'rainbow',
  [makeKey('stone', 'fire')]:      'metal',
  [makeKey('stone', 'water')]:     'island',

  // Tier 3
  [makeKey('tree', 'fire')]:       'wood',
  [makeKey('tree', 'stone')]:      'house',
  [makeKey('garden', 'water')]:    'flower',
  [makeKey('sun', 'water')]:       'prism',
  [makeKey('metal', 'lightning')]: 'robot',
  [makeKey('metal', 'fire')]:      'sword',
  [makeKey('river', 'earth')]:     'valley',
  [makeKey('house', 'fire')]:      'ruins',
  [makeKey('flower', 'fire')]:     'honey',
  [makeKey('mountain', 'cloud')]:  'snow',
  [makeKey('wood', 'fire')]:       'campfire',

  // Tier 4
  [makeKey('robot', 'lightning')]: 'ai',
  [makeKey('sword', 'stone')]:     'king',
  [makeKey('snow', 'fire')]:       'meltwater',
  [makeKey('island', 'tree')]:     'paradise',
  [makeKey('crystal', 'lightning')]: 'diamond',
  [makeKey('fog', 'lightning')]:   'storm',
  [makeKey('sun', 'plant')]:       'wheat',

  // Tier 5
  [makeKey('ai', 'garden')]:       'internet',
  [makeKey('king', 'house')]:      'castle',
  [makeKey('storm', 'water')]:     'tsunami',
  [makeKey('wheat', 'fire')]:      'bread',
  [makeKey('diamond', 'metal')]:   'ring',
  [makeKey('river', 'stone')]:     'bridge',

  // Tier 6
  [makeKey('bread', 'water')]:     'soup',
  [makeKey('castle', 'king')]:     'kingdom',
  [makeKey('paradise', 'ai')]:     'game',

  // Additional recipes for extra elements
  [makeKey('stone', 'fire')]:      'metal',
  [makeKey('sand', 'fire')]:       'glass',
  [makeKey('mud', 'fire')]:        'brick',
  [makeKey('lava', 'earth')]:      'volcano',
  [makeKey('river', 'mountain')]:  'lake',
  [makeKey('mud', 'plant')]:       'swamp',
  [makeKey('water', 'snow')]:      'ice',
  [makeKey('sun', 'earth')]:       'desert',
  [makeKey('desert', 'water')]:    'oasis',
  [makeKey('metal', 'storm')]:     'electricity',
  [makeKey('electricity', 'crystal')]: 'computer',
  [makeKey('computer', 'air')]:    'phone',
  [makeKey('metal', 'stone')]:     'armor',
  [makeKey('diamond', 'king')]:    'crown',
  [makeKey('ash', 'water')]:       'mud',
  [makeKey('rain', 'rain')]:       'river',
  [makeKey('stone', 'stone')]:     'mountain',
  [makeKey('cloud', 'cloud')]:     'rain',
  [makeKey('mountain', 'water')]:  'river',
  [makeKey('ice', 'fire')]:        'meltwater',
  [makeKey('glass', 'sun')]:       'prism',
  [makeKey('brick', 'brick')]:     'house',
  [makeKey('sword', 'metal')]:     'armor',
};

const TOTAL_DISCOVERABLE = Object.keys(ALL_ELEMENTS).length;

const CATEGORY_COLORS: Record<ElementCategory, { bg: string; border: string; text: string }> = {
  base:         { bg: 'rgba(136, 136, 160, 0.15)', border: '#8888a0', text: '#8888a0' },
  nature:       { bg: 'rgba(34, 197, 94, 0.15)',   border: '#22c55e', text: '#22c55e' },
  weather:      { bg: 'rgba(59, 130, 246, 0.15)',  border: '#3b82f6', text: '#3b82f6' },
  tech:         { bg: 'rgba(168, 85, 247, 0.15)',  border: '#a855f7', text: '#a855f7' },
  civilization: { bg: 'rgba(245, 158, 11, 0.15)',  border: '#f59e0b', text: '#f59e0b' },
  material:     { bg: 'rgba(236, 72, 153, 0.15)',  border: '#ec4899', text: '#ec4899' },
  food:         { bg: 'rgba(239, 68, 68, 0.15)',   border: '#ef4444', text: '#ef4444' },
};

const STORAGE_KEY = 'element-mixer-discovered';

// ============================================
// Component
// ============================================

export default function ElementMixerPage() {
  const [mounted, setMounted] = useState(false);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; isNew: boolean } | null>(null);
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ElementCategory | 'all'>('all');

  // Load from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setDiscovered(new Set(parsed));
      } else {
        setDiscovered(new Set(['fire', 'water', 'earth', 'air']));
      }
    } catch {
      setDiscovered(new Set(['fire', 'water', 'earth', 'air']));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]));
    } catch {
      // Storage full or unavailable
    }
  }, [discovered, mounted]);

  const showNotification = useCallback((text: string, isNew: boolean) => {
    setNotification({ text, isNew });
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const combine = useCallback((a: string, b: string) => {
    const key = makeKey(a, b);
    const resultId = RECIPES[key];

    if (!resultId) {
      showNotification('Nothing happened...', false);
      return;
    }

    const element = ALL_ELEMENTS[resultId];
    if (!element) {
      showNotification('Nothing happened...', false);
      return;
    }

    if (discovered.has(resultId)) {
      showNotification(`${element.emoji} ${element.name} (already discovered)`, false);
    } else {
      setDiscovered(prev => new Set([...prev, resultId]));
      setNewlyDiscovered(resultId);
      showNotification(`${element.emoji} ${element.name} discovered!`, true);
      setTimeout(() => setNewlyDiscovered(null), 1500);
    }
  }, [discovered, showNotification]);

  const handleElementClick = useCallback((elementId: string) => {
    if (selected === null) {
      setSelected(elementId);
    } else if (selected === elementId) {
      // Deselect
      setSelected(null);
    } else {
      // Combine
      combine(selected, elementId);
      setSelected(null);
    }
  }, [selected, combine]);

  const handleReset = () => {
    setDiscovered(new Set(['fire', 'water', 'earth', 'air']));
    setSelected(null);
    setNotification(null);
    setNewlyDiscovered(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const discoveredElements = [...discovered]
    .map(id => ALL_ELEMENTS[id])
    .filter(Boolean)
    .filter(el => filterCategory === 'all' || el.category === filterCategory)
    .sort((a, b) => {
      const catOrder: ElementCategory[] = ['base', 'nature', 'weather', 'material', 'food', 'tech', 'civilization'];
      const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name);
    });

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Link
          href="/games"
          className="inline-block mb-4 pixel-text text-xs transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          {'<'} Back to Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="pixel-text text-2xl md:text-3xl mb-2" style={{ color: 'var(--color-text)' }}>
            Element Mixer
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Combine elements to discover new ones
          </p>
        </div>

        {/* Discovery Counter */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div
            className="pixel-card rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
              {discovered.size}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              / {TOTAL_DISCOVERABLE} discovered
            </span>
          </div>

          <button
            onClick={handleReset}
            className="pixel-btn text-xs"
            style={{
              borderColor: 'var(--color-red)',
              color: 'var(--color-red)',
              fontSize: '0.6rem',
              padding: '0.5rem 1rem',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-red)';
              e.currentTarget.style.color = 'var(--color-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-red)';
            }}
          >
            Reset
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 mx-auto max-w-md">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(discovered.size / TOTAL_DISCOVERABLE) * 100}%`,
                background: `linear-gradient(90deg, var(--color-accent), var(--color-cyan))`,
              }}
            />
          </div>
        </div>

        {/* Notification */}
        <div className="h-12 flex items-center justify-center mb-4">
          {notification && (
            <div
              className={`pixel-text text-sm px-6 py-2 rounded-lg animate-fade-in-up ${
                notification.isNew ? 'animate-glow-pulse' : ''
              }`}
              style={{
                background: notification.isNew
                  ? 'var(--color-accent-glow)'
                  : 'var(--color-bg-secondary)',
                border: `2px solid ${notification.isNew ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: notification.isNew ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {notification.isNew && (
                <span className="inline-block mr-2 animate-pixel-bounce" style={{ color: 'var(--color-orange)' }}>
                  NEW!
                </span>
              )}
              {notification.text}
            </div>
          )}
        </div>

        {/* Workspace */}
        <div
          className="pixel-card rounded-xl p-6 mb-6 text-center"
          style={{ minHeight: '100px' }}
        >
          <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {selected
              ? `Selected: ${ALL_ELEMENTS[selected]?.emoji} ${ALL_ELEMENTS[selected]?.name} -- tap another element to combine`
              : 'Tap an element to select it, then tap another to combine'}
          </p>

          {selected && (
            <div className="flex items-center justify-center gap-4">
              <div
                className="pixel-border-accent rounded-lg px-5 py-3 inline-flex items-center gap-2 animate-glow-pulse"
              >
                <span className="text-2xl">{ALL_ELEMENTS[selected]?.emoji}</span>
                <span className="pixel-text text-xs" style={{ color: 'var(--color-accent)' }}>
                  {ALL_ELEMENTS[selected]?.name}
                </span>
              </div>
              <span className="pixel-text text-lg" style={{ color: 'var(--color-text-muted)' }}>+</span>
              <span className="pixel-text text-xs" style={{ color: 'var(--color-text-muted)' }}>?</span>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {(['all', 'base', 'nature', 'weather', 'material', 'food', 'tech', 'civilization'] as const).map(cat => {
            const isActive = filterCategory === cat;
            const catColor = cat === 'all' ? 'var(--color-accent)' : CATEGORY_COLORS[cat].border;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className="pixel-text rounded-md transition-all duration-200"
                style={{
                  fontSize: '0.5rem',
                  padding: '0.35rem 0.7rem',
                  background: isActive ? catColor : 'transparent',
                  color: isActive ? 'var(--color-bg)' : catColor,
                  border: `1px solid ${catColor}`,
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Discovered Elements Grid */}
        <div
          className="pixel-card rounded-xl p-4"
          style={{ maxHeight: '50vh', overflowY: 'auto' }}
        >
          {discoveredElements.length === 0 ? (
            <p className="text-center pixel-text text-xs py-8" style={{ color: 'var(--color-text-muted)' }}>
              No elements in this category yet
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {discoveredElements.map(element => {
                const isSelected = selected === element.id;
                const isNew = newlyDiscovered === element.id;
                const colors = CATEGORY_COLORS[element.category];

                return (
                  <button
                    key={element.id}
                    onClick={() => handleElementClick(element.id)}
                    className={`
                      rounded-lg px-3 py-3 flex items-center gap-2 transition-all duration-200
                      hover:scale-105 active:scale-95 cursor-pointer
                      ${isNew ? 'animate-scale-in' : ''}
                    `}
                    style={{
                      background: isSelected ? colors.border : colors.bg,
                      border: `2px solid ${isSelected ? colors.border : 'transparent'}`,
                      color: isSelected ? 'var(--color-bg)' : colors.text,
                      boxShadow: isSelected
                        ? `0 0 16px ${colors.bg}, 3px 3px 0 ${colors.border}`
                        : isNew
                        ? `0 0 20px ${colors.border}`
                        : 'none',
                    }}
                  >
                    <span className={`text-xl ${isNew ? 'animate-pixel-bounce' : ''}`}>{element.emoji}</span>
                    <span
                      className="pixel-text truncate"
                      style={{ fontSize: '0.5rem' }}
                    >
                      {element.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hints section */}
        <div className="mt-6 text-center">
          <details className="inline-block text-left">
            <summary
              className="pixel-text text-xs cursor-pointer select-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Stuck? Click for a hint
            </summary>
            <div
              className="mt-2 pixel-card rounded-lg p-4 text-xs max-w-md"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <p className="mb-2">Try combining the 4 base elements first to unlock Tier 1 elements.</p>
              <p className="mb-2">Then combine those results with base elements or each other.</p>
              <p>Every element can be discovered through logical combinations.</p>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Inspired by Infinite Craft. {TOTAL_DISCOVERABLE} elements to discover.
          </p>
        </div>
      </div>
    </div>
  );
}
