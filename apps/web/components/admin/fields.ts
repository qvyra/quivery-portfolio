import {
  contactLinkTypeSchema,
  linkTypeSchema,
  releaseStatusSchema,
  sectionTypeSchema,
  skillTierSchema,
  type AdminCollection,
  type MediaKind,
} from "@repo/shared";

// How each collection's content is edited. The strict schemas in @repo/shared
// stay the source of truth for what's valid; this only says how to show it

type Base = {
  name: string;
  label: string;
  help?: string;
  /** Empty means null, for the schema's nullable fields */
  optional?: boolean;
};

export type Field = Base &
  (
    | { kind: "text" | "url"; max?: number }
    | { kind: "textarea"; rows?: number; max?: number; markdown?: boolean }
    | { kind: "number"; min?: number; max?: number }
    | { kind: "boolean" }
    | { kind: "select"; options: Option[] }
    | { kind: "media"; accept: MediaKind }
    | { kind: "strings"; max?: number }
    | { kind: "links" | "blocks" | "date" | "project" }
  );

export type Option = { value: string; label: string };

const options = (values: readonly string[]): Option[] =>
  values.map((value) => ({
    value,
    label: value
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/^./, (c) => c.toUpperCase()),
  }));

export const linkTypes = options(linkTypeSchema.options);

export type CollectionConfig = {
  title: string;
  singular: string;
  fields: Field[];
  /** The name shown in lists */
  label: (content: Record<string, unknown>) => string;
  /** What the preview pane shows for an item */
  preview: "site" | "project";
  /** Where new items start */
  defaults?: Record<string, unknown>;
};

const text = (content: Record<string, unknown>, key: string) =>
  typeof content[key] === "string" ? (content[key] as string) : "";

export const collections: Record<AdminCollection, CollectionConfig> = {
  sections: {
    title: "Sections",
    singular: "section",
    preview: "site",
    label: (c) => text(c, "title"),
    defaults: { type: "custom" },
    fields: [
      { name: "title", label: "Title", kind: "text", max: 80 },
      {
        name: "titleHighlight",
        label: "Highlighted phrase",
        kind: "text",
        optional: true,
        max: 80,
        help: "Part of the title, exactly as written, shown in the accent gradient",
      },
      {
        name: "eyebrow",
        label: "Eyebrow",
        kind: "text",
        optional: true,
        max: 60,
        help: "Small heading above the title",
      },
      {
        name: "navLabel",
        label: "Nav label",
        kind: "text",
        optional: true,
        max: 24,
        help: "Shorter name for the site nav",
      },
      {
        name: "slug",
        label: "Anchor",
        kind: "text",
        max: 80,
        help: "The in-page link, e.g. works for /#works",
      },
      {
        name: "type",
        label: "Type",
        kind: "select",
        options: options(sectionTypeSchema.options),
        help: "A typed section shows its list (projects, skills...) after its blocks. Custom shows only the blocks",
      },
      { name: "blocks", label: "Blocks", kind: "blocks" },
    ],
  },
  projects: {
    title: "Projects",
    singular: "project",
    preview: "project",
    label: (c) => text(c, "title"),
    defaults: { releaseStatus: "IN_DEVELOPMENT" },
    fields: [
      { name: "title", label: "Title", kind: "text", max: 80 },
      {
        name: "slug",
        label: "URL",
        kind: "text",
        max: 80,
        help: "/projects/<this>. Changing it on a published project starts a deploy",
      },
      {
        name: "summary",
        label: "Summary",
        kind: "textarea",
        rows: 3,
        max: 300,
      },
      {
        name: "releaseStatus",
        label: "Status",
        kind: "select",
        options: options(releaseStatusSchema.options),
      },
      {
        name: "version",
        label: "Version",
        kind: "text",
        optional: true,
        max: 32,
      },
      { name: "featured", label: "Featured, listed first", kind: "boolean" },
      { name: "openSource", label: "Open source", kind: "boolean" },
      {
        name: "isPlaceholder",
        label: "Placeholder, development only",
        kind: "boolean",
      },
      {
        name: "coverId",
        label: "Cover image",
        kind: "media",
        accept: "IMAGE",
        optional: true,
      },
      { name: "tags", label: "Tags", kind: "strings", max: 32 },
      { name: "links", label: "Links", kind: "links" },
      {
        name: "benchmarkUrl",
        label: "Benchmark URL",
        kind: "url",
        optional: true,
        help: "Required for any performance or safety claim: the benchmark code and method",
      },
      {
        name: "robloxPlaceId",
        label: "Roblox place id",
        kind: "text",
        optional: true,
      },
      {
        name: "robloxUniverseId",
        label: "Roblox universe id",
        kind: "text",
        optional: true,
      },
      { name: "body", label: "Page", kind: "blocks" },
    ],
  },
  stats: {
    title: "Stats",
    singular: "stat",
    preview: "site",
    label: (c) => `${text(c, "value")} ${text(c, "label")}`,
    fields: [
      { name: "value", label: "Value", kind: "text", max: 16, help: "e.g. 6+" },
      { name: "label", label: "Label", kind: "text", max: 40 },
    ],
  },
  skills: {
    title: "Skills",
    singular: "skill",
    preview: "site",
    label: (c) => text(c, "name"),
    defaults: { tier: "PRIMARY" },
    fields: [
      { name: "name", label: "Name", kind: "text", max: 60 },
      {
        name: "category",
        label: "Category",
        kind: "text",
        optional: true,
        max: 40,
      },
      {
        name: "tier",
        label: "Tier",
        kind: "select",
        options: options(skillTierSchema.options),
      },
      {
        name: "description",
        label: "Description",
        kind: "textarea",
        rows: 3,
        optional: true,
        max: 300,
      },
      {
        name: "iconId",
        label: "Icon",
        kind: "media",
        accept: "IMAGE",
        optional: true,
      },
    ],
  },
  services: {
    title: "Services",
    singular: "service",
    preview: "site",
    label: (c) => text(c, "title"),
    fields: [
      { name: "title", label: "Title", kind: "text", max: 80 },
      {
        name: "summary",
        label: "Summary",
        kind: "textarea",
        rows: 3,
        max: 400,
      },
      { name: "highlights", label: "Highlights", kind: "strings", max: 120 },
      {
        name: "iconId",
        label: "Icon",
        kind: "media",
        accept: "IMAGE",
        optional: true,
      },
    ],
  },
  testimonials: {
    title: "Testimonials",
    singular: "testimonial",
    preview: "site",
    label: (c) => text(c, "authorName"),
    fields: [
      { name: "authorName", label: "Name", kind: "text", max: 80 },
      {
        name: "authorRole",
        label: "Role",
        kind: "text",
        optional: true,
        max: 80,
      },
      { name: "authorUrl", label: "Profile URL", kind: "url", optional: true },
      {
        name: "avatarId",
        label: "Photo",
        kind: "media",
        accept: "IMAGE",
        optional: true,
      },
      {
        name: "quote",
        label: "Quote",
        kind: "textarea",
        rows: 5,
        max: 1200,
        help: "Real testimonials only, word for word",
      },
      {
        name: "rating",
        label: "Rating (1 to 5)",
        kind: "number",
        min: 1,
        max: 5,
        optional: true,
      },
      {
        name: "source",
        label: "Where it was given",
        kind: "text",
        optional: true,
        max: 60,
      },
      { name: "givenAt", label: "Date", kind: "date", optional: true },
      { name: "projectId", label: "Project", kind: "project", optional: true },
    ],
  },
  contactLinks: {
    title: "Contact links",
    singular: "contact link",
    preview: "site",
    label: (c) => `${text(c, "label")}: ${text(c, "value")}`,
    defaults: { type: "website" },
    fields: [
      {
        name: "type",
        label: "Type",
        kind: "select",
        options: options(contactLinkTypeSchema.options),
      },
      { name: "label", label: "Label", kind: "text", max: 40 },
      {
        name: "value",
        label: "Shown as",
        kind: "text",
        max: 120,
        help: "e.g. the Discord handle or the address",
      },
      {
        name: "url",
        label: "Link",
        kind: "url",
        optional: true,
        help: "https://... or mailto:...",
      },
      {
        name: "featured",
        label: "Featured, the contact section's main button",
        kind: "boolean",
      },
    ],
  },
};

export const profileFields: Field[] = [
  { name: "brandName", label: "Brand name", kind: "text", max: 40 },
  { name: "displayName", label: "Display name", kind: "text", max: 40 },
  { name: "headline", label: "Headline", kind: "text", max: 120 },
  { name: "tagline", label: "Tagline", kind: "textarea", rows: 3, max: 200 },
  {
    name: "avatarId",
    label: "Avatar",
    kind: "media",
    accept: "IMAGE",
    optional: true,
  },
  {
    name: "cvId",
    label: "CV (PDF)",
    kind: "media",
    accept: "FILE",
    optional: true,
  },
];

/** An empty value for a field, for new items */
export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case "boolean":
      return false;
    case "strings":
    case "links":
    case "blocks":
      return [];
    case "select":
      return field.options[0]?.value ?? "";
    case "media":
    case "number":
    case "date":
    case "project":
      return null;
    default:
      return field.optional ? null : "";
  }
}

/** Form values as the schema expects them: empty optional text is null */
export function toPayload(fields: Field[], values: Record<string, unknown>) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values[field.name];
      const empty = value === "" || value === undefined;
      return [
        field.name,
        field.optional && empty ? null : (value ?? emptyValue(field)),
      ];
    }),
  );
}
