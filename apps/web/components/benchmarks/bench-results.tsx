import type { BenchView, NotMeasuredView, RunListItem } from "@repo/shared";
import { ArrowUpRight, Cpu, Server } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BenchMetric } from "./bench-metrics";
import { formatDate, stepLabel } from "./format";

export type HeadingLevel = 2 | 3 | 4 | 5;

const headingClass: Record<HeadingLevel, string> = {
  2: "text-h2 font-semibold",
  3: "text-h3 font-semibold",
  4: "text-lg font-semibold",
  5: "font-semibold",
};

export function Heading({
  level,
  id,
  className,
  children,
}: {
  level: HeadingLevel;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      id={id}
      className={[headingClass[level], className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}

const deeper = (level: HeadingLevel): HeadingLevel =>
  Math.min(level + 1, 5) as HeadingLevel;

/** A link out of the site, said so for screen readers */
export function OutLink({
  href,
  children,
  className = "font-medium text-focus underline decoration-focus/40 underline-offset-4 hover:decoration-focus",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Note({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="rounded-xl bg-white/[0.03] p-4 text-sm ring-1 ring-white/10 ring-inset sm:p-5">
      <p className="font-semibold text-white/90">{title}</p>
      <div className="mt-1.5 space-y-2 text-white/70">{children}</div>
    </aside>
  );
}

/**
 * A table wider than a phone scrolls on its own. It takes focus so keyboard
 * users can scroll it too, and is positioned so screen-reader-only text in a
 * wide table can't stretch the page
 */
export function ScrollRegion({
  label,
  labelledBy,
  children,
}: {
  label?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative overflow-x-auto rounded-sm"
      role="region"
      aria-label={label}
      aria-labelledby={labelledBy}
      // a scrollable region has to be focusable, the rule doesn't know role
      // region scrolls
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {children}
    </div>
  );
}

/** Every suite of a view, each with its scenarios and metrics */
export function BenchSuites({
  view,
  level,
  idPrefix,
}: {
  view: BenchView;
  level: HeadingLevel;
  idPrefix: string;
}) {
  return (
    <div className="space-y-16">
      {view.suites.map((suite) => {
        const hasTimings = suite.scenarios.some((scenario) =>
          scenario.metrics.some((metric) => metric.kind === "timing"),
        );
        const step =
          hasTimings && suite.timingResolution
            ? stepLabel(suite.timingResolution)
            : undefined;
        return (
          <section
            key={suite.id}
            aria-labelledby={`${idPrefix}-${suite.id}`}
            className="space-y-8"
          >
            <header className="max-w-[48rem] space-y-3">
              <Heading level={level} id={`${idPrefix}-${suite.id}`}>
                {suite.name}
              </Heading>
              <Badge>
                {suite.environment === "roblox-live" ? (
                  <Server aria-hidden="true" className="size-3.5" />
                ) : (
                  <Cpu aria-hidden="true" className="size-3.5" />
                )}
                {suite.environmentLabel}
              </Badge>
              <p className="text-white/75">{suite.description}</p>
              {suite.caveat && (
                <Note title="Caveat">
                  <p>{suite.caveat}</p>
                </Note>
              )}
            </header>
            {suite.scenarios.map((scenario) => (
              <section
                key={scenario.id}
                aria-labelledby={`${idPrefix}-${suite.id}-${scenario.id}`}
                className="space-y-6 border-t border-white/10 pt-8"
              >
                <div className="max-w-[48rem] space-y-1">
                  <Heading
                    level={deeper(level)}
                    id={`${idPrefix}-${suite.id}-${scenario.id}`}
                  >
                    {scenario.name}
                  </Heading>
                  {scenario.description && (
                    <p className="text-sm text-white/70">
                      {scenario.description}
                    </p>
                  )}
                </div>
                <div className="space-y-10">
                  {scenario.metrics.map((metric) => (
                    <BenchMetric
                      key={`${metric.metric.id}-${metric.kind}`}
                      view={metric}
                      timingStep={step}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function NotMeasuredList({
  items,
  level,
  id,
}: {
  items: NotMeasuredView[];
  level: HeadingLevel;
  id: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <Heading level={level} id={id}>
        Not measured
      </Heading>
      <dl className="max-w-[48rem] divide-y divide-white/10">
        {items.map((item, index) => (
          <div key={index} className="py-3">
            <dt className="font-medium">{item.label}</dt>
            <dd className="mt-1 text-sm text-white/70">{item.reason}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RunsTable({
  runs,
  level,
  id,
  runPath,
  runDataUrl,
}: {
  runs: RunListItem[];
  level: HeadingLevel;
  id: string;
  /** The run's page on this site, when there is one */
  runPath?: ((runId: string) => string) | undefined;
  runDataUrl: (runId: string) => string | null;
}) {
  if (runs.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <Heading level={level} id={id}>
        Every run
      </Heading>
      <p className="max-w-[48rem] text-sm text-white/70">
        Newest first. The results above come from the runs marked as used.
      </p>
      <ScrollRegion labelledBy={id}>
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="text-xs text-white/60">
              <th scope="col" className="py-2 pr-4 font-medium">
                Run
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Date
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Build
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Results above
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const data = runDataUrl(run.id);
              return (
                <tr key={run.id} className="border-t border-white/10">
                  <th scope="row" className="py-2 pr-4 font-mono font-medium">
                    {runPath ? (
                      <Link
                        href={runPath(run.id)}
                        className="inline-flex min-h-6 items-center text-focus underline decoration-focus/40 underline-offset-4 hover:decoration-focus"
                      >
                        {run.id}
                      </Link>
                    ) : (
                      run.id
                    )}
                  </th>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <time dateTime={run.date}>{formatDate(run.date)}</time>
                  </td>
                  <td className="py-2 pr-4">{run.build}</td>
                  <td className="py-2 pr-4">
                    {run.inLatest ? "Used" : "Not used"}
                  </td>
                  <td className="py-2 pr-4">
                    {data && (
                      <OutLink href={data}>
                        JSON
                        <span className="sr-only"> for run {run.id}</span>
                      </OutLink>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}

/** Links to the data behind a view and the method */
export function SourceLinks({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            {link.label}
            <ArrowUpRight data-icon="end" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
