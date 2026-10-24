import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// /admin is also noindex (header and meta) and never linked from the site.
// Listing it here gives its path away, but the admin is closed by the API's
// session check, not by staying hidden
export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = env();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
