import type { SiteSection } from "@repo/shared";
import { ProjectCard } from "@/components/site/project-card";
import { Reveal } from "@/components/ui/reveal";
import { orderProjects } from "@/lib/content";
import { SectionShell } from "./section-shell";

/** Featured projects as large cards first, then the rest in a grid */
export function ProjectsSection({
  section,
}: {
  section: Extract<SiteSection, { type: "projects" }>;
}) {
  const projects = orderProjects(section.projects);
  const flagship = projects.filter((project) => project.featured);
  const others = projects.filter((project) => !project.featured);

  return (
    <SectionShell section={section}>
      {flagship.length > 0 && (
        <Reveal as="ul" stagger className="grid gap-6 lg:grid-cols-2">
          {flagship.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} flagship />
            </li>
          ))}
        </Reveal>
      )}
      {others.length > 0 && (
        <Reveal
          as="ul"
          stagger
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {others.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </Reveal>
      )}
    </SectionShell>
  );
}
