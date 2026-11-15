import type { ContactLink, Site, SiteSection } from "@repo/shared";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { CvButton } from "@/components/site/cv-button";
import { Reveal } from "@/components/ui/reveal";
import { SiteIcon } from "@/components/ui/site-icon";
import { isExternal, primaryContact } from "@/lib/contact";
import { contactTypeIcons } from "@/lib/icons/defaults";
import { SectionShell } from "./section-shell";

function ContactRow({ link }: { link: ContactLink }) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-white/[0.05] ring-1 ring-white/10 ring-inset">
        <SiteIcon
          iconKey={link.iconKey}
          media={link.icon}
          fallback={contactTypeIcons[link.type]}
          className="size-5"
          sizes="20px"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-white/60">{link.label}</span>
        <span className="block font-medium break-words">{link.value}</span>
      </span>
    </>
  );
  const rowClass =
    "flex min-h-16 items-center gap-4 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10 ring-inset";

  if (!link.url) return <div className={rowClass}>{body}</div>;
  return (
    <a
      href={link.url}
      className={`${rowClass} transition-transform duration-(--motion-fast) ease-out-quart hover:ring-white/25 motion-safe:active:scale-[0.99]`}
      {...(isExternal(link.url) && { target: "_blank", rel: "noreferrer" })}
    >
      {body}
      {isExternal(link.url) && (
        <span className="sr-only"> (opens in a new tab)</span>
      )}
    </a>
  );
}

/**
 * How to reach Quivery: one call to action (the featured or most direct
 * channel) and every published contact link
 */
export function ContactSection({
  section,
  site,
  form,
}: {
  section: Extract<SiteSection, { type: "contact" }>;
  site: Site;
  /** The contact form. Without one the links take the full width */
  form?: ReactNode;
}) {
  const cta = primaryContact(site.contactLinks);

  return (
    <SectionShell section={section}>
      <div className={form ? "grid gap-10 lg:grid-cols-2" : undefined}>
        <div className="space-y-8">
          <div className="flex flex-wrap gap-3 empty:hidden">
            {cta?.link.url && (
              <a
                href={cta.link.url}
                className="btn btn-primary btn-lg"
                {...(isExternal(cta.link.url) && {
                  target: "_blank",
                  rel: "noreferrer",
                })}
              >
                {cta.label}
                <ArrowUpRight data-icon="end" aria-hidden="true" />
                {isExternal(cta.link.url) && (
                  <span className="sr-only"> (opens in a new tab)</span>
                )}
              </a>
            )}
            <CvButton
              profile={site.profile}
              className="btn btn-secondary btn-lg"
            />
          </div>
          <Reveal
            as="ul"
            stagger
            className="grid max-w-[44rem] gap-3 sm:grid-cols-2"
          >
            {site.contactLinks.map((link) => (
              <li key={link.id}>
                <ContactRow link={link} />
              </li>
            ))}
          </Reveal>
        </div>
        {form}
      </div>
    </SectionShell>
  );
}
