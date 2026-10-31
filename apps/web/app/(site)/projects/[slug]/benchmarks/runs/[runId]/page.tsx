import { runView, type BenchLatest, type BenchRun } from "@repo/shared";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BenchSuites,
  Heading,
  Note,
  ScrollRegion,
  SourceLinks,
} from "@/components/benchmarks/bench-results";
import { formatDate } from "@/components/benchmarks/format";
import { Container } from "@/components/ui/container";
import {
  benchmarkSlugs,
  benchRunUrl,
  getBenchRun,
  projectRunSources,
} from "@/lib/benchmarks";
import { getBuiltProject } from "@/lib/content";
import { pageOpenGraph } from "@/lib/seo";

// every run the index lists prerenders. A run published later renders on its
// first visit, and an id the index doesn't list is a 404 without any fetch
export const instant = false;

const runIdPattern = /^[0-9a-f]{8}$/;

export async function generateStaticParams() {
  const params: { slug: string; runId: string }[] = [];
  for (const slug of await benchmarkSlugs()) {
    const project = await getBuiltProject(slug);
    if (!project) continue;
    for (const source of await projectRunSources(project)) {
      for (const run of source.index.runs) {
        params.push({ slug, runId: run.id });
      }
    }
  }
  // a static layout needs one param set, this one prerenders the 404
  return params.length > 0 ? params : [{ slug: "none", runId: "00000000" }];
}

async function findRun(slug: string, runId: string) {
  if (!runIdPattern.test(runId)) return null;
  const project = await getBuiltProject(slug);
  if (!project || project.benchmarks.length === 0) return null;
  for (const source of await projectRunSources(project)) {
    const url = benchRunUrl(source.indexUrl, source.index, runId);
    if (url) return { project, source, url };
  }
  return null;
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]/benchmarks/runs/[runId]">): Promise<Metadata> {
  const { slug, runId } = await params;
  const found = await findRun(slug, runId);
  if (!found) return { title: "Page not found" };

  const url = `/projects/${slug}/benchmarks/runs/${runId}`;
  const title = `${found.project.title} benchmark run ${runId}`;
  const description = `One benchmark run of ${found.project.title}: its results, the library versions it ran and links to its raw data and workflow.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: pageOpenGraph({ title, description, url }),
  };
}

// a run's own record of what ran, didn't run and went wrong
function RunDetails({ run, latest }: { run: BenchRun; latest: BenchLatest }) {
  const shown = new Set(
    latest.suites
      .filter((suite) => suite.recordedOnly !== true)
      .map((suite) => suite.id),
  );
  const suiteName = (id: string) =>
    latest.suites.find((suite) => suite.id === id)?.name ?? id;
  const subjectName = (id: string) =>
    latest.subjects.find((subject) => subject.id === id)?.config.label ?? id;
  // the same reason can be recorded once per scenario
  const notRunnable = [
    ...new Map(
      run.notRunnable
        .filter((entry) => shown.has(entry.suite))
        .map((entry) => [
          `${entry.subject} ${entry.suite} ${entry.reason}`,
          entry,
        ]),
    ).values(),
  ];

  return (
    <div className="space-y-12">
      <section aria-labelledby="run-libraries" className="space-y-4">
        <Heading level={2} id="run-libraries">
          Libraries
        </Heading>
        <ScrollRegion labelledBy="run-libraries">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="text-xs text-white/60">
                {["Library", "Version", "Commit", "Licence"].map((label) => (
                  <th key={label} scope="col" className="py-2 pr-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.libraries.map((library) => (
                <tr key={library.name} className="border-t border-white/10">
                  <th scope="row" className="py-2 pr-4 font-medium">
                    {library.name}
                  </th>
                  <td className="py-2 pr-4">{library.version}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {library.repo}@{library.ref.slice(0, 7)}
                  </td>
                  <td className="max-w-[20rem] py-2 pr-4 whitespace-normal">
                    {library.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      {notRunnable.length > 0 && (
        <section aria-labelledby="run-not-runnable" className="space-y-4">
          <Heading level={2} id="run-not-runnable">
            Couldn&apos;t run
          </Heading>
          <dl className="max-w-[48rem] divide-y divide-white/10">
            {notRunnable.map((entry) => (
              <div
                key={`${entry.subject}-${entry.suite}-${entry.reason}`}
                className="py-3"
              >
                <dt className="font-medium">
                  {subjectName(entry.subject)}, {suiteName(entry.suite)}
                </dt>
                <dd className="mt-1 text-sm text-white/70">{entry.reason}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {run.problems.length > 0 && (
        <section aria-labelledby="run-problems" className="space-y-4">
          <Heading level={2} id="run-problems">
            Problems recorded
          </Heading>
          <dl className="max-w-[48rem] divide-y divide-white/10">
            {run.problems.map((entry, index) => (
              <div key={index} className="py-3">
                <dt className="font-medium">
                  {subjectName(entry.subject)} ({entry.mode})
                </dt>
                <dd className="mt-1 text-sm break-words text-white/70">
                  {entry.problem}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

export default async function RunPage({
  params,
}: PageProps<"/projects/[slug]/benchmarks/runs/[runId]">) {
  const { slug, runId } = await params;
  const found = await findRun(slug, runId);
  if (!found) notFound();
  const { project, source, url } = found;
  const run = await getBenchRun(url, runId);
  const { latest } = source;
  const build =
    run === "unsupported"
      ? undefined
      : latest.builds.find((item) => item.id === run.build);
  const current = latest.runs.some((item) => item.id === runId);
  const benchmarksPath = `/projects/${project.slug}/benchmarks`;

  return (
    <main id="main">
      <Container className="pt-[clamp(1.5rem,5svh,3.5rem)] pb-section">
        <Link
          href={benchmarksPath}
          className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-sm font-medium text-white/70 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {project.title} benchmarks
        </Link>
        <header className="mt-6 max-w-[48rem] space-y-6">
          <h1 className="text-display font-semibold">
            Run <span className="font-mono">{runId}</span>
          </h1>
          {run === "unsupported" ? null : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-white/60">Date</dt>
              <dd>
                <time dateTime={run.date}>{formatDate(run.date)}</time>
              </dd>
              <dt className="text-white/60">Build</dt>
              <dd>
                {run.build}
                {build?.note && (
                  <span className="block text-white/65">{build.note}</span>
                )}
              </dd>
              <dt className="text-white/60">Used in the results page</dt>
              <dd>{current ? "Yes" : "No"}</dd>
              <dt className="text-white/60">Geode source</dt>
              <dd className="font-mono text-xs break-all">
                {run.geode.sourceTree}
              </dd>
            </dl>
          )}
          <SourceLinks
            links={[
              ...(run !== "unsupported" && run.bench.workflowRun
                ? [{ label: "Workflow run", href: run.bench.workflowRun }]
                : []),
              { label: "Raw run data (JSON)", href: url },
              ...(source.methodUrl
                ? [{ label: "Method", href: source.methodUrl }]
                : []),
            ]}
          />
        </header>

        {run === "unsupported" ? (
          <div className="mt-12 max-w-[48rem]">
            <Note title="Results unavailable">
              <p>
                This run uses a newer data format than this site reads, so its
                results aren&apos;t shown here. The raw data is linked above.
              </p>
            </Note>
          </div>
        ) : (
          <div className="mt-12 space-y-16">
            <Note title="Reading one run">
              <p>
                These are this run&apos;s results alone, with every subject that
                ran side by side, historical builds included.
              </p>
              <p>{latest.aggregation.caveat}</p>
            </Note>
            <BenchSuites
              view={runView(run, latest)}
              level={2}
              idPrefix={`run-${runId}`}
            />
            <RunDetails run={run} latest={latest} />
          </div>
        )}
      </Container>
    </main>
  );
}
