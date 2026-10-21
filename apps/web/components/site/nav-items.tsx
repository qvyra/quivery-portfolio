import type { SiteSection } from "@repo/shared";
import { Briefcase, FolderGit2, Layers, Star, Wrench } from "lucide-react";
import type { NavItem } from "./site-nav";

// hero and stats are the top of the page, and contact has its own button
const outsideNav = new Set<SiteSection["type"]>(["hero", "stats", "contact"]);

const icons: Partial<Record<SiteSection["type"], typeof Layers>> = {
  projects: FolderGit2,
  skills: Wrench,
  services: Briefcase,
  testimonials: Star,
  custom: Layers,
};

/**
 * Nav links for rendered sections (the API leaves out empty and unpublished
 * ones). Links point at the homepage so they work from project pages too
 */
export function navItems(sections: SiteSection[]): NavItem[] {
  return sections
    .filter((section) => !outsideNav.has(section.type))
    .map((section) => {
      const Icon = icons[section.type] ?? Layers;
      return {
        label: section.navLabel ?? section.title,
        href: `/#${section.slug}`,
        icon: <Icon />,
      };
    });
}

/** The contact button, if the contact section renders */
export function contactItem(sections: SiteSection[]): NavItem | null {
  const contact = sections.find((section) => section.type === "contact");
  return contact ? { label: "Get in touch", href: `/#${contact.slug}` } : null;
}
