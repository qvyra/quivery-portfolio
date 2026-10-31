import type { MetricView, SubjectView } from "@repo/shared";
import type { ReactNode } from "react";
import { ScrollRegion } from "./bench-results";
import {
  amountFormatter,
  formatRange,
  plural,
  secondsFormatter,
  ticks,
  type Formatter,
} from "./format";

// One metric of one scenario, as a chart with its table or as a table alone.
// Rows keep the data's order and nothing is singled out: no winner, no
// colour that means better. Every chart's numbers are also in a table, and
// historical subjects sit in their own group under a label

type ChartRow = {
  subject: SubjectView;
  min?: number | undefined;
  max?: number | undefined;
  median?: number | undefined;
  n: number;
  failed?: number | undefined;
  ties?: SubjectView[];
};

const pct = (value: number, top: number) => `${(value / top) * 100}%`;

function TieNote({ ties }: { ties?: SubjectView[] | undefined }) {
  if (!ties?.length) return null;
  return (
    <span className="block text-xs text-white/60">
      {/* labels can hold commas, so the list uses semicolons */}
      Tie with {ties.map((subject) => subject.label).join("; ")}
    </span>
  );
}

function SubjectLabel({ row }: { row: ChartRow }) {
  return (
    <span className="min-w-0 text-sm">
      <span className="font-medium text-white/90">{row.subject.label}</span>
      <TieNote ties={row.ties} />
    </span>
  );
}

function Track({
  row,
  top,
  grid,
  historical,
}: {
  row: ChartRow;
  top: number;
  grid: number[];
  historical: boolean;
}) {
  const { min, max, median } = row;
  return (
    <div className="relative h-6">
      {grid.map((value) => (
        <span
          key={value}
          className="absolute inset-y-0 w-px bg-white/10"
          style={{ left: pct(value, top) }}
        />
      ))}
      {min !== undefined && max !== undefined && (
        <span
          className={`absolute top-1/2 h-2 min-w-0.5 -translate-y-1/2 rounded-full ${
            historical ? "border border-dashed border-white/70" : "bg-orchid/75"
          }`}
          style={{ left: pct(min, top), width: pct(max - min, top) }}
        />
      )}
      {median !== undefined && (
        <span
          className={`absolute inset-y-0.5 w-[3px] -translate-x-1/2 rounded-full ring-2 ring-ink ${
            historical ? "bg-white/70" : "bg-white"
          }`}
          style={{ left: pct(median, top) }}
        />
      )}
    </div>
  );
}

function ValueText({ row, format }: { row: ChartRow; format: Formatter }) {
  const { min, max, median, n, failed } = row;
  const notes = [`n ${n}`, failed ? `${failed} failed` : null]
    .filter(Boolean)
    .join(" · ");
  if (min === undefined || max === undefined) {
    return (
      <span className="text-sm text-white/70">
        No successful samples
        <span className="block text-xs text-white/60">{notes}</span>
      </span>
    );
  }
  return (
    <span className="text-sm tabular-nums">
      <span className="font-medium text-white/90">
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
  top,
  grid,
  format,
  historical,
}: {
  rows: ChartRow[];
  top: number;
  grid: number[];
  format: Formatter;
  historical: boolean;
}) {
  // on a phone the label and value share a line and the bar gets the full
  // width under them
  return rows.map((row) => (
    <div key={row.subject.id} className={chartGrid}>
      <span className="min-w-0 sm:col-start-1 sm:row-start-1">
        <SubjectLabel row={row} />
      </span>
      <span className="text-right sm:col-start-3 sm:row-start-1 sm:text-left">
        <ValueText row={row} format={format} />
      </span>
      <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <Track row={row} top={top} grid={grid} historical={historical} />
      </div>
    </div>
  ));
}

const chartGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_9rem]";

function HistoricalLabel({ rows }: { rows: { subject: SubjectView }[] }) {
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

function DataTable({
  caption,
  head,
  current,
  historical,
}: {
  caption: string;
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
    <ScrollRegion label={caption}>
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
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

function MetricFigure({
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

function RangeChart({
  title,
  description,
  shows,
  current,
  historical,
  scaleMax,
  format,
  tableHead,
  tableCells,
}: {
  title: string;
  description?: string | undefined;
  shows: string;
  current: ChartRow[];
  historical: ChartRow[];
  scaleMax: number;
  format: Formatter;
  tableHead: string[];
  tableCells: (row: ChartRow) => ReactNode[];
}) {
  const grid = ticks(scaleMax);
  const top = grid.at(-1)!;
  const toTable = (rows: ChartRow[]) =>
    rows.map((row) => ({ key: row.subject.id, cells: tableCells(row) }));
  return (
    <MetricFigure title={title} description={description}>
      <p className="text-xs text-white/60">{shows}</p>
      {/* the chart repeats the table below it, so screen readers get the
          table alone */}
      <div aria-hidden="true" className="space-y-3">
        <ChartRows
          rows={current}
          top={top}
          grid={grid}
          format={format}
          historical={false}
        />
        {historical.length > 0 && (
          <div className="space-y-3 border-t border-dashed border-white/20 pt-3">
            <HistoricalLabel rows={historical} />
            <ChartRows
              rows={historical}
              top={top}
              grid={grid}
              format={format}
              historical
            />
          </div>
        )}
        <div className={chartGrid}>
          <div className="relative col-span-2 h-4 text-[0.6875rem] text-white/55 tabular-nums sm:col-span-1 sm:col-start-2">
            {grid.map((value, index) => (
              <span
                key={value}
                className={`absolute top-0 whitespace-nowrap ${
                  index === 0
                    ? ""
                    : index === grid.length - 1
                      ? "-translate-x-full"
                      : "-translate-x-1/2"
                }`}
                style={{ left: pct(value, top) }}
              >
                {format(value)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="group rounded-lg bg-white/[0.03] ring-1 ring-white/10 ring-inset">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-medium text-white/80 hover:text-white">
          Table: {title}
        </summary>
        <div className="px-4 pb-3">
          <DataTable
            caption={title}
            head={tableHead}
            current={toTable(current)}
            historical={toTable(historical)}
          />
        </div>
      </details>
    </MetricFigure>
  );
}

const valueOrDash = (value: number | undefined, format: Formatter) =>
  value === undefined ? "–" : format(value);

/** A metric view, as the kind of figure its values call for */
export function BenchMetric({
  view,
  timingStep,
}: {
  view: MetricView;
  timingStep?: string | undefined;
}) {
  const { metric } = view;
  switch (view.kind) {
    case "timing": {
      const format = secondsFormatter(view.scaleMax);
      const rows = (list: typeof view.current): ChartRow[] =>
        list.map((row) => ({
          subject: row.subject,
          ...row.value,
          ties: row.ties,
        }));
      return (
        <RangeChart
          title={metric.name}
          description={metric.description}
          shows={`Median (the upright tick) and min to max of every sample (the bar)${
            timingStep
              ? `. Medians less than one timing step (${timingStep}) apart are ties`
              : ""
          }.`}
          current={rows(view.current)}
          historical={rows(view.historical)}
          scaleMax={view.scaleMax}
          format={format}
          tableHead={[
            "Subject",
            "Median",
            "Min",
            "Max",
            "n",
            "Failed",
            "Tie with",
          ]}
          tableCells={(row) => [
            row.subject.label,
            valueOrDash(row.median, format),
            valueOrDash(row.min, format),
            valueOrDash(row.max, format),
            row.n,
            row.failed ?? 0,
            row.ties?.map((s) => s.label).join(", ") || "–",
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
          n: row.value.n,
          failed: row.value.failed,
        }));
      return (
        <RangeChart
          title={metric.name}
          description={metric.description}
          shows="Shown as a range only: the shortest and longest sample, no median."
          current={rows(view.current)}
          historical={rows(view.historical)}
          scaleMax={view.scaleMax}
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
        view.current[0]?.value.unit ?? view.historical[0]?.value.unit;
      const format = amountFormatter(unit ?? metric.unit ?? "");
      const rows = (list: typeof view.current): ChartRow[] =>
        list.map((row) => ({ subject: row.subject, ...row.value }));
      return (
        <RangeChart
          title={metric.name}
          description={metric.description}
          shows="Median (the upright tick) and min to max of every sample (the bar)."
          current={rows(view.current)}
          historical={rows(view.historical)}
          scaleMax={view.scaleMax}
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
