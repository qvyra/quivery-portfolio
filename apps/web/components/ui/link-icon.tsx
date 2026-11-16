import type { ResolvedLink } from "@repo/shared";
import { linkTypeIcon } from "@/lib/icons/defaults";
import { SiteIcon } from "./site-icon";

/**
 * A project or block link's icon: the one it picked, or its type's own. An
 * upload whose file is gone shows the type's icon too
 */
export function LinkIcon({ link }: { link: ResolvedLink }) {
  const { icon } = link;
  return (
    <SiteIcon
      iconKey={icon?.kind === "icon" ? icon.key : null}
      media={icon?.kind === "media" ? icon.media : null}
      fallback={
        icon?.kind === "icon" ? null : linkTypeIcon(link.type, link.url)
      }
      sizes="20px"
    />
  );
}
