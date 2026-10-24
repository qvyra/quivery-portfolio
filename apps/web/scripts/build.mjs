// Production build. Waits for the API, snapshots which project slugs are
// published, then runs next build with that list baked in, so an unknown
// project URL can 404 without asking the API (see next.config.ts)
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";
import { parseProjects } from "@repo/shared";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    // npm puts next on PATH as next.cmd on Windows
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node", ["scripts/wait-for-api.mjs"]);

// wait-for-api already checked API_URL, reading .env files the same way
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
const apiUrl = process.env.API_URL.replace(/\/+$/, "");
const response = await fetch(`${apiUrl}/public/projects`, {
  signal: AbortSignal.timeout(60_000),
});
const slugs = parseProjects(await response.json()).map(
  (project) => project.slug,
);
console.log(`[build] Published projects: ${slugs.join(", ") || "none"}`);

// API answers kept by an earlier build would be prerendered instead of the
// content as it is now, so every build fetches afresh
rmSync(".next/cache/fetch-cache", { recursive: true, force: true });

run("next", ["build"], { PUBLISHED_PROJECT_SLUGS: JSON.stringify(slugs) });
