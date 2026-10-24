import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time compare for shared secrets and tokens. Hashing first makes the
 * lengths equal, which timingSafeEqual needs, and hides the expected length
 */
export function secretMatches(given: string | undefined, expected: string) {
  if (!given) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
