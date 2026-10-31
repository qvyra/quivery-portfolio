import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { benchmarkSlugs, projectRunSources } from "@/lib/benchmarks";
import { getBuiltProject, getBuiltProjects } from "@/lib/content";
import { env } from "@/lib/env";

// the homepage, every project page in this build and the benchmarks pages
// with their runs. Refreshed with the content, and never lists the admin
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // metadata routes are prerendered once and never revalidated, tag or path,
  // so this renders on request from the cached projects, which do refresh
  await connection();
  const { siteUrl } = env();
  const projects = await getBuiltProjects();
  const latest = projects
    .map((project) => project.updatedAt)
    .sort()
    .at(-1);
  const benchmarks = await Promise.all(
    (await benchmarkSlugs()).map(async (slug) => {
      const project = await getBuiltProject(slug);
      const sources = project ? await projectRunSources(project) : [];
      const path = `${siteUrl}/projects/${slug}/benchmarks`;
      return [
        {
          url: path,
          ...(sources[0] && { lastModified: sources[0].latest.updatedAt }),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
        ...sources.flatMap((source) =>
          source.index.runs.map((run) => ({
            url: `${path}/runs/${run.id}`,
            lastModified: run.date,
            changeFrequency: "yearly" as const,
            priority: 0.3,
          })),
        ),
      ];
    }),
  );
  return [
    {
      url: `${siteUrl}/`,
      ...(latest && { lastModified: latest }),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...benchmarks.flat(),
  ];
}
