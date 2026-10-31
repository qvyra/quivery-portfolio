import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  isBenchmarkDataUrl,
  parseBenchIndex,
  parseBenchLatest,
  parseBenchRun,
} from "./parse.js";
import { benchV1 } from "./v1.js";

// Copies of the real files Geode's docs site publishes, and of the JSON
// Schema they follow. Both the Zod schemas and the JSON Schema have to accept
// them, and the two schemas have to name the same fields, so neither can
// drift from the other unnoticed
const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
  );

type JsonSchema = {
  $defs: Record<string, JsonDef>;
};
type JsonDef = {
  properties?: Record<string, JsonDef & { enum?: string[]; const?: unknown }>;
  required?: string[];
  items?: JsonDef;
  oneOf?: { $ref: string }[];
};

const jsonSchema = fixture("schema-v1.json") as JsonSchema;
const props = jsonSchema.$defs;
const latest = fixture("latest.json");
const index = fixture("index.json");
const run = fixture("run-74d6b2a5.json");

const ajv = new Ajv2020({ allErrors: true, strict: false });
// ajv-formats is CommonJS: under NodeNext its function is the default's default
addFormats.default(ajv);
const validate = ajv.compile(jsonSchema);

const clone = <T>(value: T): T => structuredClone(value);

describe("bench data fixtures", () => {
  it.each([
    ["latest.json", latest],
    ["index.json", index],
    ["run-74d6b2a5.json", run],
  ])("%s matches the published JSON Schema", (_name, data) => {
    expect(validate(data), JSON.stringify(validate.errors)).toBe(true);
  });

  it("latest.json parses with Zod", () => {
    const parsed = parseBenchLatest(latest);
    expect(parsed.status).toBe("ok");
  });

  it("index.json parses with Zod", () => {
    expect(parseBenchIndex(index).status).toBe("ok");
  });

  it("a run parses with Zod, without its raw data", () => {
    const parsed = parseBenchRun(run);
    expect(parsed.status).toBe("ok");
    if (parsed.status !== "ok") return;
    expect(parsed.data).not.toHaveProperty("tasks");
    expect(parsed.data).not.toHaveProperty("lune");
    expect(parsed.data.results.length).toBeGreaterThan(0);
  });
});

describe("Zod and the JSON Schema stay in step", () => {
  const shapeOf = (schema: z.ZodType) =>
    (schema as unknown as z.ZodObject).shape as Record<string, z.ZodType>;

  it.each(Object.keys(benchV1))("%s has the same fields", (name) => {
    const def = jsonSchema.$defs[name];
    expect(def, `$defs.${name}`).toBeDefined();
    const shape = shapeOf(benchV1[name as keyof typeof benchV1]);
    expect(Object.keys(shape).sort()).toEqual(
      Object.keys(def!.properties ?? {}).sort(),
    );
    const required = Object.entries(shape)
      .filter(([, field]) => !field.safeParse(undefined).success)
      .map(([key]) => key)
      .sort();
    expect(required).toEqual([...(def!.required ?? [])].sort());
  });

  it("every $defs object has a Zod schema", () => {
    const objects = Object.entries(jsonSchema.$defs)
      .filter(([, def]) => def.properties)
      .map(([name]) => name)
      .sort();
    expect(Object.keys(benchV1).sort()).toEqual(objects);
  });

  it("the enums match", () => {
    const enumOf = (schema: z.ZodType, key: string) =>
      (shapeOf(schema)[key] as unknown as z.ZodEnum).options;
    expect(enumOf(benchV1.suite, "environment")).toEqual(
      props.suite!.properties!.environment!.enum,
    );
    expect(enumOf(benchV1.metric, "kind")).toEqual(
      props.metric!.properties!.kind!.enum,
    );
    const taskModes = (
      shapeOf(benchV1.run).tasks as unknown as z.ZodArray<z.ZodObject>
    ).element.shape.mode as unknown as z.ZodEnum;
    expect(taskModes.options).toEqual(
      props.run!.properties!.tasks!.items!.properties!.mode!.enum,
    );
  });

  it("the result value kinds match", () => {
    const kinds = props.result!.properties!.value!.oneOf!.map(
      ({ $ref }) =>
        props[$ref.replace("#/$defs/", "")]!.properties!.kind!.const,
    );
    expect(kinds.sort()).toEqual(
      benchV1.result.shape.value.options
        .map((option) => option.shape.kind.value)
        .sort(),
    );
  });
});

describe("versions and bad data", () => {
  it("an unknown schema version is unsupported, not read as v1", () => {
    const next = { ...clone(latest as object), schemaVersion: 2 };
    expect(parseBenchLatest(next)).toEqual({
      status: "unsupported",
      schemaVersion: 2,
    });
    expect(validate(next)).toBe(false);
  });

  it("both schemas reject a result without a value", () => {
    const broken = clone(latest) as { results: Record<string, unknown>[] };
    delete broken.results[0]!.value;
    expect(parseBenchLatest(broken).status).toBe("invalid");
    expect(validate(broken)).toBe(false);
  });

  it("both schemas reject a malformed run id", () => {
    const broken = clone(index) as { runs: { id: string }[] };
    broken.runs[0]!.id = "not-a-run";
    expect(parseBenchIndex(broken).status).toBe("invalid");
    expect(validate(broken)).toBe(false);
  });

  it("data without a schema version is invalid", () => {
    expect(parseBenchLatest({ kind: "latest" }).status).toBe("invalid");
  });
});

describe("data URLs", () => {
  it.each([
    "https://qvyra.github.io/geode/data/benchmarks/index.json",
    "https://qvyra.github.io/other/latest.json",
  ])("allows %s", (url) => {
    expect(isBenchmarkDataUrl(url)).toBe(true);
  });

  it.each([
    "http://qvyra.github.io/geode/data/benchmarks/index.json",
    "https://example.com/index.json",
    "https://qvyra.github.io.evil.example/index.json",
    "https://user:pass@qvyra.github.io/index.json",
    "https://qvyra.github.io:8443/index.json",
    "https://qvyra.github.io/geode/",
    "not a url",
  ])("refuses %s", (url) => {
    expect(isBenchmarkDataUrl(url)).toBe(false);
  });
});
