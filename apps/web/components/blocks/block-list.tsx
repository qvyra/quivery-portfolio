import { embedPlayer, type ResolvedBlock } from "@repo/shared";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { BenchmarkBlock } from "@/components/benchmarks/benchmark-block";
import { LinkIcon } from "@/components/ui/link-icon";
import { Stat, StatList } from "@/components/ui/stat";
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
};

type BlockOf<T extends ResolvedBlock["type"]> = Extract<
  ResolvedBlock,
  { type: T }
>;
type Renderer<T extends ResolvedBlock["type"]> = (
  block: BlockOf<T>,
  context: BlockContext,
) => ReactNode;

const CONTENT_SIZES =
  "(min-width: 1280px) 60rem, (min-width: 768px) 85vw, 100vw";

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
    <RichText markdown={block.markdown} headingLevel={context.headingLevel} />
  ),

  image: (block) =>
    block.image.media && (
      <figure>
        <MediaImage
          media={block.image.media}
          sizes={CONTENT_SIZES}
          className="rounded-xl ring-1 ring-white/10"
        />
        <Caption>{block.caption}</Caption>
      </figure>
    ),

  gallery: (block) => (
    <ul className="grid gap-4 sm:grid-cols-2">
      {block.items.map(
        (item, index) =>
          item.image.media && (
            <li key={`${item.image.mediaId}-${index}`}>
              <figure>
                <MediaImage
                  media={item.image.media}
                  sizes="(min-width: 640px) 45vw, 100vw"
                  className="rounded-xl ring-1 ring-white/10"
                />
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
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-md"
          >
            <LinkIcon type={link.type} url={link.url} />
            {link.label}
            <ArrowUpRight data-icon="end" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
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
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
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
}: {
  blocks: ResolvedBlock[];
  context: BlockContext;
  className?: string;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className={["space-y-10", className].filter(Boolean).join(" ")}>
      {blocks.map((block) => {
        const render = registry[block.type] as
          Renderer<typeof block.type> | undefined;
        if (!render) return null;
        return <div key={block.id}>{render(block as never, context)}</div>;
      })}
    </div>
  );
}
