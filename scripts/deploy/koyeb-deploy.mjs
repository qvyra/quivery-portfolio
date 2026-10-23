// Deploys the API on Koyeb at the commit CI tested and waits until it's healthy.
// Anything but the free instance type is billable, so it's refused before
// anything is created, and a new deployment that comes out different is cancelled
//
//   KOYEB_TOKEN       Koyeb API token
//   KOYEB_SERVICE_ID  the API service's id
//   DEPLOY_SHA        the commit to deploy
//   API_URL           optional, checked once deployed
import process from "node:process";

const API = "https://app.koyeb.com/v1";
const FREE_INSTANCE_TYPE = "free";
const TIMEOUT_MS = 20 * 60_000;
const POLL_MS = 10_000;

const { KOYEB_TOKEN, KOYEB_SERVICE_ID, DEPLOY_SHA, API_URL } = process.env;
for (const [name, value] of Object.entries({
  KOYEB_TOKEN,
  KOYEB_SERVICE_ID,
  DEPLOY_SHA,
})) {
  if (!value) fail(`${name} is not set`);
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

process.on("uncaughtException", (error) => fail(error.message));

async function koyeb(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KOYEB_TOKEN}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    fail(
      `Koyeb ${method} ${path} answered ${response.status}: ${JSON.stringify(json)}`,
    );
  }
  return json;
}

/** Throws unless every instance type in the definition is the free one */
function assertFreeOnly(definition, what) {
  const types = (definition?.instance_types ?? []).map((entry) => entry.type);
  if (types.length === 0 || types.some((type) => type !== FREE_INSTANCE_TYPE)) {
    throw new Error(
      `${what} uses instance type(s) [${types.join(", ") || "none"}], not only "${FREE_INSTANCE_TYPE}". ` +
        "Refusing to deploy anything billable. Fix the service on Koyeb first (see DEPLOY.md).",
    );
  }
  console.log(`${what}: instance type "${FREE_INSTANCE_TYPE}" only, OK`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// redeploy reuses the current definition, so check it first
const { service } = await koyeb("GET", `/services/${KOYEB_SERVICE_ID}`);
const { deployment: current } = await koyeb(
  "GET",
  `/deployments/${service.latest_deployment_id}`,
);
assertFreeOnly(current.definition, "Current deployment");
if (current.definition?.git?.no_deploy_on_push !== true) {
  fail(
    "Koyeb's deploy-on-push is on for this service. Turn it off: deploys must go through CI.",
  );
}

console.log(`Deploying ${DEPLOY_SHA} to service ${service.name}...`);
const { deployment } = await koyeb(
  "POST",
  `/services/${KOYEB_SERVICE_ID}/redeploy`,
  { sha: DEPLOY_SHA },
);
try {
  assertFreeOnly(deployment.definition, "New deployment");
} catch (error) {
  await koyeb("POST", `/deployments/${deployment.id}/cancel`);
  throw error;
}

// Koyeb only routes traffic to it once its health check passes, the old one
// serves until then. UNHEALTHY can be transient while it starts, so only final
// states fail early and the timeout catches the rest
const failed = new Set(["ERROR", "CANCELED", "STOPPED"]);
const started = Date.now();
let last = "";
for (;;) {
  const { deployment: now } = await koyeb(
    "GET",
    `/deployments/${deployment.id}`,
  );
  if (now.status !== last) {
    last = now.status;
    console.log(
      `[${Math.round((Date.now() - started) / 1000)}s] ${now.status}`,
    );
  }
  if (now.status === "HEALTHY") break;
  if (failed.has(now.status)) {
    fail(
      `Deployment ${deployment.id} ended ${now.status}: ${(now.messages ?? []).join(" | ")}. ` +
        "The previous deployment is still serving.",
    );
  }
  if (Date.now() - started > TIMEOUT_MS) {
    fail(
      `Deployment ${deployment.id} not healthy after ${TIMEOUT_MS / 60_000} minutes (${now.status}).`,
    );
  }
  await sleep(POLL_MS);
}

if (API_URL) {
  const url = `${API_URL.replace(/\/+$/, "")}/health/ready`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) fail(`${url} answered ${response.status} after the deploy`);
  console.log(`${url} answered ${response.status}`);
}
console.log("API deployed.");
