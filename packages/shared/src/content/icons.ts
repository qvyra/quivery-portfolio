import { z } from "zod";

// Anything that carries an icon picks a built-in one from the site's icon
// library (apps/web/lib/icons/library.ts) by key, or an uploaded image from
// Media, or none. The API only checks a key's shape, so adding an icon to the
// library needs no API change, and a key the site doesn't know shows no icon

export const iconKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Pick an icon from the library");

/** An icon inside stored JSON, like a link's. One or the other, never both */
export const iconRefSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("icon"), key: iconKeySchema }),
  z.strictObject({ kind: z.literal("media"), id: z.uuid() }),
]);
export type IconRef = z.infer<typeof iconRefSchema>;

/**
 * Rows keep a built-in icon and an uploaded one in two columns (the upload is
 * a relation). Picking one clears the other, and this refuses both
 */
export function checkOneIcon(keyField: string, mediaField: string) {
  return (value: Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (value[keyField] && value[mediaField]) {
      ctx.addIssue({
        code: "custom",
        path: [keyField],
        message: "Pick a built-in icon or an uploaded image, not both",
      });
    }
  };
}
