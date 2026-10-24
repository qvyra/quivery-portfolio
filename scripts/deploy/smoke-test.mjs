// Checks the deployed site and API from the outside, after every deploy or by hand
//
//   SITE_URL=https://... API_URL=https://... node scripts/deploy/smoke-test.mjs
//
// SITE_ALIASES, optional and comma separated, lists other origins that must
// redirect to SITE_URL
import process from "node:process";

const site = process.env.SITE_URL?.replace(/\/+$/, "");
const api = process.env.API_URL?.replace(/\/+$/, "");
if (!site || !api) {
  console.error("::error::SITE_URL and API_URL must be set");
  process.exit(1);
}
const aliases = (process.env.SITE_ALIASES ?? "")
  .split(",")
  .map((alias) => alias.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const checks = [
  {
    url: `${site}/`,
    status: 200,
    absent: ["Placeholder project", "/admin"],
    // the security headers, and a share card that loads
    headers: {
      "content-security-policy": "frame-ancestors 'none'",
      "strict-transport-security": "includeSubDomains; preload",
      "x-content-type-options": "nosniff",
    },
    ogImage: true,
  },
  {
    url: `${site}/projects/geode`,
    status: 200,
    // a wrong SITE_URL in the build shows up here first
    present: [`<link rel="canonical" href="${site}/projects/geode"/>`],
    ogImage: true,
  },
  { url: `${site}/sitemap.xml`, status: 200, present: ["/projects/geode"] },
  {
    url: `${site}/robots.txt`,
    status: 200,
    present: ["Disallow: /admin", "Sitemap:"],
  },
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
  // the admin stays closed: signed out it redirects, the site's admin API
  // needs a session, and the API's needs the admin secret
  { url: `${site}/admin`, status: 307 },
  {
    url: `${site}/admin/api/collections/stats`,
    status: 401,
    code: "ADMIN_SESSION_EXPIRED",
  },
  {
    url: `${api}/admin/collections/stats`,
    status: 401,
    code: "ADMIN_UNAUTHORIZED",
  },
  // a permanent redirect that keeps the path, so old links and search
  // results land on the same page
  ...aliases.map((alias) => ({
    url: `${alias}/projects/geode`,
    status: 308,
    location: `${site}/projects/geode`,
  })),
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
    for (const text of check.present ?? []) {
      if (!body.includes(text)) return `no ${JSON.stringify(text)}`;
    }
    if (check.location && response.headers.get("location") !== check.location) {
      return `redirects to ${response.headers.get("location")}`;
    }
    for (const [name, text] of Object.entries(check.headers ?? {})) {
      if (!response.headers.get(name)?.includes(text)) {
        return `${name} doesn't have ${JSON.stringify(text)}`;
      }
    }
    if (check.ogImage) {
      const image = body.match(
        /<meta property="og:image" content="([^"]+)"/,
      )?.[1];
      if (!image) return "no og:image";
      const card = await fetch(image.replaceAll("&amp;", "&"), {
        signal: AbortSignal.timeout(60_000),
      });
      if (
        card.status !== 200 ||
        card.headers.get("content-type") !== "image/png"
      ) {
        return `og:image answered ${card.status} ${card.headers.get("content-type")}`;
      }
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
