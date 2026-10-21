import type { ReactNode } from "react";
import { SiteChrome } from "@/components/site/site-chrome";

// every public page must be fully static, so the build fails if anything would
// render per request (uncached data, cookies, headers). Content is fetched at
// build time and refreshed by tag, see lib/content.ts
export const ensureStatic = "navigation";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
