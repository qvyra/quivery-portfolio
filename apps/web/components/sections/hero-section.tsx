import type { Site, SiteSection } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import { BlockList } from "@/components/blocks/block-list";
import { HeroMark } from "@/components/site/hero-mark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { Eyebrow } from "@/components/ui/section-heading";
import { titleId } from "./section-shell";

/**
 * The page's h1 (section title and highlight), the profile tagline as the
 * subline, the framed Q and up to two calls to action
 */
export function HeroSection({
  section,
  site,
}: {
  section: Extract<SiteSection, { type: "hero" }>;
  site: Site;
}) {
  const contact = site.sections.find((s) => s.type === "contact");
  const projects = site.sections.find((s) => s.type === "projects");

  return (
    <section id={section.slug} aria-labelledby={titleId(section)}>
      <Container className="grid items-center gap-12 pt-[clamp(2rem,6svh,5rem)] pb-16 lg:min-h-[calc(85svh-var(--header-total))] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="max-w-[40rem]">
          {section.eyebrow && (
            <Eyebrow className="animate-enter">{section.eyebrow}</Eyebrow>
          )}
          <h1
            id={titleId(section)}
            className="mt-5 animate-enter text-display font-semibold [--i:1]"
          >
            <HighlightedText
              text={section.title}
              highlight={section.titleHighlight}
            />
          </h1>
          <p className="mt-6 max-w-[36rem] animate-enter text-lead text-white/75 [--i:2]">
            {site.profile.tagline}
          </p>
          {(contact || projects) && (
            <div className="mt-9 flex animate-enter flex-wrap gap-3 [--i:3]">
              {contact && (
                <ButtonLink href={`#${contact.slug}`} size="lg">
                  Get in touch
                  <ArrowRight data-icon="end" aria-hidden="true" />
                </ButtonLink>
              )}
              {projects && (
                <ButtonLink
                  href={`#${projects.slug}`}
                  size="lg"
                  variant={contact ? "secondary" : "primary"}
                >
                  See projects
                </ButtonLink>
              )}
            </div>
          )}
          <BlockList
            blocks={section.blocks}
            context={{ headingLevel: 2 }}
            className="mt-10"
          />
        </div>
        <HeroMark className="mx-auto w-[min(100%,26rem,62svh)] lg:w-full lg:max-w-[34rem] lg:justify-self-end" />
      </Container>
    </section>
  );
}
