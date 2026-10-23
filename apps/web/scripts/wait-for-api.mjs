// Runs before next build. The API and its database sleep when idle (a cold API
// takes about a minute), so this wakes them through /health/ready with backoff
// before prerendering starts. If it never gets ready the build fails and the
// last deploy stays live
import process from "node:process";

// API_URL can come from .env files too, in Next's order for a production
// build. Real env vars win
for (const file of [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // missing files are fine
  }
}

const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
if (!apiUrl) {
  console.error(
    "[wait-for-api] API_URL is not set. See apps/web/.env.example.",
  );
  process.exit(1);
}

const url = `${apiUrl}/health/ready`;
// WAIT_FOR_API_TIMEOUT_MS overrides the 5 minute budget
const budgetMs = Number(process.env.WAIT_FOR_API_TIMEOUT_MS ?? 300_000);
// long enough for a request held while the API spins up
const attemptTimeoutMs = 60_000;
const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(`[wait-for-api] Waiting for ${url} (up to ${budgetMs / 1000}s)`);

let delayMs = 2_000;
for (let attempt = 1; ; attempt++) {
  let outcome;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(attemptTimeoutMs),
      headers: { accept: "application/json" },
    });
    // only the API's own answer counts, not a host's "waking up" page
    const json = await response.json().catch(() => null);
    if (response.ok && json?.code === "HEALTH_READY") {
      console.log(
        `[wait-for-api] Ready after ${elapsed()} (attempt ${attempt})`,
      );
      process.exit(0);
    }
    outcome = `answered ${response.status}${json ? "" : " (not JSON)"}`;
  } catch (error) {
    outcome =
      error instanceof Error
        ? (error.cause?.code ?? error.name)
        : String(error);
  }

  const remainingMs = budgetMs - (Date.now() - started);
  if (remainingMs <= 0) {
    console.error(
      `[wait-for-api] Not ready after ${elapsed()} (${attempt} attempts, last: ${outcome}). ` +
        "Failing the build so nothing incomplete is deployed.",
    );
    process.exit(1);
  }
  const waitMs = Math.min(delayMs, remainingMs);
  console.log(
    `[wait-for-api] Attempt ${attempt}: ${outcome}. Retrying in ${waitMs / 1000}s (${elapsed()} elapsed)`,
  );
  await sleep(waitMs);
  delayMs = Math.min(delayMs * 2, 30_000);
}
