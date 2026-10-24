import type { MetadataRoute } from "next";
import { getBuiltProjects } from "@/lib/content";
import { env } from "@/lib/env";

// the homepage and every project page in this build. Refreshed with the
// content, and never lists the admin
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
