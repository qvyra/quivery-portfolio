import { benchView, runList, type ResolvedBlock } from "@repo/shared";
import { RichText } from "@/components/blocks/rich-text";
import { benchRunUrl, getBenchData } from "@/lib/benchmarks";
import {
  BenchSuites,
  Heading,
  Note,
  NotMeasuredList,
  RunsTable,
  SourceLinks,
  type HeadingLevel,
} from "./bench-results";
import { formatDate, plural } from "./format";

type Block = Extract<ResolvedBlock, { type: "benchmark" }>;

/**
 * Results from a bench dataset, as published. The admin's title and note are
 * the only words here that don't come from the data
 */
export async function BenchmarkBlock({
  block,
  level,
  runsPath,
}: {
  block: Block;
  level: HeadingLevel;
  /** Where this dataset's run pages live, when it has them */
  runsPath?: string | undefined;
}) {
  const data = await getBenchData(block.dataUrl);
  const sub = Math.min(level + 1, 5) as HeadingLevel;
  const id = `bench-${block.id}`;

  const header = (
    <header className="max-w-[48rem] space-y-4">
      <Heading level={level} id={id}>
        {block.title}
      </Heading>
      {block.note && <RichText markdown={block.note} headingLevel={sub} />}
    </header>
  );

  if (data.status === "unavailable") {
    return (
      <section aria-labelledby={id} className="space-y-6">
        {header}
        <Note title="Results unavailable">
          <p>
            {data.reason === "unsupported"
              ? "The published results use a newer data format than this site reads, so they aren't shown here yet."
              : "The results couldn't be loaded when this page was built. It tries again within the hour."}
          </p>
        </Note>
        <SourceLinks
          links={[
            { label: "Raw data", href: block.dataUrl },
            ...(block.methodUrl
              ? [{ label: "Method", href: block.methodUrl }]
              : []),
          ]}
        />
      </section>
    );
  }

  const { latest, latestUrl, index, indexUrl } = data;
  const view = benchView(latest, latest.results, {
    suites: block.suites,
    scenarios: block.scenarios,
  });
  const builds = [...new Set(latest.runs.map((run) => run.build))];

  return (
    <section aria-labelledby={id} className="space-y-12">
      <div className="space-y-6">
        {header}
        <p className="text-sm text-white/70">
          Updated{" "}
          <time dateTime={latest.updatedAt}>
            {formatDate(latest.updatedAt)}
          </time>{" "}
          · from {plural(latest.runs.length, "run")} on{" "}
          {builds.length === 1 ? "build" : "builds"} {builds.join(", ")}
        </p>
        <SourceLinks
          links={[
            { label: "Raw results (JSON)", href: latestUrl },
            ...(indexUrl
              ? [{ label: "Run index (JSON)", href: indexUrl }]
              : []),
            ...(block.methodUrl
              ? [{ label: "Method", href: block.methodUrl }]
              : []),
          ]}
        />
        <Note title="How the results are put together">
          <p>{latest.aggregation.rule}</p>
          <p>{latest.aggregation.caveat}</p>
        </Note>
        {/* the page runs long, so every part is a jump away */}
        <nav aria-label={`${block.title}: contents`}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              ...view.suites.map((suite) => ({
                href: `#${id}-${suite.id}`,
                label: suite.name,
              })),
              ...(view.notMeasured.length > 0
                ? [{ href: `#${id}-not-measured`, label: "Not measured" }]
                : []),
              ...(index ? [{ href: `#${id}-runs`, label: "Every run" }] : []),
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-6 items-center font-medium text-focus underline decoration-focus/40 underline-offset-4 hover:decoration-focus"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <BenchSuites view={view} level={sub} idPrefix={id} />

      <NotMeasuredList
        items={view.notMeasured}
        level={sub}
        id={`${id}-not-measured`}
      />

      {index && indexUrl && (
        <RunsTable
          runs={runList(index, latest)}
          level={sub}
          id={`${id}-runs`}
          runPath={runsPath ? (runId) => `${runsPath}/${runId}` : undefined}
          runDataUrl={(runId) => benchRunUrl(indexUrl, index, runId)}
        />
      )}
    </section>
  );
}
