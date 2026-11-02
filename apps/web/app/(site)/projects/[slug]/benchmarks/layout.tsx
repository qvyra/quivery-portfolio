import { preload } from "react-dom";
import { poppinsFiles } from "@/lib/fonts";

// The root preloads semibold only. These pages are long and linked to by
// #hash, and regular arriving after the browser scrolls there re-wraps the
// intro text above the target and moves it, so it loads up front here.
// Elsewhere it would only compete with the hero image
export default function BenchmarksLayout({
  children,
}: LayoutProps<"/projects/[slug]/benchmarks">) {
  preload(poppinsFiles[400], {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  return children;
}
