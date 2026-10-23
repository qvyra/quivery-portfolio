import { z } from 'zod';

const DEV_WEB_ORIGIN = 'http://localhost:3000';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(5005),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // the Next site's origin, the only one CORS lets through
    WEB_ORIGIN: z.url().optional(),
    // shared with the web app, sent with revalidation requests after admin
    // edits. At least 32 characters
    REVALIDATE_SECRET: z.string().min(32).optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.WEB_ORIGIN, {
    message: 'WEB_ORIGIN is required in production',
    path: ['WEB_ORIGIN'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.REVALIDATE_SECRET, {
    message: 'REVALIDATE_SECRET is required in production',
    path: ['REVALIDATE_SECRET'],
  })
  .transform((env) => ({
    ...env,
    // CORS compares origins exactly, so any path or trailing slash has to go
    WEB_ORIGIN: new URL(env.WEB_ORIGIN ?? DEV_WEB_ORIGIN).origin,
  }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
