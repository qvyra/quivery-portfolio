import { benchmarkSlugs } from "@/lib/benchmarks";
import { benchmarksImage, imageResponse } from "@/lib/og/images";

// a benchmarks page's link preview, prerendered, see lib/og/previews.ts
export async function generateStaticParams() {
  const slugs = await benchmarkSlugs();
  // at least one param set, like the page, so an empty build still works
  return slugs.length > 0
    ? slugs.map((slug) => ({ slug }))
    : [{ slug: "none" }];
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/benchmarks/[slug]">,
) {
  const { slug } = await params;
  return imageResponse(await benchmarksImage(slug));
}
