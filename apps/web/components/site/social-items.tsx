import type { ContactLink } from "@repo/shared";
import { SiteIcon } from "@/components/ui/site-icon";
import { contactTypeIcons } from "@/lib/icons/defaults";
import { socialLinks } from "@/lib/contact";
import type { SocialItem } from "./social-links";

/**
 * The social row's links with their icons rendered here, on the server, so
 * the client component that copies a Discord handle doesn't ship the library
 */
export function socialItems(links: ContactLink[]): SocialItem[] {
  return socialLinks(links).map((link) => ({
    link,
    icon: (
      <SiteIcon
        iconKey={link.iconKey}
        media={link.icon}
        fallback={contactTypeIcons[link.type]}
        sizes="20px"
      />
    ),
  }));
}
