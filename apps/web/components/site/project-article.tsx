import type { ProjectDetail, ProjectSummary } from "@repo/shared";
import { ArrowLeft, ArrowRight, ChartBar, FlaskConical } from "lucide-react";
import Link from "next/link";
import { BlockList } from "@/components/blocks/block-list";
import { MediaImage } from "@/components/blocks/media-image";
import { TestimonialCard } from "@/components/sections/testimonials-section";
import { ProjectBadges } from "@/components/site/project-badges";
import { Container } from "@/components/ui/container";
import { LinkIcon } from "@/components/ui/link-icon";
import { Reveal } from "@/components/ui/reveal";

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

/**
 * A project page's content. The public page and the admin's preview both
 * render it, so the preview shows exactly what will go live
 */
export function ProjectArticle({
  project,
  backHref,
  previous,
  next,
}: {
  project: ProjectDetail;
  backHref: string;
  previous?: ProjectSummary | undefined;
  next?: ProjectSummary | undefined;
}) {
  const hasBenchmarks = project.benchmarks.length > 0;
  return (
    <article>
      <Container className="pt-[clamp(1.5rem,5svh,3.5rem)] pb-section">
        <Link
          href={backHref}
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
          {(project.links.length > 0 ||
            project.benchmarkUrl ||
            hasBenchmarks) && (
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
              {hasBenchmarks && (
                <li>
                  <Link
                    href={`/projects/${project.slug}/benchmarks`}
                    className="btn btn-secondary btn-md"
                  >
                    <ChartBar aria-hidden="true" />
                    Benchmarks
                  </Link>
                </li>
              )}
              {project.benchmarkUrl && (
                <li>
                  {/* evidence for the performance and safety claims. With a
                      results page on the site, this is the method behind it */}
                  <a
                    href={project.benchmarkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-md"
                  >
                    <FlaskConical aria-hidden="true" />
                    {hasBenchmarks ? "Full method" : "Benchmarks and method"}
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
            {previous && <Neighbour project={previous} direction="previous" />}
            {next && <Neighbour project={next} direction="next" />}
          </nav>
        )}
      </Container>
    </article>
  );
}
