// Asks the live site to refresh cached pages, like the API will after admin
// edits. Tags: site, projects, project:<slug>
//
//   SITE_URL=https://... node scripts/deploy/revalidate.mjs site projects
//
// REVALIDATE_SECRET comes from the environment or .deploy/secrets.local
import process from "node:process";

try {
  process.loadEnvFile(".deploy/secrets.local");
} catch {
  // CI passes them as environment variables
}

const site = process.env.SITE_URL?.replace(/\/+$/, "");
const secret = process.env.REVALIDATE_SECRET;
const tags = process.argv.slice(2);
if (!site || !secret || tags.length === 0) {
  console.error(
    "Usage: SITE_URL=... REVALIDATE_SECRET=... node scripts/deploy/revalidate.mjs <tag>...",
  );
  process.exit(1);
}

const response = await fetch(`${site}/api/revalidate`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-revalidate-secret": secret,
  },
  body: JSON.stringify({ tags }),
  signal: AbortSignal.timeout(30_000),
});
const body = await response.json().catch(() => null);
console.log(response.status, JSON.stringify(body));
if (!response.ok) process.exit(1);
