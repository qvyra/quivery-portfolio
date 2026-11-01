import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBenchIndex, parseBenchLatest, parseBenchRun } from "./parse.js";
import type { BenchIndex, BenchLatest, BenchRun } from "./v1.js";
import {
  benchView,
  historyViews,
  runList,
  runView,
  type MetricView,
} from "./view.js";

const load = <T>(name: string, parse: (json: unknown) => unknown): T => {
  const parsed = parse(
    JSON.parse(
      readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
    ),
  ) as { status: string; data: T };
  if (parsed.status !== "ok") throw new Error(`${name} didn't parse`);
  return parsed.data;
};

const latest = load<BenchLatest>("latest.json", parseBenchLatest);
const index = load<BenchIndex>("index.json", parseBenchIndex);
const run = load<BenchRun>("run-74d6b2a5.json", parseBenchRun);

const metricOf = (
  view: ReturnType<typeof benchView>,
  suite: string,
  scenario: string,
  kind: MetricView["kind"],
) =>
  view.suites
    .find((s) => s.id === suite)
    ?.scenarios.find((s) => s.id === scenario)
    ?.metrics.find((m) => m.kind === kind);

describe("benchView", () => {
  const view = benchView(latest, latest.results);

  it("never includes a recordedOnly suite", () => {
    expect(latest.suites.find((s) => s.id === "memory")?.recordedOnly).toBe(
      true,
    );
    expect(view.suites.map((s) => s.id)).not.toContain("memory");
  });

  it("never shows a run's recordedOnly results either", () => {
    expect(run.results.some((r) => r.suite === "memory")).toBe(true);
    const shown = runView(run, latest);
    expect(shown.suites.map((s) => s.id)).not.toContain("memory");
    expect(JSON.stringify(shown)).not.toContain("heap-per-profile");
  });

  it("keeps historical subjects apart from current ones", () => {
    const timing = metricOf(view, "load-save-release", "load-new", "timing");
    expect(timing?.kind).toBe("timing");
    if (timing?.kind !== "timing") return;
    expect(timing.current.map((row) => row.subject.id)).not.toContain(
      "geode-0.5",
    );
    expect(timing.historical.map((row) => row.subject.id)).toEqual([
      "geode-0.5",
    ]);
    expect(timing.historical[0]!.subject.notes.length).toBeGreaterThan(0);
  });

  it("keeps the data's subject order instead of ranking", () => {
    const timing = metricOf(view, "load-save-release", "load-new", "timing");
    if (timing?.kind !== "timing") throw new Error("no timing");
    const order = latest.subjects
      .map((s) => s.id)
      .filter((id) => timing.current.some((row) => row.subject.id === id));
    expect(timing.current.map((row) => row.subject.id)).toEqual(order);
  });

  it("puts correctness before times and request counts", () => {
    const scenario = view.suites
      .find((s) => s.id === "server-hop")!
      .scenarios.find((s) => s.id === "old-releases")!;
    expect(scenario.metrics.map((m) => m.kind)).toEqual([
      "count",
      "timing",
      "requests",
    ]);
  });

  it("shows throttling as ranges, never medians", () => {
    const range = metricOf(view, "throttling", "load", "range");
    expect(range?.kind).toBe("range");
    expect(metricOf(view, "throttling", "load", "timing")).toBeUndefined();
  });

  it("labels the environments", () => {
    const label = (id: string) =>
      view.suites.find((s) => s.id === id)?.environmentLabel;
    expect(label("server-hop")).toBe("Live Roblox servers");
    expect(label("geode-edits")).toBe("Lune, Geode only");
  });

  it("lists the request methods by their labels", () => {
    const requests = metricOf(view, "server-hop", "old-releases", "requests");
    if (requests?.kind !== "requests") throw new Error("no requests");
    expect(requests.methods.map((m) => m.label)).toContain(
      "GetAsync past the cache",
    );
    const varied = requests.current.filter((row) => !row.value.exact);
    expect(varied.map((row) => row.subject.id)).toEqual([
      "profilestore",
      "profileservice",
    ]);
  });

  it("filters suites and scenarios", () => {
    const filtered = benchView(latest, latest.results, {
      suites: ["server-hop"],
      scenarios: ["old-keeps"],
    });
    expect(filtered.suites.map((s) => s.id)).toEqual(["server-hop"]);
    expect(filtered.suites[0]!.scenarios.map((s) => s.id)).toEqual([
      "old-keeps",
    ]);
  });

  it("skips results that name something the data doesn't define", () => {
    const stray = {
      ...latest.results[0]!,
      subject: "made-up",
    };
    const extra = benchView(latest, [...latest.results, stray]);
    expect(JSON.stringify(extra)).not.toContain("made-up");
  });

  it("names every not-measured entry", () => {
    expect(view.notMeasured.length).toBe(latest.notMeasured.length);
    expect(view.notMeasured.map((entry) => entry.label)).toContain(
      "DataStore2, OrderedBackups",
    );
    expect(view.notMeasured.every((entry) => entry.label.length > 0)).toBe(
      true,
    );
  });
});

describe("runList", () => {
  it("lists every run newest first, marking the ones latest.json uses", () => {
    const runs = runList(index, latest);
    expect(runs).toHaveLength(index.runs.length);
    expect(runs[0]!.date >= runs.at(-1)!.date).toBe(true);
    const used = new Set(latest.runs.map((r) => r.id));
    for (const item of runs) expect(item.inLatest).toBe(used.has(item.id));
  });
});

describe("historyViews", () => {
  // the fixture holds one 0.6.1 run, so the others are made from it
  const asRun = (id: string, build: string, subject: string, factor = 1) => ({
    ...run,
    id,
    build,
    results: run.results.flatMap((result) =>
      result.subject !== "geode" && result.subject !== "geode-mailbox"
        ? [result]
        : result.subject === "geode-mailbox" && subject !== "geode"
          ? []
          : [
              {
                ...result,
                subject:
                  result.subject === "geode-mailbox" ? result.subject : subject,
                value:
                  result.value.kind === "timing"
                    ? {
                        ...result.value,
                        samples: result.value.samples.map((x) => x * factor),
                      }
                    : result.value,
              },
            ],
    ),
  });
  const old = asRun("1d449b46", "0.5.0", "geode-0.5", 2);
  const older = asRun("25532752", "0.5.0", "geode-0.5", 4);
  // a run latest.json doesn't use
  const unused = asRun("1b5acb20", "0.6.0-pre", "geode", 100);
  const views = historyViews(latest, [run, unused, older, old]);
  const loadNew = views.find(
    (view) =>
      view.suite === "load-save-release" && view.scenario === "load-new",
  )!;
  const samples = run.results.find(
    (result) =>
      result.scenario === "load-new" &&
      result.subject === "geode" &&
      result.value.kind === "timing",
  )!.value as { samples: number[] };

  it("follows the default-options subjects in build order", () => {
    expect(loadNew.library).toBe("Geode");
    expect(loadNew.points.map((point) => point.build)).toEqual([
      "0.5.0",
      "0.6.1",
    ]);
    expect(loadNew.points.map((point) => point.subject.id)).toEqual([
      "geode-0.5",
      "geode",
    ]);
  });

  it("pools a build's samples across its runs", () => {
    const pooled = [
      ...samples.samples.map((x) => x * 2),
      ...samples.samples.map((x) => x * 4),
    ].sort((a, b) => a - b);
    const first = loadNew.points[0]!;
    expect(first.n).toBe(pooled.length);
    expect(first.runs).toBe(2);
    // an even count takes the mean of the middle two
    expect(first.median).toBeCloseTo(
      (pooled[pooled.length / 2 - 1]! + pooled[pooled.length / 2]!) / 2,
    );
  });

  it("only counts runs latest.json uses", () => {
    expect(loadNew.points.map((point) => point.build)).not.toContain(
      "0.6.0-pre",
    );
  });

  it("leaves out timings with fewer than two builds", () => {
    expect(historyViews(latest, [run])).toEqual([]);
  });

  it("only charts timings, never a recordedOnly suite", () => {
    expect(views.every((view) => view.metric.kind === "timing")).toBe(true);
    expect(views.map((view) => view.suite)).not.toContain("memory");
  });
});
