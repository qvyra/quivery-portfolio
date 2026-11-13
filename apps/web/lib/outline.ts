// A page's outline for its "On this page" rail: the top heading of every rich
// text block, with an id for each. Headings are found with the same parser
// RichText renders with, and keyed by where they start in the markdown, so the
// rail's links and the rendered headings can't disagree
import type { ResolvedBlock } from "@repo/shared";
import type { Heading, Root } from "mdast";
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

export function pageOutline(blocks: ResolvedBlock[]): {
  entries: OutlineEntry[];
  anchors: HeadingAnchors;
} {
  const entries: OutlineEntry[] = [];
  const anchors: HeadingAnchors = {};
  // ids the page already has: the skip link target
  const used = new Map<string, number>([["main", 1]]);

  for (const block of blocks) {
    if (block.type !== "richText") continue;
    const tree = parser.parse(block.markdown) as Root;
    // RichText lifts the shallowest heading of a block to the page's top
    // heading level, so those are the ones the rail lists
    const headings = tree.children.filter(
      (node): node is Heading => node.type === "heading",
    );
    const top = Math.min(...headings.map((heading) => heading.depth));
    for (const heading of headings) {
      const offset = heading.position?.start.offset;
      if (heading.depth !== top || offset === undefined) continue;
      const text = toString(heading).trim();
      const base = headingSlug(text);
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;
      entries.push({ id, text });
      (anchors[block.id] ??= {})[offset] = id;
    }
  }
  return { entries, anchors };
}
