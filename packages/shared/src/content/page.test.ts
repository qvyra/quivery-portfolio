import { describe, expect, it } from "vitest";
import { adminContentSchemas } from "../admin.js";
import { pageInputSchema, pageSlugSchema, reservedPageSlugs } from "./page.js";
import { parsePage, parseSite } from "./public-api.js";
import { sectionInputSchema } from "./section.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ok = (data: unknown) => ({
  status: 200,
  message: "OK",
  code: "OK",
  data,
});

const page = {
  slug: "architecture",
  title: "How I build systems",
  seoDescription: "How I structure Roblox games and their data.",
};

describe("pageInputSchema", () => {
  it("starts a new page as a visible draft with no blocks", () => {
    expect(pageInputSchema.parse(page)).toMatchObject({
      publishStatus: "DRAFT",
      visible: true,
      sortOrder: 0,
      blocks: [],
    });
  });

  it.each(reservedPageSlugs)("refuses the reserved slug %s", (slug) => {
    expect(pageInputSchema.safeParse({ ...page, slug }).success).toBe(false);
  });

  it("refuses the hashed names of metadata images, and allows look-alikes", () => {
    for (const slug of [
      "opengraph-image-12o0cb",
      "icon-abc",
      "twitter-image",
    ]) {
      expect(pageSlugSchema.safeParse(slug).success).toBe(false);
    }
    for (const slug of ["icons-guide", "iconic", "architecture"]) {
      expect(pageSlugSchema.safeParse(slug).success).toBe(true);
    }
  });

  it("refuses unknown keys, a highlight outside the title and a missing description", () => {
    expect(pageInputSchema.safeParse({ ...page, nav: true }).success).toBe(
      false,
    );
    expect(
      pageInputSchema.safeParse({ ...page, titleHighlight: "games" }).success,
    ).toBe(false);
    expect(
      pageInputSchema.safeParse({ ...page, titleHighlight: "systems" }).success,
    ).toBe(true);
    const withoutDescription: Partial<typeof page> = { ...page };
    delete withoutDescription.seoDescription;
    expect(pageInputSchema.safeParse(withoutDescription).success).toBe(false);
  });

  it("is an admin collection without the state fields", () => {
    expect(adminContentSchemas.pages.safeParse(page).success).toBe(true);
    expect(
      adminContentSchemas.pages.safeParse({ ...page, publishStatus: "DRAFT" })
        .success,
    ).toBe(false);
  });
});

describe("section page links", () => {
  const section = { slug: "architecture", type: "custom", title: "A" };

  it("leaves sections without a link as they were", () => {
    const parsed = sectionInputSchema.parse(section);
    expect(parsed).not.toHaveProperty("linkPage");
    expect(parsed).not.toHaveProperty("linkLabel");
  });

  it("needs both the page and the label", () => {
    expect(
      sectionInputSchema.safeParse({
        ...section,
        linkPage: "architecture",
        linkLabel: "Read more",
      }).success,
    ).toBe(true);
    expect(
      sectionInputSchema.safeParse({ ...section, linkPage: "architecture" })
        .success,
    ).toBe(false);
    expect(
      adminContentSchemas.sections.safeParse({
        ...section,
        linkPage: null,
        linkLabel: "Read more",
      }).success,
    ).toBe(false);
  });

  it("defaults the public link to null for an API without it", () => {
    const site = parseSite(
      ok({
        profile: {
          brandName: "Quivery",
          displayName: "Quivery",
          headline: "Roblox systems engineer",
          tagline: "Tagline",
          avatar: null,
          cv: null,
        },
        contactLinks: [],
        sections: [
          {
            id: uuid(1),
            slug: "about",
            type: "custom",
            title: "About",
            titleHighlight: null,
            eyebrow: null,
            navLabel: null,
            blocks: [{ id: "a", type: "richText", markdown: "Hi" }],
          },
        ],
      }),
    );
    expect(site.sections[0]!.link).toBeNull();
  });
});

describe("parsePage", () => {
  it("drops blocks of unknown types and reports them", () => {
    const skipped: string[] = [];
    const parsed = parsePage(
      ok({
        id: uuid(2),
        slug: "architecture",
        title: "How I build systems",
        titleHighlight: "systems",
        eyebrow: "Architecture",
        seoTitle: null,
        seoDescription: "How I build",
        updatedAt: "2026-11-13T10:00:00.000Z",
        blocks: [
          { id: "a", type: "richText", markdown: "### Hello" },
          { id: "b", type: "hologram" },
        ],
      }),
      (message) => skipped.push(message),
    );
    expect(parsed.blocks.map((block) => block.id)).toEqual(["a"]);
    expect(skipped).toEqual([
      'Page "architecture": block 1 has unknown type "hologram", skipped',
    ]);
  });
});
