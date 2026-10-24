import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";

// The panel reads the URL (current page, item ids) and only renders in the
// browser, so the prerendered page is just this fallback
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<p className="p-8 text-white/60">Loading the admin…</p>}
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
