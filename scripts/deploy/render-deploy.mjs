// Deploys the API on Render at the commit CI tested and waits until it's live.
// Anything but the free plan is billable, so the service is checked before a
// deploy is created and refused if it isn't free, in Frankfurt, with auto deploy off
//
//   RENDER_API_KEY     Render API key
//   RENDER_SERVICE_ID  the API service's id (srv-...)
//   DEPLOY_SHA         the commit to deploy
//   API_URL            optional, checked once deployed
import process from "node:process";

const API = "https://api.render.com/v1";
const FREE_PLAN = "free";
const REGION = "frankfurt";
// a Docker build on the free builders, plus the queue in front of it
const TIMEOUT_MS = 25 * 60_000;
const POLL_MS = 15_000;

const { RENDER_API_KEY, RENDER_SERVICE_ID, DEPLOY_SHA, API_URL } = process.env;
for (const [name, value] of Object.entries({
  RENDER_API_KEY,
  RENDER_SERVICE_ID,
  DEPLOY_SHA,
})) {
  if (!value) fail(`${name} is not set`);
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

process.on("uncaughtException", (error) => fail(error.message));

async function render(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${RENDER_API_KEY}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    fail(
      `Render ${method} ${path} answered ${response.status}: ${JSON.stringify(json)}`,
    );
  }
  return json;
}

/** Throws unless the service is the free, Frankfurt, CI-deployed one */
function assertSafe(service) {
  const { plan, region } = service.serviceDetails ?? {};
  // autoDeploy is the deprecated form of autoDeployTrigger
  const trigger =
    service.autoDeployTrigger ??
    (service.autoDeploy === "no" ? "off" : "commit");
  const problems = [];
  if (plan !== FREE_PLAN)
    problems.push(`plan is "${plan}", not "${FREE_PLAN}"`);
  if (region !== REGION)
    problems.push(`region is "${region}", not "${REGION}"`);
  if (trigger !== "off") {
    problems.push(`auto deploy is "${trigger}", deploys must go through CI`);
  }
  if (problems.length > 0) {
    throw new Error(
      `Refusing to deploy to ${service.name}: ${problems.join(", ")}. Fix the service on Render first (see DEPLOY.md)`,
    );
  }
  console.log(`${service.name}: plan "${plan}", ${region}, auto deploy off`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

assertSafe(await render("GET", `/services/${RENDER_SERVICE_ID}`));

console.log(`Deploying ${DEPLOY_SHA}...`);
const deploy = await render("POST", `/services/${RENDER_SERVICE_ID}/deploys`, {
  commitId: DEPLOY_SHA,
});

// Render only moves traffic once the new instance passes its health check, the
// old one serves until then and keeps serving if this deploy fails
const failed = new Set([
  "build_failed",
  "update_failed",
  "pre_deploy_failed",
  "canceled",
  "deactivated",
]);
const started = Date.now();
let last = "";
for (;;) {
  const now = await render(
    "GET",
    `/services/${RENDER_SERVICE_ID}/deploys/${deploy.id}`,
  );
  if (now.status !== last) {
    last = now.status;
    console.log(
      `[${Math.round((Date.now() - started) / 1000)}s] ${now.status}`,
    );
  }
  if (now.status === "live") break;
  if (failed.has(now.status)) {
    fail(
      `Deploy ${deploy.id} ended ${now.status}. The previous deploy is still serving`,
    );
  }
  if (Date.now() - started > TIMEOUT_MS) {
    fail(
      `Deploy ${deploy.id} not live after ${TIMEOUT_MS / 60_000} minutes (${now.status})`,
    );
  }
  await sleep(POLL_MS);
}

// a deploy can't change the plan, but this is cheap and the bill isn't
assertSafe(await render("GET", `/services/${RENDER_SERVICE_ID}`));

if (API_URL) {
  const url = `${API_URL.replace(/\/+$/, "")}/health/ready`;
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  });
  const json = await response.json().catch(() => null);
  if (json?.code !== "HEALTH_READY") {
    fail(
      `${url} answered ${response.status} ${JSON.stringify(json)} after the deploy`,
    );
  }
  console.log(`${url} is ready`);
}
console.log("API deployed");
