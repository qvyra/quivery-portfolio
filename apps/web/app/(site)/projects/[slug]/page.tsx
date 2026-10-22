import type { ProjectSummary } from "@repo/shared";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockList } from "@/components/blocks/block-list";
import { MediaImage } from "@/components/blocks/media-image";
import { TestimonialCard } from "@/components/sections/testimonials-section";
import { ProjectBadges } from "@/components/site/project-badges";
import { Container } from "@/components/ui/container";
import { LinkIcon } from "@/components/ui/link-icon";
import { Reveal } from "@/components/ui/reveal";
import { getProject, getProjects, getSite, orderProjects } from "@/lib/content";

// every published project prerenders through generateStaticParams. A slug
// published later renders on its first visit, and that visit waits for the
// full static page instead of streaming a shell, so an unknown slug gets a
// real 404 status. The layout's ensureStatic still requires static output
export const instant = false;

export async function generateStaticParams() {
  const projects = await getProjects();
  // a fully static layout needs at least one param set. With no published
  // projects, "none" prerenders the 404 page
  return projects.length > 0
    ? projects.map((project) => ({ slug: project.slug }))
    : [{ slug: "none" }];
}

// checking the cached list first means a made-up slug never reaches the API
// or adds a cache entry
async function load(slug: string) {
  const projects = await getProjects();
  if (!projects.some((project) => project.slug === slug)) return null;
  return getProject(slug);
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

function Neighbour({
  project,
  direction,
}: {
  project: ProjectSummary;
  direction: "previous" | "next";
}) {
  const next = direction === "next";
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`group flex min-h-24 flex-col justify-center gap-1 rounded-xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/10 transition-transform duration-(--motion-base) ease-out-quart ring-inset hover:ring-white/25 motion-safe:active:scale-[0.99] ${next ? "items-end text-right sm:col-start-2" : ""}`}
    >
      <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
        {!next && (
          <ArrowLeft
            aria-hidden="true"
            className="size-4 transition-transform duration-(--motion-base) group-hover:-translate-x-0.5"
          />
        )}
        {next ? "Next project" : "Previous project"}
        {next && (
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-(--motion-base) group-hover:translate-x-0.5"
          />
        )}
      </span>
      <span className="text-h3 font-semibold">{project.title}</span>
    </Link>
  );
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
      <article>
        <Container className="pt-[clamp(1.5rem,5svh,3.5rem)] pb-section">
          <Link
            href={worksSection ? `/#${worksSection.slug}` : "/"}
            className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-sm font-medium text-white/70 hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All projects
          </Link>

          <header className="mt-6 max-w-[48rem] space-y-6">
            <div className="animate-enter">
              <ProjectBadges project={project} />
            </div>
            <h1 className="animate-enter text-display font-semibold [--i:1]">
              {project.title}
            </h1>
            <p className="animate-enter text-lead text-white/75 [--i:2]">
              {project.summary}
            </p>
            {(project.links.length > 0 || project.benchmarkUrl) && (
              <ul className="flex animate-enter flex-wrap gap-3 [--i:3]">
                {project.links.map((link, linkIndex) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`btn btn-md ${linkIndex === 0 ? "btn-primary" : "btn-secondary"}`}
                    >
                      <LinkIcon type={link.type} url={link.url} />
                      {link.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
                {project.benchmarkUrl && (
                  <li>
                    {/* evidence for the performance and safety claims */}
                    <a
                      href={project.benchmarkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-md"
                    >
                      <FlaskConical aria-hidden="true" />
                      Benchmarks and method
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
              </ul>
            )}
            {project.tags.length > 0 && (
              <ul
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/55"
                aria-label="Tags"
              >
                {project.tags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            )}
          </header>

          {project.cover && (
            <div className="mt-12 overflow-hidden rounded-xl ring-1 ring-white/10">
              {/* the page's main image, so it loads first */}
              <MediaImage
                media={project.cover}
                sizes="(min-width: 1280px) 76rem, 100vw"
                priority
              />
            </div>
          )}

          <BlockList
            blocks={project.body}
            context={{ headingLevel: 2 }}
            className="mt-14 max-w-[60rem]"
          />

          {project.testimonials.length > 0 && (
            <section
              aria-labelledby="project-testimonials"
              className="mt-section space-y-8"
            >
              <h2 id="project-testimonials" className="text-h2 font-semibold">
                What people say
              </h2>
              <Reveal as="ul" stagger className="grid gap-6 md:grid-cols-2">
                {project.testimonials.map((testimonial) => (
                  <li key={testimonial.id}>
                    <TestimonialCard testimonial={testimonial} />
                  </li>
                ))}
              </Reveal>
            </section>
          )}

          {(previous || next) && (
            <nav
              aria-label="More projects"
              className="mt-section grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-2"
            >
              {previous && (
                <Neighbour project={previous} direction="previous" />
              )}
              {next && <Neighbour project={next} direction="next" />}
            </nav>
          )}
        </Container>
      </article>
    </main>
  );
}
