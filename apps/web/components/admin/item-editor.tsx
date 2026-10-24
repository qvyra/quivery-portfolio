"use client";

import { adminCollectionSchema, type AdminCollection } from "@repo/shared";
import {
  ArrowLeft,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminError, adminFetch } from "./api";
import { collections, emptyValue, toPayload } from "./fields";
import { FieldsForm, type Errors, type Values } from "./form";
import {
  apiErrors,
  statusOf,
  validate,
  type AdminChange,
  type AdminItem,
} from "./items";
import { deployNotice, useNotice, useUnsavedGuard } from "./shell";

export function ItemEditor() {
  const params = useParams<{ collection: string; id: string }>();
  const parsed = adminCollectionSchema.safeParse(params.collection);
  if (!parsed.success) return <p>No such collection.</p>;
  return (
    <Editor
      key={`${parsed.data}/${params.id}`}
      collection={parsed.data}
      id={params.id}
    />
  );
}

function Editor({
  collection,
  id,
}: {
  collection: AdminCollection;
  id: string;
}) {
  const config = collections[collection];
  const router = useRouter();
  const notify = useNotice();
  const creating = id === "new";
  const [item, setItem] = useState<AdminItem | null>(null);
  // a new item starts from empty fields and the collection's defaults
  const [values, setValues] = useState<Values | null>(() =>
    creating
      ? {
          ...Object.fromEntries(
            config.fields.map((f) => [f.name, emptyValue(f)]),
          ),
          ...config.defaults,
        }
      : null,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "publish" | "discard">(null);
  const [preview, setPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedGuard(dirty);

  useEffect(() => {
    if (creating) return;
    adminFetch<AdminItem>(`/collections/${collection}/${id}`)
      .then((loaded) => {
        setItem(loaded);
        // a pending draft is what the next publish puts live, so edit that
        setValues(loaded.draft ?? loaded.content);
      })
      .catch((e: Error) => notify(e.message, "error"));
  }, [collection, id, creating, config, notify]);

  function change(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }

  function focusFirstError() {
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus(),
    );
  }

  /** Saves, returning the saved item, or null when it couldn't */
  async function save(): Promise<AdminItem | null> {
    if (!values) return null;
    const payload = toPayload(config.fields, values);
    const found = validate(collection, payload);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify("Some fields need fixing.", "error");
      focusFirstError();
      return null;
    }
    try {
      const result = await adminFetch<AdminChange>(
        creating
          ? `/collections/${collection}`
          : `/collections/${collection}/${id}`,
        { method: creating ? "POST" : "PUT", body: payload },
      );
      setDirty(false);
      setPreviewKey((k) => k + 1);
      if (creating && result.item) {
        notify(`Created as a draft. Publish it to put it on the site.`);
        router.replace(`/admin/content/${collection}/${result.item.id}`);
      } else if (result.item) {
        setItem(result.item);
        notify(
          result.item.publishStatus === "PUBLISHED"
            ? "Saved as unpublished changes. The site changes when you publish."
            : "Saved.",
        );
      }
      return result.item;
    } catch (e) {
      if (e instanceof AdminError && e.code.startsWith("VALIDATION_FAILURE_")) {
        setErrors(apiErrors(e.message));
        focusFirstError();
      }
      notify((e as Error).message, "error");
      return null;
    }
  }

  async function run(kind: "save" | "publish" | "discard") {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "save") {
        await save();
      } else if (kind === "publish") {
        const saved = dirty || creating ? await save() : item;
        if (!saved) return;
        const result = await adminFetch<AdminChange>(
          `/collections/${collection}/${saved.id}/publish`,
          { method: "POST" },
        );
        if (result.item) setItem(result.item);
        setPreviewKey((k) => k + 1);
        notify("Published. The site updates in a moment.");
        const deploy = deployNotice(result.deploy);
        if (deploy)
          notify(deploy, result.deploy === "started" ? "ok" : "error");
      } else if (
        item &&
        window.confirm("Throw away the unpublished changes?")
      ) {
        const result = await adminFetch<AdminChange>(
          `/collections/${collection}/${item.id}/discard`,
          { method: "POST" },
        );
        if (result.item) {
          setItem(result.item);
          setValues(result.item.content);
          setDirty(false);
          setPreviewKey((k) => k + 1);
        }
        notify("Unpublished changes discarded.");
      }
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const previewUrl =
    config.preview === "project" && item
      ? `/admin/preview/projects/${item.id}`
      : `/admin/preview${collection === "sections" && typeof values?.slug === "string" ? `#${values.slug}` : ""}`;

  return (
    <div className={preview ? "grid gap-6 xl:grid-cols-2" : "max-w-3xl"}>
      <div className="min-w-0">
        <Link
          href={`/admin/content/${collection}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> {config.title}
        </Link>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-h2 font-semibold">
              {creating
                ? `New ${config.singular}`
                : values
                  ? config.label(values) || "Untitled"
                  : "Loading…"}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {item
                ? `${statusOf(item)}${item.visible ? "" : " · Hidden"}`
                : creating
                  ? "Not saved yet"
                  : ""}
              {dirty && " · Unsaved edits"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
          >
            {preview ? (
              <PanelRightClose aria-hidden="true" />
            ) : (
              <PanelRightOpen aria-hidden="true" />
            )}
            Preview
          </button>
        </div>
        {values && (
          <form
            ref={formRef}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void run("save");
            }}
          >
            <FieldsForm
              fields={config.fields}
              values={values}
              errors={errors}
              onChange={change}
            />
            <div className="sticky bottom-0 mt-8 flex flex-wrap gap-3 border-t border-white/10 bg-ink/95 py-4 backdrop-blur">
              <button
                type="submit"
                className="btn btn-secondary btn-md"
                aria-disabled={busy !== null || undefined}
              >
                {busy === "save" && (
                  <LoaderCircle
                    className="motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                )}
                {item?.publishStatus === "PUBLISHED" ? "Save changes" : "Save"}
              </button>
              {(creating ||
                dirty ||
                item?.publishStatus === "DRAFT" ||
                item?.draft) && (
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  aria-disabled={busy !== null || undefined}
                  onClick={() => void run("publish")}
                >
                  {busy === "publish" && (
                    <LoaderCircle
                      className="motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {dirty || creating ? "Save and publish" : "Publish"}
                </button>
              )}
              {item?.draft && (
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  aria-disabled={busy !== null || undefined}
                  onClick={() => void run("discard")}
                >
                  Discard changes
                </button>
              )}
            </div>
          </form>
        )}
      </div>
      {preview && (
        <div className="min-w-0 xl:sticky xl:top-4 xl:h-[calc(100dvh-2rem)]">
          <p className="mb-2 text-sm text-white/60">
            {creating
              ? "Save first to preview."
              : "The site as it will look once published, saved changes included. Updates on every save."}
          </p>
          {!creating && (
            <iframe
              key={previewKey}
              src={previewUrl}
              title="Preview"
              className="h-[70vh] w-full rounded-xl bg-ink ring-1 ring-white/15 xl:h-[calc(100%-2rem)]"
            />
          )}
        </div>
      )}
    </div>
  );
}
