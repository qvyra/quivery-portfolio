// Link preview images. Each page names its image in its metadata with a
// version hash in the query, made from exactly what the image shows, so the
// URL changes when the picture does: LinkedIn keeps an image by its URL and
// never fetches the same one again. The images are routes under app/og,
// prerendered with the build, so a bot fetching one never waits on rendering
// or on the API. After an edit /api/revalidate expires them outright and
// renders them again straight away, see images.ts
import "server-only";
import { createHash } from "node:crypto";
import {
  benchView,
  type PageDetail,
  type ProjectDetail,
  type Site,
} from "@repo/shared";
import type { Media } from "@repo/shared";
import type { Metadata } from "next";
import { benchmarkBlocks, getBenchData } from "@/lib/benchmarks";
import { orderProjects } from "@/lib/content";
import { hasSeparateName } from "@/lib/seo";
import type { OgBadge, OgCard } from "./card";
import { ogSize } from "./size";

// part of every version hash. Bump it when the card's design or the cover
// crop changes, so every preview gets a new URL
const RENDERER = "2";

export type Source =
  { kind: "card"; card: OgCard } | { kind: "cover"; url: string };

/** One page's preview: where its image lives, what it shows, its alt text */
export type Preview = { path: string; source: Source; alt: string };

export const typeOf = (source: Source) =>
  source.kind === "cover" ? "image/jpeg" : "image/png";

function version(source: Source): string {
  return createHash("sha256")
    .update(`${RENDERER}\n${JSON.stringify(source)}`)
    .digest("hex")
    .slice(0, 12);
}

/**
 * The Open Graph image fields for a page. Twitter's card reads the same image,
 * since Next fills twitter:image from these when a page sets none of its own
 */
export function previewImages(
  preview: Preview,
): NonNullable<Metadata["openGraph"]>["images"] {
  return [
    {
      url: `${preview.path}?v=${version(preview.source)}`,
      ...ogSize,
      type: typeOf(preview.source),
      alt: preview.alt,
    },
  ];
}

/** Whether a project's cover can be its link preview */
export function isLandscapeImage(media: Media | null): media is Media {
  return (
    media !== null &&
    media.kind === "IMAGE" &&
    media.width !== null &&
    media.height !== null &&
    media.width > media.height
  );
}

export function sitePreview(site: Site): Preview {
  const projects = orderProjects(
    site.sections.flatMap((section) =>
      section.type === "projects" ? section.projects : [],
    ),
  );
  const { profile } = site;
  return {
    path: "/og/site",
    alt: "The Quivery card: name, role, tagline and projects",
    source: {
      kind: "card",
      card: {
        eyebrow: hasSeparateName(profile)
          ? `${profile.brandName} · ${profile.displayName}`
          : profile.brandName,
        title: profile.headline,
        text: profile.tagline,
        badges: projects.slice(0, 3).map((project) => ({
          label: project.title,
          dot: project.releaseStatus === "RELEASED" ? "released" : "progress",
        })),
      },
    },
  };
}

/** The landscape cover when there is one (never the mobile cover), else a card */
export function projectPreview(project: ProjectDetail, site: Site): Preview {
  const path = `/og/projects/${project.slug}`;
  if (isLandscapeImage(project.cover)) {
    return {
      path,
      // an empty alt marks the cover decorative on the page, but a preview
      // image needs a description
      alt: project.cover.alt || `${project.title}: ${project.summary}`,
      source: { kind: "cover", url: project.cover.url },
    };
  }
  const released = project.releaseStatus === "RELEASED";
  const badges: OgBadge[] = [
    released
      ? { label: "Released", dot: "released" }
      : { label: "In development", dot: "progress" },
  ];
  if (project.version) badges.push({ label: `v${project.version}` });
  if (project.openSource) badges.push({ label: "Open source" });
  return {
    path,
    alt: "The project's card: title, status and summary",
    source: {
      kind: "card",
      card: {
        eyebrow: `${site.profile.brandName} · Project`,
        title: project.title,
        text: project.summary,
        badges,
      },
    },
  };
}

export function pagePreview(page: PageDetail, site: Site): Preview {
  return {
    path: `/og/pages/${page.slug}`,
    alt: "The page's card: title and description",
    source: {
      kind: "card",
      card: {
        eyebrow: page.eyebrow
          ? `${site.profile.brandName} · ${page.eyebrow}`
          : site.profile.brandName,
        title: page.title,
        text: page.seoDescription,
        badges: [],
      },
    },
  };
}

/** What the benchmarks page covers, all named by the data, never a result */
export async function benchmarksPreview(
  project: ProjectDetail,
  site: Site,
): Promise<Preview> {
  const block = benchmarkBlocks(project)[0];
  const data = block ? await getBenchData(block.dataUrl) : null;
  const badges: OgBadge[] = [];
  let text = `Benchmark results for ${project.title}, with every run, the raw data and the method.`;
  if (block && data?.status === "ok") {
    const view = benchView(data.latest, data.latest.results, {
      suites: block.suites,
      scenarios: block.scenarios,
    });
    text = view.suites.map((suite) => suite.name).join(" · ");
    // one row of badges fits the card: the run count and the newest run's
    // build. Each suite's environment is on the page
    const newest = data.latest.runs.toSorted((a, b) =>
      b.date.localeCompare(a.date),
    )[0];
    badges.push({ label: `${data.latest.runs.length} runs` });
    if (newest) badges.push({ label: `Latest build ${newest.build}` });
  }
  return {
    path: `/og/benchmarks/${project.slug}`,
    alt: "The benchmarks page's card: project, suites, runs and build",
    source: {
      kind: "card",
      card: {
        eyebrow: `${site.profile.brandName} · Benchmarks`,
        title: `${project.title} benchmarks`,
        text,
        badges,
      },
    },
  };
}
