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
  // the contact route checks messages itself, and the API only takes them
  // from the site. Neither stores anything
  {
    url: `${site}/api/contact`,
    method: "POST",
    body: {},
    status: 400,
    code: "VALIDATION_FAILURE_NAME",
  },
  {
    url: `${api}/contact`,
    method: "POST",
    body: {},
    status: 401,
    code: "CONTACT_UNAUTHORIZED",
  },
];

async function run(check) {
  try {
    // the API might be asleep, and takes about a minute to wake
    const response = await fetch(check.url, {
      method: check.method ?? "GET",
      ...(check.body && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(check.body),
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.text();
    const found = (check.absent ?? []).filter((text) => body.includes(text));
    if (response.status !== check.status) {
      return `expected ${check.status}, got ${response.status}`;
    }
    if (check.code && !body.includes(`"code":"${check.code}"`)) {
      return `no ${check.code} in the answer`;
    }
    if (found.length > 0) {
      return `contains ${found.map((text) => JSON.stringify(text)).join(", ")}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// a domain that was just aliased to a new deployment can answer 404 for a few
// seconds, so failed checks get a couple more tries before the job fails
const ATTEMPTS = 4;
const RETRY_MS = 15_000;
let pending = checks;
for (let attempt = 1; pending.length > 0; attempt++) {
  const failed = [];
  for (const check of pending) {
    const outcome = await run(check);
    if (outcome) failed.push(check);
    console.log(
      `${outcome ? "FAIL" : "ok  "} ${check.method ?? "GET"} ${check.url}${outcome ? ` (${outcome})` : ""}`,
    );
  }
  pending = failed;
  if (pending.length === 0) break;
  if (attempt === ATTEMPTS) {
    console.error(`::error::${pending.length} smoke check(s) failed`);
    process.exit(1);
  }
  console.log(`retrying ${pending.length} in ${RETRY_MS / 1000}s`);
  await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
}
