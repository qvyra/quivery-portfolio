import { describe, expect, it } from "vitest";
import {
  adminCollectionSchema,
  adminContentSchemas,
  adminLoginSchema,
  adminMediaCreateSchema,
  adminReorderSchema,
} from "./admin.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("adminContentSchemas", () => {
  it("has a content schema for every collection", () => {
    for (const collection of adminCollectionSchema.options) {
      expect(adminContentSchemas[collection]).toBeDefined();
    }
  });

  it("accepts plain content", () => {
    expect(
      adminContentSchemas.stats.safeParse({ value: "6", label: "Years" })
        .success,
    ).toBe(true);
  });

  it("refuses publish state, order, visibility and columns like id or draft", () => {
    for (const extra of [
      { publishStatus: "PUBLISHED" },
      { visible: false },
      { sortOrder: 3 },
      { id: uuid(1) },
      { draft: { value: "1" } },
      { createdAt: "2026-01-01" },
    ]) {
      expect(
        adminContentSchemas.stats.safeParse({
          value: "6",
          label: "Years",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });

  it("keeps the section title highlight check", () => {
    const section = {
      slug: "works",
      type: "projects",
      title: "Selected works",
    };
    expect(
      adminContentSchemas.sections.safeParse({
        ...section,
        titleHighlight: "works",
      }).success,
    ).toBe(true);
    expect(
      adminContentSchemas.sections.safeParse({
        ...section,
        titleHighlight: "nope",
      }).success,
    ).toBe(false);
  });

  it("validates the blocks inside a project body", () => {
    const project = {
      slug: "geode",
      title: "Geode",
      summary: "Data layer",
      releaseStatus: "RELEASED",
    };
    expect(
      adminContentSchemas.projects.safeParse({
        ...project,
        body: [{ id: "a", type: "richText", markdown: "Hi" }],
      }).success,
    ).toBe(true);
    expect(
      adminContentSchemas.projects.safeParse({
        ...project,
        body: [{ id: "a", type: "script", src: "x" }],
      }).success,
    ).toBe(false);
  });
});

describe("adminReorderSchema", () => {
  it("needs unique ids", () => {
    expect(
      adminReorderSchema.safeParse({ ids: [uuid(1), uuid(2)] }).success,
    ).toBe(true);
    expect(
      adminReorderSchema.safeParse({ ids: [uuid(1), uuid(1)] }).success,
    ).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("is strict too", () => {
    expect(
      adminLoginSchema.safeParse({ username: "a", password: "b" }).success,
    ).toBe(true);
    expect(
      adminLoginSchema.safeParse({ username: "a", password: "b", role: "x" })
        .success,
    ).toBe(false);
  });
});

describe("adminMediaCreateSchema", () => {
  it("takes object storage URLs and the dev adapter's paths", () => {
    const media = {
      kind: "IMAGE",
      mimeType: "image/png",
      sizeBytes: 10,
      storageKey: "media/a.png",
    };
    expect(
      adminMediaCreateSchema.safeParse({
        ...media,
        url: "https://x.public.blob.vercel-storage.com/media/a.png",
      }).success,
    ).toBe(true);
    expect(
      adminMediaCreateSchema.safeParse({ ...media, url: "/uploads/a.png" })
        .success,
    ).toBe(true);
    expect(
      adminMediaCreateSchema.safeParse({ ...media, url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
});
