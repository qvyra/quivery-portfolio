import type { ProjectSummary } from "@repo/shared";
import { Badge } from "@/components/ui/badge";

/** Status, version, licence and, in development only, the placeholder flag */
export function ProjectBadges({ project }: { project: ProjectSummary }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Project status">
      {project.isPlaceholder && (
        // the API drops placeholders in production, this flags them locally
        <li>
          <Badge tone="warning">Placeholder (dev only)</Badge>
        </li>
      )}
      <li>
        {project.releaseStatus === "RELEASED" ? (
          <Badge dot="released">Released</Badge>
        ) : (
          <Badge dot="progress">In development</Badge>
        )}
      </li>
      {project.version && (
        <li>
          <Badge>v{project.version}</Badge>
        </li>
      )}
      {project.openSource && (
        <li>
          <Badge tone="accent">Open source</Badge>
        </li>
      )}
    </ul>
  );
}
