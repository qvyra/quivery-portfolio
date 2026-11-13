import type { SiteSection } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { BlockList } from "@/components/blocks/block-list";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export const titleId = (section: { slug: string }) => `${section.slug}-title`;

/**
 * Standard section frame: anchor id for the nav, heading, the section's intro
 * blocks, then its content
 */
export function SectionShell({
  section,
  children,
  description,
}: {
  section: SiteSection;
  children?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <section
      id={section.slug}
      aria-labelledby={titleId(section)}
      // top padding only, so stacked sections don't double the gap
      className="pt-section"
    >
      <Container className="space-y-12">
        <Reveal>
          <SectionHeading
            id={titleId(section)}
            eyebrow={section.eyebrow}
            title={section.title}
            highlight={section.titleHighlight}
            description={description}
          />
        </Reveal>
        <BlockList blocks={section.blocks} context={{ headingLevel: 3 }} />
        {section.link && (
          <ButtonLink href={section.link.href} size="md">
            {section.link.label}
            <ArrowRight data-icon="end" />
          </ButtonLink>
        )}
        {children}
      </Container>
    </section>
  );
}
