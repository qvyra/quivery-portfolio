"use client";

import type { ContactTopic } from "@repo/shared";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Mail,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/ui/icons";
import {
  clearDraft,
  emptyFields,
  newDraft,
  newKey,
  readDraft,
  writeDraft,
  type ContactDraft,
  type ContactFields,
} from "@/lib/contact-draft";

type FieldName = keyof ContactFields;
type Errors = Partial<Record<FieldName, string>>;

type Phase = "idle" | "sending" | "waking" | "sent" | "failed";

export type ContactFallback = {
  kind: "discord" | "email";
  label: string;
  href: string;
};

type Props = {
  topics: { value: ContactTopic; label: string }[];
  limits: { name: number; email: number; message: number };
  /** Direct channels offered when sending fails */
  fallbacks: ContactFallback[];
};

// the order fields appear in, so focus goes to the first error on screen
const fieldOrder: FieldName[] = ["name", "email", "topic", "message"];

// a cold API takes about 35s, so after 3s of sending this explains the wait
const WAKING_AFTER_MS = 3_000;
const WAKING_TEXT = "Waking the server, this can take up to a minute";
// the site's route gives the API 90s, this allows a little more on top
const ATTEMPT_TIMEOUT_MS = 95_000;

// Zod and the shared schema load on first focus, not with the page: the form
// sits at the bottom, and most visitors never touch it
let shared: Promise<typeof import("@repo/shared")> | undefined;
const loadShared = () => (shared ??= import("@repo/shared"));

type Attempt =
  | { kind: "stored" }
  | { kind: "invalid"; errors: Errors }
  | { kind: "rejected"; message: string }
  | { kind: "retryable" };

async function send(body: object): Promise<Attempt> {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;

    if (response.status === 201) return { kind: "stored" };
    if (
      response.status === 400 &&
      json?.code?.startsWith("VALIDATION_FAILURE_")
    ) {
      // "VALIDATION_FAILURE_EMAIL" and "email: Enter a valid email address"
      const field = json.code.slice("VALIDATION_FAILURE_".length).toLowerCase();
      const text =
        json.message?.replace(/^[^:]*:\s*/, "") ?? "Check this field";
      return fieldOrder.includes(field as FieldName)
        ? { kind: "invalid", errors: { [field]: text } }
        : { kind: "rejected", message: text };
    }
    if (response.status === 429 && json?.message) {
      return { kind: "rejected", message: json.message };
    }
    return { kind: "retryable" };
  } catch {
    // offline, or no answer within the timeout
    return { kind: "retryable" };
  }
}

/**
 * The contact form. Sending stores the message before anything else, retries
 * once on its own with the same idempotency key, and the draft stays in this
 * browser until the message is confirmed stored
 */
export function ContactForm({ topics, limits, fallbacks }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ name: string; email: string } | null>(
    null,
  );

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});
  const trapRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef<"error" | "result" | null>(null);
  const warmed = useRef(false);
  const wakingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // the saved draft only exists in the browser, so it's read after hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage can't be read during the server render
    setDraft(readDraft() ?? newDraft());
    return () => clearTimeout(wakingTimer.current);
  }, []);

  useEffect(() => {
    if (draft) writeDraft(draft);
  }, [draft]);

  // focus moves after the render that shows the errors or the result, so
  // screen readers read the new state, not the old one
  useEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target === "result") resultRef.current?.focus();
    if (target === "error") {
      const first = fieldOrder.find((name) => errors[name]);
      if (first) fieldRefs.current[first]?.focus();
    }
  }, [errors, phase]);

  const fields = draft?.fields ?? emptyFields;
  const busy = phase === "sending" || phase === "waking";

  // wakes the API and loads the schema while the visitor is still typing
  function warmUp() {
    if (warmed.current) return;
    warmed.current = true;
    void loadShared();
    void fetch("/api/contact/warm", { method: "POST" }).catch(() => {});
  }

  function update(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    // what is being sent stays exactly what gets stored
    if (busy) return;
    const name = event.target.name as FieldName;
    const value = event.target.value;
    setDraft((current) => {
      const base = current ?? newDraft();
      return {
        ...base,
        fields: { ...base.fields, [name]: value },
        startedAt: base.startedAt ?? Date.now(),
        // an edit after a failed send is a new message: if the failed send
        // was stored after all, the same key would answer with the old text
        key: phase === "failed" ? newKey() : base.key,
      };
    });
    if (errors[name])
      setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !draft) return;

    const { contactMessageSchema } = await loadShared();
    const parsed = contactMessageSchema.safeParse({
      ...draft.fields,
      topic: draft.fields.topic || undefined,
    });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        found[field] ??= issue.message;
      }
      focusAfterRender.current = "error";
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure(null);
    setPhase("sending");
    wakingTimer.current = setTimeout(() => setPhase("waking"), WAKING_AFTER_MS);

    const body = {
      ...parsed.data,
      idempotencyKey: draft.key,
      trap: trapRef.current?.value ?? "",
      elapsedMs: Math.max(0, Date.now() - (draft.startedAt ?? Date.now())),
    };
    let attempt = await send(body);
    // one automatic retry, same key, so it can't store the message twice
    if (attempt.kind === "retryable") attempt = await send(body);
    clearTimeout(wakingTimer.current);

    if (attempt.kind === "stored") {
      clearDraft();
      setSentTo({ name: parsed.data.name, email: parsed.data.email });
      setDraft(newDraft());
      focusAfterRender.current = "result";
      setPhase("sent");
    } else if (attempt.kind === "invalid") {
      focusAfterRender.current = "error";
      setErrors(attempt.errors);
      setPhase("idle");
    } else {
      setFailure(
        attempt.kind === "rejected"
          ? attempt.message
          : "Your message couldn't be sent. It's still here, so you can try again in a moment.",
      );
      focusAfterRender.current = "result";
      setPhase("failed");
    }
  }

  if (phase === "sent" && sentTo) {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        aria-labelledby={`${id}-sent`}
        className="space-y-4 self-start rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset sm:p-8"
      >
        <span className="grid size-11 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/15 ring-inset">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <h3 id={`${id}-sent`} className="text-h3 font-semibold">
          Message sent
        </h3>
        <p className="text-white/75">
          Thanks, {sentTo.name}. I&apos;ll reply to{" "}
          <span className="font-medium break-all text-white">
            {sentTo.email}
          </span>
          .
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setSentTo(null);
            setPhase("idle");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  const describedBy = (name: FieldName, hint?: string) =>
    [hint, `${id}-${name}-error`].filter(Boolean).join(" ");

  return (
    <form
      noValidate
      onSubmit={submit}
      onFocus={warmUp}
      aria-labelledby={`${id}-title`}
      className="relative space-y-5 self-start rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset sm:p-8"
    >
      <h3 id={`${id}-title`} className="text-h3 font-semibold">
        Send a message
      </h3>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Name" error={errors.name}>
          <input
            ref={(el) => {
              fieldRefs.current.name = el;
            }}
            id={`${id}-name`}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={limits.name}
            value={fields.name}
            onChange={update}
            readOnly={busy}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
            className="field-input"
          />
        </Field>
        <Field id={`${id}-email`} label="Email" error={errors.email}>
          <input
            ref={(el) => {
              fieldRefs.current.email = el;
            }}
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={limits.email}
            value={fields.email}
            onChange={update}
            readOnly={busy}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className="field-input"
          />
        </Field>
      </div>

      <Field
        id={`${id}-topic`}
        label="What's this about?"
        optional
        error={errors.topic}
      >
        <div className="relative">
          <select
            ref={(el) => {
              fieldRefs.current.topic = el;
            }}
            id={`${id}-topic`}
            name="topic"
            value={fields.topic}
            onChange={update}
            // a select has no readOnly, and disabling it would drop focus
            aria-readonly={busy || undefined}
            aria-invalid={errors.topic ? true : undefined}
            aria-describedby={describedBy("topic")}
            className={`field-input ${fields.topic ? "" : "text-white/60"}`}
          >
            <option value="">Choose a topic</option>
            {topics.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-white/60"
          />
        </div>
      </Field>

      <Field id={`${id}-message`} label="Message" error={errors.message}>
        <textarea
          ref={(el) => {
            fieldRefs.current.message = el;
          }}
          id={`${id}-message`}
          name="message"
          rows={6}
          maxLength={limits.message}
          value={fields.message}
          onChange={update}
          readOnly={busy}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message", `${id}-message-hint`)}
          className="field-input"
        />
        <p id={`${id}-message-hint`} className="mt-2 text-sm text-white/55">
          Up to 3 links.
        </p>
      </Field>

      {/* people never see or reach this field, bots fill it in. The name
          avoids anything a browser's autofill recognises */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] size-px overflow-hidden"
      >
        <label htmlFor={`${id}-trap`}>Leave this field empty</label>
        <input
          ref={trapRef}
          id={`${id}-trap`}
          name="trap"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {phase === "failed" && failure && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="alert"
          className="space-y-4 rounded-lg bg-white/[0.04] p-4 ring-1 ring-(--color-error)/40 ring-inset"
        >
          <p className="flex gap-2.5">
            <CircleAlert
              className="mt-0.5 size-5 shrink-0 text-(--color-error)"
              aria-hidden="true"
            />
            <span>{failure}</span>
          </p>
          {fallbacks.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-white/70">Or reach me directly:</span>
              {fallbacks.map((link) => (
                <FallbackLink key={link.kind} link={link} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" size="lg" aria-disabled={busy || undefined}>
          {busy ? (
            <>
              <LoaderCircle
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />
              Sending
            </>
          ) : phase === "failed" ? (
            <>
              <RotateCcw aria-hidden="true" />
              Try again
            </>
          ) : (
            <>
              Send message
              <Send data-icon="end" aria-hidden="true" />
            </>
          )}
        </Button>
        <p role="status" className="text-sm text-white/70">
          {phase === "waking"
            ? WAKING_TEXT
            : phase === "sending"
              ? "Sending your message…"
              : ""}
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium">
        {label}
        {optional && (
          <span className="font-normal text-white/55"> (optional)</span>
        )}
      </label>
      {children}
      {/* always rendered, so the error is announced as it appears */}
      <p
        id={`${id}-error`}
        aria-live="polite"
        className={
          error ? "mt-2 flex gap-1.5 text-sm text-(--color-error)" : undefined
        }
      >
        {error && (
          <>
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </>
        )}
      </p>
    </div>
  );
}

function FallbackLink({ link }: { link: ContactFallback }) {
  const Icon = link.kind === "discord" ? DiscordIcon : Mail;
  const external = /^https?:\/\//.test(link.href);
  return (
    <a
      href={link.href}
      className="inline-flex min-h-11 items-center gap-1.5 font-medium underline decoration-white/30 underline-offset-4 hover:decoration-white"
      {...(external && { target: "_blank", rel: "noreferrer" })}
    >
      <Icon className="size-4" aria-hidden="true" />
      {link.label}
      {external && (
        <>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}
