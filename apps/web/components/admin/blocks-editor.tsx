"use client";

import { embedProviderHosts, type BlockType } from "@repo/shared";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import {
  FieldError,
  IconButton,
  LinkList,
  move,
  type Errors,
  type Values,
} from "./form";
import { MediaField } from "./media";

const blockLabels: Record<BlockType, string> = {
  richText: "Text",
  image: "Image",
  video: "Video",
  gallery: "Gallery",
  linkList: "Links",
  statsRow: "Stats row",
  codeSnippet: "Code",
  embed: "Embedded video",
};

const newId = () => Math.random().toString(36).slice(2, 10);

function newBlock(type: BlockType): Values {
  const id = newId();
  switch (type) {
    case "richText":
      return { id, type, markdown: "" };
    case "image":
      return { id, type, image: { mediaId: null } };
    case "video":
      return { id, type, video: { mediaId: null }, loop: false };
    case "gallery":
      return { id, type, items: [] };
    case "linkList":
      return { id, type, links: [] };
    case "statsRow":
      return { id, type, items: [] };
    case "codeSnippet":
      return { id, type, language: "luau", code: "" };
    case "embed":
      return { id, type, provider: "youtube", url: "", title: "" };
  }
}

// an optional text that's empty is left out, the schema rejects ""
function withOptional(block: Values, key: string, value: string): Values {
  const copy = { ...block };
  if (value.trim() === "") delete copy[key];
  else copy[key] = value;
  return copy;
}

/** Edits a list of content blocks: add, change, reorder and remove */
export function BlocksEditor({
  label,
  blocks,
  errors,
  path,
  onChange,
}: {
  label: string;
  blocks: Values[];
  errors: Errors;
  path: string;
  onChange: (blocks: Values[]) => void;
}) {
  const id = useId();
  const [type, setType] = useState<BlockType>("richText");
  const update = (index: number, block: Values) =>
    onChange(blocks.map((b, i) => (i === index ? block : b)));

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {blocks.length === 0 && (
        <p className="text-sm text-white/55">No blocks yet.</p>
      )}
      <ol className="space-y-3">
        {blocks.map((block, index) => (
          <li
            key={String(block.id)}
            className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10 ring-inset"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-white/80">
                {blockLabels[block.type as BlockType] ?? String(block.type)}
              </span>
              <span className="ml-auto flex gap-1">
                <IconButton
                  label="Move block up"
                  disabled={index === 0}
                  onClick={() => onChange(move(blocks, index, -1))}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Move block down"
                  disabled={index === blocks.length - 1}
                  onClick={() => onChange(move(blocks, index, 1))}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Remove block"
                  onClick={() => onChange(blocks.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </span>
            </div>
            <BlockFields
              block={block}
              errors={errors}
              path={`${path}.${index}`}
              onChange={(b) => update(index, b)}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label
            htmlFor={`${id}-type`}
            className="mb-1.5 block text-sm text-white/70"
          >
            New block
          </label>
          <select
            id={`${id}-type`}
            className="field-input"
            value={type}
            onChange={(e) => setType(e.target.value as BlockType)}
          >
            {Object.entries(blockLabels).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onChange([...blocks, newBlock(type)])}
        >
          <Plus aria-hidden="true" /> Add block
        </button>
      </div>
      <FieldError id={`${id}-error`} error={errors[path]} />
    </fieldset>
  );
}

function Text({
  label,
  value,
  error,
  multiline,
  mono,
  onChange,
}: {
  label: string;
  value: unknown;
  error?: string;
  multiline?: boolean;
  mono?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const props = {
    id,
    className: `field-input ${mono ? "font-mono text-sm" : ""}`,
    value: typeof value === "string" ? value : "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-error`,
  } as const;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...props}
          rows={8}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input {...props} onChange={(e) => onChange(e.target.value)} />
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function MediaRef({
  label,
  accept,
  value,
  error,
  onChange,
}: {
  label: string;
  accept: "IMAGE" | "VIDEO";
  value: unknown;
  error?: string;
  onChange: (value: { mediaId: string | null }) => void;
}) {
  const id = useId();
  const mediaId =
    (value as { mediaId?: string | null } | undefined)?.mediaId ?? null;
  return (
    <MediaField
      id={id}
      label={label}
      accept={accept}
      value={mediaId}
      error={error}
      onChange={(next) => onChange({ mediaId: next })}
    />
  );
}

function BlockFields({
  block,
  errors,
  path,
  onChange,
}: {
  block: Values;
  errors: Errors;
  path: string;
  onChange: (block: Values) => void;
}) {
  const at = (key: string) => errors[`${path}.${key}`];
  const caption = (
    <Text
      label="Caption (optional)"
      value={block.caption}
      error={at("caption")}
      onChange={(v) => onChange(withOptional(block, "caption", v))}
    />
  );

  switch (block.type as BlockType) {
    case "richText":
      return (
        <Text
          label="Markdown"
          multiline
          mono
          value={block.markdown}
          error={at("markdown")}
          onChange={(markdown) => onChange({ ...block, markdown })}
        />
      );
    case "image":
      return (
        <div className="space-y-4">
          <MediaRef
            label="Image"
            accept="IMAGE"
            value={block.image}
            error={at("image.mediaId") ?? at("image")}
            onChange={(image) => onChange({ ...block, image })}
          />
          {caption}
        </div>
      );
    case "video":
      return (
        <div className="space-y-4">
          <MediaRef
            label="Video"
            accept="VIDEO"
            value={block.video}
            error={at("video.mediaId") ?? at("video")}
            onChange={(video) => onChange({ ...block, video })}
          />
          {caption}
          <label className="inline-flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-(--color-orchid)"
              checked={block.loop === true}
              onChange={(e) => onChange({ ...block, loop: e.target.checked })}
            />
            Loop silently, like a GIF
          </label>
        </div>
      );
    case "gallery":
      return (
        <GalleryItems
          block={block}
          errors={errors}
          path={path}
          onChange={onChange}
        />
      );
    case "linkList":
      return (
        <LinkList
          label="Links"
          links={
            (block.links as { label: string; url: string; type: string }[]) ??
            []
          }
          errors={errors}
          path={`${path}.links`}
          onChange={(links) => onChange({ ...block, links })}
        />
      );
    case "statsRow":
      return (
        <StatItems
          block={block}
          errors={errors}
          path={path}
          onChange={onChange}
        />
      );
    case "codeSnippet":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            label="Language"
            value={block.language}
            error={at("language")}
            onChange={(language) => onChange({ ...block, language })}
          />
          <Text
            label="File name (optional)"
            value={block.filename}
            error={at("filename")}
            onChange={(v) => onChange(withOptional(block, "filename", v))}
          />
          <div className="sm:col-span-2">
            <Text
              label="Code"
              multiline
              mono
              value={block.code}
              error={at("code")}
              onChange={(code) => onChange({ ...block, code })}
            />
          </div>
          <div className="sm:col-span-2">{caption}</div>
        </div>
      );
    case "embed":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm"
              htmlFor={`${path}-provider`}
            >
              Provider
            </label>
            <select
              id={`${path}-provider`}
              className="field-input"
              value={String(block.provider)}
              onChange={(e) => onChange({ ...block, provider: e.target.value })}
            >
              {Object.keys(embedProviderHosts).map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <Text
            label="Title, for screen readers"
            value={block.title}
            error={at("title")}
            onChange={(title) => onChange({ ...block, title })}
          />
          <div className="sm:col-span-2">
            <Text
              label="URL"
              value={block.url}
              error={at("url")}
              onChange={(url) => onChange({ ...block, url })}
            />
          </div>
        </div>
      );
    default:
      return (
        <p className="text-sm text-white/60">
          This block type can&apos;t be edited here.
        </p>
      );
  }
}

function GalleryItems({
  block,
  errors,
  path,
  onChange,
}: {
  block: Values;
  errors: Errors;
  path: string;
  onChange: (b: Values) => void;
}) {
  const items = (block.items as Values[]) ?? [];
  const set = (next: Values[]) => onChange({ ...block, items: next });
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex flex-wrap items-start gap-3 rounded-lg p-3 ring-1 ring-white/10 ring-inset"
          >
            <div className="min-w-60 flex-1 space-y-3">
              <MediaRef
                label={`Image ${index + 1}`}
                accept="IMAGE"
                value={item.image}
                error={errors[`${path}.items.${index}.image.mediaId`]}
                onChange={(image) =>
                  set(
                    items.map((it, i) => (i === index ? { ...it, image } : it)),
                  )
                }
              />
              <Text
                label="Caption (optional)"
                value={item.caption}
                onChange={(v) =>
                  set(
                    items.map((it, i) =>
                      i === index ? withOptional(it, "caption", v) : it,
                    ),
                  )
                }
              />
            </div>
            <div className="flex gap-1">
              <IconButton
                label="Move image up"
                disabled={index === 0}
                onClick={() => set(move(items, index, -1))}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Move image down"
                disabled={index === items.length - 1}
                onClick={() => set(move(items, index, 1))}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Remove image"
                onClick={() => set(items.filter((_, i) => i !== index))}
              >
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => set([...items, { image: { mediaId: null } }])}
      >
        <Plus aria-hidden="true" /> Add image
      </button>
      <FieldError id={`${path}-items-error`} error={errors[`${path}.items`]} />
    </div>
  );
}

function StatItems({
  block,
  errors,
  path,
  onChange,
}: {
  block: Values;
  errors: Errors;
  path: string;
  onChange: (b: Values) => void;
}) {
  const items = (block.items as { value: string; label: string }[]) ?? [];
  const set = (next: typeof items) => onChange({ ...block, items: next });
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex flex-wrap gap-2">
            <input
              aria-label={`Stat ${index + 1} value`}
              placeholder="6+"
              className="field-input w-28"
              value={item.value}
              onChange={(e) =>
                set(
                  items.map((it, i) =>
                    i === index ? { ...it, value: e.target.value } : it,
                  ),
                )
              }
            />
            <input
              aria-label={`Stat ${index + 1} label`}
              placeholder="Years"
              className="field-input min-w-40 flex-1"
              value={item.label}
              onChange={(e) =>
                set(
                  items.map((it, i) =>
                    i === index ? { ...it, label: e.target.value } : it,
                  ),
                )
              }
            />
            <IconButton
              label={`Remove stat ${index + 1}`}
              onClick={() => set(items.filter((_, i) => i !== index))}
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => set([...items, { value: "", label: "" }])}
      >
        <Plus aria-hidden="true" /> Add stat
      </button>
      <FieldError id={`${path}-stats-error`} error={errors[`${path}.items`]} />
    </div>
  );
}
