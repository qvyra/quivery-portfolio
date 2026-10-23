import { z } from "zod";

// The contact form's fields. The site checks them before sending, and the API
// checks them again, with the same messages, which the form shows inline

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  messageMin: 10,
  message: 5000,
  links: 3,
} as const;

export const contactTopicSchema = z.enum([
  "JOB_OPPORTUNITY",
  "COMMISSION",
  "GEODE_OR_LOUPE",
  "OTHER",
]);
export type ContactTopic = z.infer<typeof contactTopicSchema>;

export const contactTopicLabels: Record<ContactTopic, string> = {
  JOB_OPPORTUNITY: "Job opportunity",
  COMMISSION: "Commission",
  GEODE_OR_LOUPE: "Geode or Loupe",
  OTHER: "Other",
};

// http(s) URLs and bare www. hosts, the usual shapes of link spam
const linkPattern = /\bhttps?:\/\/|\bwww\./gi;

/** How many links a message contains */
export const countLinks = (text: string) =>
  text.match(linkPattern)?.length ?? 0;

export const contactMessageSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(
      CONTACT_LIMITS.name,
      `Keep it under ${CONTACT_LIMITS.name} characters`,
    ),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .max(CONTACT_LIMITS.email, "That email address is too long")
    .pipe(z.email("Enter a valid email address, like you@example.com")),
  topic: contactTopicSchema.optional(),
  message: z
    .string()
    .trim()
    .min(
      CONTACT_LIMITS.messageMin,
      `Write at least ${CONTACT_LIMITS.messageMin} characters`,
    )
    .max(
      CONTACT_LIMITS.message,
      `Keep it under ${CONTACT_LIMITS.message} characters`,
    )
    .refine(
      (text) => countLinks(text) <= CONTACT_LIMITS.links,
      `Include ${CONTACT_LIMITS.links} links or fewer`,
    ),
});
export type ContactMessageInput = z.input<typeof contactMessageSchema>;

/**
 * What the site sends the API. `idempotencyKey` is made once per draft, so a
 * retry of the same message is stored once. `trap` is a field people never
 * see and bots fill in, and `elapsedMs` is how long since the visitor started
 * typing. The API answers bots with a normal success and keeps nothing
 */
export const contactSubmissionSchema = contactMessageSchema.extend({
  idempotencyKey: z.uuid(),
  trap: z.string().max(500),
  elapsedMs: z.number().int().min(0),
});
export type ContactSubmission = z.input<typeof contactSubmissionSchema>;
