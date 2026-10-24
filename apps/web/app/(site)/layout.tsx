import type { ReactNode } from "react";
import { SiteAnalytics } from "@/components/site/analytics";
import { SiteChrome } from "@/components/site/site-chrome";
import { env } from "@/lib/env";

// every public page must be fully static, so the build fails if anything would
// render per request (uncached data, cookies, headers). Content is fetched at
// build time and refreshed by tag, see lib/content.ts
export const ensureStatic = "navigation";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteChrome>{children}</SiteChrome>
      {/* public pages only, the admin never loads the script */}
      {env().webAnalytics && <SiteAnalytics />}
    </>
  );
}
