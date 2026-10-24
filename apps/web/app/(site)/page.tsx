import type { Metadata } from "next";
import { SectionList } from "@/components/sections/section-list";
import { JsonLd } from "@/components/site/json-ld";
import { getSite } from "@/lib/content";
import { pageOpenGraph } from "@/lib/seo";
import { homeStructuredData } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getSite();
  const title = `${profile.brandName} · ${profile.headline}`;
  return {
    // full title, without the "· Quivery" template suffix
    title: { absolute: title },
    description: profile.tagline,
    alternates: { canonical: "/" },
    // the image comes from opengraph-image.tsx next to this page
    openGraph: pageOpenGraph({
      title,
      description: profile.tagline,
      url: "/",
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
