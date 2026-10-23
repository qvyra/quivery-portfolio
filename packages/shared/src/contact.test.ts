import { describe, expect, it } from "vitest";
import {
  CONTACT_LIMITS,
  contactMessageSchema,
  contactSubmissionSchema,
  countLinks,
} from "./contact.js";

const message = {
  name: "Ada",
  email: "ada@example.com",
  topic: "COMMISSION",
  message: "I'd like a DataStore layer for my game.",
};

const firstError = (input: unknown) => {
  const result = contactMessageSchema.safeParse(input);
  return result.success
    ? undefined
    : {
        path: result.error.issues[0]?.path,
        text: result.error.issues[0]?.message,
      };
};

describe("contactMessageSchema", () => {
  it("accepts a normal message and trims every field", () => {
    expect(
      contactMessageSchema.parse({
        ...message,
        name: "  Ada ",
        email: " ada@example.com ",
        message: `  ${message.message}  `,
      }),
    ).toEqual(message);
  });

  it("leaves the topic optional", () => {
    expect(
      contactMessageSchema.safeParse({ ...message, topic: undefined }).success,
    ).toBe(true);
  });

  it("rejects an unknown topic", () => {
    expect(firstError({ ...message, topic: "SPAM" })?.path).toEqual(["topic"]);
  });

  it("rejects a blank or too long name", () => {
    expect(firstError({ ...message, name: "   " })).toEqual({
      path: ["name"],
      text: "Enter your name",
    });
    expect(
      firstError({ ...message, name: "a".repeat(CONTACT_LIMITS.name + 1) })
        ?.path,
    ).toEqual(["name"]);
  });

  it("rejects an invalid email", () => {
    expect(firstError({ ...message, email: "ada@" })).toEqual({
      path: ["email"],
      text: "Enter a valid email address, like you@example.com",
    });
  });

  it("asks for a real message, within the length limits", () => {
    expect(firstError({ ...message, message: "hi" })?.path).toEqual([
      "message",
    ]);
    expect(
      firstError({
        ...message,
        message: "a".repeat(CONTACT_LIMITS.message + 1),
      })?.path,
    ).toEqual(["message"]);
  });

  it("allows up to three links and rejects a fourth", () => {
    const links = (n: number) =>
      Array.from({ length: n }, (_, i) => `https://example.com/${i}`).join(" ");

    expect(
      contactMessageSchema.safeParse({ ...message, message: links(3) }).success,
    ).toBe(true);
    expect(firstError({ ...message, message: links(4) })).toEqual({
      path: ["message"],
      text: "Include 3 links or fewer",
    });
  });

  it("rejects fields that are not in the whitelist", () => {
    expect(
      contactMessageSchema.safeParse({ ...message, status: "READ" }).success,
    ).toBe(false);
  });
});

describe("countLinks", () => {
  it("counts http(s) URLs and bare www. hosts, in any case", () => {
    expect(countLinks("see HTTPS://a.dev, http://b.dev and www.c.dev")).toBe(3);
  });

  it("ignores plain words and email addresses", () => {
    expect(countLinks("Email me at ada@example.com about the website")).toBe(0);
  });
});

describe("contactSubmissionSchema", () => {
  const submission = {
    ...message,
    idempotencyKey: "0b8f3c1e-6d2a-4f7b-9a51-3e2c8d4f6a10",
    trap: "",
    elapsedMs: 12_000,
  };

  it("adds the idempotency key and the spam signals", () => {
    expect(contactSubmissionSchema.safeParse(submission).success).toBe(true);
  });

  it("needs a UUID key and a whole, non-negative elapsed time", () => {
    for (const bad of [
      { idempotencyKey: "retry-1" },
      { elapsedMs: -1 },
      { elapsedMs: 1.5 },
    ]) {
      expect(
        contactSubmissionSchema.safeParse({ ...submission, ...bad }).success,
      ).toBe(false);
    }
  });

  it("still rejects unknown fields", () => {
    expect(
      contactSubmissionSchema.safeParse({ ...submission, ip: "1.2.3.4" })
        .success,
    ).toBe(false);
  });
});
