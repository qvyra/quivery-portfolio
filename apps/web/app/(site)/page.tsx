import type { Metadata } from "next";
import { SectionList } from "@/components/sections/section-list";
import { getSite } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getSite();
  const title = `${profile.brandName} · ${profile.headline}`;
  return {
    // full title, without the "· Quivery" template suffix
    title: { absolute: title },
    description: profile.tagline,
    alternates: { canonical: "/" },
    openGraph: { title, description: profile.tagline, url: "/" },
  };
}

export default async function HomePage() {
  const site = await getSite();
  return (
    <main id="main" className="pb-section">
      <SectionList site={site} />
    </main>
  );
}
