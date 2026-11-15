// The preview images themselves, served by the routes under app/og. Kept
// apart from previews.ts so pages, which only name their image, don't bundle
// the renderers
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { benchmarksTag, benchmarkSlugs } from "@/lib/benchmarks";
import {
  getBuiltPages,
  getBuiltProjects,
  loadPage,
  loadProject,
  loadSite,
  pagesPublishedAtBuild,
  publishedAtBuild,
  tags,
} from "@/lib/content";
import { env } from "@/lib/env";
import { renderCard } from "./card";
import { renderCover } from "./cover";
import {
  benchmarksPreview,
  pagePreview,
  projectPreview,
  sitePreview,
  typeOf,
  type Source,
} from "./previews";

export type PreviewImage = {
  bytes: Uint8Array<ArrayBuffer>;
  type: "image/png" | "image/jpeg";
};

async function render(source: Source): Promise<PreviewImage> {
  return {
    bytes:
      source.kind === "cover"
        ? await renderCover(source.url)
        : await renderCard(source.card),
    type: typeOf(source),
  };
}

// Each image below is cached whole: the data, then the picture. They load
// the API uncached (see loadSite in lib/content.ts) and only the og tag
// refreshes them

export async function siteImage(): Promise<PreviewImage> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.og);
  return render(sitePreview(await loadSite()).source);
}

// unknown slugs answer 404 without asking the API, like the pages do
const inBuild = (published: string[] | null, slug: string) =>
  published === null || published.includes(slug);

export async function projectImage(slug: string): Promise<PreviewImage | null> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.og);
  if (!inBuild(publishedAtBuild(), slug)) return null;
  const [project, site] = await Promise.all([loadProject(slug), loadSite()]);
  return project ? render(projectPreview(project, site).source) : null;
}

export async function pageImage(slug: string): Promise<PreviewImage | null> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.og);
  if (!inBuild(pagesPublishedAtBuild(), slug)) return null;
  const [page, site] = await Promise.all([loadPage(slug), loadSite()]);
  return page ? render(pagePreview(page, site).source) : null;
}

export async function benchmarksImage(
  slug: string,
): Promise<PreviewImage | null> {
  "use cache";
  cacheTag(tags.og, benchmarksTag);
  // the run data refreshes daily (see getBenchData), and the card shows it
  cacheLife({ stale: 300, revalidate: 86_400, expire: 31_536_000 });
  if (!inBuild(publishedAtBuild(), slug)) return null;
  const [project, site] = await Promise.all([loadProject(slug), loadSite()]);
  if (!project || project.benchmarks.length === 0) return null;
  return render((await benchmarksPreview(project, site)).source);
}

/** An image route's reply */
export function imageResponse(image: PreviewImage | null): Response {
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.bytes, {
    headers: { "Content-Type": image.type },
  });
}

/** Every page in this build that has a preview, with its image's path */
export async function previewTargets(): Promise<
  { page: string; image: string }[]
> {
  const [projects, pages, benchmarked] = await Promise.all([
    getBuiltProjects(),
    getBuiltPages(),
    benchmarkSlugs(),
  ]);
  return [
    { page: "/", image: "/og/site" },
    ...projects.map(({ slug }) => ({
      page: `/projects/${slug}`,
      image: `/og/projects/${slug}`,
    })),
    ...pages.map(({ slug }) => ({
      page: `/${slug}`,
      image: `/og/pages/${slug}`,
    })),
    ...benchmarked.map((slug) => ({
      page: `/projects/${slug}/benchmarks`,
      image: `/og/benchmarks/${slug}`,
    })),
  ];
}

async function warm(url: string): Promise<void> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    await response.arrayBuffer();
    if (!response.ok)
      console.error(`[og] Warming ${url} answered ${response.status}`);
  } catch (error) {
    console.error(`[og] Couldn't warm ${url}`, error);
  }
}

/**
 * Runs after /api/revalidate. The pages first: each visit starts its
 * background rebuild, so the page soon names the new image URL instead of
 * the one LinkedIn already has. Then the images, which were expired outright
 * and render again on this request, so the first bot to ask gets a finished
 * one. The API is awake, it has just sent the refresh. One at a time keeps it
 * light
 */
export async function warmPreviews(): Promise<void> {
  const { siteUrl } = env();
  const targets = await previewTargets();
  for (const { page } of targets) await warm(`${siteUrl}${page}`);
  for (const { image } of targets) await warm(`${siteUrl}${image}`);
}
