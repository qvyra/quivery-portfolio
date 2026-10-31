import type { ProjectDetail, ProjectSummary } from "@repo/shared";
import { ArrowLeft, ArrowRight, ChartBar, FlaskConical } from "lucide-react";
import Link from "next/link";
import { BlockList } from "@/components/blocks/block-list";
import { MediaImage } from "@/components/blocks/media-image";
import { TestimonialCard } from "@/components/sections/testimonials-section";
import { ProjectBadges } from "@/components/site/project-badges";
import { Container } from "@/components/ui/container";
import { GithubIcon } from "@/components/ui/icons";
import { LinkIcon } from "@/components/ui/link-icon";
import { Reveal } from "@/components/ui/reveal";

const navCard =
  "group relative isolate flex min-h-24 flex-col justify-center gap-1 overflow-hidden rounded-xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/10 transition-transform duration-(--motion-base) ease-out-quart ring-inset hover:ring-white/25 motion-safe:active:scale-[0.99]";

const arrowClass = "size-4 transition-transform duration-(--motion-base)";

function NavCard({
  href,
  label,
  title,
  direction,
}: {
  href: string;
  label: string;
  title: string;
  direction: "back" | "forward";
}) {
  const forward = direction === "forward";
  return (
    <Link
      href={href}
      data-spotlight=""
      className={`${navCard} ${forward ? "items-end text-right sm:col-start-2" : ""}`}
    >
      <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
        {!forward && (
          <ArrowLeft
            aria-hidden="true"
            className={`${arrowClass} group-hover:-translate-x-0.5`}
          />
        )}
        {label}
        {forward && (
          <ArrowRight
            aria-hidden="true"
            className={`${arrowClass} group-hover:translate-x-0.5`}
          />
        )}
      </span>
      <span className="text-h3 font-semibold">{title}</span>
    </Link>
  );
}

/** After the last project: where to look while there's nothing newer */
function EndCard({
  githubUrl,
  allProjectsHref,
}: {
  githubUrl: string;
  allProjectsHref: string;
}) {
  const link =
    "inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-focus underline decoration-focus/40 underline-offset-4 hover:decoration-focus";
  return (
    <div
      data-spotlight=""
      className="relative isolate flex min-h-24 flex-col justify-center gap-2 overflow-hidden rounded-xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/10 ring-inset sm:col-start-2"
    >
      <p className="text-h3 font-semibold">
        That&rsquo;s the latest &mdash; more projects are on the way
      </p>
      <p className="flex flex-wrap gap-x-5 text-sm">
        <a href={githubUrl} target="_blank" rel="noreferrer" className={link}>
          <GithubIcon className="size-4" />
          Follow along on GitHub
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <Link href={allProjectsHref} className={link}>
          All projects
        </Link>
      </p>
    </div>
  );
}

export type ProjectNavigation = {
  previous?: ProjectSummary | undefined;
  next?: ProjectSummary | undefined;
  allProjectsHref: string;
  githubUrl: string;
};

/**
 * Cards to the neighbouring projects in the CMS order. The first project
 * points back to the list, the last one ends on a note that more are coming
 */
function MoreProjects({
  previous,
  next,
  allProjectsHref,
  githubUrl,
}: ProjectNavigation) {
  return (
    <nav
      aria-label="More projects"
      className="mt-section grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-2"
    >
      {previous ? (
        <NavCard
          href={`/projects/${previous.slug}`}
          label="Previous project"
          title={previous.title}
          direction="back"
        />
      ) : (
        <NavCard
          href={allProjectsHref}
          label="Back to projects"
          title="All projects"
          direction="back"
        />
      )}
      {next ? (
        <NavCard
          href={`/projects/${next.slug}`}
          label="Next project"
          title={next.title}
          direction="forward"
        />
      ) : (
        <EndCard githubUrl={githubUrl} allProjectsHref={allProjectsHref} />
      )}
    </nav>
  );
}

/**
 * A project page's content. The public page and the admin's preview both
 * render it, so the preview shows exactly what will go live
 */
export function ProjectArticle({
  project,
  backHref,
  backLabel = "Back to home page",
  navigation,
}: {
  project: ProjectDetail;
  backHref: string;
  backLabel?: string;
  /** The cards to other projects, left out in the admin's preview */
  navigation?: ProjectNavigation | undefined;
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
          {backLabel}
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

        {navigation && <MoreProjects {...navigation} />}
      </Container>
    </article>
  );
}
