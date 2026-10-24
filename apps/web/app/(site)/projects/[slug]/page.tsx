import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProjectArticle } from "@/components/site/project-article";
import {
  getBuiltProject,
  getProjects,
  getSite,
  orderProjects,
  publishedAtBuild,
} from "@/lib/content";
import { pageOpenGraph } from "@/lib/seo";
import { projectStructuredData } from "@/lib/structured-data";

// every published project prerenders through generateStaticParams. Any other
// slug waits for the full page instead of streaming a shell, so it gets a real
// 404 status. The layout's ensureStatic still requires static output
export const instant = false;

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

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getBuiltProject(slug);
  if (!project) return { title: "Project not found" };

  const url = `/projects/${project.slug}`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: url },
    // the image comes from opengraph-image.tsx next to this page
    openGraph: pageOpenGraph({
      type: "article",
      title: project.title,
      description: project.summary,
      url,
    }),
  };
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await getBuiltProject(slug);
  if (!project) notFound();

  const [projects, site] = await Promise.all([getProjects(), getSite()]);
  const ordered = orderProjects(projects);
  const index = ordered.findIndex((item) => item.slug === project.slug);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const structuredData = projectStructuredData(project, site);
  const worksSection = site.sections.find(
    (section) => section.type === "projects",
  );

  return (
    <main id="main">
      {structuredData && <JsonLd data={structuredData} />}
      <ProjectArticle
        project={project}
        backHref={worksSection ? `/#${worksSection.slug}` : "/"}
        previous={previous}
        next={next}
      />
    </main>
  );
}
