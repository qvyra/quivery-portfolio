import type { SiteSection } from "@repo/shared";
import { SiteIcon } from "@/components/ui/site-icon";
import { sectionTypeIcons } from "@/lib/icons/defaults";
import type { NavItem } from "./site-nav";

// hero and stats are the top of the page, and contact has its own button
const outsideNav = new Set<SiteSection["type"]>(["hero", "stats", "contact"]);

/**
 * Nav links for rendered sections (the API leaves out empty and unpublished
 * ones). Links point at the homepage so they work from project pages too. A
 * section that links to a page is a teaser for it, so its link goes there
 */
export function navItems(sections: SiteSection[]): NavItem[] {
  return sections
    .filter((section) => !outsideNav.has(section.type))
    .map((section) => {
      return {
        label: section.navLabel ?? section.title,
        href: section.link?.href ?? `/#${section.slug}`,
        // the section's pick, or its type's own. Rendered here on the server,
        // so the icon library never reaches the browser
        icon: (
          <SiteIcon
            iconKey={section.navIcon}
            media={section.navIconImage}
            fallback={sectionTypeIcons[section.type] ?? "layers"}
            sizes="20px"
          />
        ),
      };
    });
}

/** The contact button, if the contact section renders */
export function contactItem(sections: SiteSection[]): NavItem | null {
  const contact = sections.find((section) => section.type === "contact");
  return contact ? { label: "Get in touch", href: `/#${contact.slug}` } : null;
}
