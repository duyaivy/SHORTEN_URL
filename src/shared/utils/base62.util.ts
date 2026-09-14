import { randomInt } from 'node:crypto';

/** Base62 character set — a-z A-Z 0-9 (62 chars total). */
const BASE62_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a cryptographically-random Base62 string of the given length.
 * With length=7, supports ~3.5 trillion unique codes (62^7 ≈ 3,521,614,606,208).
 *
 * Each character is chosen using `randomInt` from the Node.js crypto module
 * which provides uniform distribution without bias.
 *
 * @param length Number of characters (default: 7)
 */
export function generateBase62(length = 7): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS[randomInt(0, BASE62_CHARS.length)];
  }
  return result;
}
