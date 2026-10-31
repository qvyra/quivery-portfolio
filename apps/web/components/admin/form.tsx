"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { adminFetch } from "./api";
import { BlocksEditor } from "./blocks-editor";
import { linkTypes, type Field } from "./fields";
import { MediaField } from "./media";

export type Values = Record<string, unknown>;
/** Errors by path, "links.0.url" style, from the schema's issues */
export type Errors = Record<string, string>;

export function FieldError({ id, error }: { id: string; error?: string }) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={error ? "mt-1.5 text-sm text-(--color-error)" : undefined}
    >
      {error}
    </p>
  );
}

export function Labelled({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {help && <p className="mt-1.5 text-sm text-white/55">{help}</p>}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** Moves item `index` by `delta` in a copy of the list */
export function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 shrink-0 place-items-center rounded-md text-white/70 ring-1 ring-white/10 ring-inset hover:bg-white/[0.06] hover:text-white disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Every field of a form, in order */
export function FieldsForm({
  fields,
  values,
  errors,
  onChange,
  prefix = "",
}: {
  fields: Field[];
  values: Values;
  errors: Errors;
  onChange: (name: string, value: unknown) => void;
  /** Error path prefix, for nested forms */
  prefix?: string;
}) {
  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name]}
          errors={errors}
          path={`${prefix}${field.name}`}
          onChange={(value) => onChange(field.name, value)}
        />
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  errors,
  path,
  onChange,
}: {
  field: Field;
  value: unknown;
  errors: Errors;
  path: string;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  const error = errors[path];
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-error`,
  } as const;
  const label = field.optional ? `${field.label} (optional)` : field.label;

  switch (field.kind) {
    case "text":
    case "url":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <input
            {...common}
            type={field.kind === "url" ? "url" : "text"}
            className="field-input"
            maxLength={field.kind === "text" ? field.max : undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </Labelled>
      );
    case "textarea":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <textarea
            {...common}
            rows={field.rows ?? 6}
            maxLength={field.max}
            className={`field-input ${field.markdown ? "font-mono text-sm" : ""}`}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </Labelled>
      );
    case "number":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <input
            {...common}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            className="field-input max-w-40"
            value={typeof value === "number" ? value : ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Labelled>
      );
    case "date":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <input
            {...common}
            type="date"
            className="field-input max-w-56"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        </Labelled>
      );
    case "boolean":
      return (
        <div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
            <input
              {...common}
              type="checkbox"
              className="size-5 accent-(--color-orchid)"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
          {field.help && <p className="text-sm text-white/55">{field.help}</p>}
          <FieldError id={`${id}-error`} error={error} />
        </div>
      );
    case "select":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <select
            {...common}
            className="field-input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Labelled>
      );
    case "project":
      return (
        <Labelled id={id} label={label} help={field.help} error={error}>
          <ProjectSelect
            {...common}
            value={typeof value === "string" ? value : null}
            onChange={onChange}
          />
        </Labelled>
      );
    case "media":
      return (
        <MediaField
          id={id}
          label={label}
          help={field.help}
          error={error}
          accept={field.accept}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
        />
      );
    case "strings":
      return (
        <StringList
          id={id}
          label={label}
          help={field.help}
          max={field.max}
          values={Array.isArray(value) ? (value as string[]) : []}
          errors={errors}
          path={path}
          onChange={onChange}
        />
      );
    case "links":
      return (
        <LinkList
          label={label}
          links={Array.isArray(value) ? (value as Link[]) : []}
          errors={errors}
          path={path}
          onChange={onChange}
        />
      );
    case "blocks":
      return (
        <BlocksEditor
          label={label}
          help={field.help}
          blocks={Array.isArray(value) ? (value as Values[]) : []}
          errors={errors}
          path={path}
          onChange={onChange}
        />
      );
  }
}

function ProjectSelect({
  value,
  onChange,
  ...props
}: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    adminFetch<{ id: string; content: { title: string } }[]>(
      "/collections/projects",
    )
      .then((items) =>
        setProjects(items.map((i) => ({ id: i.id, title: i.content.title }))),
      )
      .catch(() => setProjects([]));
  }, []);
  return (
    <select
      {...props}
      className="field-input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">None</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.title}
        </option>
      ))}
    </select>
  );
}

function StringList({
  id,
  label,
  help,
  max,
  values,
  errors,
  path,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  max?: number;
  values: string[];
  errors: Errors;
  path: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset aria-describedby={`${id}-error`}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <ul className="space-y-2">
        {values.map((entry, index) => (
          <li key={index} className="flex gap-2">
            <input
              aria-label={`${label} ${index + 1}`}
              className="field-input"
              maxLength={max}
              value={entry}
              aria-invalid={errors[`${path}.${index}`] ? true : undefined}
              onChange={(e) =>
                onChange(
                  values.map((v, i) => (i === index ? e.target.value : v)),
                )
              }
            />
            <IconButton
              label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-2"
        onClick={() => onChange([...values, ""])}
      >
        <Plus aria-hidden="true" /> Add
      </button>
      {help && <p className="mt-1.5 text-sm text-white/55">{help}</p>}
      <FieldError id={`${id}-error`} error={errors[path]} />
    </fieldset>
  );
}

type Link = { label: string; url: string; type: string };

export function LinkList({
  label,
  links,
  errors,
  path,
  onChange,
}: {
  label: string;
  links: Link[];
  errors: Errors;
  path: string;
  onChange: (value: Link[]) => void;
}) {
  const set = (index: number, patch: Partial<Link>) =>
    onChange(
      links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <ul className="space-y-3">
        {links.map((link, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-lg p-3 ring-1 ring-white/10 ring-inset sm:grid-cols-[1fr_1.4fr_10rem_auto]"
          >
            <input
              aria-label="Link label"
              placeholder="Label"
              className="field-input"
              value={link.label}
              onChange={(e) => set(index, { label: e.target.value })}
              aria-invalid={errors[`${path}.${index}.label`] ? true : undefined}
            />
            <input
              aria-label="Link URL"
              placeholder="https://"
              type="url"
              className="field-input"
              value={link.url}
              onChange={(e) => set(index, { url: e.target.value })}
              aria-invalid={errors[`${path}.${index}.url`] ? true : undefined}
            />
            <select
              aria-label="Link type"
              className="field-input"
              value={link.type}
              onChange={(e) => set(index, { type: e.target.value })}
            >
              {linkTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <IconButton
                label="Move link up"
                disabled={index === 0}
                onClick={() => onChange(move(links, index, -1))}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Move link down"
                disabled={index === links.length - 1}
                onClick={() => onChange(move(links, index, 1))}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Remove link"
                onClick={() => onChange(links.filter((_, i) => i !== index))}
              >
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
            {(errors[`${path}.${index}.label`] ??
              errors[`${path}.${index}.url`]) && (
              <p className="text-sm text-(--color-error) sm:col-span-4">
                {errors[`${path}.${index}.label`] ??
                  errors[`${path}.${index}.url`]}
              </p>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-2"
        onClick={() =>
          onChange([...links, { label: "", url: "", type: "website" }])
        }
      >
        <Plus aria-hidden="true" /> Add link
      </button>
      <FieldError id={`${path}-links-error`} error={errors[path]} />
    </fieldset>
  );
}
