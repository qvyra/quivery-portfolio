const HOUR = 60 * 60 * 1000;

/**
 * Messages one visitor can send. The throttler counts in memory, which
 * resets whenever the free Render instance sleeps or restarts, so the daily
 * limit is also checked against stored messages
 */
export const CONTACT_RATE_LIMITS = [
  { name: 'hour', ttl: HOUR, limit: 5 },
  { name: 'day', ttl: 24 * HOUR, limit: 10 },
] as const;

export const DAILY_LIMIT = CONTACT_RATE_LIMITS[1];
