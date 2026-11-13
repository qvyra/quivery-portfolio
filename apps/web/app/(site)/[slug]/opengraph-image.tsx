import { notFound } from "next/navigation";
import { getBuiltPage, getBuiltPages, getSite, tags } from "@/lib/content";
import { ogCard, ogContentType, ogSize } from "@/lib/og/card";

// static exports keep the image prerendered, see ../opengraph-image.tsx
export const alt = "The page's card: title and description";
export const size = ogSize;
export const contentType = ogContentType;

// a card for every page in the build, and like the page itself at least one
// param set, so a build with no pages still prerenders
export async function generateStaticParams() {
  const pages = await getBuiltPages();
  return pages.length > 0
    ? pages.map((page) => ({ slug: page.slug }))
    : [{ slug: "none" }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, site] = await Promise.all([getBuiltPage(slug), getSite()]);
  if (!page) notFound();

  return ogCard(
    {
      eyebrow: page.eyebrow
        ? `${site.profile.brandName} · ${page.eyebrow}`
        : site.profile.brandName,
      title: page.title,
      text: page.seoDescription,
      badges: [],
    },
    [tags.site, tags.pages, tags.page(page.slug)],
  );
}
