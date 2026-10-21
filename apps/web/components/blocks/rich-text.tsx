import Link from "next/link";
import type { ComponentProps, ElementType } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type Level = 2 | 3 | 4 | 5 | 6;

// shallowest heading level in the markdown, skipping code fences
function topHeadingDepth(markdown: string): number {
  let inFence = false;
  let top = 7;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const match = !inFence && /^ {0,3}(#{1,6})\s/.exec(line);
    if (match) top = Math.min(top, match[1]!.length);
  }
  return top;
}

const headingClass: Record<Level, string> = {
  2: "text-h2 font-semibold",
  3: "text-h3 font-semibold",
  4: "text-lg font-semibold",
  5: "font-semibold",
  6: "font-semibold text-white/80",
};

function MarkdownLink({ href = "", children }: ComponentProps<"a">) {
  const className =
    "font-medium text-focus underline decoration-focus/40 underline-offset-4 hover:decoration-focus";
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * Markdown from the CMS. Raw HTML is never rendered (react-markdown escapes
 * it) and unsafe URLs are dropped
 */
export function RichText({
  markdown,
  headingLevel,
}: {
  markdown: string;
  headingLevel: Level;
}) {
  // shift headings so the shallowest becomes headingLevel, keeping the page
  // outline right wherever the block sits
  const offset = headingLevel - topHeadingDepth(markdown);
  const heading = (depth: number) => {
    const level = Math.min(6, Math.max(2, depth + offset)) as Level;
    const Tag = `h${level}` as ElementType;
    function Heading({ children }: ComponentProps<"h2">) {
      return (
        <Tag className={`mt-10 mb-4 first:mt-0 ${headingClass[level]}`}>
          {children}
        </Tag>
      );
    }
    return Heading;
  };

  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    p: ({ children }) => (
      <p className="my-4 first:mt-0 last:mb-0">{children}</p>
    ),
    a: MarkdownLink,
    ul: ({ children }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 marker:text-orchid">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-white/60">
        {children}
      </ol>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-orchid/60 pl-5 text-white/80 italic">
        {children}
      </blockquote>
    ),
    code: ({ children, className }) =>
      className ? (
        // fenced code, already inside <pre>
        <code className={className}>{children}</code>
      ) : (
        <code className="rounded-xs bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-white">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-sm leading-relaxed ring-1 ring-white/10">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-8 border-white/10" />,
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-white/15 px-3 py-2 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-white/10 px-3 py-2 text-white/80">
        {children}
      </td>
    ),
  };

  return (
    <div className="max-w-[68ch] text-white/80">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={components}
        // images belong in image blocks, not inline markdown
        disallowedElements={["img"]}
        unwrapDisallowed
      >
        {markdown}
      </Markdown>
    </div>
  );
}
