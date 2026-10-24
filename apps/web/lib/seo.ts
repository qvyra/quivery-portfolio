import type { Profile } from "@repo/shared";
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

/**
 * Whether the person goes by a name other than the brand. When both are the
 * same, places that pair them show it once instead of "Quivery · Quivery"
 */
export function hasSeparateName({
  brandName,
  displayName,
}: Pick<Profile, "brandName" | "displayName">): boolean {
  return brandName.trim().toLowerCase() !== displayName.trim().toLowerCase();
}
