import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageArticle } from "@/components/site/page-article";
import { getBuiltPage, getPages, pagesPublishedAtBuild } from "@/lib/content";
import { pageOpenGraph } from "@/lib/seo";

// every published page prerenders through generateStaticParams, and the proxy
// sends any other slug to the static 404, like project pages. A slug that
// still gets here waits for the full page, so its 404 has the right status
export const instant = false;

export async function generateStaticParams() {
  const published = pagesPublishedAtBuild();
  if (!published && process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLISHED_PAGE_SLUGS is missing. Build with npm run build, which runs scripts/build.mjs",
    );
  }
  const slugs = published ?? (await getPages()).map((page) => page.slug);
  // a fully static layout needs at least one param set. With no published
  // pages, "none" prerenders the 404 page
  return slugs.length > 0
    ? slugs.map((slug) => ({ slug }))
    : [{ slug: "none" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getBuiltPage(slug);
  if (!page) return { title: "Page not found" };

  const url = `/${page.slug}`;
  const title = page.seoTitle ?? page.title;
  return {
    title,
    description: page.seoDescription,
    alternates: { canonical: url },
    // the image comes from opengraph-image.tsx next to this page
    openGraph: pageOpenGraph({
      type: "article",
      title,
      description: page.seoDescription,
      url,
    }),
  };
}

export default async function StandalonePage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = await getBuiltPage(slug);
  if (!page) notFound();

  return (
    <main id="main">
      <PageArticle page={page} backHref="/" />
    </main>
  );
}
