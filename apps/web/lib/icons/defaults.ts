import type { ContactLinkType, LinkType, SectionType } from "@repo/shared";

// The icons content shows when it hasn't picked one: what each type showed
// before icons could be picked, as library keys, so old content looks the same

const linkTypeIcons: Record<LinkType, string> = {
  internal: "arrow-right",
  repository: "repository",
  package: "package",
  devforum: "messages",
  "creator-store": "store",
  "roblox-game": "gamepad",
  documentation: "book-open",
  website: "globe",
  video: "play",
  other: "external-link",
};

/** A project or block link's own icon. GitHub repos get the GitHub mark */
export function linkTypeIcon(type: LinkType, url: string): string {
  if (type === "repository" && URL.canParse(url)) {
    if (new URL(url).hostname === "github.com") return "github";
  }
  return linkTypeIcons[type];
}

/** A contact link's own icon, for the contact list */
export const contactTypeIcons: Record<ContactLinkType, string> = {
  discord: "discord",
  github: "github",
  kofi: "kofi",
  email: "mail",
  "roblox-talent-hub": "arrow-up-right",
  website: "arrow-up-right",
  other: "arrow-up-right",
};

/** A section's nav icon when it picks none */
export const sectionTypeIcons: Partial<Record<SectionType, string>> = {
  projects: "repository",
  skills: "wrench",
  services: "briefcase",
  testimonials: "star",
  custom: "layers",
};
