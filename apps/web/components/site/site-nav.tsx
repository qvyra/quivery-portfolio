"use client";

import type { ContactLink } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ButtonLink } from "@/components/ui/button";
import { socialLinks } from "@/lib/contact";
import { SocialLinks } from "./social-links";

/** `href` points at a section (`/#id`). The icon shows in the phone menu */
export type NavItem = { label: string; href: string; icon?: ReactNode };

const anchorId = (href: string) =>
  href.includes("#") ? href.slice(href.indexOf("#") + 1) : null;

const DESKTOP = "(min-width: 768px)";
const FOCUSABLE = "a[href], button:not([disabled])";

// id of the section in view: the first one crossing a band just above the
// middle of the viewport. Stays on the last one while the band is between
// sections, and clears above the first
function useActiveSection(hrefs: string[]) {
  // tied to the page it was measured on, so it can't carry over after client
  // navigation (the sections only exist on the homepage)
  const pathname = usePathname();
  const [state, setState] = useState<{ pathname: string; id: string | null }>({
    pathname,
    id: null,
  });
  const key = hrefs.join(" ");

  useEffect(() => {
    const sections = key
      .split(" ")
      .map(anchorId)
      .map((id) => (id ? document.getElementById(id) : null))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const inBand = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target);
          else inBand.delete(entry.target);
        }
        const current = sections.find((el) => inBand.has(el));
        if (current) setState({ pathname, id: current.id });
        else if (sections[0]!.getBoundingClientRect().top > innerHeight * 0.4)
          setState({ pathname, id: null });
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    for (const section of sections) io.observe(section);
    return () => io.disconnect();
  }, [key, pathname]);

  return state.pathname === pathname ? state.id : null;
}

/**
 * Main nav. One list of links, inline from 768px and a slide-in drawer below,
 * so assistive tech never hears the links twice
 */
export function SiteNav({
  items,
  contact,
  contactLinks = [],
}: {
  items: NavItem[];
  /** Contact button, null when there's no contact section */
  contact: NavItem | null;
  contactLinks?: ContactLink[];
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();
  const active = useActiveSection(items.map((item) => item.href));
  const socials = socialLinks(contactLinks);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    const toggle = toggleRef.current;
    // the drawer is still sliding in off-canvas, so focusing it mustn't
    // scroll the page
    drawer
      ?.querySelector<HTMLElement>(FOCUSABLE)
      ?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle?.focus({ preventScroll: true });
        return;
      }
      // trap Tab in the open menu. The toggle comes after the drawer in the
      // DOM, so it joins the cycle at the end
      if (event.key === "Tab" && drawer && toggle) {
        const focusable = [
          ...drawer.querySelectorAll<HTMLElement>(FOCUSABLE),
          toggle,
        ].filter((el) => el.offsetParent !== null);
        const current = focusable.indexOf(
          document.activeElement as HTMLElement,
        );
        const step = event.shiftKey ? -1 : 1;
        const next =
          current === -1
            ? 0
            : (current + step + focusable.length) % focusable.length;
        event.preventDefault();
        focusable[next]?.focus({ preventScroll: true });
      }
    };
    // close if the window grows to the desktop layout
    const desktop = window.matchMedia(DESKTOP);
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    // <html> reserves the scrollbar gutter, so locking doesn't shift layout
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <nav aria-label="Main" className="flex items-center gap-2 md:gap-4">
      {/* scrim behind the drawer, phones only */}
      <div
        aria-hidden="true"
        data-open={open}
        onClick={close}
        className="nav-scrim"
      />

      <div
        id={drawerId}
        ref={drawerRef}
        data-open={open}
        className="nav-drawer"
      >
        <p
          className="drawer-item mb-3 px-3 text-eyebrow font-semibold text-white/55 uppercase md:hidden"
          aria-hidden="true"
        >
          Menu
        </p>
        <ul className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-0">
          {items.map((item, index) => {
            const current = active !== null && anchorId(item.href) === active;
            return (
              <li
                key={item.href}
                className="drawer-item"
                style={{ "--i": index + 1 } as CSSProperties}
              >
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={current ? "true" : undefined}
                  onClick={close}
                >
                  {item.icon && (
                    <span className="nav-link-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                  <span className="nav-link-dot" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* drawer footer, phones only */}
        <div className="mt-auto space-y-6 pt-8 md:hidden">
          {socials.length > 0 && (
            <div
              className="drawer-item space-y-3 px-3"
              style={{ "--i": items.length + 1 } as CSSProperties}
            >
              <p className="text-eyebrow font-semibold text-white/55 uppercase">
                Find me
              </p>
              <SocialLinks links={socials} />
            </div>
          )}
          {contact && (
            <div
              className="drawer-item"
              style={{ "--i": items.length + 2 } as CSSProperties}
            >
              <ButtonLink
                href={contact.href}
                size="lg"
                className="w-full"
                onClick={close}
              >
                {contact.label}
                <ArrowRight data-icon="end" />
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {contact && (
        <ButtonLink href={contact.href} size="sm" className="max-sm:hidden">
          {contact.label}
        </ButtonLink>
      )}

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="relative z-50 -mr-2.5 grid size-11 place-items-center rounded-full md:hidden"
      >
        <span className="menu-icon" aria-hidden="true">
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
        </span>
      </button>
    </nav>
  );
}
