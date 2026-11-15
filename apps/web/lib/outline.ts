// A page's outline for its "On this page" rail: every heading at the top
// level used anywhere on the page, from every rich text block, in page order.
// Headings are found with the same parser RichText renders with, and keyed by
// where they start in the markdown, so the rail's links and the rendered
// headings can't disagree. Being a parser, it skips # lines in code and
// hashtags such as #Luau, which aren't headings
import type { ResolvedBlock } from "@repo/shared";
import type { Heading, Nodes } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type OutlineEntry = { id: string; text: string };

/** Heading ids per block, keyed by the heading's start offset in the markdown */
export type HeadingAnchors = Record<string, Record<number, string>>;

const parser = unified().use(remarkParse).use(remarkGfm);

/** A URL fragment from a heading's text: "Case study: a 5-second hop" */
export function headingSlug(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/**
 * Every heading in some markdown, in order, nested ones (in a quote or a
 * list) included, since RichText renders those as headings too
 */
export function markdownHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const walk = (node: Nodes) => {
    if (node.type === "heading") headings.push(node);
    if ("children" in node) for (const child of node.children) walk(child);
  };
  walk(parser.parse(markdown));
  return headings;
}

/** The shallowest heading depth (1 for #) in some markdown, or null */
export function topDepth(markdown: string): number | null {
  const depths = markdownHeadings(markdown).map((heading) => heading.depth);
  return depths.length > 0 ? Math.min(...depths) : null;
}

export function pageOutline(blocks: ResolvedBlock[]): {
  entries: OutlineEntry[];
  anchors: HeadingAnchors;
  /** The page's top heading depth, which RichText lifts to the page's top
   *  heading level everywhere, or undefined with no headings */
  topDepth: number | undefined;
} {
  const parsed = blocks.flatMap((block) =>
    block.type === "richText"
      ? [{ id: block.id, headings: markdownHeadings(block.markdown) }]
      : [],
  );
  const depths = parsed.flatMap(({ headings }) =>
    headings.map((heading) => heading.depth),
  );
  const top = depths.length > 0 ? Math.min(...depths) : undefined;

  const entries: OutlineEntry[] = [];
  const anchors: HeadingAnchors = {};
  // ids the page already has: the skip link target
  const taken = new Set(["main"]);
  for (const { id: blockId, headings } of parsed) {
    for (const heading of headings) {
      const offset = heading.position?.start.offset;
      if (heading.depth !== top || offset === undefined) continue;
      const text = toString(heading).trim();
      const base = headingSlug(text);
      // a repeat gets -2, -3..., past any heading already named like that
      let id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id);
      entries.push({ id, text });
      (anchors[blockId] ??= {})[offset] = id;
    }
  }
  return { entries, anchors, topDepth: top };
}
