import { embedPlayer, type ResolvedBlock, type TextWidth } from "@repo/shared";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { BenchmarkBlock } from "@/components/benchmarks/benchmark-block";
import { ContentLink } from "@/components/ui/content-link";
import { Stat, StatList } from "@/components/ui/stat";
import {
  COLUMN_GALLERY_SIZES,
  COLUMN_SIZES,
  PAGE_GALLERY_SIZES,
  PAGE_SIZES,
} from "@/lib/image-sizes";
import type { HeadingAnchors } from "@/lib/outline";
import { ArtImage } from "./art-image";
import { CopyButton } from "./copy-button";
import { EmbedPlayer } from "./embed-player";
import { MediaImage } from "./media-image";
import { RichText } from "./rich-text";
import { VideoPlayer } from "./video-player";

/** Where a list of blocks sits, so headings and images fit the page */
export type BlockContext = {
  /** Top rich text heading level, 2 on a project page and 3 in a section */
  headingLevel: 2 | 3;
  /** Where a benchmark block's run pages live, on a benchmarks page */
  benchmarkRunsPath?: string;
  /** Heading ids by block, for a page's "On this page" rail (lib/outline) */
  anchors?: HeadingAnchors;
  /** The page's shallowest heading depth, so every text block lifts it to
   *  headingLevel alike (lib/outline) */
  topDepth?: number | undefined;
  /** The section or page default for text blocks without their own, narrow
   *  when unset */
  textWidth?: TextWidth | null | undefined;
  /** Set by BlockList when blocks are capped at the 60rem column, so images
   *  ask for files that size and not the page's width */
  inColumn?: boolean;
};

type BlockOf<T extends ResolvedBlock["type"]> = Extract<
  ResolvedBlock,
  { type: T }
>;
type Renderer<T extends ResolvedBlock["type"]> = (
  block: BlockOf<T>,
  context: BlockContext,
) => ReactNode;

function Caption({ children }: { children?: string }) {
  return children ? (
    <figcaption className="mt-3 text-sm text-white/60">{children}</figcaption>
  ) : null;
}

const providerNames = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  streamable: "Streamable",
};

// the mapped type makes a missing renderer a compile error when the shared
// schema gains a block type
const registry: { [T in ResolvedBlock["type"]]: Renderer<T> } = {
  richText: (block, context) => (
    <RichText
      markdown={block.markdown}
      headingLevel={context.headingLevel}
      topDepth={context.topDepth}
      anchors={context.anchors?.[block.id]}
    />
  ),

  image: (block, context) =>
    block.image.media?.kind === "IMAGE" && (
      <figure>
        <ArtImage
          image={block.image.media}
          mobileImage={block.mobileImage?.media}
          sizes={!block.wide && context.inColumn ? COLUMN_SIZES : PAGE_SIZES}
          caption={block.caption}
        />
        <Caption>{block.caption}</Caption>
      </figure>
    ),

  gallery: (block, context) => (
    <ul className="grid gap-4 sm:grid-cols-2">
      {block.items.map(
        (item, index) =>
          item.image.media && (
            <li key={`${item.image.mediaId}-${index}`}>
              <figure>
                <div className="image-frame overflow-hidden">
                  <MediaImage
                    media={item.image.media}
                    sizes={
                      context.inColumn
                        ? COLUMN_GALLERY_SIZES
                        : PAGE_GALLERY_SIZES
                    }
                  />
                </div>
                <Caption>{item.caption}</Caption>
              </figure>
            </li>
          ),
      )}
    </ul>
  ),

  video: (block) =>
    block.video.media?.kind === "VIDEO" && (
      <figure>
        <VideoPlayer
          src={block.video.media.url}
          captionsUrl={block.video.media.captionsUrl}
          label={block.caption ?? (block.video.media.alt || "Video")}
          loop={block.loop}
        />
        <Caption>{block.caption}</Caption>
      </figure>
    ),

  embed: (block) => {
    const player = embedPlayer(block.provider, block.url);
    const provider = providerNames[block.provider];
    if (!player) {
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-focus underline underline-offset-4"
        >
          {block.title} on {provider}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
    return (
      <EmbedPlayer
        src={player.src}
        thumbnail={player.thumbnail}
        title={block.title}
        provider={provider}
      />
    );
  },

  linkList: (block) => (
    <ul className="flex flex-wrap gap-3">
      {block.links.map((link) => (
        <li key={link.url}>
          <ContentLink
            link={link}
            className="btn btn-secondary btn-md"
            external={<ArrowUpRight data-icon="end" aria-hidden="true" />}
          />
        </li>
      ))}
    </ul>
  ),

  statsRow: (block) => (
    <StatList>
      {block.items.map((item) => (
        <Stat
          key={`${item.value}-${item.label}`}
          value={item.value}
          label={item.label}
        />
      ))}
    </StatList>
  ),

  codeSnippet: (block) => (
    <figure className="overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 py-1 pr-2 pl-4">
        <span className="truncate font-mono text-xs text-white/60">
          {block.filename ?? block.language}
        </span>
        <CopyButton text={block.code} />
      </div>
      <pre
        // long lines scroll sideways on a phone, so the keyboard has to reach
        // it too
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto p-4 font-mono text-sm leading-relaxed"
      >
        <code data-language={block.language}>{block.code}</code>
      </pre>
      {block.caption && (
        <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-white/60">
          {block.caption}
        </figcaption>
      )}
    </figure>
  ),

  benchmark: (block, context) => (
    <BenchmarkBlock
      block={block}
      level={context.headingLevel}
      runsPath={context.benchmarkRunsPath}
    />
  ),
};

/**
 * Renders content blocks in order. Unknown types are skipped, the parser
 * already reported them
 */
export function BlockList({
  blocks,
  context,
  className,
  measure,
}: {
  blocks: ResolvedBlock[];
  context: BlockContext;
  className?: string;
  /** Caps each block at the text column, except wide images and text,
   *  which sizes itself */
  measure?: string;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className={["space-y-10", className].filter(Boolean).join(" ")}>
      {blocks.map((block) => {
        const render = registry[block.type] as
          Renderer<typeof block.type> | undefined;
        if (!render) return null;
        if (block.type === "richText") {
          // text sets its own width (rich-text.tsx), from 68ch up to the
          // page's full width. data-block-id lets the admin preview change it
          // live, and full text makes a page's rail step aside like a wide
          // image (page-toc.tsx)
          return (
            <div
              key={block.id}
              data-block-id={block.id}
              data-text-width={block.width ?? context.textWidth ?? "narrow"}
            >
              {render(block, context)}
            </div>
          );
        }
        const wide = block.type === "image" && block.wide;
        return (
          // data-wide lets a page's rail step aside, see page-toc.tsx
          <div
            key={block.id}
            className={wide ? undefined : measure}
            data-wide={wide ? "" : undefined}
          >
            {render(block as never, {
              ...context,
              inColumn: !wide && !!measure,
            })}
          </div>
        );
      })}
    </div>
  );
}
