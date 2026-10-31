"use client";

import { contactTopicLabels, type ContactTopic } from "@repo/shared";
import {
  Archive,
  ArchiveRestore,
  LoaderCircle,
  Mail,
  MailOpen,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminError, adminFetch } from "./api";
import { collections, profileFields, toPayload } from "./fields";
import { FieldsForm, IconButton, type Errors, type Values } from "./form";
import { apiErrors, type AdminItem } from "./items";
import {
  fileName,
  MediaThumb,
  refreshMediaLibrary,
  uploadFile,
  useMediaLibrary,
  type AdminMedia,
} from "./media";
import { useNotice, useUnsavedGuard } from "./shell";

// ── Overview ────────────────────────────────────────────────────────────────

export function Overview() {
  const [unread, setUnread] = useState<number | null>(null);
  const [pending, setPending] = useState<
    { key: string; title: string; count: number }[]
  >([]);

  useEffect(() => {
    adminFetch<{ counts: { NEW: number } }>("/messages")
      .then((inbox) => setUnread(inbox.counts.NEW))
      .catch(() => setUnread(null));
    void Promise.all(
      Object.entries(collections).map(async ([key, config]) => {
        const items = await adminFetch<AdminItem[]>(
          `/collections/${key}`,
        ).catch(() => []);
        return {
          key,
          title: config.title,
          count: items.filter((i) => i.draft || i.publishStatus === "DRAFT")
            .length,
        };
      }),
    ).then(setPending);
  }, []);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-h2 font-semibold">Overview</h1>
      <section
        aria-labelledby="inbox-title"
        className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10 ring-inset"
      >
        <h2 id="inbox-title" className="text-h3 font-semibold">
          Inbox
        </h2>
        <p className="mt-1 text-white/70">
          {unread === null
            ? "Loading…"
            : unread === 0
              ? "No unread messages."
              : `${unread} unread ${unread === 1 ? "message" : "messages"}.`}
        </p>
        <Link href="/admin/inbox" className="btn btn-secondary btn-sm mt-4">
          Open the inbox
        </Link>
      </section>
      <BenchmarksRefresh />
      <section aria-labelledby="drafts-title">
        <h2 id="drafts-title" className="text-h3 font-semibold">
          Not published yet
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {pending.map((entry) => (
            <li key={entry.key}>
              <Link
                href={`/admin/content/${entry.key}`}
                className="flex min-h-14 items-center justify-between rounded-lg bg-white/[0.03] px-4 ring-1 ring-white/10 ring-inset hover:ring-white/25"
              >
                <span>{entry.title}</span>
                <span className="text-sm text-white/60">
                  {entry.count === 0
                    ? "All published"
                    : `${entry.count} waiting`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// the bench data refreshes daily by itself, this is for right after a run
function BenchmarksRefresh() {
  const notify = useNotice();
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    setBusy(true);
    adminFetch("/benchmarks/refresh", { method: "POST" })
      .then(() =>
        notify(
          "Done. The next visit to a benchmarks page starts a refresh, and the one after shows it.",
        ),
      )
      .catch((e: Error) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <section
      aria-labelledby="benchmarks-title"
      className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10 ring-inset"
    >
      <h2 id="benchmarks-title" className="text-h3 font-semibold">
        Benchmarks
      </h2>
      <p className="mt-1 text-white/70">
        Results are fetched from the bench data once a day. Refresh after a new
        run to pick it up sooner.
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-4"
        onClick={refresh}
        disabled={busy}
      >
        {busy && (
          <LoaderCircle
            aria-hidden="true"
            className="motion-safe:animate-spin"
          />
        )}
        Refresh benchmarks
      </button>
    </section>
  );
}

// ── Profile ─────────────────────────────────────────────────────────────────

export function ProfileEditor() {
  const notify = useNotice();
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useUnsavedGuard(dirty);

  useEffect(() => {
    adminFetch<Values>("/profile")
      .then(setValues)
      .catch((e: Error) => notify(e.message, "error"));
  }, [notify]);

  async function save() {
    if (!values || busy) return;
    setBusy(true);
    try {
      await adminFetch("/profile", {
        method: "PUT",
        body: toPayload(profileFields, values),
      });
      setErrors({});
      setDirty(false);
      notify(
        "Saved. The profile has no drafts, so the site updates in a moment.",
      );
    } catch (e) {
      if (e instanceof AdminError && e.code.startsWith("VALIDATION_FAILURE_"))
        setErrors(apiErrors(e.message));
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-h2 font-semibold">Profile</h1>
      <p className="mb-6 text-white/60">
        Your name and headline across the site. Saving puts it live straight
        away.
      </p>
      {values && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <FieldsForm
            fields={profileFields}
            values={values}
            errors={errors}
            onChange={(name, value) => {
              setValues((v) => ({ ...v, [name]: value }));
              setDirty(true);
            }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-md mt-8"
            aria-disabled={busy || undefined}
          >
            {busy && (
              <LoaderCircle
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />
            )}
            Save
          </button>
        </form>
      )}
    </div>
  );
}

// ── Media library ───────────────────────────────────────────────────────────

const size = (bytes: number | null) =>
  bytes === null
    ? ""
    : bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;

export function MediaLibrary() {
  const notify = useNotice();
  const items = useMediaLibrary();
  const [busy, setBusy] = useState(false);
  const captions = (items ?? []).filter((m) => m.mimeType === "text/vtt");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
        notify(`Uploaded ${file.name}.`);
      } catch (e) {
        notify(`${file.name}: ${(e as Error).message}`, "error");
      }
    }
    setBusy(false);
  }

  async function save(
    media: AdminMedia,
    patch: Partial<Pick<AdminMedia, "alt" | "captionsId">>,
  ) {
    try {
      await adminFetch(`/media/${media.id}`, {
        method: "PUT",
        body: {
          alt: patch.alt ?? media.alt,
          captionsId:
            patch.captionsId === undefined
              ? media.captionsId
              : patch.captionsId,
        },
      });
      refreshMediaLibrary();
      notify("Saved.");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  async function remove(media: AdminMedia) {
    if (!window.confirm(`Delete ${fileName(media)}? This can't be undone.`))
      return;
    try {
      await adminFetch(`/media/${media.id}`, { method: "DELETE" });
      refreshMediaLibrary();
      notify("Deleted.");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 font-semibold">Media</h1>
        <label className="btn btn-primary btn-sm cursor-pointer">
          {busy ? (
            <LoaderCircle
              className="motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {busy ? "Uploading" : "Upload"}
          <input
            type="file"
            multiple
            className="sr-only"
            disabled={busy}
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif,video/mp4,video/webm,.pdf,.vtt"
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
      </div>
      <p className="mb-6 text-sm text-white/60">
        Images up to 10 MB, MP4 or WebM videos up to 100 MB, PDFs and .vtt
        captions. Describe every image that carries meaning in its alt text;
        leave it empty for decoration.
      </p>
      {items === null && <p className="text-white/60">Loading…</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            captions={captions}
            onSave={save}
            onRemove={remove}
          />
        ))}
      </ul>
    </div>
  );
}

function MediaCard({
  media,
  captions,
  onSave,
  onRemove,
}: {
  media: AdminMedia;
  captions: AdminMedia[];
  onSave: (
    media: AdminMedia,
    patch: Partial<Pick<AdminMedia, "alt" | "captionsId">>,
  ) => Promise<void>;
  onRemove: (media: AdminMedia) => Promise<void>;
}) {
  const [alt, setAlt] = useState(media.alt);
  return (
    <li className="space-y-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10 ring-inset">
      <MediaThumb media={media} className="aspect-video h-auto w-full" />
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm">
          <a
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate underline-offset-4 hover:underline"
          >
            {fileName(media)}
          </a>
          <span className="text-white/55">
            {media.kind.toLowerCase()} · {size(media.sizeBytes)}
            {media.width && media.height
              ? ` · ${media.width}×${media.height}`
              : ""}
          </span>
        </p>
        <IconButton
          label={`Delete ${fileName(media)}`}
          onClick={() => void onRemove(media)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
      {media.kind !== "FILE" && (
        <div>
          <label htmlFor={`alt-${media.id}`} className="mb-1 block text-sm">
            Alt text
          </label>
          <input
            id={`alt-${media.id}`}
            className="field-input"
            maxLength={300}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={() => alt !== media.alt && void onSave(media, { alt })}
          />
        </div>
      )}
      {media.kind === "VIDEO" && (
        <div>
          <label
            htmlFor={`captions-${media.id}`}
            className="mb-1 block text-sm"
          >
            Captions
          </label>
          <select
            id={`captions-${media.id}`}
            className="field-input"
            value={media.captionsId ?? ""}
            onChange={(e) =>
              void onSave(media, { captionsId: e.target.value || null })
            }
          >
            <option value="">None</option>
            {captions.map((file) => (
              <option key={file.id} value={file.id}>
                {fileName(file)}
              </option>
            ))}
          </select>
          {captions.length === 0 && (
            <p className="mt-1 text-sm text-white/55">
              Upload a .vtt file to add captions.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// ── Inbox ───────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic | null;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED";
  createdAt: string;
};

export function Inbox() {
  const notify = useNotice();
  const [archived, setArchived] = useState(false);
  const [data, setData] = useState<{
    messages: Message[];
    counts: Record<Message["status"], number>;
  } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const loadId = useRef(0);

  async function load(showArchived = archived) {
    const id = ++loadId.current;
    const next = await adminFetch<NonNullable<typeof data>>(
      showArchived ? "/messages?status=ARCHIVED" : "/messages",
    );
    if (id === loadId.current) setData(next);
  }

  useEffect(() => {
    void load(archived).catch((e: Error) => notify(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the tab changes
  }, [archived]);

  async function setStatus(
    message: Message,
    status: Message["status"],
    quiet = false,
  ) {
    try {
      await adminFetch(`/messages/${message.id}/status`, {
        method: "PUT",
        body: { status },
      });
      await load();
      if (!quiet)
        notify(
          status === "ARCHIVED"
            ? "Archived."
            : status === "NEW"
              ? "Marked unread."
              : "Moved to the inbox.",
        );
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  async function remove(message: Message) {
    if (
      !window.confirm(
        `Delete the message from ${message.name}? This can't be undone.`,
      )
    )
      return;
    try {
      await adminFetch(`/messages/${message.id}`, { method: "DELETE" });
      await load();
      notify("Deleted.");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  function toggle(message: Message) {
    const opening = open !== message.id;
    setOpen(opening ? message.id : null);
    if (opening && message.status === "NEW")
      void setStatus(message, "READ", true);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-h2 font-semibold">Inbox</h1>
      {/* filters over one list, so toggle buttons rather than tabs */}
      <div role="group" aria-label="Show" className="mb-6 flex gap-2">
        {[false, true].map((tab) => (
          <button
            key={String(tab)}
            type="button"
            aria-pressed={archived === tab}
            onClick={() => setArchived(tab)}
            className={`btn btn-sm ${archived === tab ? "btn-primary" : "btn-secondary"}`}
          >
            {tab
              ? `Archived (${data?.counts.ARCHIVED ?? 0})`
              : `Inbox (${(data?.counts.NEW ?? 0) + (data?.counts.READ ?? 0)})`}
          </button>
        ))}
      </div>
      {data === null && <p className="text-white/60">Loading…</p>}
      {data?.messages.length === 0 && (
        <p className="text-white/60">
          {archived ? "Nothing archived." : "No messages."}
        </p>
      )}
      <ul
        className="space-y-2"
        aria-label={archived ? "Archived messages" : "Messages"}
      >
        {data?.messages.map((message) => (
          <li
            key={message.id}
            className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 ring-inset"
          >
            <button
              type="button"
              aria-expanded={open === message.id}
              onClick={() => toggle(message)}
              className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 p-4 text-left"
            >
              {message.status === "NEW" && (
                <span className="rounded-full bg-(--color-rose) px-2 text-xs font-semibold">
                  New
                </span>
              )}
              <span className={message.status === "NEW" ? "font-semibold" : ""}>
                {message.name}
              </span>
              <span className="text-sm text-white/55">
                {message.topic ? contactTopicLabels[message.topic] : "No topic"}{" "}
                · {new Date(message.createdAt).toLocaleString()}
              </span>
              <span className="w-full truncate text-sm text-white/70">
                {message.message}
              </span>
            </button>
            {open === message.id && (
              <div className="space-y-4 border-t border-white/10 p-4">
                <p className="text-sm">
                  <a
                    href={`mailto:${message.email}`}
                    className="underline underline-offset-4"
                  >
                    {message.email}
                  </a>
                </p>
                <p className="whitespace-pre-wrap">{message.message}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`mailto:${message.email}`}
                    className="btn btn-primary btn-sm"
                  >
                    <Mail aria-hidden="true" /> Reply
                  </a>
                  {message.status !== "ARCHIVED" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void setStatus(message, "NEW")}
                      >
                        <MailOpen aria-hidden="true" /> Mark unread
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void setStatus(message, "ARCHIVED")}
                      >
                        <Archive aria-hidden="true" /> Archive
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void setStatus(message, "READ")}
                    >
                      <ArchiveRestore aria-hidden="true" /> Move to the inbox
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void remove(message)}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
