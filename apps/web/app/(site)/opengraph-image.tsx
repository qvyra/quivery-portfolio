import { getSite, orderProjects, tags } from "@/lib/content";
import { ogCard, ogContentType, ogSize } from "@/lib/og/card";
import { hasSeparateName } from "@/lib/seo";

// static exports keep the image prerendered with the page. generateImageMetadata
// would make it render on request, and a cold function would wake the API
export const alt = "The Quivery card: name, role, tagline and projects";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image() {
  const site = await getSite();
  const projects = orderProjects(
    site.sections.flatMap((section) =>
      section.type === "projects" ? section.projects : [],
    ),
  );
  const { profile } = site;
  return ogCard(
    {
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
    [tags.site, tags.projects],
  );
}
