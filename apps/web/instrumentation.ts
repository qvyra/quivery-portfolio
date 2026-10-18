// Runs once when a Next.js server starts: dev, build workers and next start
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { currentStage, loadEnv } = await import("./lib/env");
  // throws with a list of what's wrong, so a misconfigured deploy fails fast
  loadEnv(currentStage());
}
