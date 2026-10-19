import type { ContactLink, ContactLinkType } from "@repo/shared";

// channels people can actually reach Ether on, most direct first
const reachPriority: ContactLinkType[] = [
  "discord",
  "email",
  "roblox-talent-hub",
  "github",
  "website",
  "other",
];

const ctaLabel: Partial<Record<ContactLinkType, string>> = {
  discord: "Message me on Discord",
  email: "Email me",
  "roblox-talent-hub": "Hire me on Talent Hub",
  github: "Find me on GitHub",
};

/**
 * Main way to get in touch: the featured link, else the most direct channel
 * that's set. Ko-fi is for support, so it's never the call to action
 */
export function primaryContact(
  links: ContactLink[],
): { link: ContactLink; label: string } | null {
  const reachable = links.filter((link) => link.type !== "kofi");
  const link =
    reachable.find((l) => l.featured) ??
    reachPriority
      .map((type) => reachable.find((l) => l.type === type))
      .find(Boolean);
  if (!link) return null;
  return { link, label: ctaLabel[link.type] ?? `Contact me: ${link.label}` };
}

/** Whether a link leaves the site, so it opens in a new tab */
export const isExternal = (url: string) => /^https?:\/\//.test(url);

// shown as round icon links in the header menu and footer
const socialTypes = new Set<ContactLinkType>([
  "discord",
  "github",
  "kofi",
  "email",
]);

/** Contact links that have an icon in the social row, in stored order */
export function socialLinks(links: ContactLink[]): ContactLink[] {
  return links.filter((link) => socialTypes.has(link.type));
}
