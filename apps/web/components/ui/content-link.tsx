import type { Link as ContentLinkData } from "@repo/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { LinkIcon } from "./link-icon";

/**
 * A CMS link as a button. A page on this site navigates in the same tab
 * with client-side routing, anything else opens in a new tab, and only
 * those get `external` (the arrow that says it leaves the site)
 */
export function ContentLink({
  link,
  className,
  external,
}: {
  link: ContentLinkData;
  className: string;
  external?: ReactNode;
}) {
  if (link.type === "internal") {
    return (
      <Link href={link.url} className={className}>
        <LinkIcon type={link.type} url={link.url} />
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.url} target="_blank" rel="noreferrer" className={className}>
      <LinkIcon type={link.type} url={link.url} />
      {link.label}
      {external}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
