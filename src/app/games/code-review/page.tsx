'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

interface Reviewer {
  id: string;
  name: string;
  emoji: string;
  title: string;
  color: string;
  style: string;
}

interface ReviewComment {
  id: number;
  tier: number;
  reviewer: string;
  title: string;
  description: string;
  validate: (code: string) => boolean;
  hint?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

type GameScreen = 'menu' | 'style-guide' | 'playing' | 'game-over';

// ============================================
// REVIEWERS
// ============================================

const REVIEWERS: Record<string, Reviewer> = {
  pedant: {
    id: 'pedant',
    name: 'The Pedant',
    emoji: '\ud83e\udd13',
    title: 'Senior Style Enforcer',
    color: 'var(--color-purple)',
    style: 'Obsesses over every semicolon, space, and naming convention. Has memorized the entire style guide. Twice.',
  },
  architect: {
    id: 'architect',
    name: 'The Architect Astronaut',
    emoji: '\ud83d\udcd0',
    title: 'Principal Over-Engineer',
    color: 'var(--color-blue)',
    style: 'Demands enterprise architecture patterns for a 5-line script. Thinks "Hello World" needs a microservice.',
  },
  security: {
    id: 'security',
    name: 'The Security Paranoiac',
    emoji: '\ud83d\udd12',
    title: 'Chief Threat Imaginer',
    color: 'var(--color-red)',
    style: 'Treats every program like it handles nuclear launch codes. Has nightmares about SQL injection in print statements.',
  },
  senior: {
    id: 'senior',
    name: 'Senior Dev (Bad Day)',
    emoji: '\ud83d\ude24',
    title: 'Tech Lead (Pre-Coffee)',
    color: 'var(--color-orange)',
    style: 'Just found out the sprint deadline moved up. Their cat deleted their stash. Everything is personal now.',
  },
};

// ============================================
// HELPER FUNCTIONS FOR VALIDATORS
// ============================================

function countOccurrences(str: string, sub: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

function getLines(code: string): string[] {
  return code.split('\n');
}

function countChar(str: string, ch: string): number {
  let c = 0;
  for (const s of str) if (s === ch) c++;
  return c;
}

// Rough syllable counter for haiku check
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return w.length > 0 ? 1 : 0;
  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;
  for (const ch of w) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(count, 1);
}

function lineSyllables(line: string): number {
  return line.trim().split(/\s+/).filter(w => w.length > 0).reduce((s, w) => s + countSyllables(w), 0);
}

function isPalindrome(s: string): boolean {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleaned.length < 2) return true;
  return cleaned === cleaned.split('').reverse().join('');
}

// ============================================
// REVIEW COMMENTS (80+ across 4 tiers)
// ============================================

const ALL_COMMENTS: ReviewComment[] = [
  // ============================================
  // TIER 1: Reasonable (1-5) - The Pedant leads
  // ============================================
  {
    id: 1,
    tier: 1,
    reviewer: 'pedant',
    title: 'Add a comment',
    description: 'Every file should have at least one comment. Add a comment using // somewhere in the code.',
    validate: (code) => code.includes('//'),
    hint: 'Just add // followed by some text anywhere',
  },
  {
    id: 2,
    tier: 1,
    reviewer: 'pedant',
    title: 'Use const instead of let',
    description: 'Per our style guide, prefer `const` over `let` for variable declarations. Your code must contain `const`.',
    validate: (code) => code.includes('const '),
    hint: 'Declare a variable with const',
  },
  {
    id: 3,
    tier: 1,
    reviewer: 'security',
    title: 'Add error handling',
    description: 'What if something goes wrong? Wrap your logic in a try/catch block. I need to see both `try` and `catch` in the code.',
    validate: (code) => code.includes('try') && code.includes('catch'),
    hint: 'Add a try { } catch(e) { } block',
  },
  {
    id: 4,
    tier: 1,
    reviewer: 'architect',
    title: 'Use a function',
    description: 'Raw imperative code? In 2024? Please wrap your logic in a function. The code must contain `function`.',
    validate: (code) => code.includes('function'),
    hint: 'Wrap your code in a function declaration',
  },
  {
    id: 5,
    tier: 1,
    reviewer: 'senior',
    title: 'End with a semicolon',
    description: 'We use semicolons in this codebase. Every real developer does. Make sure the code contains at least one semicolon.',
    validate: (code) => code.includes(';'),
    hint: 'End a statement with ;',
  },

  // ============================================
  // TIER 2: Annoying (6-15)
  // ============================================
  {
    id: 6,
    tier: 2,
    reviewer: 'pedant',
    title: 'Variable names must be descriptive',
    description: 'All variable names after `const` or `let` must be at least 15 characters long. I should be able to read the name and understand the entire codebase.',
    validate: (code) => {
      const matches = code.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
      if (!matches) return false;
      return matches.every(m => {
        const name = m.replace(/^(?:const|let|var)\s+/, '');
        return name.length >= 15;
      });
    },
    hint: 'Make all variable names at least 15 characters',
  },
  {
    id: 7,
    tier: 2,
    reviewer: 'architect',
    title: 'Every function needs exactly 3 parameters',
    description: 'Our architecture requires exactly 3 parameters per function for consistency. Every function declaration must have exactly 3 comma-separated parameters.',
    validate: (code) => {
      const funcMatches = code.match(/function\s+\w*\s*\(([^)]*)\)/g);
      if (!funcMatches) return false;
      return funcMatches.every(m => {
        const params = m.match(/\(([^)]*)\)/);
        if (!params) return false;
        const paramList = params[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
        return paramList.length === 3;
      });
    },
    hint: 'Every function(...) must have exactly 3 params',
  },
  {
    id: 8,
    tier: 2,
    reviewer: 'senior',
    title: 'Comments must rhyme',
    description: 'I\'m tired of boring comments. EVERY comment line (lines starting with //) must end with a word that rhymes with the last word of the PREVIOUS comment line. First comment line is free. (We check the last 3+ letters match.)',
    validate: (code) => {
      const commentLines = getLines(code).filter(l => l.trim().startsWith('//'));
      if (commentLines.length < 1) return false;
      if (commentLines.length === 1) return true;
      for (let i = 1; i < commentLines.length; i++) {
        const prevWords = commentLines[i - 1].trim().replace(/^\/\/\s*/, '').trim().split(/\s+/);
        const currWords = commentLines[i].trim().replace(/^\/\/\s*/, '').trim().split(/\s+/);
        if (prevWords.length === 0 || currWords.length === 0) continue;
        const prevLast = prevWords[prevWords.length - 1].toLowerCase().replace(/[^a-z]/g, '');
        const currLast = currWords[currWords.length - 1].toLowerCase().replace(/[^a-z]/g, '');
        if (prevLast.length < 3 || currLast.length < 3) continue;
        const prevEnd = prevLast.slice(-3);
        const currEnd = currLast.slice(-3);
        if (prevEnd !== currEnd) return false;
      }
      return true;
    },
    hint: 'End each comment line with a word that shares the last 3 letters with the previous comment line\'s last word',
  },
  {
    id: 9,
    tier: 2,
    reviewer: 'security',
    title: 'Input validation required',
    description: 'I see no input validation. Your code must contain the word `validate` AND the word `sanitize`. Think of the children!',
    validate: (code) => code.toLowerCase().includes('validate') && code.toLowerCase().includes('sanitize'),
    hint: 'Include both words "validate" and "sanitize" somewhere in the code',
  },
  {
    id: 10,
    tier: 2,
    reviewer: 'pedant',
    title: 'Exactly 4 blank lines',
    description: 'Our style guide section 12.7b mandates exactly 4 blank lines in every file. Not 3. Not 5. Four. Count them.',
    validate: (code) => {
      const blankLines = getLines(code).filter(l => l.trim() === '');
      return blankLines.length === 4;
    },
    hint: 'Have exactly 4 empty lines in your code',
  },
  {
    id: 11,
    tier: 2,
    reviewer: 'architect',
    title: 'Add a class',
    description: 'Functions are too procedural. We need OOP. Your code must contain the keyword `class`.',
    validate: (code) => /\bclass\b/.test(code),
    hint: 'Add a class declaration',
  },
  {
    id: 12,
    tier: 2,
    reviewer: 'senior',
    title: 'Code must be at least 15 lines',
    description: 'This is suspiciously short. No one writes good code in under 15 lines. Pad it out. I mean, add meaningful content.',
    validate: (code) => getLines(code).length >= 15,
    hint: 'Make sure your code has at least 15 lines',
  },
  {
    id: 13,
    tier: 2,
    reviewer: 'security',
    title: 'No eval, no Function constructor',
    description: 'Remove ALL instances of `eval` and `Function` from the code. These are attack vectors! Even in comments! Even as substrings!',
    validate: (code) => !code.includes('eval') && !code.includes('Function'),
    hint: 'Make sure "eval" and "Function" don\'t appear anywhere',
  },
  {
    id: 14,
    tier: 2,
    reviewer: 'pedant',
    title: 'Exactly 3 semicolons',
    description: 'I\'ve reviewed the optimal semicolon density research. Your code must contain EXACTLY 3 semicolons. The science is settled.',
    validate: (code) => countChar(code, ';') === 3,
    hint: 'Use exactly 3 semicolons in the entire code',
  },
  {
    id: 15,
    tier: 2,
    reviewer: 'architect',
    title: 'Add a return statement',
    description: 'Every function should explicitly return a value. Your code must contain the keyword `return`.',
    validate: (code) => code.includes('return'),
    hint: 'Add a return statement',
  },

  // ============================================
  // TIER 3: Absurd (16-25)
  // ============================================
  {
    id: 16,
    tier: 3,
    reviewer: 'pedant',
    title: 'All strings must be palindromes',
    description: 'Per style guide section 47.3 (the Sumerian naming convention appendix), all string literals (text between quotes) must be palindromes. "aba" is fine. "hello" is not.',
    validate: (code) => {
      const strings = code.match(/["']([^"']+)["']/g);
      if (!strings) return true;
      return strings.every(s => {
        const content = s.slice(1, -1);
        return isPalindrome(content);
      });
    },
    hint: 'Every string like "abc" must read the same forwards and backwards',
  },
  {
    id: 17,
    tier: 3,
    reviewer: 'architect',
    title: 'Add the word "enterprise" at least 3 times',
    description: 'This code doesn\'t feel enterprise-ready. Add the word "enterprise" at least 3 times (in comments, variable names, strings, wherever).',
    validate: (code) => countOccurrences(code.toLowerCase(), 'enterprise') >= 3,
    hint: 'Use the word "enterprise" 3+ times',
  },
  {
    id: 18,
    tier: 3,
    reviewer: 'security',
    title: 'Code must contain a UUID',
    description: 'Every file needs a security trace ID. Include a valid UUID v4 format somewhere: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (hex chars, the 4 is mandatory).',
    validate: (code) => /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(code),
    hint: 'Add something like a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5',
  },
  {
    id: 19,
    tier: 3,
    reviewer: 'senior',
    title: 'Code must contain an emoji',
    description: 'I read a blog post that emojis improve code readability by 47%. Your code MUST contain at least one emoji character. Put it in a comment if you have to.',
    validate: (code) => {
      // Check for common emoji ranges
      return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(code);
    },
    hint: 'Put an emoji somewhere in the code (in a comment is fine)',
  },
  {
    id: 20,
    tier: 3,
    reviewer: 'pedant',
    title: 'Variable names must be valid hex colors',
    description: 'Our new branding-aligned naming convention requires that at least one variable name (after const/let) must be a valid hex color code starting with _ (since # isn\'t valid in names). Use format _RRGGBB where RR, GG, BB are hex values. E.g., `const _FF00AA = ...`',
    validate: (code) => {
      const matches = code.match(/(?:const|let|var)\s+(_[0-9a-fA-F]{6})\b/);
      return !!matches;
    },
    hint: 'Name a variable like _FF00AA (underscore + 6 hex chars)',
  },
  {
    id: 21,
    tier: 3,
    reviewer: 'architect',
    title: 'Implement the Observer pattern',
    description: 'Hello World clearly needs the Observer pattern. Your code must contain both the words `subscribe` and `notify`.',
    validate: (code) => code.includes('subscribe') && code.includes('notify'),
    hint: 'Include both "subscribe" and "notify" in the code',
  },
  {
    id: 22,
    tier: 3,
    reviewer: 'security',
    title: 'Add a checksum comment',
    description: 'For integrity verification, add a comment containing "CHECKSUM:" followed by exactly 8 hex characters. E.g., // CHECKSUM: A1B2C3D4',
    validate: (code) => /\/\/\s*CHECKSUM:\s*[0-9A-Fa-f]{8}\b/.test(code),
    hint: 'Add a comment like // CHECKSUM: DEADBEEF',
  },
  {
    id: 23,
    tier: 3,
    reviewer: 'senior',
    title: 'No letter "z" allowed',
    description: 'I have a personal vendetta against the letter Z. Remove every instance of the letter "z" (upper or lowercase) from the code. I don\'t care if it breaks words. Z is dead to me.',
    validate: (code) => !code.toLowerCase().includes('z'),
    hint: 'Remove all instances of the letter z/Z',
  },
  {
    id: 24,
    tier: 3,
    reviewer: 'pedant',
    title: 'Every line must have different length',
    description: 'For optimal visual aesthetics, no two non-empty lines may have the same character count. Each non-empty line must be a unique length.',
    validate: (code) => {
      const lines = getLines(code).filter(l => l.trim().length > 0);
      const lengths = lines.map(l => l.length);
      return new Set(lengths).size === lengths.length;
    },
    hint: 'Make every non-empty line a different length (add/remove spaces or comments)',
  },
  {
    id: 25,
    tier: 3,
    reviewer: 'architect',
    title: 'Add async/await',
    description: 'This code needs to be future-proof for when Hello World goes distributed. Add both `async` and `await` keywords.',
    validate: (code) => code.includes('async') && code.includes('await'),
    hint: 'Add async/await somewhere in the code',
  },

  // ============================================
  // TIER 4: Insane (26-40)
  // ============================================
  {
    id: 26,
    tier: 4,
    reviewer: 'senior',
    title: 'The cat walked on the keyboard',
    description: 'My cat just walked across my keyboard and typed "qwfpgj". Your code must contain this exact string somewhere. Don\'t question it. Just do it.',
    validate: (code) => code.includes('qwfpgj'),
    hint: 'Include the string "qwfpgj" somewhere',
  },
  {
    id: 27,
    tier: 4,
    reviewer: 'pedant',
    title: 'Code must contain a haiku',
    description: 'Add a 3-line comment block where each line is a haiku line: 5 syllables, 7 syllables, 5 syllables. Mark it with // HAIKU: on each line.',
    validate: (code) => {
      const lines = getLines(code);
      for (let i = 0; i < lines.length - 2; i++) {
        const l1 = lines[i].trim();
        const l2 = lines[i + 1].trim();
        const l3 = lines[i + 2].trim();
        if (l1.startsWith('// HAIKU:') && l2.startsWith('// HAIKU:') && l3.startsWith('// HAIKU:')) {
          const s1 = lineSyllables(l1.replace('// HAIKU:', ''));
          const s2 = lineSyllables(l2.replace('// HAIKU:', ''));
          const s3 = lineSyllables(l3.replace('// HAIKU:', ''));
          if (s1 === 5 && s2 === 7 && s3 === 5) return true;
        }
      }
      return false;
    },
    hint: 'Add 3 consecutive lines starting with "// HAIKU:" with 5-7-5 syllable pattern',
  },
  {
    id: 28,
    tier: 4,
    reviewer: 'security',
    title: 'Include an escape plan',
    description: 'Every secure system needs an escape hatch. Your code must contain the phrase "IN CASE OF EMERGENCY" (exact caps) AND a line containing "break glass".',
    validate: (code) => code.includes('IN CASE OF EMERGENCY') && code.toLowerCase().includes('break glass'),
    hint: 'Add both "IN CASE OF EMERGENCY" and "break glass" to the code',
  },
  {
    id: 29,
    tier: 4,
    reviewer: 'architect',
    title: 'Code must reference a design pattern',
    description: 'Your code must contain ALL of: "singleton", "factory", and "observer". Hello World is at minimum a three-pattern problem.',
    validate: (code) => {
      const lower = code.toLowerCase();
      return lower.includes('singleton') && lower.includes('factory') && lower.includes('observer');
    },
    hint: 'Include all three words: singleton, factory, observer',
  },
  {
    id: 30,
    tier: 4,
    reviewer: 'senior',
    title: 'Exactly 42 words in comments',
    description: 'The answer to life, the universe, and everything. Your comments (// lines) must contain EXACTLY 42 words total. (Excluding the // itself.)',
    validate: (code) => {
      const commentLines = getLines(code).filter(l => l.trim().startsWith('//'));
      const words = commentLines
        .map(l => l.trim().replace(/^\/\/\s*/, ''))
        .join(' ')
        .split(/\s+/)
        .filter(w => w.length > 0);
      return words.length === 42;
    },
    hint: 'Make the total word count across all comment lines exactly 42',
  },
  {
    id: 31,
    tier: 4,
    reviewer: 'pedant',
    title: 'Lines must alternate in length',
    description: 'Non-empty lines must alternate: short-long-short-long. Each "long" line must be longer than the previous "short" line, and each "short" line must be shorter than the previous "long" line. First line is "short".',
    validate: (code) => {
      const lines = getLines(code).filter(l => l.trim().length > 0);
      if (lines.length < 2) return true;
      for (let i = 1; i < lines.length; i++) {
        const isLongTurn = i % 2 === 1;
        if (isLongTurn && lines[i].length <= lines[i - 1].length) return false;
        if (!isLongTurn && lines[i].length >= lines[i - 1].length) return false;
      }
      return true;
    },
    hint: 'Non-empty lines alternate: short, long, short, long (each transition must be strictly shorter/longer)',
  },
  {
    id: 32,
    tier: 4,
    reviewer: 'security',
    title: 'Encryption theater',
    description: 'Add a comment containing a ROT13-encoded message. It must start with "// ROT13:" and the encoded portion must contain "uryyb" (which decodes to "hello").',
    validate: (code) => /\/\/\s*ROT13:.*uryyb/.test(code),
    hint: 'Add a comment like: // ROT13: uryyb (which is "hello" in ROT13)',
  },
  {
    id: 33,
    tier: 4,
    reviewer: 'architect',
    title: 'Dependency injection comment',
    description: 'Add a JSDoc-style comment block containing "@inject" and "@provides". Every enterprise Hello World needs DI annotations.',
    validate: (code) => code.includes('@inject') && code.includes('@provides'),
    hint: 'Add @inject and @provides in comments',
  },
  {
    id: 34,
    tier: 4,
    reviewer: 'senior',
    title: 'Code must contain a TODO with a fake date',
    description: 'Add a TODO comment with a date from the year 2099. Format: // TODO (2099-XX-XX): message. Because we all know TODOs never get resolved.',
    validate: (code) => /\/\/\s*TODO\s*\(2099-\d{2}-\d{2}\)/.test(code),
    hint: 'Add something like // TODO (2099-01-15): fix this later',
  },
  {
    id: 35,
    tier: 4,
    reviewer: 'pedant',
    title: 'The code must contain pi',
    description: 'Include the first 5 digits of pi (3.1415) somewhere in the code. Bonus: it could be a variable value. Math is beautiful.',
    validate: (code) => code.includes('3.1415'),
    hint: 'Put 3.1415 somewhere in the code',
  },
  {
    id: 36,
    tier: 4,
    reviewer: 'security',
    title: 'Add a copyright notice',
    description: 'Legal requires a copyright line. Add a comment containing "Copyright" AND a year AND "All rights reserved".',
    validate: (code) => {
      const lower = code.toLowerCase();
      return lower.includes('copyright') && /\b20\d{2}\b/.test(code) && lower.includes('all rights reserved');
    },
    hint: 'Add something like // Copyright 2024 All rights reserved',
  },
  {
    id: 37,
    tier: 4,
    reviewer: 'architect',
    title: 'Must contain a URL',
    description: 'Add a reference URL in a comment. Must start with https:// and contain at least 20 characters after the protocol.',
    validate: (code) => /https:\/\/[^\s]{20,}/.test(code),
    hint: 'Add a URL like // See: https://example.com/some/long/path/here',
  },
  {
    id: 38,
    tier: 4,
    reviewer: 'senior',
    title: 'Vowel quota',
    description: 'The total number of vowels (a, e, i, o, u) in the entire code must be an even number. I have my reasons.',
    validate: (code) => {
      const vowels = code.toLowerCase().split('').filter(c => 'aeiou'.includes(c)).length;
      return vowels % 2 === 0;
    },
    hint: 'Count all vowels in the code - the total must be even',
  },
  {
    id: 39,
    tier: 4,
    reviewer: 'pedant',
    title: 'Code must contain a version number',
    description: 'Semantic versioning is not optional. Include a version string in format vX.Y.Z where X >= 1.',
    validate: (code) => /v[1-9]\d*\.\d+\.\d+/.test(code),
    hint: 'Add something like v1.0.0 or v2.3.1',
  },
  {
    id: 40,
    tier: 4,
    reviewer: 'security',
    title: 'Add a cryptographic constant',
    description: 'For audit purposes, include the hex string "DEADBEEF" somewhere in the code. Every serious application needs at least one caffeinated hex constant.',
    validate: (code) => code.includes('DEADBEEF'),
    hint: 'Put DEADBEEF in the code',
  },

  // ============================================
  // BONUS TIER: The Final Gauntlet (41-50)
  // ============================================
  {
    id: 41,
    tier: 4,
    reviewer: 'senior',
    title: 'ASCII art required',
    description: 'Add an ASCII art border using asterisks. You need a line that is ONLY asterisks (*) and is at least 10 characters long.',
    validate: (code) => {
      return getLines(code).some(l => /^\*{10,}$/.test(l.trim()));
    },
    hint: 'Add a line of at least 10 asterisks: **********',
  },
  {
    id: 42,
    tier: 4,
    reviewer: 'pedant',
    title: 'The forbidden number',
    description: 'The number 13 must not appear ANYWHERE in the code. Not as "13", not in "130", not in "513". Nowhere. It is cursed.',
    validate: (code) => !code.includes('13'),
    hint: 'Remove any instance of the digit sequence "13" from the code',
  },
  {
    id: 43,
    tier: 4,
    reviewer: 'architect',
    title: 'Add an interface',
    description: 'Type safety is non-negotiable. Your code must contain the keyword `interface` or `type` followed by an identifier.',
    validate: (code) => /\b(?:interface|type)\s+[A-Z]/.test(code),
    hint: 'Add an interface like: interface MyType { }',
  },
  {
    id: 44,
    tier: 4,
    reviewer: 'security',
    title: 'Exactly 2 curly brace pairs',
    description: 'Too many braces creates too many scopes. Too many scopes means too many attack surfaces. Exactly 2 opening AND 2 closing curly braces.',
    validate: (code) => countChar(code, '{') === 2 && countChar(code, '}') === 2,
    hint: 'Have exactly 2 { and 2 } in the entire code',
  },
  {
    id: 45,
    tier: 4,
    reviewer: 'senior',
    title: 'Code must end with a question',
    description: 'The last non-empty line of code must end with a question mark. Because really, does any code ever truly work? Does anything?',
    validate: (code) => {
      const lines = getLines(code).filter(l => l.trim().length > 0);
      if (lines.length === 0) return false;
      return lines[lines.length - 1].trim().endsWith('?');
    },
    hint: 'Make the last non-empty line end with ?',
  },
  {
    id: 46,
    tier: 4,
    reviewer: 'pedant',
    title: 'Must use exactly 2 different string quote types',
    description: 'Use both single quotes (\') and double quotes (") in the code. Template literals don\'t count. Both must appear.',
    validate: (code) => code.includes("'") && code.includes('"'),
    hint: 'Use both \' and " somewhere in the code',
  },
  {
    id: 47,
    tier: 4,
    reviewer: 'architect',
    title: 'Contains the word "microservice"',
    description: 'This Hello World is clearly part of a larger distributed system. Include the word "microservice" somewhere.',
    validate: (code) => code.toLowerCase().includes('microservice'),
    hint: 'Put "microservice" somewhere in the code',
  },
  {
    id: 48,
    tier: 4,
    reviewer: 'security',
    title: 'Add rate limiting comment',
    description: 'Document your rate limiting strategy. Include both "rate limit" and "429" in the code.',
    validate: (code) => code.toLowerCase().includes('rate limit') && code.includes('429'),
    hint: 'Include "rate limit" and "429" in comments',
  },
  {
    id: 49,
    tier: 4,
    reviewer: 'senior',
    title: 'No parentheses in comments',
    description: 'Parenthetical asides in comments are passive-aggressive (not that I would know). Remove ALL parentheses from comment lines.',
    validate: (code) => {
      const commentLines = getLines(code).filter(l => l.trim().startsWith('//'));
      return commentLines.every(l => !l.includes('(') && !l.includes(')'));
    },
    hint: 'Remove ( and ) from all lines starting with //',
  },
  {
    id: 50,
    tier: 4,
    reviewer: 'pedant',
    title: 'Code length must be a prime number',
    description: 'The total character count of the entire code (including whitespace) must be a prime number. This is non-negotiable.',
    validate: (code) => {
      const len = code.length;
      if (len < 2) return false;
      for (let i = 2; i <= Math.sqrt(len); i++) {
        if (len % i === 0) return false;
      }
      return true;
    },
    hint: 'Adjust the code length (add/remove spaces) until the total character count is prime',
  },

  // ============================================
  // ULTRA BONUS (51-60): For the truly masochistic
  // ============================================
  {
    id: 51,
    tier: 4,
    reviewer: 'architect',
    title: 'Add logging levels',
    description: 'Include all 3 log levels: "INFO", "WARN", and "ERROR" somewhere in the code.',
    validate: (code) => code.includes('INFO') && code.includes('WARN') && code.includes('ERROR'),
    hint: 'Put INFO, WARN, and ERROR in the code',
  },
  {
    id: 52,
    tier: 4,
    reviewer: 'senior',
    title: 'Must contain your resignation',
    description: 'Add "I quit" somewhere in the code. We all feel it. Just put it in a comment. It\'s therapeutic.',
    validate: (code) => code.toLowerCase().includes('i quit'),
    hint: 'Add "I quit" somewhere',
  },
  {
    id: 53,
    tier: 4,
    reviewer: 'security',
    title: 'Paranoia level: maximum',
    description: 'Add the phrase "trust no one" AND "verify everything" in the code. Preferably in ALL CAPS because we\'re shouting into the void.',
    validate: (code) => {
      const lower = code.toLowerCase();
      return lower.includes('trust no one') && lower.includes('verify everything');
    },
    hint: 'Include "trust no one" and "verify everything"',
  },
  {
    id: 54,
    tier: 4,
    reviewer: 'pedant',
    title: 'The code must contain a day of the week',
    description: 'Include the full name of any day of the week (Monday through Sunday). Our linter requires temporal awareness.',
    validate: (code) => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      return days.some(d => code.toLowerCase().includes(d));
    },
    hint: 'Include a day name like "Monday" or "Friday"',
  },
  {
    id: 55,
    tier: 4,
    reviewer: 'architect',
    title: 'Include a semver range',
    description: 'Add a dependency comment with a semver range using ^. E.g., // requires hello-world ^2.0.0',
    validate: (code) => /\^[0-9]+\.[0-9]+\.[0-9]+/.test(code),
    hint: 'Add something like ^1.0.0',
  },
  {
    id: 56,
    tier: 4,
    reviewer: 'senior',
    title: 'Emotional support comment',
    description: 'Add a comment that contains "you can do this" because honestly, you look like you need it right now.',
    validate: (code) => code.toLowerCase().includes('you can do this'),
    hint: 'Add "you can do this" in a comment',
  },
  {
    id: 57,
    tier: 4,
    reviewer: 'security',
    title: 'Must include an IP address',
    description: 'For allowlisting purposes, include an IPv4 address (format: X.X.X.X where each X is 1-3 digits).',
    validate: (code) => /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(code),
    hint: 'Add an IP address like 192.168.1.1',
  },
  {
    id: 58,
    tier: 4,
    reviewer: 'pedant',
    title: 'Must contain a mathematical operator',
    description: 'Include an actual mathematical expression using +, -, *, or / with numbers on both sides. E.g., 2 + 2. Not in a string.',
    validate: (code) => /\d\s*[+\-*/]\s*\d/.test(code),
    hint: 'Add a math expression like 2 + 2',
  },
  {
    id: 59,
    tier: 4,
    reviewer: 'architect',
    title: 'Module documentation',
    description: 'Add a @module JSDoc tag. The comment must contain "@module" followed by a module name.',
    validate: (code) => /@module\s+\w+/.test(code),
    hint: 'Add a comment containing @module SomeName',
  },
  {
    id: 60,
    tier: 4,
    reviewer: 'senior',
    title: 'The final review',
    description: 'Add the exact phrase "LGTM ship it" to the code. You\'ve earned it. Maybe. I\'m still not happy about the z thing.',
    validate: (code) => code.includes('LGTM ship it'),
    hint: 'Add "LGTM ship it" to the code',
  },
];

// ============================================
// STYLE GUIDE CONTENT
// ============================================

const STYLE_GUIDE_SECTIONS = [
  {
    title: 'Section 1: Variable Naming',
    content: 'All variable names must be descriptive (15+ characters). When branding requirements apply, variables may use hex color format (_RRGGBB). The letter Z is permanently banned per the 2023 incident.',
  },
  {
    title: 'Section 2: Comments',
    content: 'Comments must rhyme when multiple are present. Total comment word count must reflect universal constants. Haiku format is accepted for poetic expressions (5-7-5). No parentheses in comments.',
  },
  {
    title: 'Section 3: Code Structure',
    content: 'Functions require exactly 3 parameters. OOP via classes is mandatory. Async/await is required for future-proofing. Lines alternate short-long. File must be 15+ lines. Exactly 4 blank lines.',
  },
  {
    title: 'Section 4: Semicolons & Braces',
    content: 'Exactly 3 semicolons per file. Exactly 2 curly brace pairs. This is optimal based on proprietary research.',
  },
  {
    title: 'Section 5: Security',
    content: 'Include "validate" and "sanitize". No eval/Function. UUID v4 trace IDs required. ROT13 encoded messages for sensitive strings. DEADBEEF audit constant. Rate limiting documentation with 429. Trust no one.',
  },
  {
    title: 'Section 6: Enterprise Requirements',
    content: 'Minimum 3 "enterprise" references. Observer pattern (subscribe/notify). DI annotations (@inject/@provides). Singleton, factory, observer patterns. Microservice architecture. Logging levels INFO/WARN/ERROR.',
  },
  {
    title: 'Section 7: Miscellaneous',
    content: 'Pi to 4 decimal places required. No number 13 anywhere. Palindromic strings. Both quote types. Semantic version number. Escape plan documentation. Copyright notice. ASCII art borders. Emotional support comments are encouraged.',
  },
  {
    title: 'Section 47.3: The Sumerian Appendix',
    content: 'If you\'re reading this, congratulations. You found the legendary section 47.3. The ancient Sumerians believed that code quality was directly proportional to the number of contradictory rules applied simultaneously. They were right.',
  },
];

// ============================================
// ACHIEVEMENTS
// ============================================

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-fix', title: 'First Blood', description: 'Satisfied your first comment', emoji: '\ud83c\udfc6' },
  { id: 'tier2', title: 'Getting Annoying', description: 'Reached Tier 2 comments', emoji: '\ud83d\ude12' },
  { id: 'tier3', title: 'This Is Absurd', description: 'Reached Tier 3 comments', emoji: '\ud83e\udd2f' },
  { id: 'tier4', title: 'Welcome to Hell', description: 'Reached Tier 4 comments', emoji: '\ud83d\udd25' },
  { id: 'level10', title: 'Double Digits', description: 'Reached level 10', emoji: '\ud83d\udcaa' },
  { id: 'level20', title: 'Masochist', description: 'Reached level 20', emoji: '\ud83d\ude08' },
  { id: 'level30', title: 'Code Review Survivor', description: 'Reached level 30', emoji: '\ud83c\udf96\ufe0f' },
  { id: 'allgreen', title: 'CI Passing', description: 'Had all comments green at once (5+)', emoji: '\u2705' },
];

// ============================================
// INITIAL CODE
// ============================================

const INITIAL_CODE = `// Hello World
function main() {
  console.log("Hello, World!");
}

main();`;

// ============================================
// SYNTAX HIGHLIGHTING
// ============================================

function highlightCode(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    const remaining = line;
    let partKey = 0;

    // Comment line
    if (remaining.trim().startsWith('//')) {
      parts.push(
        <span key={partKey++} style={{ color: 'var(--color-text-muted)' }}>{remaining}</span>
      );
      return <div key={i} className="leading-relaxed">{parts.length > 0 ? parts : '\u00a0'}</div>;
    }

    // Tokenize roughly
    const tokens = remaining.match(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$|\b(?:const|let|var|function|class|return|if|else|try|catch|new|async|await|throw|interface|type|export|import|from|default|extends|implements|static|get|set|true|false|null|undefined|void|typeof|instanceof|this)\b|\d+\.?\d*|[{}()[\];,.:=<>!+\-*/&|?@#]|\w+|\s+)/g);

    if (!tokens) {
      parts.push(<span key={partKey++}>{remaining}</span>);
    } else {
      for (const token of tokens) {
        const keywords = ['const', 'let', 'var', 'function', 'class', 'return', 'if', 'else', 'try', 'catch', 'new', 'async', 'await', 'throw', 'interface', 'type', 'export', 'import', 'from', 'default', 'extends', 'implements', 'static', 'get', 'set', 'void', 'typeof', 'instanceof', 'this'];
        const booleans = ['true', 'false', 'null', 'undefined'];

        if (keywords.includes(token)) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-purple)' }}>{token}</span>);
        } else if (booleans.includes(token)) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-orange)' }}>{token}</span>);
        } else if (/^["'`]/.test(token)) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-accent)' }}>{token}</span>);
        } else if (/^\d/.test(token)) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-orange)' }}>{token}</span>);
        } else if (/^[{}()[\];,.:=<>!+\-*/&|?@#]$/.test(token)) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-text-secondary)' }}>{token}</span>);
        } else if (token.startsWith('//')) {
          parts.push(<span key={partKey++} style={{ color: 'var(--color-text-muted)' }}>{token}</span>);
        } else {
          parts.push(<span key={partKey++}>{token}</span>);
        }
      }
    }

    return <div key={i} className="leading-relaxed">{parts.length > 0 ? parts : '\u00a0'}</div>;
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CodeReviewPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [code, setCode] = useState(INITIAL_CODE);
  const [activeComments, setActiveComments] = useState<ReviewComment[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [earnedAchievements, setEarnedAchievements] = useState<Set<string>>(new Set());
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const [commentsPanel, setCommentsPanel] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const achievementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('code-review-hell-best');
    if (saved) setBestLevel(parseInt(saved, 10));
    const savedAchievements = localStorage.getItem('code-review-hell-achievements');
    if (savedAchievements) {
      try {
        setEarnedAchievements(new Set(JSON.parse(savedAchievements)));
      } catch { /* ignore */ }
    }
  }, []);

  const saveBest = useCallback((level: number) => {
    if (level > bestLevel) {
      setBestLevel(level);
      localStorage.setItem('code-review-hell-best', String(level));
    }
  }, [bestLevel]);

  const triggerAchievement = useCallback((achievement: Achievement) => {
    setEarnedAchievements(prev => {
      if (prev.has(achievement.id)) return prev;
      const next = new Set(prev);
      next.add(achievement.id);
      localStorage.setItem('code-review-hell-achievements', JSON.stringify([...next]));
      setShowAchievement(achievement);
      if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
      achievementTimeoutRef.current = setTimeout(() => setShowAchievement(null), 3000);
      return next;
    });
  }, []);

  const checkAchievements = useCallback((level: number, results: boolean[]) => {
    if (level >= 1 && results.some(r => r)) triggerAchievement(ACHIEVEMENTS[0]);
    if (level >= 6) triggerAchievement(ACHIEVEMENTS[1]);
    if (level >= 16) triggerAchievement(ACHIEVEMENTS[2]);
    if (level >= 26) triggerAchievement(ACHIEVEMENTS[3]);
    if (level >= 10) triggerAchievement(ACHIEVEMENTS[4]);
    if (level >= 20) triggerAchievement(ACHIEVEMENTS[5]);
    if (level >= 30) triggerAchievement(ACHIEVEMENTS[6]);
    if (results.length >= 5 && results.every(r => r)) triggerAchievement(ACHIEVEMENTS[7]);
  }, [triggerAchievement]);

  const validationResults = activeComments.map(c => c.validate(code));
  const allPassing = activeComments.length > 0 && validationResults.every(Boolean);
  const passingCount = validationResults.filter(Boolean).length;
  const failingCount = validationResults.filter(r => !r).length;

  const startGame = () => {
    setCode(INITIAL_CODE);
    setActiveComments([ALL_COMMENTS[0]]);
    setCurrentLevel(1);
    setSubmitCount(0);
    setGameOverReason('');
    setScreen('playing');
  };

  const submitCode = () => {
    setSubmitCount(prev => prev + 1);
    const results = activeComments.map(c => c.validate(code));
    checkAchievements(currentLevel, results);

    if (results.every(Boolean)) {
      // All pass — add next comment
      const nextLevel = currentLevel + 1;
      const nextComment = ALL_COMMENTS.find(c => c.id === nextLevel);

      if (!nextComment) {
        // Beat all comments!
        saveBest(currentLevel);
        setGameOverReason('YOU BEAT EVERY SINGLE REVIEW COMMENT. You are either a genius or have lost your mind. Probably both. The PR is merged.');
        setScreen('game-over');
        return;
      }

      setCurrentLevel(nextLevel);
      setActiveComments(prev => [...prev, nextComment]);
      saveBest(nextLevel);
    }
    // If not all pass, player just sees the failures and keeps editing
  };

  const giveUp = () => {
    saveBest(currentLevel);
    setGameOverReason(`You couldn't satisfy all ${activeComments.length} reviewers simultaneously. The PR was closed with the comment: "Let's revisit this in the next sprint" (it was never revisited).`);
    setScreen('game-over');
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'var(--color-accent)';
      case 2: return 'var(--color-orange)';
      case 3: return 'var(--color-pink)';
      case 4: return 'var(--color-red)';
      default: return 'var(--color-text)';
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return 'REASONABLE';
      case 2: return 'ANNOYING';
      case 3: return 'ABSURD';
      case 4: return 'INSANE';
      default: return 'UNKNOWN';
    }
  };

  if (!mounted) return null;

  // ============================================
  // MENU SCREEN
  // ============================================
  if (screen === 'menu') {
    return (
      <div
        className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <Link
          href="/games"
          className="absolute top-4 left-4 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &larr; Back to Games
        </Link>

        <div className="max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{'\ud83d\udd25'}</div>
          <h1 className="pixel-text text-lg md:text-2xl mb-2" style={{ color: 'var(--color-red)' }}>
            CODE REVIEW
          </h1>
          <h2 className="pixel-text text-sm md:text-lg mb-6" style={{ color: 'var(--color-orange)' }}>
            FROM HELL
          </h2>

          <div
            className="pixel-card rounded-lg p-6 mb-6 text-left"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You submit a simple &quot;Hello World&quot; program. A team of unhinged code reviewers
              leave increasingly absurd comments that you must address.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              The catch? <span style={{ color: 'var(--color-red)' }}>Fixing one comment often breaks
              compliance with previous ones.</span> You must satisfy ALL active comments simultaneously.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Comments escalate from reasonable to completely unhinged. How far can you get?
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {Object.values(REVIEWERS).map(r => (
                <div
                  key={r.id}
                  className="text-center p-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                >
                  <div className="text-3xl mb-1">{r.emoji}</div>
                  <div className="pixel-text text-[8px] mb-1" style={{ color: r.color }}>{r.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{r.title}</div>
                </div>
              ))}
            </div>
          </div>

          {bestLevel > 0 && (
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Best: Level <span className="mono-text" style={{ color: 'var(--color-accent)' }}>{bestLevel}</span> / {ALL_COMMENTS.length}
            </p>
          )}

          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={startGame} className="pixel-btn">
              Open PR
            </button>
            <button
              onClick={() => setScreen('style-guide')}
              className="pixel-btn"
              style={{ borderColor: 'var(--color-purple)', color: 'var(--color-purple)' }}
            >
              Style Guide
            </button>
          </div>

          {earnedAchievements.size > 0 && (
            <div className="mt-8">
              <h3 className="pixel-text text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                ACHIEVEMENTS
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {ACHIEVEMENTS.filter(a => earnedAchievements.has(a.id)).map(a => (
                  <div
                    key={a.id}
                    className="px-3 py-1 rounded text-xs border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    title={a.description}
                  >
                    {a.emoji} {a.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // STYLE GUIDE SCREEN
  // ============================================
  if (screen === 'style-guide') {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setScreen('menu')}
            className="text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Menu
          </button>

          <h1 className="pixel-text text-lg mb-2" style={{ color: 'var(--color-purple)' }}>
            THE STYLE GUIDE
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            The sacred document. Memorize it. Fear it. It grows with each review cycle.
          </p>

          <div className="space-y-4">
            {STYLE_GUIDE_SECTIONS.map((section, i) => (
              <div
                key={i}
                className="pixel-card rounded-lg p-4"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                <h3 className="pixel-text text-[10px] mb-2" style={{ color: 'var(--color-accent)' }}>
                  {section.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // GAME OVER SCREEN
  // ============================================
  if (screen === 'game-over') {
    const levelPercent = Math.round((currentLevel / ALL_COMMENTS.length) * 100);
    const rating =
      currentLevel >= 50 ? 'LEGENDARY DEVELOPER' :
      currentLevel >= 30 ? 'Code Review Survivor' :
      currentLevel >= 20 ? 'Pain Enjoyer' :
      currentLevel >= 10 ? 'Junior Masochist' :
      currentLevel >= 5 ? 'Intern Energy' :
      'Ctrl+Z Your Career';

    return (
      <div
        className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{currentLevel >= 50 ? '\ud83c\udfc6' : '\ud83d\udcad'}</div>
          <h1 className="pixel-text text-lg md:text-xl mb-2" style={{ color: 'var(--color-red)' }}>
            PR CLOSED
          </h1>

          <div
            className="pixel-card rounded-lg p-6 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {gameOverReason}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="pixel-text text-2xl mb-1" style={{ color: 'var(--color-accent)' }}>
                  {currentLevel}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Comments Survived
                </div>
              </div>
              <div className="text-center">
                <div className="pixel-text text-2xl mb-1" style={{ color: 'var(--color-orange)' }}>
                  {submitCount}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Total Submissions
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Progress: {levelPercent}%
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${levelPercent}%`,
                    backgroundColor: 'var(--color-accent)',
                    boxShadow: '0 0 8px var(--color-accent)',
                  }}
                />
              </div>
            </div>

            <div
              className="pixel-text text-xs p-3 rounded"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-orange)' }}
            >
              Rating: {rating}
            </div>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={startGame} className="pixel-btn">
              Try Again
            </button>
            <button
              onClick={() => setScreen('menu')}
              className="pixel-btn"
              style={{ borderColor: 'var(--color-text-secondary)', color: 'var(--color-text-secondary)' }}
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PLAYING SCREEN
  // ============================================
  const currentTier = activeComments.length > 0 ? activeComments[activeComments.length - 1].tier : 1;
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Achievement Popup */}
      {showAchievement && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '2px solid var(--color-accent)',
            borderRadius: '8px',
            padding: '12px 24px',
            boxShadow: '0 0 20px var(--color-accent-glow)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{showAchievement.emoji}</span>
            <div>
              <div className="pixel-text text-[10px]" style={{ color: 'var(--color-accent)' }}>
                ACHIEVEMENT UNLOCKED
              </div>
              <div className="text-sm font-bold">{showAchievement.title}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {showAchievement.description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/games"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Exit
          </Link>
          <span className="pixel-text text-[9px]" style={{ color: 'var(--color-red)' }}>
            CODE REVIEW FROM HELL
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Build Status */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: allPassing ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
              color: allPassing ? 'var(--color-accent)' : 'var(--color-red)',
              border: `1px solid ${allPassing ? 'var(--color-accent)' : 'var(--color-red)'}`,
            }}
          >
            <span>{allPassing ? '\u2705' : '\u274c'}</span>
            <span className="mono-text">{passingCount}/{activeComments.length}</span>
          </div>

          <div className="pixel-text text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>
            LVL <span style={{ color: getTierColor(currentTier) }}>{currentLevel}</span>
          </div>

          {/* Tier Badge */}
          <span
            className="pixel-text text-[8px] px-2 py-0.5 rounded"
            style={{
              backgroundColor: `color-mix(in srgb, ${getTierColor(currentTier)} 15%, transparent)`,
              color: getTierColor(currentTier),
              border: `1px solid ${getTierColor(currentTier)}`,
            }}
          >
            {getTierLabel(currentTier)}
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Editor Header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {'\ud83d\udcc4'} hello-world.js
              </span>
              <span className="mono-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {code.length} chars | {getLines(code).length} lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStyleGuide(!showStyleGuide)}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-purple)',
                  color: 'var(--color-purple)',
                }}
              >
                {'\ud83d\udcd6'} Guide
              </button>
              <button
                onClick={() => setCommentsPanel(!commentsPanel)}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors hover:opacity-80 md:hidden"
                style={{
                  borderColor: 'var(--color-text-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {commentsPanel ? 'Hide' : 'Show'} Comments {failingCount > 0 && `(${failingCount} \u274c)`}
              </button>
            </div>
          </div>

          {/* Inline Style Guide */}
          {showStyleGuide && (
            <div
              className="border-b p-3 overflow-y-auto shrink-0"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                maxHeight: '200px',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="pixel-text text-[9px]" style={{ color: 'var(--color-purple)' }}>
                  STYLE GUIDE (Quick Ref)
                </span>
                <button
                  onClick={() => setShowStyleGuide(false)}
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {'\u2715'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STYLE_GUIDE_SECTIONS.slice(0, 6).map((s, i) => (
                  <div key={i} className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-accent)' }}>{s.title}:</span> {s.content.slice(0, 80)}...
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Line numbers + highlighted preview (background) */}
            <div
              className="absolute inset-0 overflow-auto p-3 pointer-events-none"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            >
              <div className="flex">
                <div
                  className="select-none text-right pr-3 mr-3 border-r shrink-0"
                  style={{
                    color: 'var(--color-text-muted)',
                    borderColor: 'var(--color-border)',
                    minWidth: '2.5em',
                  }}
                >
                  {getLines(code).map((_, i) => (
                    <div key={i} className="leading-relaxed">{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 whitespace-pre-wrap break-all">
                  {highlightCode(code)}
                </div>
              </div>
            </div>

            {/* Actual textarea (transparent, for editing) */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="absolute inset-0 w-full h-full resize-none p-3 bg-transparent outline-none"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'transparent',
                caretColor: 'var(--color-accent)',
                paddingLeft: 'calc(2.5em + 1.5rem + 0.75rem)',
                lineHeight: '1.625',
                tabSize: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          {/* Action Bar */}
          <div
            className="flex items-center justify-between px-3 py-2 border-t shrink-0"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={submitCode}
                className="pixel-btn text-xs"
                style={{
                  borderColor: allPassing ? 'var(--color-accent)' : 'var(--color-orange)',
                  color: allPassing ? 'var(--color-accent)' : 'var(--color-orange)',
                }}
              >
                {allPassing ? '\u2705 Submit for Review' : '\ud83d\udd04 Re-submit'}
              </button>
              <span className="mono-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Submissions: {submitCount}
              </span>
            </div>
            <button
              onClick={giveUp}
              className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--color-red)',
                color: 'var(--color-red)',
              }}
            >
              Close PR
            </button>
          </div>
        </div>

        {/* Comments Panel */}
        <div
          className={`${commentsPanel ? 'flex' : 'hidden'} md:flex flex-col border-l overflow-hidden`}
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            width: '100%',
            maxHeight: '40vh',
          }}
        >
          <style>{`
            @media (min-width: 768px) {
              .comments-panel-override {
                width: 380px !important;
                max-width: 380px !important;
                max-height: none !important;
                height: 100% !important;
              }
            }
          `}</style>
          <div className="comments-panel-override flex flex-col overflow-hidden h-full">
            {/* Panel Header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="pixel-text text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>
                REVIEW COMMENTS ({activeComments.length})
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: 'var(--color-accent)' }}>
                  {'\u2705'} {passingCount}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-red)' }}>
                  {'\u274c'} {failingCount}
                </span>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {[...activeComments].reverse().map((comment, idx) => {
                const actualIdx = activeComments.length - 1 - idx;
                const passing = validationResults[actualIdx];
                const rev = REVIEWERS[comment.reviewer];
                const isLatest = actualIdx === activeComments.length - 1;

                return (
                  <div
                    key={comment.id}
                    className="rounded-lg p-3 border transition-all"
                    style={{
                      backgroundColor: isLatest ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
                      borderColor: passing ? 'var(--color-accent)' : isLatest ? rev.color : 'var(--color-border)',
                      borderWidth: isLatest ? '2px' : '1px',
                      opacity: passing ? 0.7 : 1,
                    }}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="text-lg shrink-0">{rev.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: rev.color }}>
                            {rev.name}
                          </span>
                          <span
                            className="pixel-text text-[7px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${getTierColor(comment.tier)} 15%, transparent)`,
                              color: getTierColor(comment.tier),
                            }}
                          >
                            {getTierLabel(comment.tier)}
                          </span>
                          <span className="text-[10px]">
                            {passing
                              ? <span style={{ color: 'var(--color-accent)' }}>{'\u2705'} RESOLVED</span>
                              : <span style={{ color: 'var(--color-red)' }}>{'\u274c'} OPEN</span>
                            }
                          </span>
                        </div>
                        <div className="text-xs font-bold mt-1" style={{ color: 'var(--color-text)' }}>
                          #{comment.id}: {comment.title}
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {comment.description}
                        </p>
                        {!passing && comment.hint && (
                          <p className="text-[10px] mt-1 italic" style={{ color: 'var(--color-text-muted)' }}>
                            Hint: {comment.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
