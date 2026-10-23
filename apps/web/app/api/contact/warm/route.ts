// Wakes the API and its database while someone is still typing, so sending
// rarely waits on a cold start. The form calls it once, on first focus. POST,
// so crawlers following links never wake the free instance
import { env } from "@/lib/env";

export const maxDuration = 90;

// one wake-up per function instance per minute is plenty
let lastWarm = 0;

export async function POST() {
  const now = Date.now();
  if (now - lastWarm < 60_000) return new Response(null, { status: 204 });
  lastWarm = now;

  // /health/ready touches the database, which wakes it as well
  await fetch(`${env().apiUrl}/health/ready`, {
    signal: AbortSignal.timeout(75_000),
  }).catch(() => {
    // nothing to do: sending will wait for the API itself
  });
  return new Response(null, { status: 204 });
}
