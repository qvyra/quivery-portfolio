import { getBuiltPages } from "@/lib/content";
import { imageResponse, pageImage } from "@/lib/og/images";

// a standalone page's link preview, prerendered, see lib/og/previews.ts
export async function generateStaticParams() {
  const pages = await getBuiltPages();
  // at least one param set, like the page, so an empty build still works
  return pages.length > 0
    ? pages.map(({ slug }) => ({ slug }))
    : [{ slug: "none" }];
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/pages/[slug]">,
) {
  const { slug } = await params;
  return imageResponse(await pageImage(slug));
}
