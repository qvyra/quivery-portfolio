import type { SiteSection } from "@repo/shared";
import { Container } from "@/components/ui/container";
import { Stat, StatList } from "@/components/ui/stat";
import { titleId } from "./section-shell";

/** Row of numbers under the hero. Its title is for screen readers only */
export function StatsSection({
  section,
}: {
  section: Extract<SiteSection, { type: "stats" }>;
}) {
  return (
    <section id={section.slug} aria-labelledby={titleId(section)}>
      <Container>
        <h2 id={titleId(section)} className="sr-only">
          {section.title}
        </h2>
        <StatList>
          {section.stats.map((stat) => (
            <Stat key={stat.id} value={stat.value} label={stat.label} />
          ))}
        </StatList>
      </Container>
    </section>
  );
}
