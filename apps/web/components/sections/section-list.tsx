import type { Site, SiteSection } from "@repo/shared";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/site/contact-form";
import { contactFormProps } from "@/lib/contact-form";
import { ContactSection } from "./contact-section";
import { HeroSection } from "./hero-section";
import { ProjectsSection } from "./projects-section";
import { SectionShell } from "./section-shell";
import { ServicesSection } from "./services-section";
import { SkillsSection } from "./skills-section";
import { StatsSection } from "./stats-section";
import { TestimonialsSection } from "./testimonials-section";

type SectionOf<T extends SiteSection["type"]> = Extract<
  SiteSection,
  { type: T }
>;
type Renderer<T extends SiteSection["type"]> = (
  section: SectionOf<T>,
  site: Site,
) => ReactNode;

// the mapped type makes a missing renderer a compile error when the shared
// schema gains a section type
const registry: { [T in SiteSection["type"]]: Renderer<T> } = {
  hero: (section, site) => <HeroSection section={section} site={site} />,
  stats: (section) => <StatsSection section={section} />,
  services: (section) => <ServicesSection section={section} />,
  projects: (section) => <ProjectsSection section={section} />,
  skills: (section) => <SkillsSection section={section} />,
  testimonials: (section) => <TestimonialsSection section={section} />,
  contact: (section, site) => (
    <ContactSection
      section={section}
      site={site}
      form={<ContactForm {...contactFormProps(site.contactLinks)} />}
    />
  ),
  // a custom section is just its heading and blocks
  custom: (section) => <SectionShell section={section} />,
};

/** Homepage sections in their stored order */
export function SectionList({ site }: { site: Site }) {
  return site.sections.map((section) => {
    const render = registry[section.type] as
      Renderer<typeof section.type> | undefined;
    if (!render) {
      // the parser drops unknown types already, this catches a renderer gap
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[sections] No renderer for section type "${section.type}", skipped`,
        );
      }
      return null;
    }
    return <div key={section.id}>{render(section as never, site)}</div>;
  });
}
