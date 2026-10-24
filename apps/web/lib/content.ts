// Every public API read goes through here. Results are cached and tagged, so
// pages prerender once and stay static until the API calls /api/revalidate.
// No visitor request ever waits on the API
import "server-only";
import {
  parseProject,
  parseProjects,
  parseSite,
  type ProjectDetail,
  type ProjectSummary,
  type Site,
} from "@repo/shared";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "./env";

/** Cache tags the API revalidates after content changes */
export const tags = {
  /** Anything on the homepage (sections, profile, stats, skills, links...) */
  site: "site",
  /** Any project list or project page */
  projects: "projects",
  /** One project page */
  project: (slug: string) => `project:${slug}`,
} as const;

// unknown section and block types get skipped, so say so while developing
function reportSkip(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[content] ${message}`);
  }
}

// Failures throw on purpose. In next build that fails the build so nothing
// broken ships, after deploy a failed refresh keeps the last good page and
// logs, and in development it shows the error overlay
async function request(
  path: string,
): Promise<{ status: number; json: unknown }> {
  const url = `${env().apiUrl}${path}`;
  let response: Response;
  try {
    // a background refresh can find the API asleep, and waking takes about a
    // minute. Visitors get the cached page meanwhile, so waiting costs nothing
    response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  } catch (error) {
    const message = `[content] Couldn't reach the API at ${url}. Is it running? (npm run dev starts it.)`;
    console.error(message, error);
    throw new Error(message, { cause: error });
  }
  const json: unknown = await response.json().catch(() => null);
  return { status: response.status, json };
}

function unexpected(path: string, status: number, json: unknown): Error {
  const message = `[content] GET ${path} answered ${status}: ${JSON.stringify(json)}`;
  console.error(message);
  return new Error(message);
}

// logs parse failures so they show up in production logs too
function parsed<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getSite(): Promise<Site> {
  "use cache";
  cacheLife("max");
  // the homepage lists project summaries, so project changes refresh it too
  cacheTag(tags.site, tags.projects);

  const { status, json } = await request("/public/site");
  if (status !== 200) throw unexpected("/public/site", status, json);
  const site = parsed(() => parseSite(json, reportSkip));
  // an empty homepage means an empty or wrong database, never real content.
  // Refusing it fails the build, or keeps the last good page
  if (site.sections.length === 0) {
    throw unexpected("/public/site", status, "no published sections");
  }
  return site;
}

export async function getProjects(): Promise<ProjectSummary[]> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.projects);

  const { status, json } = await request("/public/projects");
  if (status !== 200) throw unexpected("/public/projects", status, json);
  return parsed(() => parseProjects(json));
}

/** A published project, or null if there's none with this slug */
export async function getProject(slug: string): Promise<ProjectDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.projects, tags.project(slug));

  const path = `/public/projects/${encodeURIComponent(slug)}`;
  const { status, json } = await request(path);
  if (status === 404) return null;
  if (status !== 200) throw unexpected(path, status, json);
  return parsed(() => parseProject(json, reportSkip));
}

/**
 * The project slugs published at build time, from scripts/build.mjs, or null
 * in dev. Functions don't share a cache, so checking an unknown slug against
 * the API would wake it on every miss. A project published later needs a
 * rebuild
 */
export function publishedAtBuild(): string[] | null {
  const value = process.env.PUBLISHED_PROJECT_SLUGS;
  return value ? (JSON.parse(value) as string[]) : null;
}

/** A project that has a page in this build, or null */
export async function getBuiltProject(
  slug: string,
): Promise<ProjectDetail | null> {
  const published = publishedAtBuild();
  const known = published
    ? published.includes(slug)
    : (await getProjects()).some((project) => project.slug === slug);
  return known ? getProject(slug) : null;
}

/** The projects that have a page in this build */
export async function getBuiltProjects(): Promise<ProjectSummary[]> {
  const published = publishedAtBuild();
  const projects = await getProjects();
  return published
    ? projects.filter((project) => published.includes(project.slug))
    : projects;
}

/** Featured projects first, otherwise in stored order */
export function orderProjects<T extends { featured: boolean }>(
  projects: T[],
): T[] {
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
}
