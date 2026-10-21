import type { SiteSection } from "@repo/shared";
import { Check } from "lucide-react";
import { MediaImage } from "@/components/blocks/media-image";
import { Reveal } from "@/components/ui/reveal";
import { SectionShell } from "./section-shell";

/** What Ether offers. Only rendered when at least one service is published */
export function ServicesSection({
  section,
}: {
  section: Extract<SiteSection, { type: "services" }>;
}) {
  return (
    <SectionShell section={section}>
      <Reveal
        as="ul"
        stagger
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {section.services.map((service) => (
          <li
            key={service.id}
            className="flex flex-col gap-4 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset sm:p-7"
          >
            {service.icon && (
              <div className="size-10">
                <MediaImage media={service.icon} sizes="40px" />
              </div>
            )}
            <h3 className="text-h3 font-semibold">{service.title}</h3>
            <p className="text-white/75">{service.summary}</p>
            {service.highlights.length > 0 && (
              <ul className="space-y-2 text-sm text-white/75">
                {service.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-orchid"
                    />
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </Reveal>
    </SectionShell>
  );
}
