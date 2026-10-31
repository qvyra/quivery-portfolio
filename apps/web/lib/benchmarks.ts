// Bench data from Geode's docs site (or any allowlisted host). Only the server
// fetches it, while prerendering or refreshing a page, never for a visitor's
// request and never from the browser. A day after a render, or after the
// admin's refresh, the next visit gets the cached page and a new one renders
// in the background
import "server-only";
import {
  isBenchmarkDataUrl,
  parseBenchIndex,
  parseBenchLatest,
  parseBenchRun,
  type BenchIndex,
  type BenchLatest,
  type BenchParse,
  type BenchRun,
  type ProjectDetail,
} from "@repo/shared";
import { cacheLife, cacheTag } from "next/cache";
import { getBuiltProjects, getProject } from "./content";
import { currentStage } from "./env";

/** The cache tag behind every benchmark render */
export const benchmarksTag = "benchmarks";

export type BenchData =
  | {
      status: "ok";
      latest: BenchLatest;
      latestUrl: string;
      /** Only when the data URL is an index.json */
      index: BenchIndex | null;
      indexUrl: string | null;
    }
  | {
      /** What the page says instead of results */
      status: "unavailable";
      reason: "unsupported" | "failed";
    };

class BenchError extends Error {}

async function fetchJson(url: string): Promise<unknown> {
  // checked again here since relative paths inside the data can point anywhere
  if (!isBenchmarkDataUrl(url)) {
    throw new BenchError(`${url} isn't an allowed benchmark data URL`);
  }
  const response = await fetch(url, {
    // GitHub Pages answers in well under a second, a hung request shouldn't
    // hold a build or a refresh for long
    signal: AbortSignal.timeout(15_000),
    // a redirect could leave the allowlisted host
    redirect: "error",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new BenchError(`GET ${url} answered ${response.status}`);
  }
  return response.json();
}

function unwrap<T>(url: string, parsed: BenchParse<T>): T | "unsupported" {
  if (parsed.status === "ok") return parsed.data;
  if (parsed.status === "unsupported") {
    console.error(
      `[benchmarks] ${url} is schema version ${parsed.schemaVersion}, this site reads version 1`,
    );
    return "unsupported";
  }
  throw new BenchError(
    `${url} doesn't match the bench schema:\n${parsed.error}`,
  );
}

async function load(dataUrl: string): Promise<BenchData> {
  const first = (await fetchJson(dataUrl)) as { kind?: unknown } | null;
  if (first?.kind !== "index") {
    const latest = unwrap(dataUrl, parseBenchLatest(first));
    return latest === "unsupported"
      ? { status: "unavailable", reason: "unsupported" }
      : {
          status: "ok",
          latest,
          latestUrl: dataUrl,
          index: null,
          indexUrl: null,
        };
  }
  const index = unwrap(dataUrl, parseBenchIndex(first));
  if (index === "unsupported") {
    return { status: "unavailable", reason: "unsupported" };
  }
  const latestUrl = new URL(index.latest, dataUrl).href;
  const latest = unwrap(
    latestUrl,
    parseBenchLatest(await fetchJson(latestUrl)),
  );
  if (latest === "unsupported") {
    return { status: "unavailable", reason: "unsupported" };
  }
  return { status: "ok", latest, latestUrl, index, indexUrl: dataUrl };
}

/**
 * The data behind a benchmark block. A failed fetch or bad data while
 * building renders "unavailable" and tries again within the hour, so another
 * site's outage can't stop a deploy. After that it throws, which keeps the
 * last good page and logs why
 */
export async function getBenchData(dataUrl: string): Promise<BenchData> {
  "use cache";
  cacheTag(benchmarksTag);

  let data: BenchData;
  try {
    data = await load(dataUrl);
  } catch (error) {
    console.error(`[benchmarks] Couldn't load ${dataUrl}`, error);
    if (currentStage() !== "build") throw error;
    data = { status: "unavailable", reason: "failed" };
  }
  cacheLife(
    data.status === "ok"
      ? { stale: 300, revalidate: 86_400, expire: 31_536_000 }
      : { stale: 300, revalidate: 3_600, expire: 31_536_000 },
  );
  return data;
}

/** One run, without its raw data. Runs never change once published */
export async function getBenchRun(
  url: string,
  runId: string,
): Promise<BenchRun | "unsupported"> {
  "use cache";
  cacheTag(benchmarksTag);
  cacheLife("max");

  try {
    const run = unwrap(url, parseBenchRun(await fetchJson(url)));
    if (run !== "unsupported" && run.id !== runId) {
      throw new BenchError(`${url} holds run ${run.id}, not ${runId}`);
    }
    return run;
  } catch (error) {
    console.error(`[benchmarks] Couldn't load run ${runId}`, error);
    throw error;
  }
}

/** A run file's public URL, or null if the index doesn't list the run */
export function benchRunUrl(
  indexUrl: string,
  index: BenchIndex,
  runId: string,
): string | null {
  const ref = index.runs.find((run) => run.id === runId);
  return ref ? new URL(ref.data, indexUrl).href : null;
}

/** The benchmark blocks of a project's benchmarks page */
export function benchmarkBlocks(project: ProjectDetail) {
  return project.benchmarks.flatMap((block) =>
    block.type === "benchmark" ? [block] : [],
  );
}

export type RunSource = {
  indexUrl: string;
  index: BenchIndex;
  latest: BenchLatest;
  methodUrl?: string | undefined;
};

/** Every dataset with a run index on a project's benchmarks page */
export async function projectRunSources(
  project: ProjectDetail,
): Promise<RunSource[]> {
  const sources: RunSource[] = [];
  for (const block of benchmarkBlocks(project)) {
    const data = await getBenchData(block.dataUrl);
    if (data.status === "ok" && data.index && data.indexUrl) {
      sources.push({
        indexUrl: data.indexUrl,
        index: data.index,
        latest: data.latest,
        methodUrl: block.methodUrl,
      });
    }
  }
  return sources;
}

/** The projects in this build that have a benchmarks page */
export async function benchmarkSlugs(): Promise<string[]> {
  const projects = await getBuiltProjects();
  const details = await Promise.all(
    projects.map((project) => getProject(project.slug)),
  );
  return details.flatMap((project) =>
    project && project.benchmarks.length > 0 ? [project.slug] : [],
  );
}
