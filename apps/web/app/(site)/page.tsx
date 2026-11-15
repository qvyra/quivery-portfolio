import type { Metadata } from "next";
import { SectionList } from "@/components/sections/section-list";
import { JsonLd } from "@/components/site/json-ld";
import { getSite } from "@/lib/content";
import { previewImages, sitePreview } from "@/lib/og/previews";
import { pageOpenGraph } from "@/lib/seo";
import { homeStructuredData } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const { profile } = site;
  const title = `${profile.brandName} · ${profile.headline}`;
  return {
    // full title, without the "· Quivery" template suffix
    title: { absolute: title },
    description: profile.tagline,
    alternates: { canonical: "/" },
    openGraph: pageOpenGraph({
      title,
      description: profile.tagline,
      url: "/",
      images: previewImages(sitePreview(site)),
    }),
  };
}

export default async function HomePage() {
  const site = await getSite();
  return (
    <main id="main" className="pb-section">
      <JsonLd data={homeStructuredData(site)} />
      <SectionList site={site} />
    </main>
  );
}
