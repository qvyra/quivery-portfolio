import { notFound } from "next/navigation";
import {
  getBuiltProject,
  getBuiltProjects,
  getSite,
  tags,
} from "@/lib/content";
import { ogCard, ogContentType, ogSize, type OgBadge } from "@/lib/og/card";

// static exports keep the image prerendered, see ../../opengraph-image.tsx
export const alt = "The project's card: title, status and summary";
export const size = ogSize;
export const contentType = ogContentType;

// a card for every project page in the build
export async function generateStaticParams() {
  return (await getBuiltProjects()).map((project) => ({ slug: project.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, site] = await Promise.all([getBuiltProject(slug), getSite()]);
  if (!project) notFound();

  const released = project.releaseStatus === "RELEASED";
  const badges: OgBadge[] = [
    released
      ? { label: "Released", dot: "released" }
      : { label: "In development", dot: "progress" },
  ];
  if (project.version) badges.push({ label: `v${project.version}` });
  if (project.openSource) badges.push({ label: "Open source" });

  return ogCard(
    {
      eyebrow: `${site.profile.brandName} · Project`,
      title: project.title,
      text: project.summary,
      badges,
    },
    [tags.site, tags.projects, tags.project(project.slug)],
  );
}
