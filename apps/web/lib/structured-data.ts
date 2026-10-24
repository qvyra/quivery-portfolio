// schema.org data for search engines, built from the same content as the pages
import "server-only";
import type { ProjectDetail, Site } from "@repo/shared";
import { env } from "./env";
import { hasSeparateName } from "./seo";

// tags that name a language, for SoftwareSourceCode.programmingLanguage
const languages = new Set([
  "Luau",
  "Lua",
  "TypeScript",
  "JavaScript",
  "roblox-ts",
  "Rust",
  "Python",
  "Go",
  "C#",
]);

const personId = () => `${env().siteUrl}/#person`;

function person(site: Site) {
  const { siteUrl } = env();
  const { profile } = site;
  const skills = site.sections.flatMap((section) =>
    section.type === "skills" ? section.skills : [],
  );
  return {
    "@type": "Person",
    "@id": personId(),
    name: profile.displayName,
    ...(hasSeparateName(profile) && { alternateName: profile.brandName }),
    jobTitle: profile.headline,
    description: profile.tagline,
    url: `${siteUrl}/`,
    image: profile.avatar?.url ?? `${siteUrl}/icons/icon-512.png`,
    // profiles elsewhere, never the email address
    sameAs: site.contactLinks
      .map((link) => link.url)
      .filter((url): url is string => !!url && /^https?:\/\//.test(url)),
    ...(skills.length > 0 && { knowsAbout: skills.map((skill) => skill.name) }),
  };
}

/** The homepage: who the site is about, and the site itself */
export function homeStructuredData(site: Site) {
  const { siteUrl } = env();
  return {
    "@context": "https://schema.org",
    "@graph": [
      person(site),
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: site.profile.brandName,
        url: `${siteUrl}/`,
        author: { "@id": personId() },
      },
    ],
  };
}

/**
 * SoftwareSourceCode for an open-source project with a repository link, null
 * for anything else
 */
export function projectStructuredData(project: ProjectDetail, site: Site) {
  const { siteUrl } = env();
  const repository = project.links.find((link) => link.type === "repository");
  if (!project.openSource || !repository) return null;
  const language = project.tags.filter((tag) => languages.has(tag));
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.title,
    description: project.summary,
    url: `${siteUrl}/projects/${project.slug}`,
    codeRepository: repository.url,
    ...(language.length > 0 && { programmingLanguage: language }),
    ...(project.version && { version: project.version }),
    runtimePlatform: "Roblox",
    keywords: project.tags.join(", "),
    dateModified: project.updatedAt,
    author: person(site),
  };
}
