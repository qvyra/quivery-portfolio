import type { ContactLink } from "@repo/shared";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { wordmark } from "@/lib/brand";
import { ScrollWatcher } from "./scroll-watcher";
import { SiteNav, type NavItem } from "./site-nav";

/**
 * Sticky header with the logo, main nav and contact button. Pages need a
 * <main id="main"> for the skip link
 */
export function SiteHeader({
  items,
  contact,
  contactLinks,
}: {
  items: NavItem[];
  contact: NavItem | null;
  /** Shown as icon links in the phone menu, if they have an icon */
  contactLinks?: ContactLink[];
}) {
  return (
    <>
      <ScrollWatcher />
      {/* very short viewports (400% zoom) get a header that scrolls away */}
      <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] [@media(height<20rem)]:relative">
        <div
          aria-hidden="true"
          // background and hairline fade in on scroll. Only opacity and
          // transform animate and the height is fixed, so nothing shifts
          className="absolute inset-0 -z-10 border-b border-white/10 bg-ink/70 opacity-0 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-(--motion-slow) ease-out-quart scrolled:opacity-100"
        />
        <a
          href="#main"
          className="sr-only rounded-sm bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60]"
        >
          Skip to content
        </a>
        <Container className="flex h-(--header-h) items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Quivery, home"
            className="-m-1 shrink-0 rounded-sm p-1"
          >
            <Image
              src={wordmark.src}
              alt=""
              width={wordmark.width}
              height={wordmark.height}
              loading="eager"
              // wordmark only, the "Independent development" line is
              // unreadable at header size
              className="h-[1.625rem] w-auto origin-left transition-transform duration-(--motion-slow) ease-out-quart scrolled:scale-[0.92] md:h-7 lg:h-8 motion-reduce:transition-none"
            />
          </Link>
          <SiteNav
            items={items}
            contact={contact}
            contactLinks={contactLinks}
          />
        </Container>
      </header>
    </>
  );
}
