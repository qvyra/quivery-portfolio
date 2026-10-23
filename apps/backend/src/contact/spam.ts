import type { ContactSubmission } from '@repo/shared';

// Nobody reads the form, writes a message and sends it in under 3 seconds.
// The clock starts at the first keystroke and survives a restored draft, so a
// person sending a saved draft right away isn't caught by it
export const MIN_FILL_MS = 3_000;

export type BotSignal = 'trap' | 'too-fast';

/**
 * Why a submission looks automated, or null. Bots get a normal looking
 * success and nothing is stored, so they can't tell they were caught.
 * Cloudflare Turnstile would be one more signal here
 */
export function botSignal(
  submission: Pick<ContactSubmission, 'trap' | 'elapsedMs'>,
): BotSignal | null {
  if (submission.trap.trim() !== '') return 'trap';
  if (submission.elapsedMs < MIN_FILL_MS) return 'too-fast';
  return null;
}
