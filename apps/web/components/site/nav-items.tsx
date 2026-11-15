import type { NavIcon, SiteSection } from "@repo/shared";
import {
  BookOpen,
  Briefcase,
  DraftingCompass,
  FolderGit2,
  Layers,
  Network,
  Star,
  User,
  Workflow,
  Wrench,
} from "lucide-react";
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

// what a section can pick instead, so two custom sections can differ
export const navIcons: Record<NavIcon, typeof Layers> = {
  layers: Layers,
  network: Network,
  workflow: Workflow,
  "drafting-compass": DraftingCompass,
  user: User,
  "book-open": BookOpen,
};

/**
 * Nav links for rendered sections (the API leaves out empty and unpublished
 * ones). Links point at the homepage so they work from project pages too. A
 * section that links to a page is a teaser for it, so its link goes there
 */
export function navItems(sections: SiteSection[]): NavItem[] {
  return sections
    .filter((section) => !outsideNav.has(section.type))
    .map((section) => {
      const Icon =
        (section.navIcon && navIcons[section.navIcon]) ??
        icons[section.type] ??
        Layers;
      return {
        label: section.navLabel ?? section.title,
        href: section.link?.href ?? `/#${section.slug}`,
        icon: <Icon />,
      };
    });
}

/** The contact button, if the contact section renders */
export function contactItem(sections: SiteSection[]): NavItem | null {
  const contact = sections.find((section) => section.type === "contact");
  return contact ? { label: "Get in touch", href: `/#${contact.slug}` } : null;
}
