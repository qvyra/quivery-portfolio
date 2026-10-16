import { z } from "zod";
import { httpUrlSchema } from "./common.js";

export const mediaKindSchema = z.enum(["IMAGE", "VIDEO", "FILE"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

// an http(s) URL (object storage) or a root-relative path the web app serves
export const mediaUrlSchema = z.union([
  httpUrlSchema,
  z.string().regex(/^\/(?!\/)\S+$/, "Must be an http(s) URL or start with /"),
]);

// every upload or static file is one Media row, content points at it by id
export const mediaInputSchema = z.strictObject({
  id: z.uuid().optional(),
  kind: mediaKindSchema,
  url: mediaUrlSchema,
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  // empty alt marks the image as decorative
  alt: z.string().trim().max(300).default(""),
});
export type MediaInput = z.input<typeof mediaInputSchema>;

export const mediaSchema = z.object({
  id: z.uuid(),
  kind: mediaKindSchema,
  url: mediaUrlSchema,
  mimeType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string(),
});
export type Media = z.infer<typeof mediaSchema>;
