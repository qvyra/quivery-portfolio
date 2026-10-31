import { z } from "zod";
import { benchmarkDataUrlSchema } from "../benchmarks/parse.js";
import { httpUrlSchema, linkSchema } from "./common.js";
import { mediaSchema } from "./media.js";

// Content blocks, stored as a JSON array on Section.blocks and Project.body. A
// new block type is one schema in `defineBlocks` plus a web renderer, no
// migration. The API resolves every `{ mediaId }`, at any depth, to
// `{ mediaId, media }` with `media` null once the file is deleted, so renderers
// have to handle a missing image by rendering nothing

const storedMediaRef = z.strictObject({ mediaId: z.uuid() });
const resolvedMediaRef = z.strictObject({
  mediaId: z.uuid(),
  media: mediaSchema.nullable(),
});

const blockId = z.string().trim().min(1).max(64);
const caption = z.string().trim().min(1).max(300).optional();

// hosts each embed provider may serve from, anything else is rejected
export const embedProviderHosts = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  vimeo: ["vimeo.com", "player.vimeo.com"],
  streamable: ["streamable.com"],
} as const;
export type EmbedProvider = keyof typeof embedProviderHosts;

// a suite or scenario id in bench data
const benchId = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9.+-]*$/, "Use the id from the bench data");

const embedProviderSchema = z.enum(
  Object.keys(embedProviderHosts) as [EmbedProvider, ...EmbedProvider[]],
);

function defineBlocks<MediaRef extends z.ZodType>(mediaRef: MediaRef) {
  return z.discriminatedUnion("type", [
    z.strictObject({
      id: blockId,
      type: z.literal("richText"),
      // markdown, rendered without raw HTML
      markdown: z.string().trim().min(1).max(20_000),
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("image"),
      image: mediaRef,
      caption,
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("video"),
      video: mediaRef,
      caption,
      // loops silently like a GIF instead of showing player controls
      loop: z.boolean().default(false),
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("gallery"),
      items: z
        .array(z.strictObject({ image: mediaRef, caption }))
        .min(1)
        .max(48),
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("linkList"),
      links: z.array(linkSchema).min(1).max(20),
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("statsRow"),
      items: z
        .array(
          z.strictObject({
            value: z.string().trim().min(1).max(16),
            label: z.string().trim().min(1).max(40),
          }),
        )
        .min(1)
        .max(6),
    }),
    z.strictObject({
      id: blockId,
      type: z.literal("codeSnippet"),
      language: z.string().trim().min(1).max(32),
      code: z.string().min(1).max(20_000),
      filename: z.string().trim().min(1).max(120).optional(),
      caption,
    }),
    z
      .strictObject({
        id: blockId,
        type: z.literal("embed"),
        provider: embedProviderSchema,
        url: httpUrlSchema,
        // required, every iframe needs an accessible title
        title: z.string().trim().min(1).max(120),
      })
      .refine(
        (block) =>
          (embedProviderHosts[block.provider] as readonly string[]).includes(
            new URL(block.url).hostname,
          ),
        {
          message: "URL host does not match the embed provider",
          path: ["url"],
        },
      ),
    z.strictObject({
      id: blockId,
      type: z.literal("benchmark"),
      title: z.string().trim().min(1).max(120),
      note: z.string().trim().min(1).max(2000).optional(),
      // the data's index.json, which leads to its latest results and runs
      dataUrl: benchmarkDataUrlSchema,
      // the write-up of how it was measured
      methodUrl: httpUrlSchema.optional(),
      // all of them when empty
      suites: z.array(benchId).max(20).default([]),
      scenarios: z.array(benchId).max(50).default([]),
    }),
  ]);
}

// block ids are unique within a list, they're React keys and drive reordering
const uniqueBlockIds = (blocks: { id: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  blocks.forEach((block, index) => {
    if (seen.has(block.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate block id "${block.id}"`,
        path: [index, "id"],
      });
    }
    seen.add(block.id);
  });
};

// every block type, for code that checks a type before parsing the block
export const blockTypeSchema = z.enum([
  "richText",
  "image",
  "video",
  "gallery",
  "linkList",
  "statsRow",
  "codeSnippet",
  "embed",
  "benchmark",
]);

export const blockSchema = defineBlocks(storedMediaRef);
export type Block = z.infer<typeof blockSchema>;
export type BlockInput = z.input<typeof blockSchema>;
export type BlockType = Block["type"];

export const blocksSchema = z
  .array(blockSchema)
  .max(100)
  .superRefine(uniqueBlockIds);

export const resolvedBlockSchema = defineBlocks(resolvedMediaRef);
export type ResolvedBlock = z.infer<typeof resolvedBlockSchema>;
