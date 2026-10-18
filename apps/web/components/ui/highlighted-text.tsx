/**
 * Renders `text` with its `highlight` phrase (stored separately in the CMS)
 * in the accent gradient. If the phrase isn't found it all renders plain
 */
export function HighlightedText({
  text,
  highlight,
}: {
  text: string;
  highlight?: string | null;
}) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="text-gradient">{highlight}</span>
      {text.slice(at + highlight.length)}
    </>
  );
}
