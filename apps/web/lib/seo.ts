import type { Metadata } from "next";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

// A page's openGraph replaces the layout's whole object rather than merging
// into it, so every page builds on these
const siteOpenGraph = {
  siteName: "Quivery",
  locale: "en",
} as const;

/** Open Graph fields for a page, with the site-wide ones filled in */
export function pageOpenGraph(fields: OpenGraph): OpenGraph {
  return { type: "website", ...siteOpenGraph, ...fields } as OpenGraph;
}
