// Checks the deployed site and API from the outside, after every deploy or by hand
//
//   SITE_URL=https://... API_URL=https://... node scripts/deploy/smoke-test.mjs
import process from "node:process";

const site = process.env.SITE_URL?.replace(/\/+$/, "");
const api = process.env.API_URL?.replace(/\/+$/, "");
if (!site || !api) {
  console.error("::error::SITE_URL and API_URL must be set");
  process.exit(1);
}

const checks = [
  { url: `${site}/`, status: 200, absent: ["Placeholder project", "/admin"] },
  { url: `${site}/projects/geode`, status: 200 },
  { url: `${site}/projects/placeholder-one`, status: 404 },
  { url: `${site}/projects/no-such-project-${Date.now()}`, status: 404 },
  { url: `${site}/dev/design`, status: 404 },
  { url: `${api}/health`, status: 200, code: "HEALTH_OK" },
];

let failures = 0;
for (const check of checks) {
  let outcome;
  try {
    // the API might be asleep, and takes about a minute to wake
    const response = await fetch(check.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.text();
    const found = (check.absent ?? []).filter((text) => body.includes(text));
    if (response.status !== check.status) {
      outcome = `expected ${check.status}, got ${response.status}`;
    } else if (check.code && !body.includes(`"code":"${check.code}"`)) {
      outcome = `no ${check.code} in the answer`;
    } else if (found.length > 0) {
      outcome = `contains ${found.map((text) => JSON.stringify(text)).join(", ")}`;
    }
  } catch (error) {
    outcome = error instanceof Error ? error.message : String(error);
  }
  if (outcome) failures++;
  console.log(
    `${outcome ? "FAIL" : "ok  "} ${check.url}${outcome ? ` (${outcome})` : ""}`,
  );
}

if (failures > 0) {
  console.error(`::error::${failures} smoke check(s) failed`);
  process.exit(1);
}
