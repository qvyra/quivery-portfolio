import { benchView } from "@repo/shared";
import { notFound } from "next/navigation";
import {
  benchmarkBlocks,
  benchmarksTag,
  benchmarkSlugs,
  getBenchData,
} from "@/lib/benchmarks";
import { getBuiltProject, getSite, tags } from "@/lib/content";
import { ogCard, ogContentType, ogSize, type OgBadge } from "@/lib/og/card";

// static exports keep the image prerendered, see ../../../opengraph-image.tsx
export const alt =
  "The benchmarks page's card: project, suites, runs and build";
export const size = ogSize;
export const contentType = ogContentType;

export async function generateStaticParams() {
  return (await benchmarkSlugs()).map((slug) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, site] = await Promise.all([getBuiltProject(slug), getSite()]);
  if (!project || project.benchmarks.length === 0) notFound();

  // what the page covers, all named by the data, never a result
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
    const builds = [...new Set(data.latest.runs.map((run) => run.build))];
    badges.push({ label: `${data.latest.runs.length} runs` });
    for (const build of builds) badges.push({ label: `Build ${build}` });
    if (view.suites.some((suite) => suite.environment === "roblox-live")) {
      badges.push({ label: "Live Roblox servers" });
    }
  }

  return ogCard(
    {
      eyebrow: `${site.profile.brandName} · Benchmarks`,
      title: `${project.title} benchmarks`,
      text,
      badges,
    },
    [tags.site, tags.projects, tags.project(project.slug), benchmarksTag],
  );
}
