import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getBuiltProjects } from "@/lib/content";
import { env } from "@/lib/env";

// the homepage and every project page in this build. Refreshed with the
// content, and never lists the admin
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
  ];
}
