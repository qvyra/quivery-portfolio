import { z } from "zod";

/**
 * The envelope of every Nest API response. Clients branch on `code`, a stable
 * SCREAMING_SNAKE_CASE id, never on `message`, which may change
 */
export const apiErrorSchema = z.object({
  status: z.number().int(),
  message: z.string(),
  code: z.string(),
});

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  apiErrorSchema.extend({ data });

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<T> = ApiError & { data: T };

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
