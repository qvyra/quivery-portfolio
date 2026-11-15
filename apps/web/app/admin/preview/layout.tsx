import { Suspense, type ReactNode } from "react";
import { SiteChrome } from "@/components/site/site-chrome";

// The site's own header, menu and footer around every preview, so a phone
// sized preview shows the menu a phone gets. They're the published ones: nav
// and footer changes show here once they're live. The header reads the path,
// which a preview by id only has per request, hence the boundary
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <SiteChrome>{children}</SiteChrome>
    </Suspense>
  );
}
