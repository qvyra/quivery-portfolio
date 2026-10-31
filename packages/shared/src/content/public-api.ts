import { z } from "zod";
import { apiSuccessSchema } from "../api.js";
import { blockTypeSchema } from "./blocks.js";
import {
  projectDetailSchema,
  projectSummarySchema,
  type ProjectDetail,
  type ProjectSummary,
} from "./project.js";
import { sectionTypeSchema, siteSchema, type Site } from "./section.js";

// Parsers for the public API's responses, used by the web app. A section or
// block type this code doesn't know yet (the API deployed first) is skipped and
// reported through `onSkip`. Any other mismatch throws a ContentSchemaError
// listing every problem, since rendering half-understood data is worse

export class ContentSchemaError extends Error {
  constructor(what: string, error: z.ZodError) {
    super(
      `${what} doesn't match the shared schemas:\n${z.prettifyError(error)}`,
    );
    this.name = "ContentSchemaError";
  }
}

export type SkipReporter = (message: string) => void;

const knownSectionTypes = new Set<string>(sectionTypeSchema.options);
const knownBlockTypes = new Set<string>(blockTypeSchema.options);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// drops unknown block types, everything else is left for the schema to judge
function dropUnknownBlocks(
  blocks: unknown,
  where: string,
  onSkip: SkipReporter,
): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.filter((block: unknown, index) => {
    const type = isRecord(block) ? block.type : undefined;
    if (typeof type === "string" && !knownBlockTypes.has(type)) {
      onSkip(`${where}: block ${index} has unknown type "${type}", skipped`);
      return false;
    }
    return true;
  });
}

const envelope = <T extends z.ZodType>(data: T) => apiSuccessSchema(data);

/** GET /public/site */
export function parseSite(
  json: unknown,
  onSkip: SkipReporter = () => {},
): Site {
  const raw = envelope(
    z.looseObject({ sections: z.array(z.unknown()) }),
  ).safeParse(json);
  if (!raw.success) throw new ContentSchemaError("GET /public/site", raw.error);

  const sections = raw.data.data.sections.flatMap((section) => {
    if (!isRecord(section)) return [section];
    const where = `Section "${String(section.slug)}"`;
    if (
      typeof section.type === "string" &&
      !knownSectionTypes.has(section.type)
    ) {
      onSkip(`${where} has unknown type "${section.type}", skipped`);
      return [];
    }
    const blocks = dropUnknownBlocks(section.blocks, where, onSkip);
    // a custom section is only its blocks, so none left means nothing to show
    if (
      section.type === "custom" &&
      Array.isArray(blocks) &&
      blocks.length === 0
    ) {
      onSkip(`${where} has no blocks this version can render, skipped`);
      return [];
    }
    return [{ ...section, blocks }];
  });

  const site = siteSchema.safeParse({ ...raw.data.data, sections });
  if (!site.success)
    throw new ContentSchemaError("GET /public/site", site.error);
  return site.data;
}

/** GET /public/projects */
export function parseProjects(json: unknown): ProjectSummary[] {
  const result = envelope(z.array(projectSummarySchema)).safeParse(json);
  if (!result.success) {
    throw new ContentSchemaError("GET /public/projects", result.error);
  }
  return result.data.data;
}

/** GET /public/projects/:slug */
export function parseProject(
  json: unknown,
  onSkip: SkipReporter = () => {},
): ProjectDetail {
  const raw = envelope(
    z.looseObject({
      slug: z.string(),
      body: z.unknown(),
      benchmarks: z.unknown().optional(),
    }),
  ).safeParse(json);
  if (!raw.success)
    throw new ContentSchemaError("GET /public/projects/:slug", raw.error);

  const where = `Project "${raw.data.data.slug}"`;
  const body = dropUnknownBlocks(raw.data.data.body, where, onSkip);
  const benchmarks = dropUnknownBlocks(
    raw.data.data.benchmarks ?? [],
    `${where} benchmarks`,
    onSkip,
  );
  const project = projectDetailSchema.safeParse({
    ...raw.data.data,
    body,
    benchmarks,
  });
  if (!project.success)
    throw new ContentSchemaError(
      `GET /public/projects/${raw.data.data.slug}`,
      project.error,
    );
  return project.data;
}
