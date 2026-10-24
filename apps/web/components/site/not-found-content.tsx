import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { getBuiltProjects, getSite, orderProjects } from "@/lib/content";

/**
 * 404 page body, used inside the site layout and on its own. Most dead links
 * point at a project, so every project page is one click away
 */
export async function NotFoundContent() {
  const [site, projects] = await Promise.all([getSite(), getBuiltProjects()]);
  const works = site.sections.find((section) => section.type === "projects");

  return (
    <main id="main" className="flex flex-1 items-center">
      <Container className="py-section">
        <div className="max-w-[40rem] space-y-6">
          <Eyebrow className="animate-enter">Error 404</Eyebrow>
          <h1 className="animate-enter text-display font-semibold [--i:1]">
            This page <span className="text-gradient">doesn&apos;t exist.</span>
          </h1>
          <p className="animate-enter text-lead text-white/75 [--i:2]">
            The link may be old, or the project may not be published yet.
          </p>
          <div className="flex animate-enter flex-wrap gap-3 pt-3 [--i:3]">
            <ButtonLink href="/" size="lg">
              <ArrowLeft aria-hidden="true" />
              Back to the homepage
            </ButtonLink>
            {works && (
              <ButtonLink
                href={`/#${works.slug}`}
                size="lg"
                variant="secondary"
              >
                See all projects
              </ButtonLink>
            )}
          </div>
          {projects.length > 0 && (
            <nav
              aria-labelledby="not-found-projects"
              className="animate-enter pt-6 [--i:4]"
            >
              <h2
                id="not-found-projects"
                className="text-sm font-medium text-white/60"
              >
                Looking for a project?
              </h2>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {orderProjects(projects).map((project) => (
                  <li key={project.slug}>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="group inline-flex min-h-11 items-center gap-1.5 font-semibold text-focus"
                    >
                      {project.title}
                      <ArrowRight
                        className="size-4 transition-transform duration-(--motion-base) group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </Container>
    </main>
  );
}
