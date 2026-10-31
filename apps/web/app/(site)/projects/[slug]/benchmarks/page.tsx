import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockList } from "@/components/blocks/block-list";
import { Container } from "@/components/ui/container";
import { benchmarkSlugs } from "@/lib/benchmarks";
import { getBuiltProject } from "@/lib/content";
import { pageOpenGraph } from "@/lib/seo";

// like the project page: built projects prerender, anything else waits for
// the full render so it gets a real 404
export const instant = false;

export async function generateStaticParams() {
  const slugs = await benchmarkSlugs();
  // a static layout needs one param set, "none" prerenders the 404
  return slugs.length > 0
    ? slugs.map((slug) => ({ slug }))
    : [{ slug: "none" }];
}

async function benchmarkedProject(slug: string) {
  const project = await getBuiltProject(slug);
  return project && project.benchmarks.length > 0 ? project : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]/benchmarks">): Promise<Metadata> {
  const { slug } = await params;
  const project = await benchmarkedProject(slug);
  if (!project) return { title: "Page not found" };

  const url = `/projects/${project.slug}/benchmarks`;
  const title = `${project.title} benchmarks`;
  const description = `Benchmark results for ${project.title}, with every run, the raw data and the method.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: pageOpenGraph({ title, description, url }),
  };
}

export default async function BenchmarksPage({
  params,
}: PageProps<"/projects/[slug]/benchmarks">) {
  const { slug } = await params;
  const project = await benchmarkedProject(slug);
  if (!project) notFound();

  return (
    <main id="main">
      <Container className="pt-[clamp(1.5rem,5svh,3.5rem)] pb-section">
        <Link
          href={`/projects/${project.slug}`}
          className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-sm font-medium text-white/70 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {project.title}
        </Link>
        <h1 className="mt-6 text-display font-semibold">
          {project.title} benchmarks
        </h1>
        <BlockList
          blocks={project.benchmarks}
          context={{
            headingLevel: 2,
            benchmarkRunsPath: `/projects/${project.slug}/benchmarks/runs`,
          }}
          className="mt-12"
        />
      </Container>
    </main>
  );
}
