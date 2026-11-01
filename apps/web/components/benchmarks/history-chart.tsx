import type { HistoryView } from "@repo/shared";
import {
  AxisNoteText,
  ChartSurface,
  DataTable,
  MetricFigure,
  TableDisclosure,
} from "./bench-metrics";
import {
  plural,
  resolutionLabel,
  secondsFormatter,
  tickFormatter,
} from "./format";
import { chartScale } from "./scale";

// A library's median timing build by build, as a small line chart with every
// point labelled. Historical builds have hollow points joined by a dashed
// line, so the change of build line reads without colour. The axis starts at
// 0: a fitted one would turn a change within the timer's resolution into a
// steep slope

const VIEW_W = 1000;
const VIEW_H = 100;

/** One timing's history, under the chart of its current results */
export function HistoryChart({
  view,
  resolution,
  context,
}: {
  view: HistoryView;
  /** Where it sits, scenario and suite, to tell its table apart */
  context?: string | undefined;
  /** The suite's timing resolution in seconds */
  resolution?: number | undefined;
}) {
  const { points } = view;
  const medians = points.map((point) => point.median);
  const scale = chartScale(medians, { zero: true });
  const format = secondsFormatter(Math.max(...medians));
  const ticks = tickFormatter("s", scale);
  // even spacing, half a step in from each edge
  const x = (index: number) => (index + 0.5) / points.length;
  const y = (value: number) => 1 - scale.at(value);
  const title = `${view.library}'s median by build`;
  const segments = points.slice(1).map((point, index) => {
    const from = points[index]!;
    return {
      key: point.build,
      d: `M${x(index) * VIEW_W} ${y(from.median) * VIEW_H}L${
        x(index + 1) * VIEW_W
      } ${y(point.median) * VIEW_H}`,
      // dashed while either end is a historical build
      dashed: from.subject.historical || point.subject.historical,
    };
  });
  const notes = [
    ...new Set(points.flatMap((point) => point.subject.notes)),
  ].join(" ");

  return (
    <MetricFigure
      title={title}
      description={`The median of every sample from each build's runs.${
        notes ? ` ${notes}` : ""
      }`}
    >
      <ChartSurface>
        {resolution && (
          <p className="mb-3 text-xs text-white/65">
            Differences under {resolutionLabel(resolution)} are within the
            timer&apos;s resolution.
          </p>
        )}
        <div aria-hidden="true">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/65">
            <li className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full border-2 border-white/75" />
              Historical build
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-focus" />
              Current build
            </li>
          </ul>
          {/* room above for the value labels, below for the build names */}
          <div className="relative mt-3 h-40 pt-7 pb-7">
            {/* the axis labels get a gutter of their own, clear of the points */}
            <div className="relative ml-12 h-full">
              {scale.ticks.map((value) => (
                <span
                  key={value}
                  className="absolute right-0 -left-12 border-t border-white/[0.22]"
                  style={{ top: `${y(value) * 100}%` }}
                >
                  <span className="absolute -top-2 left-0 bg-ink-raised pr-1 text-[0.6875rem] leading-4 text-white/60 tabular-nums">
                    {ticks(value)}
                  </span>
                </span>
              ))}
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
              >
                {segments.map((segment) => (
                  <path
                    key={segment.key}
                    d={segment.d}
                    fill="none"
                    stroke={
                      segment.dashed
                        ? "rgb(255 255 255 / 0.55)"
                        : "rgb(245 184 255 / 0.85)"
                    }
                    strokeWidth={2}
                    strokeDasharray={segment.dashed ? "5 5" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {points.map((point, index) => (
                <span
                  key={point.build}
                  className="absolute"
                  style={{
                    left: `${x(index) * 100}%`,
                    top: `${y(point.median) * 100}%`,
                  }}
                >
                  <span
                    className={`absolute size-2.5 -translate-1/2 rounded-full ring-2 ring-ink ${
                      point.subject.historical
                        ? "border-2 border-white/75 bg-ink"
                        : "bg-focus"
                    }`}
                  />
                  <span className="absolute bottom-2.5 -translate-x-1/2 rounded-xs bg-ink-raised px-1 text-xs font-medium whitespace-nowrap text-white/90 tabular-nums">
                    {format(point.median)}
                  </span>
                </span>
              ))}
            </div>
            <div className="absolute right-0 bottom-0 left-12 h-5">
              {points.map((point, index) => (
                <span
                  key={point.build}
                  className="absolute -translate-x-1/2 text-[0.6875rem] whitespace-nowrap text-white/60"
                  style={{ left: `${x(index) * 100}%` }}
                >
                  {point.build}
                </span>
              ))}
            </div>
          </div>
          <AxisNoteText scale={scale} format={ticks} />
        </div>
      </ChartSurface>
      <TableDisclosure title={title}>
        <DataTable
          caption={title}
          context={context}
          head={["Build", "Subject", "Median", "Samples", "Runs"]}
          current={points.map((point) => ({
            key: point.build,
            cells: [
              point.subject.historical
                ? `${point.build} (historical)`
                : point.build,
              point.subject.label,
              format(point.median),
              point.n,
              plural(point.runs, "run"),
            ],
          }))}
          historical={[]}
        />
      </TableDisclosure>
    </MetricFigure>
  );
}
