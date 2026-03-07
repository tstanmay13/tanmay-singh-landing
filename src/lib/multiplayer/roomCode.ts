import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './types';

/**
 * Generate a random room code using the unambiguous alphabet.
 * Uses crypto.getRandomValues for secure randomness.
 */
export function generateRoomCode(): string {
  const array = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length])
    .join('');
}

/**
 * Validate that a string is a valid room code format.
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return code.split('').every((char) => ROOM_CODE_ALPHABET.includes(char));
}

/**
 * Normalize a room code (uppercase, trim whitespace).
 */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Sanitize a display name: trim, limit to 16 chars, alphanumeric + spaces only.
 */
export function sanitizeDisplayName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 16)
    .trim();
}

/**
 * Generate a random avatar seed for deterministic pixel avatars.
 */
export function generateAvatarSeed(): string {
  return crypto.randomUUID().slice(0, 8);
}
