/**
 * Structured data for search engines. A JSON script block is data, not code,
 * so the Content-Security-Policy doesn't need to allow it
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // "<" escaped, so text from the content can't close the script tag
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
