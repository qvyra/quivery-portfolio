import type { ReactNode } from "react";
import { getSite } from "@/lib/content";
import { Backdrop } from "./backdrop";
import { contactItem, navItems } from "./nav-items";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Backdrop, header and footer around a public page's <main> */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const site = await getSite();

  return (
    <>
      <Backdrop />
      <SiteHeader
        items={navItems(site.sections)}
        contact={contactItem(site.sections)}
        contactLinks={site.contactLinks}
      />
      {children}
      <SiteFooter profile={site.profile} contactLinks={site.contactLinks} />
    </>
  );
}
