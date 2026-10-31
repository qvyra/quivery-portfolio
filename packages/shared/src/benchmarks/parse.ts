import { z } from "zod";
import {
  benchV1,
  type BenchIndex,
  type BenchLatest,
  type BenchRun,
  type BenchRunFile,
} from "./v1.js";

// Hosts the site may fetch bench data from. The site's server fetches the
// URL an admin typed, so anything else is refused before a request is made
export const benchmarkDataHosts = ["qvyra.github.io"] as const;

/** Whether the site may fetch bench data from this URL */
export function isBenchmarkDataUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    (benchmarkDataHosts as readonly string[]).includes(url.hostname) &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    url.pathname.endsWith(".json")
  );
}

export const benchmarkDataUrlSchema = z
  .url({ protocol: /^https$/ })
  .refine(
    isBenchmarkDataUrl,
    `Must be a .json file on ${benchmarkDataHosts.join(" or ")}`,
  );

export type BenchParse<T> =
  | { status: "ok"; data: T }
  /** A schema version this site doesn't read, so nothing is shown */
  | { status: "unsupported"; schemaVersion: number }
  | { status: "invalid"; error: string };

const supportedVersions = [1];

// only what's needed to pick the schema, so a new version's other changes
// can't make this fail
const envelope = z.object({ schemaVersion: z.number().int() });

function parseVersioned<T>(json: unknown, schema: z.ZodType<T>): BenchParse<T> {
  const version = envelope.safeParse(json);
  if (!version.success) {
    return { status: "invalid", error: "No schemaVersion" };
  }
  if (!supportedVersions.includes(version.data.schemaVersion)) {
    return {
      status: "unsupported",
      schemaVersion: version.data.schemaVersion,
    };
  }
  const parsed = schema.safeParse(json);
  return parsed.success
    ? { status: "ok", data: parsed.data }
    : { status: "invalid", error: z.prettifyError(parsed.error) };
}

export const parseBenchLatest = (json: unknown): BenchParse<BenchLatest> =>
  parseVersioned(json, benchV1.latest);

export const parseBenchIndex = (json: unknown): BenchParse<BenchIndex> =>
  parseVersioned(json, benchV1.index);

/** A run file, validated whole and then without its raw data */
export function parseBenchRun(json: unknown): BenchParse<BenchRun> {
  const parsed = parseVersioned(json, benchV1.run);
  if (parsed.status !== "ok") return parsed;
  const run = { ...parsed.data } as Partial<BenchRunFile>;
  delete run.tasks;
  delete run.lune;
  return { status: "ok", data: run as BenchRun };
}
