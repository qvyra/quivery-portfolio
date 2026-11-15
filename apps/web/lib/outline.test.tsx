import type { ResolvedBlock } from "@repo/shared";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/blocks/rich-text";
import { PageTocRail } from "@/components/site/page-toc";
import { pageOutline } from "./outline";

let next = 0;
const text = (markdown: string): ResolvedBlock => ({
  id: `block-${++next}`,
  type: "richText",
  markdown,
});
const code = (source: string): ResolvedBlock => ({
  id: `block-${++next}`,
  type: "codeSnippet",
  language: "luau",
  code: source,
});

const listed = (blocks: ResolvedBlock[]) =>
  pageOutline(blocks).entries.map((entry) => entry.text);

describe("pageOutline", () => {
  it("lists every # heading when # is the top level", () => {
    const blocks = [
      text("# Overview\n\nIntro\n\n## Detail\n\n# Usage"),
      text("## Not listed\n\n# Roadmap"),
    ];
    expect(listed(blocks)).toEqual(["Overview", "Usage", "Roadmap"]);
    expect(pageOutline(blocks).topDepth).toBe(1);
  });

  it("lists every ## heading when ## is the top level", () => {
    expect(
      listed([text("## One\n\n### Skipped\n\n## Two"), text("## Three")]),
    ).toEqual(["One", "Two", "Three"]);
  });

  it("lists every ### heading when ### is the top level", () => {
    expect(
      listed([
        text("### One\n\n#### Skipped"),
        text("#### Also skipped"),
        text("### Two"),
      ]),
    ).toEqual(["One", "Two"]);
  });

  it("takes several headings from one block, in order", () => {
    expect(
      listed([
        text(
          "#### Quick facts\n\nA\n\n#### What it does\n\nB\n\n#### Getting started",
        ),
      ]),
    ).toEqual(["Quick facts", "What it does", "Getting started"]);
  });

  it("collects across blocks in page order, past other block types", () => {
    const blocks = [
      text("#### Quick facts\n\n#### What it does\n\n#### Getting started"),
      code("-- # not a heading"),
      text("Plain text, no headings"),
      code("print(1)"),
      text("#### Status and roadmap"),
    ];
    expect(listed(blocks)).toEqual([
      "Quick facts",
      "What it does",
      "Getting started",
      "Status and roadmap",
    ]);
  });

  it("uses the top level from any block, even a later one", () => {
    expect(listed([text("### Early"), text("## Late top")])).toEqual([
      "Late top",
    ]);
  });

  it("ignores # in code blocks, inline code and hashtags", () => {
    const markdown = [
      "## Real",
      "",
      "```lua",
      "# Not a heading",
      "```",
      "",
      "~~~",
      "# Nor this",
      "~~~",
      "",
      "    # indented code",
      "",
      "Inline `# code` and tags #Luau #Wally",
      "",
      "#Luau",
      "",
      "## Also real",
    ].join("\n");
    const { entries, topDepth } = pageOutline([text(markdown)]);
    expect(entries.map((entry) => entry.text)).toEqual(["Real", "Also real"]);
    expect(topDepth).toBe(2);
  });

  it("gives repeated headings their own ids", () => {
    const { entries } = pageOutline([
      text("## Setup\n\n## Setup"),
      text("## Setup 2\n\n## Setup\n\n## Main"),
    ]);
    expect(entries.map((entry) => entry.id)).toEqual([
      "setup",
      "setup-2",
      // its own name was taken by the repeat above
      "setup-2-2",
      "setup-3",
      // the skip link already uses main
      "main-2",
    ]);
  });

  it("keys ids by block and where each heading starts", () => {
    const first = text("Intro\n\n## One");
    const second = text("## Two");
    const { anchors } = pageOutline([first, second]);
    expect(anchors).toEqual({
      [first.id]: { 7: "one" },
      [second.id]: { 0: "two" },
    });
  });

  it("has no entries and no top level without headings", () => {
    expect(pageOutline([text("Just text"), code("# x")])).toEqual({
      entries: [],
      anchors: {},
      topDepth: undefined,
    });
  });
});

describe("rendering", () => {
  const render = (blocks: ResolvedBlock[]) => {
    const { anchors, topDepth } = pageOutline(blocks);
    return blocks
      .map((block) =>
        block.type === "richText"
          ? renderToString(
              <RichText
                markdown={block.markdown}
                headingLevel={2}
                topDepth={topDepth}
                anchors={anchors[block.id]}
              />,
            )
          : "",
      )
      .join("");
  };

  it("renders # one level below the page title, never as an h1", () => {
    const html = render([text("# Overview\n\n## Detail")]);
    expect(html).not.toContain("<h1");
    expect(html).toContain('<h2 id="overview"');
    expect(html).toContain("<h3");
  });

  it("shifts every block by the page's top level, so nesting holds", () => {
    const html = render([text("## Top"), text("### Under it")]);
    expect(html).toContain('<h2 id="top"');
    expect(html).toContain(">Under it</h3>");
  });

  it("shows the rail only with two entries or more", () => {
    const one = pageOutline([text("## Only")]).entries;
    const two = pageOutline([text("## One\n\n## Two")]).entries;
    expect(renderToString(<PageTocRail entries={one} />)).toBe("");
    const rail = renderToString(<PageTocRail entries={two} />);
    expect(rail).toContain('aria-label="On this page"');
    expect(rail).toContain("xl:block");
    expect(rail).toContain('href="#one"');
  });
});
