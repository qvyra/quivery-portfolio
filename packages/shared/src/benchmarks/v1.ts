import { z } from "zod";

// Bench data, schema version 1, as Geode's docs site publishes it
// (https://qvyra.github.io/geode/data/benchmarks/schema/v1.json). One Zod
// schema per $defs entry, under the same name, so the tests can hold the two
// side by side. Objects aren't strict: version 1 may gain optional fields

const id = z.string().regex(/^[a-z0-9][a-z0-9.+-]*$/);
const runId = z.string().regex(/^[0-9a-f]{8}$/);
const gitId = z.string().regex(/^[0-9a-f]{40}$/);
const date = z.iso.datetime({ offset: true });
const seconds = z.number().min(0);
const count = z.number().int().min(0);

const runRef = z.object({
  id: runId,
  date,
  build: id,
  // the run's file, relative to the file that lists it
  data: z.string(),
});

const suite = z.object({
  id,
  name: z.string(),
  environment: z.enum(["roblox-live", "lune"]),
  // seconds per timing step: times closer than this are ties
  timingResolution: z.number().positive().optional(),
  // kept in run files but never published as a result
  recordedOnly: z.boolean().optional(),
  description: z.string(),
  caveat: z.string().optional(),
  scenarios: z.array(
    z.object({
      id,
      name: z.string(),
      description: z.string().optional(),
      metrics: z.array(id),
    }),
  ),
});

const metric = z.object({
  id,
  name: z.string(),
  kind: z.enum(["timing", "requests", "count", "values", "amount"]),
  unit: z.string().optional(),
  description: z.string(),
});

const requestMethod = z.object({
  id: z.string().regex(/^[A-Za-z]+(:[A-Za-z]+)?$/),
  label: z.string(),
  description: z.string().optional(),
});

const line = z.object({ id, description: z.string() });

const build = z.object({
  id,
  line: id,
  release: z.string().optional(),
  sourceTrees: z.array(gitId),
  note: z.string().optional(),
});

const subject = z.object({
  id,
  library: z.string(),
  lines: z.array(id).optional(),
  historical: z.boolean().optional(),
  repository: z.url().optional(),
  config: z.object({
    label: z.string(),
    options: z.record(z.string(), z.unknown()),
  }),
});

const samples = z.array(seconds);

const timing = z.object({
  kind: z.literal("timing"),
  unit: z.literal("s"),
  // left out when no sample succeeded
  median: seconds.optional(),
  min: seconds.optional(),
  max: seconds.optional(),
  n: count,
  failed: count,
  samples,
});

const range = z.object({
  kind: z.literal("range"),
  unit: z.literal("s"),
  min: seconds.optional(),
  max: seconds.optional(),
  n: count,
  failed: count,
  samples,
});

const requests = z.object({
  kind: z.literal("requests"),
  // every sample had the same counts
  exact: z.boolean(),
  n: z.number().int().min(1),
  byMethod: z.record(z.string(), z.object({ min: count, max: count })),
});

const countValue = z.object({
  kind: z.literal("count"),
  passed: count,
  total: count,
});

const values = z.object({
  kind: z.literal("values"),
  counts: z.record(z.string(), z.number().int()),
  total: count,
});

const amount = z.object({
  kind: z.literal("amount"),
  unit: z.string(),
  n: z.number().int().min(1),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  samples: z.array(z.number()),
});

const result = z.object({
  suite: id,
  scenario: id,
  metric: id,
  subject: id,
  runs: z.array(runId).min(1),
  value: z.discriminatedUnion("kind", [
    timing,
    range,
    requests,
    countValue,
    values,
    amount,
  ]),
});

const notMeasured = z
  .object({
    subject: id.optional(),
    suite: id.optional(),
    scenario: id.optional(),
    config: z.string().optional(),
    reason: z.string(),
  })
  .refine(
    (entry) => entry.subject ?? entry.suite ?? entry.scenario,
    "Needs a subject, suite or scenario",
  );

const latest = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  kind: z.literal("latest"),
  updatedAt: date,
  aggregation: z.object({
    currentRuns: z.number().int().min(1),
    rule: z.string(),
    caveat: z.string(),
  }),
  suites: z.array(suite),
  metrics: z.array(metric),
  requestMethods: z.array(requestMethod),
  lines: z.array(line),
  builds: z.array(build),
  subjects: z.array(subject),
  runs: z.array(runRef),
  results: z.array(result),
  notMeasured: z.array(notMeasured),
});

const index = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  kind: z.literal("index"),
  updatedAt: date,
  // the latest file, relative to this one
  latest: z.string(),
  runs: z.array(runRef),
});

const run = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  kind: z.literal("run"),
  id: runId,
  date,
  build: id,
  geode: z.object({ sourceTree: gitId }),
  bench: z.object({
    tree: gitId,
    workflowRun: z.url().optional(),
  }),
  libraries: z.array(
    z.object({
      name: z.string(),
      repo: z.string(),
      ref: z.string(),
      version: z.string(),
      license: z.string(),
      licenseSha256: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  ),
  refused: z.record(z.string(), z.string()),
  results: z.array(result),
  notRunnable: z.array(
    z.object({ subject: id, suite: id, reason: z.string() }),
  ),
  problems: z.array(
    z.object({ subject: id, mode: z.string(), problem: z.string() }),
  ),
  // raw measurements: validated, never shown
  lune: z.record(z.string(), z.unknown()).optional(),
  tasks: z.array(
    z.object({
      mode: z.enum(["perf", "hold", "join", "throttle", "memory"]),
      library: z.string(),
      subject: id,
      problem: z.string().optional(),
      report: z.record(z.string(), z.unknown()).optional(),
      logTail: z.array(z.string()).optional(),
    }),
  ),
});

/** Every v1 definition, named as in the JSON Schema's $defs */
export const benchV1 = {
  runRef,
  suite,
  metric,
  requestMethod,
  line,
  build,
  subject,
  result,
  timing,
  range,
  requests,
  count: countValue,
  values,
  amount,
  notMeasured,
  latest,
  index,
  run,
};

export type BenchLatest = z.infer<typeof latest>;
export type BenchIndex = z.infer<typeof index>;
export type BenchRunFile = z.infer<typeof run>;
export type BenchSuite = z.infer<typeof suite>;
export type BenchMetric = z.infer<typeof metric>;
export type BenchSubject = z.infer<typeof subject>;
export type BenchResult = z.infer<typeof result>;
export type BenchValue = BenchResult["value"];
export type BenchRunRef = z.infer<typeof runRef>;
export type BenchNotMeasured = z.infer<typeof notMeasured>;

/** A run file without its raw tasks and Lune measurements */
export type BenchRun = Omit<BenchRunFile, "tasks" | "lune">;
