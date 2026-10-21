import type { SiteSection, Testimonial } from "@repo/shared";
import { Star } from "lucide-react";
import { MediaImage } from "@/components/blocks/media-image";
import { Reveal } from "@/components/ui/reveal";
import { SectionShell } from "./section-shell";

function Rating({ value }: { value: number }) {
  return (
    <p className="flex gap-0.5" aria-label={`Rated ${value} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`size-4 ${index < value ? "fill-orchid text-orchid" : "text-white/25"}`}
        />
      ))}
    </p>
  );
}

/** One real testimonial, never a placeholder. With none the section hides */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const author = testimonial.authorUrl ? (
    <a
      href={testimonial.authorUrl}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
    >
      {testimonial.authorName}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    testimonial.authorName
  );

  return (
    <figure className="flex h-full flex-col gap-5 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset sm:p-7">
      {testimonial.rating && <Rating value={testimonial.rating} />}
      <blockquote className="text-lead text-white/85">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        {testimonial.avatar && (
          <div className="size-10 overflow-hidden rounded-full">
            <MediaImage
              media={testimonial.avatar}
              sizes="40px"
              className="object-cover"
            />
          </div>
        )}
        <div className="text-sm">
          <p className="font-semibold">{author}</p>
          {(testimonial.authorRole || testimonial.source) && (
            <p className="text-white/60">
              {[
                testimonial.authorRole,
                testimonial.source && `via ${testimonial.source}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

/** Testimonials, only rendered when at least one real one is published */
export function TestimonialsSection({
  section,
}: {
  section: Extract<SiteSection, { type: "testimonials" }>;
}) {
  return (
    <SectionShell section={section}>
      <Reveal
        as="ul"
        stagger
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {section.testimonials.map((testimonial) => (
          <li key={testimonial.id}>
            <TestimonialCard testimonial={testimonial} />
          </li>
        ))}
      </Reveal>
    </SectionShell>
  );
}
