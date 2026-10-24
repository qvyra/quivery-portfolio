import type { Metadata } from "next";
import type { ReactNode } from "react";

// Never indexed: this meta tag, the X-Robots-Tag header from proxy.ts and
// robots.txt. It's not linked from anywhere on the site either
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="bg-ink text-white">{children}</div>;
}
