'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';

// --- Rule Definitions ---

interface Rule {
  id: number;
  text: string;
  check: (password: string) => boolean;
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const COLORS = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
  'black', 'white', 'brown', 'gray', 'cyan', 'magenta', 'indigo',
  'violet', 'tan', 'gold', 'coral', 'crimson', 'ivory', 'khaki',
  'lavish', 'maroon', 'navy', 'olive', 'plum', 'salmon', 'teal',
];

const ROMAN_CHARS = ['M', 'D', 'C', 'L', 'X', 'V', 'I'];

function romanToInt(s: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const curr = map[s[i]];
    const next = map[s[i + 1]];
    if (next && curr < next) {
      total -= curr;
    } else {
      total += curr;
    }
  }
  return total;
}

function extractRomanNumerals(password: string): string[] {
  // Find sequences of Roman numeral characters (uppercase only)
  const matches = password.match(/[IVXLCDM]+/g);
  return matches || [];
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function digitSum(password: string): number {
  return password.split('').reduce((sum, ch) => {
    const d = parseInt(ch, 10);
    return isNaN(d) ? sum : sum + d;
  }, 0);
}

function countSpecialChars(password: string): number {
  const specials = password.match(/[!@#$%^&*]/g);
  return specials ? specials.length : 0;
}

const EMOJIS = ['\u{1F525}', '\u{1F480}', '\u{1F3AE}', '\u{1F680}']; // fire, skull, controller, rocket

const rules: Rule[] = [
  {
    id: 1,
    text: 'Password must be at least 8 characters long',
    check: (pw) => pw.length >= 8,
  },
  {
    id: 2,
    text: 'Must contain an uppercase letter',
    check: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: 3,
    text: 'Must contain a number',
    check: (pw) => /\d/.test(pw),
  },
  {
    id: 4,
    text: 'Must contain a special character (!@#$%^&*)',
    check: (pw) => /[!@#$%^&*]/.test(pw),
  },
  {
    id: 5,
    text: 'The digits in your password must add up to 25',
    check: (pw) => digitSum(pw) === 25,
  },
  {
    id: 6,
    text: 'Must contain a month of the year (e.g. "january")',
    check: (pw) => MONTHS.some((m) => pw.toLowerCase().includes(m)),
  },
  {
    id: 7,
    text: 'Must contain a Roman numeral (I, V, X, L, C, D, M)',
    check: (pw) => ROMAN_CHARS.some((ch) => pw.includes(ch)),
  },
  {
    id: 8,
    text: 'Must contain one of these emoji: \u{1F525} \u{1F480} \u{1F3AE} \u{1F680}',
    check: (pw) => EMOJIS.some((e) => pw.includes(e)),
  },
  {
    id: 9,
    text: 'Password length must be a prime number',
    check: (pw) => isPrime([...pw].length),
  },
  {
    id: 10,
    text: 'Must contain the word "password" (the irony)',
    check: (pw) => pw.toLowerCase().includes('password'),
  },
  {
    id: 11,
    text: 'Must contain a color name (red, blue, green, etc.)',
    check: (pw) => COLORS.some((c) => pw.toLowerCase().includes(c)),
  },
  {
    id: 12,
    text: 'The Roman numeral value must equal the number of special characters',
    check: (pw) => {
      const romans = extractRomanNumerals(pw);
      if (romans.length === 0) return false;
      const totalRomanValue = romans.reduce((sum, r) => sum + romanToInt(r), 0);
      const specialCount = countSpecialChars(pw);
      return specialCount > 0 && totalRomanValue === specialCount;
    },
  },
  {
    id: 13,
    text: 'Must end with a period "."',
    check: (pw) => pw.endsWith('.'),
  },
  {
    id: 14,
    text: 'Must contain "dev" somewhere',
    check: (pw) => pw.toLowerCase().includes('dev'),
  },
  {
    id: 15,
    text: 'Must NOT contain the letter "e" (good luck with that)',
    check: (pw) => !pw.toLowerCase().includes('e'),
  },
];

// --- Confetti Particle ---

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateConfetti(count: number): Particle[] {
  const confettiColors = ['#00ff88', '#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#06b6d4', '#ef4444'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    size: 4 + Math.random() * 8,
  }));
}

// --- Component ---

export default function PasswordGamePage() {
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [showAllRules, setShowAllRules] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [confetti, setConfetti] = useState<Particle[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track "attempts" as meaningful edits (count each change)
  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setAttempts((prev) => prev + 1);
  }, []);

  // Evaluate rules
  const ruleResults = useMemo(() => {
    return rules.map((rule) => ({
      ...rule,
      passed: rule.check(password),
    }));
  }, [password]);

  // Determine how many rules are revealed
  const revealedCount = useMemo(() => {
    if (showAllRules) return rules.length;
    let count = 1; // always show at least rule 1
    for (let i = 0; i < rules.length; i++) {
      if (ruleResults[i].passed) {
        count = Math.min(i + 2, rules.length); // reveal the next rule
      } else {
        break;
      }
    }
    return count;
  }, [ruleResults, showAllRules]);

  const satisfiedCount = ruleResults.filter((r) => r.passed).length;

  // Win detection
  useEffect(() => {
    if (satisfiedCount === rules.length && !hasWon && password.length > 0) {
      setHasWon(true);
      setConfetti(generateConfetti(60));
    }
  }, [satisfiedCount, hasWon, password]);

  // Character count using spread to handle emoji properly
  const charCount = [...password].length;

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="min-h-screen p-5 md:p-10 relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Confetti */}
      {hasWon && confetti.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${p.x}%`,
            top: `-${p.size}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}

      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <Link
          href="/games"
          className="inline-block mb-6 transition-colors pixel-text text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &lt;- Back to Games
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl md:text-3xl pixel-text mb-3"
            style={{ color: 'var(--color-accent)' }}
          >
            The Password Game
          </h1>
          <p
            className="text-sm md:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Create a password that satisfies all the rules. Simple, right?
          </p>
        </div>

        {/* Win Banner */}
        {hasWon && (
          <div
            className="pixel-border-accent text-center p-6 mb-6 animate-glow-pulse"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <div className="text-4xl mb-3">
              {'\u{1F389}'} {'\u{1F3C6}'} {'\u{1F389}'}
            </div>
            <h2
              className="pixel-text text-xl mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              YOU WIN!
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              All 15 rules satisfied in {attempts} keystrokes. You absolute legend.
            </p>
          </div>
        )}

        {/* Password Input */}
        <div className="mb-6">
          <div
            className="pixel-border p-4"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <textarea
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Start typing your password..."
              className="w-full bg-transparent outline-none resize-none mono-text text-lg md:text-xl"
              style={{
                color: 'var(--color-text)',
                minHeight: '80px',
                caretColor: 'var(--color-accent)',
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <div
              className="flex justify-between items-center mt-2 pt-2 text-xs"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>
                {charCount} character{charCount !== 1 ? 's' : ''}
                {charCount > 0 && ` | digit sum: ${digitSum(password)}`}
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                keystrokes: {attempts}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {satisfiedCount}/{rules.length} rules satisfied
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {Math.round((satisfiedCount / rules.length) * 100)}%
            </span>
          </div>
          <div
            className="h-3 pixel-border overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(satisfiedCount / rules.length) * 100}%`,
                background: hasWon
                  ? 'var(--color-accent)'
                  : satisfiedCount > 10
                    ? 'var(--color-orange)'
                    : satisfiedCount > 5
                      ? 'var(--color-blue)'
                      : 'var(--color-purple)',
              }}
            />
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-3 mb-8">
          {ruleResults.slice(0, revealedCount).map((rule, index) => (
            <div
              key={rule.id}
              className="pixel-card p-4 flex items-start gap-3"
              style={{
                borderColor: rule.passed ? 'var(--color-accent)' : 'var(--color-red)',
                animation: index === revealedCount - 1 && !showAllRules
                  ? 'fadeInUp 0.4s ease-out'
                  : undefined,
              }}
            >
              {/* Status Icon */}
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center pixel-text text-sm mt-0.5"
                style={{
                  color: rule.passed ? 'var(--color-accent)' : 'var(--color-red)',
                }}
              >
                {rule.passed ? '\u2713' : '\u2717'}
              </div>

              {/* Rule Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="pixel-text text-xs"
                    style={{
                      color: rule.passed
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    Rule {rule.id}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{
                    color: rule.passed
                      ? 'var(--color-text-secondary)'
                      : 'var(--color-text)',
                  }}
                >
                  {rule.text}
                </p>
              </div>
            </div>
          ))}

          {/* Unrevealed rules hint */}
          {revealedCount < rules.length && !showAllRules && (
            <div
              className="text-center py-4 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {rules.length - revealedCount} more rule{rules.length - revealedCount !== 1 ? 's' : ''} hidden...
              satisfy the current rules to reveal more
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {!showAllRules && !hasWon && (
            <button
              onClick={() => setShowAllRules(true)}
              className="pixel-btn"
              style={{
                borderColor: 'var(--color-red)',
                color: 'var(--color-red)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-red)';
                e.currentTarget.style.color = 'var(--color-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-red)';
              }}
            >
              Give Up (Show All Rules)
            </button>
          )}
          <button
            onClick={() => {
              setPassword('');
              setAttempts(0);
              setShowAllRules(false);
              setHasWon(false);
              setConfetti([]);
            }}
            className="pixel-btn"
          >
            Reset
          </button>
        </div>

        {/* Hint Section */}
        {!hasWon && password.length > 0 && (
          <div
            className="pixel-card p-4 mb-8"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h3
              className="pixel-text text-xs mb-3"
              style={{ color: 'var(--color-orange)' }}
            >
              Hints
            </h3>
            <div
              className="text-xs space-y-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {charCount > 0 && (
                <p>
                  Length: {charCount} ({isPrime(charCount) ? 'prime' : 'not prime'})
                  {!isPrime(charCount) && charCount > 2 && (
                    <span>
                      {' | nearest primes: '}
                      {(() => {
                        let lower = charCount - 1;
                        while (lower > 1 && !isPrime(lower)) lower--;
                        let upper = charCount + 1;
                        while (!isPrime(upper)) upper++;
                        return `${lower}, ${upper}`;
                      })()}
                    </span>
                  )}
                </p>
              )}
              <p>Digit sum: {digitSum(password)}{digitSum(password) !== 25 && ` (need 25, ${25 - digitSum(password) > 0 ? `need ${25 - digitSum(password)} more` : `${digitSum(password) - 25} too many`})`}</p>
              <p>Special characters: {countSpecialChars(password)}</p>
              {extractRomanNumerals(password).length > 0 && (
                <p>
                  Roman numeral value: {extractRomanNumerals(password).reduce((s, r) => s + romanToInt(r), 0)}
                  {' '}({extractRomanNumerals(password).join(', ')})
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p
          className="text-center text-xs mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Inspired by neal.fun&apos;s Password Game
        </p>
      </div>

      {/* Confetti animation keyframes */}
      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
