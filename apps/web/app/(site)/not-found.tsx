import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

// unknown or unpublished projects (notFound() in /projects/[slug]), shown
// inside the site layout with its header and footer
export default function SiteNotFound() {
  return <NotFoundContent />;
}
