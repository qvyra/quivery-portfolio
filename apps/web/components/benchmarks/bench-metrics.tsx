import type { MetricView, SubjectView } from "@repo/shared";
import type { ReactNode } from "react";
import { ScrollRegion } from "./bench-results";
import {
  amountFormatter,
  formatRange,
  plural,
  resolutionLabel,
  secondsFormatter,
  tickFormatter,
  type Formatter,
} from "./format";
import { chartScale, type Scale } from "./scale";

// One metric of one scenario, as a chart with its table or as a table alone.
// Rows keep the data's order and nothing is singled out: no winner, no
// colour that means better. Every chart's numbers are also in a table, and
// historical subjects sit in their own group under a label

type ChartRow = {
  subject: SubjectView;
  min?: number | undefined;
  max?: number | undefined;
  median?: number | undefined;
  samples: number[];
  n: number;
  failed?: number | undefined;
};

// Each row is one SVG stretched to the track's width. Strokes don't scale
// with it (non-scaling-stroke), so a zero-length round-capped line draws a
// true circle, and a range too narrow to see still shows as a 6px mark.
// Every sample dot is a faint circle on the bar's centre line, so samples
// that overlap add up and read as denser. Samples landing on the same spot
// share one circle, as opaque as that many stacked ones, which keeps the
// look and the page's element count down
const VIEW_W = 1000;
const VIEW_H = 28;
const MID = VIEW_H / 2;

/** Each spot samples land on, with how many land there */
function dotSpots(samples: number[], scale: Scale) {
  const spots = new Map<string, number>();
  for (const value of samples) {
    const x = (scale.at(value) * VIEW_W).toFixed(1);
    spots.set(x, (spots.get(x) ?? 0) + 1);
  }
  return [...spots];
}

// k circles of opacity a stacked show as 1 - (1 - a)^k
const stacked = (alpha: number, count: number) =>
  Number((1 - (1 - alpha) ** count).toFixed(3));

const gridPath = (values: number[], scale: Scale) =>
  values
    .map((value) => `M${(scale.at(value) * VIEW_W).toFixed(1)} 0V${VIEW_H}`)
    .join("");

function GridLines({ scale }: { scale: Scale }) {
  return (
    <>
      {scale.minor.length > 0 && (
        <path
          d={gridPath(scale.minor, scale)}
          stroke="rgb(255 255 255 / 0.07)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          shapeRendering="crispEdges"
        />
      )}
      <path
        d={gridPath(scale.ticks, scale)}
        stroke="rgb(255 255 255 / 0.24)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
      />
    </>
  );
}

function Track({
  row,
  scale,
  historical,
  className,
}: {
  row: ChartRow;
  scale: Scale;
  historical: boolean;
  className: string;
}) {
  const { min, max, median, samples } = row;
  const x = (value: number) => (scale.at(value) * VIEW_W).toFixed(1);
  const dotAlpha = historical ? 0.3 : 0.4;
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className={`block h-7 w-full overflow-visible ${className}`}
    >
      <GridLines scale={scale} />
      {min !== undefined && max !== undefined && (
        <path
          d={`M${x(min)} ${MID}H${x(max)}`}
          stroke={
            historical ? "rgb(255 255 255 / 0.55)" : "rgb(220 0 255 / 0.45)"
          }
          strokeWidth={historical ? 2 : 6}
          strokeLinecap="round"
          strokeDasharray={historical ? "4 4" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {samples.length > 0 && (
        <g
          stroke={historical ? "rgb(255 255 255)" : "rgb(245 184 255)"}
          strokeOpacity={dotAlpha}
          strokeWidth={4}
          strokeLinecap="round"
        >
          {dotSpots(samples, scale).map(([at, count]) => (
            <path
              key={at}
              d={`M${at} ${MID}h0`}
              strokeOpacity={count > 1 ? stacked(dotAlpha, count) : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}
      {median !== undefined && (
        <>
          {/* a dark edge keeps the tick readable over the dots */}
          <path
            d={`M${x(median)} 1V${VIEW_H - 1}`}
            stroke="var(--color-ink)"
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M${x(median)} 2V${VIEW_H - 2}`}
            stroke={historical ? "rgb(255 255 255 / 0.75)" : "white"}
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}

// the value cell itself, so each row has no extra wrapper
function ValueText({
  row,
  format,
  className,
}: {
  row: ChartRow;
  format: Formatter;
  className: string;
}) {
  const { min, max, median, n, failed } = row;
  const notes = [`n ${n}`, failed ? `${failed} failed` : null]
    .filter(Boolean)
    .join(" · ");
  if (min === undefined || max === undefined) {
    return (
      <span className={`text-white/70 ${className}`}>
        <span className="text-sm">No successful samples</span>
        <span className="block text-xs text-white/60">{notes}</span>
      </span>
    );
  }
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="text-sm font-medium text-white/90">
        {median !== undefined ? format(median) : formatRange(format, min, max)}
      </span>
      <span className="block text-xs text-white/60">
        {median !== undefined && `${formatRange(format, min, max)} · `}
        {notes}
      </span>
    </span>
  );
}

function ChartRows({
  rows,
  scale,
  format,
  historical,
}: {
  rows: ChartRow[];
  scale: Scale;
  format: Formatter;
  historical: boolean;
}) {
  // on a phone the label and value share a line and the track gets the full
  // width under them
  return rows.map((row) => (
    <div key={row.subject.id} className={chartGrid}>
      <span className="min-w-0 text-sm font-medium text-white/90 sm:col-start-1 sm:row-start-1">
        {row.subject.label}
      </span>
      <ValueText
        row={row}
        format={format}
        className="text-right sm:col-start-3 sm:row-start-1 sm:text-left"
      />
      <Track
        row={row}
        scale={scale}
        historical={historical}
        className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
      />
    </div>
  ));
}

const chartGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_9rem]";

/**
 * A calm surface behind a chart's gridlines, so the page's wordmark and
 * particles don't show through them. A tint and a hairline, nothing that
 * draws the eye
 */
export function ChartSurface({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-ink-raised/75 p-4 sm:p-5">
      {children}
    </div>
  );
}

/** What the axis does, when it isn't a plain 0-based one */
export function axisNote(scale: Scale, format: Formatter) {
  if (scale.kind === "log") return "Log scale";
  return scale.start === 0 ? null : `Axis starts at ${format(scale.start)}`;
}

export function HistoricalLabel({
  rows,
}: {
  rows: { subject: SubjectView }[];
}) {
  const notes = [...new Set(rows.flatMap((row) => row.subject.notes))];
  return (
    <p className="text-xs text-white/60">
      <span className="font-semibold tracking-wide text-white/75 uppercase">
        Historical build
      </span>
      {notes.length > 0 && <> · {notes.join(" ")}</>}
    </p>
  );
}

export function DataTable({
  caption,
  context,
  head,
  current,
  historical,
}: {
  caption: string;
  /** Where the table sits (scenario and suite), so tables of the same
   metric in different places get different names */
  context?: string | undefined;
  head: string[];
  current: { key: string; cells: ReactNode[] }[];
  historical: { key: string; cells: ReactNode[] }[];
}) {
  const row = ({ key, cells }: { key: string; cells: ReactNode[] }) => (
    <tr key={key} className="border-t border-white/10">
      <th scope="row" className="py-2 pr-4 text-left font-medium">
        {cells[0]}
      </th>
      {cells.slice(1).map((cell, index) => (
        <td key={index} className="py-2 pr-4 tabular-nums">
          {cell}
        </td>
      ))}
    </tr>
  );
  return (
    <ScrollRegion label={context ? `${caption} (${context})` : caption}>
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">
          {context ? `${caption} (${context})` : caption}
        </caption>
        <thead>
          <tr className="text-xs text-white/60">
            {head.map((label) => (
              <th key={label} scope="col" className="py-2 pr-4 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{current.map(row)}</tbody>
        {historical.length > 0 && (
          <tbody>
            <tr className="border-t border-white/10">
              <th
                scope="colgroup"
                colSpan={head.length}
                className="pt-4 pb-1 text-left text-xs font-semibold tracking-wide text-white/75 uppercase"
              >
                Historical build
              </th>
            </tr>
            {historical.map(row)}
          </tbody>
        )}
      </table>
    </ScrollRegion>
  );
}

export function MetricFigure({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-4">
      <figcaption>
        <span className="block font-semibold">{title}</span>
        {description && (
          <span className="mt-1 block text-sm text-white/65">
            {description}
          </span>
        )}
      </figcaption>
      {children}
    </figure>
  );
}

/** The axis under a chart's tracks, with its note at the right */
export function AxisLabels({
  scale,
  format,
  className = "",
}: {
  scale: Scale;
  format: Formatter;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="relative h-4 text-[0.6875rem] text-white/60 tabular-nums">
        {scale.ticks.map((value, index) => (
          <span
            key={value}
            className={`absolute top-0 whitespace-nowrap ${
              index === 0
                ? ""
                : index === scale.ticks.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            }`}
            style={{ left: `${scale.at(value) * 100}%` }}
          >
            {format(value)}
          </span>
        ))}
      </div>
      <AxisNoteText scale={scale} format={format} />
    </div>
  );
}

/** "Log scale" or where a fitted axis starts, at the chart's bottom right */
export function AxisNoteText({
  scale,
  format,
}: {
  scale: Scale;
  format: Formatter;
}) {
  const note = axisNote(scale, format);
  return note ? (
    <p className="mt-1 text-right text-[0.6875rem] text-white/60">{note}</p>
  ) : null;
}

export function TableDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    // the table's inset comes from here, so it needs no wrapper of its own
    <details className="group rounded-lg bg-white/[0.03] ring-1 ring-white/10 ring-inset open:pb-3 [&>[role=region]]:mx-4">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-medium text-white/80 hover:text-white">
        Table: {title}
      </summary>
      {children}
    </details>
  );
}

function RangeChart({
  title,
  context,
  description,
  notes,
  current,
  historical,
  unit,
  format,
  tableHead,
  tableCells,
}: {
  title: string;
  context?: string | undefined;
  description?: string | undefined;
  notes: string[];
  current: ChartRow[];
  historical: ChartRow[];
  unit: string;
  format: Formatter;
  tableHead: string[];
  tableCells: (row: ChartRow) => ReactNode[];
}) {
  const scale = chartScale(
    [...current, ...historical].flatMap((row) =>
      [row.min, row.max, row.median, ...row.samples].filter(
        (value): value is number => value !== undefined,
      ),
    ),
  );
  const toTable = (rows: ChartRow[]) =>
    rows.map((row) => ({ key: row.subject.id, cells: tableCells(row) }));
  return (
    <MetricFigure title={title} description={description}>
      <ChartSurface>
        <div className="space-y-1 text-xs text-white/65">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        {/* the chart repeats the table below it, so screen readers get the
            table alone */}
        <div aria-hidden="true" className="mt-4 space-y-3">
          <ChartRows
            rows={current}
            scale={scale}
            format={format}
            historical={false}
          />
          {historical.length > 0 && (
            <div className="space-y-3 border-t border-dashed border-white/20 pt-3">
              <HistoricalLabel rows={historical} />
              <ChartRows
                rows={historical}
                scale={scale}
                format={format}
                historical
              />
            </div>
          )}
          <div className={chartGrid}>
            <AxisLabels
              scale={scale}
              format={tickFormatter(unit, scale)}
              className="col-span-2 sm:col-span-1 sm:col-start-2"
            />
          </div>
        </div>
      </ChartSurface>
      <TableDisclosure title={title}>
        <DataTable
          caption={title}
          context={context}
          head={tableHead}
          current={toTable(current)}
          historical={toTable(historical)}
        />
      </TableDisclosure>
    </MetricFigure>
  );
}

export const valueOrDash = (value: number | undefined, format: Formatter) =>
  value === undefined ? "–" : format(value);

const DOTS =
  "Each dot is one sample, and where samples overlap the dots look denser.";

/** A metric view, as the kind of figure its values call for */
export function BenchMetric({
  view,
  resolution,
  context,
}: {
  view: MetricView;
  /** Where it sits, scenario and suite, to tell its table apart */
  context?: string | undefined;
  /** The suite's timing resolution in seconds */
  resolution?: number | undefined;
}) {
  const { metric } = view;
  switch (view.kind) {
    case "timing": {
      const format = secondsFormatter(view.scaleMax);
      const rows = (list: typeof view.current): ChartRow[] =>
        list.map((row) => ({ subject: row.subject, ...row.value }));
      return (
        <RangeChart
          title={metric.name}
          context={context}
          description={metric.description}
          notes={[
            ...(resolution
              ? [
                  `Differences under ${resolutionLabel(resolution)} are within the timer's resolution.`,
                ]
              : []),
            `${DOTS} The upright tick is the median and the bar runs from min to max.`,
          ]}
          current={rows(view.current)}
          historical={rows(view.historical)}
          unit="s"
          format={format}
          tableHead={["Subject", "Median", "Min", "Max", "n", "Failed"]}
          tableCells={(row) => [
            row.subject.label,
            valueOrDash(row.median, format),
            valueOrDash(row.min, format),
            valueOrDash(row.max, format),
            row.n,
            row.failed ?? 0,
          ]}
        />
      );
    }
    case "range": {
      const format = secondsFormatter(view.scaleMax);
      const rows = (list: typeof view.current): ChartRow[] =>
        list.map((row) => ({
          subject: row.subject,
          min: row.value.min,
          max: row.value.max,
          samples: row.value.samples,
          n: row.value.n,
          failed: row.value.failed,
        }));
      return (
        <RangeChart
          title={metric.name}
          context={context}
          description={metric.description}
          notes={[
            `Shown as a range only, no median. ${DOTS} The bar runs from the shortest sample to the longest.`,
          ]}
          current={rows(view.current)}
          historical={rows(view.historical)}
          unit="s"
          format={format}
          tableHead={["Subject", "Min", "Max", "n", "Failed"]}
          tableCells={(row) => [
            row.subject.label,
            valueOrDash(row.min, format),
            valueOrDash(row.max, format),
            row.n,
            row.failed ?? 0,
          ]}
        />
      );
    }
    case "amount": {
      const unit =
        view.current[0]?.value.unit ??
        view.historical[0]?.value.unit ??
        metric.unit ??
        "";
      const format = amountFormatter(unit);
      const rows = (list: typeof view.current): ChartRow[] =>
        list.map((row) => ({ subject: row.subject, ...row.value }));
      return (
        <RangeChart
          title={metric.name}
          context={context}
          description={metric.description}
          notes={[
            `${DOTS} The upright tick is the median and the bar runs from min to max.`,
          ]}
          current={rows(view.current)}
          historical={rows(view.historical)}
          unit={unit}
          format={format}
          tableHead={["Subject", "Median", "Min", "Max", "n"]}
          tableCells={(row) => [
            row.subject.label,
            valueOrDash(row.median, format),
            valueOrDash(row.min, format),
            valueOrDash(row.max, format),
            row.n,
          ]}
        />
      );
    }
    case "count": {
      const toTable = (list: typeof view.current) =>
        list.map(({ subject, value }) => ({
          key: subject.id,
          cells: [
            subject.label,
            <span key="v" className="text-lg font-semibold">
              {value.passed} of {value.total}
            </span>,
          ],
        }));
      return (
        <MetricFigure title={metric.name} description={metric.description}>
          <DataTable
            caption={metric.name}
            context={context}
            head={["Subject", metric.name]}
            current={toTable(view.current)}
            historical={toTable(view.historical)}
          />
        </MetricFigure>
      );
    }
    case "values": {
      const toTable = (list: typeof view.current) =>
        list.map(({ subject, value }) => ({
          key: subject.id,
          cells: [
            subject.label,
            <span key="v" className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(value.counts)
                .sort(([, a], [, b]) => b - a)
                .map(([seen, count]) => (
                  <span key={seen}>
                    <span className="text-lg font-semibold">{seen}</span>{" "}
                    <span className="text-white/70">
                      in {count} of {value.total}
                    </span>
                  </span>
                ))}
            </span>,
          ],
        }));
      return (
        <MetricFigure title={metric.name} description={metric.description}>
          <DataTable
            caption={metric.name}
            context={context}
            head={["Subject", metric.name]}
            current={toTable(view.current)}
            historical={toTable(view.historical)}
          />
        </MetricFigure>
      );
    }
    case "requests": {
      const toTable = (list: typeof view.current) =>
        list.map(({ subject, value }) => ({
          key: subject.id,
          cells: [
            subject.label,
            ...view.methods.map((method) => {
              const used = value.byMethod[method.id];
              if (!used) return "–";
              return used.min === used.max
                ? used.min
                : `${used.min} to ${used.max}`;
            }),
            value.n,
            value.exact ? "Same in every sample" : "Varied between samples",
          ],
        }));
      return (
        <MetricFigure title={metric.name} description={metric.description}>
          <p className="text-xs text-white/60">
            Requests per sample, by method. A range means the count varied
            between samples. {plural(view.methods.length, "method")} used.
          </p>
          <DataTable
            caption={metric.name}
            context={context}
            head={[
              "Subject",
              ...view.methods.map((method) => method.label),
              "n",
              "Counts",
            ]}
            current={toTable(view.current)}
            historical={toTable(view.historical)}
          />
        </MetricFigure>
      );
    }
  }
}
