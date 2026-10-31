import type {
  BenchIndex,
  BenchLatest,
  BenchMetric,
  BenchResult,
  BenchRun,
  BenchSuite,
  BenchValue,
} from "./v1.js";

// Turns bench data into what a page shows, without judging it: subjects keep
// the data's order, nothing is ranked, and the text all comes from the data.
// Results of a recordedOnly suite, or that name a suite, scenario, metric or
// subject the data doesn't define, are never shown

export type SubjectView = {
  id: string;
  /** The config label, e.g. "Geode, mailbox = true" */
  label: string;
  library: string;
  historical: boolean;
  /** What the subject's build lines mean, for historical ones */
  notes: string[];
};

type Row<V> = { subject: SubjectView; value: V };
type ValueOf<K extends BenchValue["kind"]> = Extract<BenchValue, { kind: K }>;

export type TimingRow = Row<ValueOf<"timing">> & {
  /** Other current subjects whose median is less than one timing step away */
  ties: SubjectView[];
};

export type MetricView =
  | {
      kind: "timing";
      metric: BenchMetric;
      current: TimingRow[];
      historical: TimingRow[];
      /** The longest time shown, for a shared scale */
      scaleMax: number;
    }
  | {
      kind: "range";
      metric: BenchMetric;
      current: Row<ValueOf<"range">>[];
      historical: Row<ValueOf<"range">>[];
      scaleMax: number;
    }
  | {
      kind: "amount";
      metric: BenchMetric;
      current: Row<ValueOf<"amount">>[];
      historical: Row<ValueOf<"amount">>[];
      scaleMax: number;
    }
  | {
      kind: "requests";
      metric: BenchMetric;
      /** The methods any row used, in the data's order */
      methods: { id: string; label: string; description?: string }[];
      current: Row<ValueOf<"requests">>[];
      historical: Row<ValueOf<"requests">>[];
    }
  | {
      kind: "count";
      metric: BenchMetric;
      current: Row<ValueOf<"count">>[];
      historical: Row<ValueOf<"count">>[];
    }
  | {
      kind: "values";
      metric: BenchMetric;
      current: Row<ValueOf<"values">>[];
      historical: Row<ValueOf<"values">>[];
    };

export type ScenarioView = {
  id: string;
  name: string;
  description?: string;
  /** Correctness first, then times, then request counts */
  metrics: MetricView[];
};

export type SuiteView = {
  id: string;
  name: string;
  environment: BenchSuite["environment"];
  /** "Live Roblox servers", or "Lune" and the one library it ran, if one */
  environmentLabel: string;
  description: string;
  caveat?: string;
  timingResolution?: number;
  scenarios: ScenarioView[];
};

export type NotMeasuredView = { label: string; reason: string };

export type BenchView = {
  suites: SuiteView[];
  notMeasured: NotMeasuredView[];
};

export type BenchViewOptions = {
  /** Suite ids to show, all when empty */
  suites?: readonly string[];
  /** Scenario ids to show, all when empty */
  scenarios?: readonly string[];
  /**
   * Whether historical subjects get their own group. Within one run every
   * subject ran side by side, so a run's view keeps them together
   */
  separateHistorical?: boolean;
};

const kindOrder: Record<BenchValue["kind"], number> = {
  count: 0,
  values: 1,
  timing: 2,
  range: 2,
  amount: 2,
  requests: 3,
};

// "lock-takeover" → "Lock takeover", for ids the data doesn't name
const humanize = (id: string) =>
  id.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

function subjectViews(latest: BenchLatest): Map<string, SubjectView> {
  const lines = new Map(latest.lines.map((line) => [line.id, line]));
  return new Map(
    latest.subjects.map((subject) => [
      subject.id,
      {
        id: subject.id,
        label: subject.config.label,
        library: subject.library,
        historical: subject.historical === true,
        notes:
          subject.historical === true
            ? (subject.lines ?? []).flatMap((id) => {
                const line = lines.get(id);
                return line ? [line.description] : [];
              })
            : [],
      },
    ]),
  );
}

const highest = (rows: Row<BenchValue>[]) =>
  Math.max(
    0,
    ...rows.map(({ value }) =>
      "max" in value && value.max !== undefined ? value.max : 0,
    ),
  );

function withTies(
  rows: Row<ValueOf<"timing">>[],
  resolution: number | undefined,
): TimingRow[] {
  return rows.map((row) => ({
    ...row,
    ties:
      resolution === undefined || row.value.median === undefined
        ? []
        : rows
            .filter(
              (other) =>
                other !== row &&
                other.value.median !== undefined &&
                Math.abs(other.value.median - row.value.median!) < resolution,
            )
            .map((other) => other.subject),
  }));
}

function metricView(
  metric: BenchMetric,
  kind: BenchValue["kind"],
  rows: Row<BenchValue>[],
  suite: BenchSuite,
  latest: BenchLatest,
  separate: boolean,
): MetricView {
  const split = <V>(list: Row<V>[]) => ({
    current: list.filter((row) => !separate || !row.subject.historical),
    historical: list.filter((row) => separate && row.subject.historical),
  });
  // every row has this view's kind, the caller grouped them by it
  const of = <K extends BenchValue["kind"]>() => rows as Row<ValueOf<K>>[];

  switch (kind) {
    case "timing": {
      const { current, historical } = split(of<"timing">());
      return {
        kind,
        metric,
        // ties are only called among current subjects, a historical one
        // stands apart from them
        current: withTies(current, suite.timingResolution),
        historical: withTies(historical, undefined),
        scaleMax: highest(rows),
      };
    }
    case "range":
      return { kind, metric, ...split(of<"range">()), scaleMax: highest(rows) };
    case "amount":
      return {
        kind,
        metric,
        ...split(of<"amount">()),
        scaleMax: highest(rows),
      };
    case "requests": {
      const used = new Set(
        of<"requests">().flatMap((row) => Object.keys(row.value.byMethod)),
      );
      const known = latest.requestMethods.filter((method) =>
        used.has(method.id),
      );
      // a method the data doesn't list still shows, under its id
      const unknown = [...used]
        .filter((id) => !known.some((method) => method.id === id))
        .map((id) => ({ id, label: id }));
      return {
        kind,
        metric,
        methods: [...known, ...unknown],
        ...split(of<"requests">()),
      };
    }
    case "count":
      return { kind, metric, ...split(of<"count">()) };
    case "values":
      return { kind, metric, ...split(of<"values">()) };
  }
}

function environmentLabel(suite: BenchSuite, libraries: Set<string>) {
  if (suite.environment === "roblox-live") return "Live Roblox servers";
  return libraries.size === 1 ? `Lune, ${[...libraries][0]} only` : "Lune";
}

/**
 * The view of a set of results: latest.json's own, or one run's. Suites,
 * metrics and subjects always come from latest.json
 */
export function benchView(
  latest: BenchLatest,
  results: BenchResult[],
  options: BenchViewOptions = {},
): BenchView {
  const separate = options.separateHistorical ?? true;
  const subjects = subjectViews(latest);
  const subjectOrder = latest.subjects.map((subject) => subject.id);
  const metrics = new Map(latest.metrics.map((metric) => [metric.id, metric]));
  const wantSuite = (id: string) =>
    !options.suites?.length || options.suites.includes(id);
  const wantScenario = (id: string) =>
    !options.scenarios?.length || options.scenarios.includes(id);

  const suites = latest.suites
    .filter((suite) => suite.recordedOnly !== true && wantSuite(suite.id))
    .map((suite): SuiteView => {
      const suiteResults = results.filter(
        (result) => result.suite === suite.id && subjects.has(result.subject),
      );
      const scenarios = suite.scenarios
        .filter((scenario) => wantScenario(scenario.id))
        .map((scenario): ScenarioView => {
          const views = scenario.metrics.flatMap((metricId) => {
            const metric = metrics.get(metricId);
            if (!metric) return [];
            const rows = suiteResults
              .filter(
                (result) =>
                  result.scenario === scenario.id && result.metric === metricId,
              )
              .sort(
                (a, b) =>
                  subjectOrder.indexOf(a.subject) -
                  subjectOrder.indexOf(b.subject),
              );
            // one view per value kind, should a metric ever mix them
            const kinds = [...new Set(rows.map((row) => row.value.kind))];
            return kinds.map((kind) =>
              metricView(
                metric,
                kind,
                rows
                  .filter((row) => row.value.kind === kind)
                  .map((row) => ({
                    subject: subjects.get(row.subject)!,
                    value: row.value,
                  })),
                suite,
                latest,
                separate,
              ),
            );
          });
          return {
            id: scenario.id,
            name: scenario.name,
            ...(scenario.description && {
              description: scenario.description,
            }),
            metrics: views.sort(
              (a, b) => kindOrder[a.kind] - kindOrder[b.kind],
            ),
          };
        })
        .filter((scenario) => scenario.metrics.length > 0);
      return {
        id: suite.id,
        name: suite.name,
        environment: suite.environment,
        environmentLabel: environmentLabel(
          suite,
          new Set(
            suiteResults.map((result) => subjects.get(result.subject)!.library),
          ),
        ),
        description: suite.description,
        ...(suite.caveat && { caveat: suite.caveat }),
        ...(suite.timingResolution && {
          timingResolution: suite.timingResolution,
        }),
        scenarios,
      };
    })
    .filter((suite) => suite.scenarios.length > 0);

  return { suites, notMeasured: notMeasuredView(latest) };
}

function notMeasuredView(latest: BenchLatest): NotMeasuredView[] {
  const scenarioNames = new Map(
    latest.suites.flatMap((suite) =>
      suite.scenarios.map((scenario) => [scenario.id, scenario.name]),
    ),
  );
  return latest.notMeasured.map((entry) => {
    const subject = latest.subjects.find((s) => s.id === entry.subject);
    const suite = latest.suites.find((s) => s.id === entry.suite);
    const parts = [
      entry.subject && (subject?.library ?? humanize(entry.subject)),
      entry.config,
      entry.suite && (suite?.name ?? humanize(entry.suite)),
      entry.scenario &&
        (scenarioNames.get(entry.scenario) ?? humanize(entry.scenario)),
    ].filter((part): part is string => Boolean(part));
    return { label: parts.join(", "), reason: entry.reason };
  });
}

export type RunListItem = {
  id: string;
  date: string;
  build: string;
  /** Whether latest.json's results include this run */
  inLatest: boolean;
  /** The build's note, from latest.json */
  buildNote?: string;
};

/** Every run the index lists, newest first */
export function runList(index: BenchIndex, latest: BenchLatest): RunListItem[] {
  const used = new Set(latest.runs.map((run) => run.id));
  const builds = new Map(latest.builds.map((build) => [build.id, build]));
  return [...index.runs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((run) => {
      const note = builds.get(run.build)?.note;
      return {
        id: run.id,
        date: run.date,
        build: run.build,
        inLatest: used.has(run.id),
        ...(note && { buildNote: note }),
      };
    });
}

/** One run's view: every subject that ran, side by side */
export function runView(
  run: BenchRun,
  latest: BenchLatest,
  options: Omit<BenchViewOptions, "separateHistorical"> = {},
): BenchView {
  return benchView(latest, run.results, {
    ...options,
    separateHistorical: false,
  });
}
