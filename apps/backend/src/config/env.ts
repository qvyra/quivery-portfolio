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
    // shared with the web app, which sends it with every contact form
    // submission. The API refuses submissions without it. At least 32
    // characters
    CONTACT_API_SECRET: z.string().min(32).optional(),
    // where new contact messages are announced. Optional: without it messages
    // are still stored, just not announced. The error never echoes the value
    DISCORD_WEBHOOK_URL: z
      .string()
      .regex(
        /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+$/,
        'must be a Discord webhook URL',
      )
      .optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.WEB_ORIGIN, {
    message: 'WEB_ORIGIN is required in production',
    path: ['WEB_ORIGIN'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.REVALIDATE_SECRET, {
    message: 'REVALIDATE_SECRET is required in production',
    path: ['REVALIDATE_SECRET'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.CONTACT_API_SECRET, {
    message: 'CONTACT_API_SECRET is required in production',
    path: ['CONTACT_API_SECRET'],
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
