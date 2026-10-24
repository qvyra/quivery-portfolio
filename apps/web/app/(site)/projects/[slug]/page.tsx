import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectArticle } from "@/components/site/project-article";
import { getProject, getProjects, getSite, orderProjects } from "@/lib/content";

// every published project prerenders through generateStaticParams. Any other
// slug waits for the full page instead of streaming a shell, so it gets a real
// 404 status. The layout's ensureStatic still requires static output
export const instant = false;

// The slugs published at build time, from scripts/build.mjs. Functions don't
// share a cache, so checking an unknown slug against the API would wake it on
// every miss. A project published later needs a rebuild. Unset in dev, where
// every slug is checked live
function publishedAtBuild(): string[] | null {
  const value = process.env.PUBLISHED_PROJECT_SLUGS;
  return value ? (JSON.parse(value) as string[]) : null;
}

export async function generateStaticParams() {
  const published = publishedAtBuild();
  if (!published && process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLISHED_PROJECT_SLUGS is missing. Build with npm run build, which runs scripts/build.mjs",
    );
  }
  const slugs =
    published ?? (await getProjects()).map((project) => project.slug);
  // a fully static layout needs at least one param set. With no published
  // projects, "none" prerenders the 404 page
  return slugs.length > 0
    ? slugs.map((slug) => ({ slug }))
    : [{ slug: "none" }];
}

async function load(slug: string) {
  const published = publishedAtBuild();
  const known = published
    ? published.includes(slug)
    : (await getProjects()).some((project) => project.slug === slug);
  return known ? getProject(slug) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await load(slug);
  if (!project) return { title: "Project not found" };

  const url = `/projects/${project.slug}`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
      url,
      ...(project.cover && {
        images: [{ url: project.cover.url, alt: project.cover.alt }],
      }),
    },
  };
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await load(slug);
  if (!project) notFound();

  const [projects, site] = await Promise.all([getProjects(), getSite()]);
  const ordered = orderProjects(projects);
  const index = ordered.findIndex((item) => item.slug === project.slug);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const worksSection = site.sections.find(
    (section) => section.type === "projects",
  );

  return (
    <main id="main">
      <ProjectArticle
        project={project}
        backHref={worksSection ? `/#${worksSection.slug}` : "/"}
        previous={previous}
        next={next}
      />
    </main>
  );
}
