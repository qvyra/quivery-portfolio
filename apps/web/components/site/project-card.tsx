import type { ProjectSummary } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MediaImage } from "@/components/blocks/media-image";
import { LinkIcon } from "@/components/ui/link-icon";
import { ProjectBadges } from "./project-badges";

/**
 * Project card. The title link stretches over the whole card, and external
 * links sit above it so they stay clickable on their own
 */
export function ProjectCard({
  project,
  headingLevel = 3,
  flagship = false,
}: {
  project: ProjectSummary;
  headingLevel?: 2 | 3;
  /** Flagship cards are larger, with room for the primary links */
  flagship?: boolean;
}) {
  const Heading = `h${headingLevel}` as const;
  const links = flagship ? project.links.slice(0, 3) : [];

  return (
    <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/10 transition-transform duration-(--motion-base) ease-out-quart ring-inset motion-safe:hover:-translate-y-1">
      {/* hover wash and brighter edge, animating opacity only */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[linear-gradient(135deg,rgb(121_1_140/0.18),transparent_55%)] opacity-0 ring-1 ring-orchid/40 transition-opacity duration-(--motion-base) ring-inset group-focus-within:opacity-100 group-hover:opacity-100"
      />
      {project.cover && (
        <MediaImage
          media={project.cover}
          sizes={
            flagship
              ? "(min-width: 1024px) 40rem, 100vw"
              : "(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 100vw"
          }
          className="border-b border-white/10"
        />
      )}
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
        <ProjectBadges project={project} />
        <div className="space-y-3">
          <Heading
            className={`font-semibold ${flagship ? "text-h2" : "text-h3"}`}
          >
            <Link
              href={`/projects/${project.slug}`}
              className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-focus"
            >
              {project.title}
            </Link>
          </Heading>
          <p className="text-white/75">{project.summary}</p>
        </div>
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
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-focus"
          >
            Read more
            <ArrowRight className="size-4 transition-transform duration-(--motion-base) ease-out-quart group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
          {links.length > 0 && (
            // above the stretched title link so these stay clickable
            <div className="relative z-10 ml-auto flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <LinkIcon type={link.type} url={link.url} />
                  {link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
