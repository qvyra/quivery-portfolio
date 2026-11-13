import type { PageDetail } from "@repo/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BlockList } from "@/components/blocks/block-list";
import { Container } from "@/components/ui/container";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { Eyebrow } from "@/components/ui/section-heading";
import { pageOutline } from "@/lib/outline";
import { PageToc } from "./page-toc";

/**
 * A standalone page's content. The public page and the admin's preview both
 * render it, so the preview shows exactly what will go live
 */
export function PageArticle({
  page,
  backHref,
  backLabel = "Back to home page",
}: {
  page: PageDetail;
  backHref: string;
  backLabel?: string;
}) {
  const { entries, anchors } = pageOutline(page.blocks);
  return (
    <article>
      <Container className="pt-[clamp(1.5rem,5svh,3.5rem)] pb-section">
        <Link
          href={backHref}
          className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-sm font-medium text-white/70 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Link>

        <header className="mt-6 max-w-[48rem] space-y-6">
          {page.eyebrow && (
            <div className="animate-enter">
              <Eyebrow>{page.eyebrow}</Eyebrow>
            </div>
          )}
          <h1 className="animate-enter text-display font-semibold [--i:1]">
            <HighlightedText
              text={page.title}
              highlight={page.titleHighlight}
            />
          </h1>
        </header>

        <div data-page-body="" className="relative mt-14">
          {/* in the space beside the text column, and first in the DOM so
              keyboard users reach it before the content. Two headings at
              least, or there's nothing to navigate */}
          {entries.length >= 2 && (
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-52 xl:block">
              <PageToc entries={entries} />
            </div>
          )}
          <BlockList
            blocks={page.blocks}
            context={{ headingLevel: 2, anchors }}
            measure="max-w-[60rem]"
          />
        </div>
      </Container>
    </article>
  );
}
