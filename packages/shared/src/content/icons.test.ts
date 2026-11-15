import { describe, expect, it } from "vitest";
import { adminContentSchemas } from "../admin.js";
import { linkSchema } from "./common.js";
import { iconKeySchema, iconRefSchema } from "./icons.js";
import { resolvedLinkSchema } from "./media.js";
import { parseProject, parseSite } from "./public-api.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ok = (data: unknown) => ({
  status: 200,
  message: "OK",
  code: "OK",
  data,
});

describe("iconKeySchema", () => {
  it("takes lowercase dashed keys", () => {
    for (const key of ["github", "roblox-studio", "c", "drafting-compass"]) {
      expect(iconKeySchema.safeParse(key).success).toBe(true);
    }
  });

  it("refuses anything else", () => {
    for (const key of [
      "",
      "GitHub",
      "a b",
      "-x",
      "x-",
      "x--y",
      "<svg>",
      "a".repeat(49),
    ]) {
      expect(iconKeySchema.safeParse(key).success).toBe(false);
    }
  });
});

describe("iconRefSchema", () => {
  it("is a built-in icon or an upload, never both", () => {
    expect(
      iconRefSchema.safeParse({ kind: "icon", key: "github" }).success,
    ).toBe(true);
    expect(
      iconRefSchema.safeParse({ kind: "media", id: uuid(1) }).success,
    ).toBe(true);
    expect(
      iconRefSchema.safeParse({ kind: "icon", key: "github", id: uuid(1) })
        .success,
    ).toBe(false);
    expect(iconRefSchema.safeParse({ kind: "media", id: "nope" }).success).toBe(
      false,
    );
  });
});

describe("links with an icon", () => {
  const link = {
    label: "Source",
    url: "https://github.com/qvyra/geode",
    type: "repository",
  };

  it("store an icon, or none like older content", () => {
    expect(linkSchema.parse(link)).toEqual(link);
    expect(
      linkSchema.parse({ ...link, icon: { kind: "icon", key: "rojo" } }).icon,
    ).toEqual({
      kind: "icon",
      key: "rojo",
    });
  });

  it("drop an icon a site build can't read, keeping the link", () => {
    const parsed = resolvedLinkSchema.parse({
      ...link,
      icon: { kind: "sticker" },
    });
    expect(parsed.icon).toBeUndefined();
    expect(parsed.url).toBe(link.url);
  });
});

describe("admin icon fields", () => {
  const skill = {
    name: "Luau",
    tier: "PRIMARY",
    category: null,
    description: null,
  };

  it("accept a built-in icon, an upload or neither", () => {
    for (const icon of [
      { iconKey: "luau", iconId: null },
      { iconKey: null, iconId: uuid(1) },
      { iconKey: null, iconId: null },
      {},
    ]) {
      expect(
        adminContentSchemas.skills.safeParse({ ...skill, ...icon }).success,
      ).toBe(true);
    }
  });

  it("refuse both on skills, services, contact links and section nav", () => {
    const both = adminContentSchemas.skills.safeParse({
      ...skill,
      iconKey: "luau",
      iconId: uuid(1),
    });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0]?.path).toEqual(["iconKey"]);
    expect(
      adminContentSchemas.services.safeParse({
        title: "Systems",
        summary: "Summary",
        highlights: [],
        iconKey: "server",
        iconId: uuid(1),
      }).success,
    ).toBe(false);
    expect(
      adminContentSchemas.contactLinks.safeParse({
        type: "github",
        label: "GitHub",
        value: "qvyra",
        url: "https://github.com/qvyra",
        featured: false,
        iconKey: "github",
        iconId: uuid(1),
      }).success,
    ).toBe(false);
    expect(
      adminContentSchemas.sections.safeParse({
        type: "custom",
        title: "Architecture",
        slug: "architecture",
        navIcon: "network",
        navIconId: uuid(1),
      }).success,
    ).toBe(false);
  });
});

describe("public content from an older API", () => {
  it("reads sections, skills and contact links without icon fields as no icon", () => {
    const parsed = parseSite(
      ok({
        profile: {
          brandName: "Quivery",
          displayName: "Quivery",
          headline: "Headline",
          tagline: "Tagline",
          avatar: null,
          cv: null,
        },
        contactLinks: [
          {
            id: uuid(1),
            type: "github",
            label: "GitHub",
            value: "qvyra",
            url: "https://github.com/qvyra",
            featured: false,
          },
        ],
        sections: [
          {
            id: uuid(2),
            type: "skills",
            slug: "skills",
            title: "Skills",
            titleHighlight: null,
            eyebrow: null,
            navLabel: null,
            navIcon: "drafting-compass",
            blocks: [],
            skills: [
              {
                id: uuid(3),
                name: "Luau",
                category: null,
                tier: "PRIMARY",
                description: null,
                icon: null,
              },
            ],
          },
        ],
      }),
    );
    expect(parsed.contactLinks[0]).toMatchObject({ iconKey: null, icon: null });
    const section = parsed.sections[0]!;
    // an old nav icon name is a library key, so old content keeps its icon
    expect(section).toMatchObject({
      navIcon: "drafting-compass",
      navIconImage: null,
    });
    expect(section.type === "skills" && section.skills[0]?.iconKey).toBeNull();
  });

  it("keeps project links an older API sends without icons", () => {
    const project = parseProject(
      ok({
        id: uuid(1),
        slug: "geode",
        title: "Geode",
        summary: "Summary",
        tags: [],
        links: [
          {
            label: "Source",
            url: "https://github.com/qvyra/geode",
            type: "repository",
          },
        ],
        releaseStatus: "RELEASED",
        version: null,
        featured: false,
        openSource: true,
        isPlaceholder: false,
        benchmarkUrl: null,
        robloxPlaceId: null,
        robloxUniverseId: null,
        cover: null,
        updatedAt: "2026-10-23T00:00:00.000Z",
        body: [],
        testimonials: [],
      }),
    );
    expect(project.links).toHaveLength(1);
    expect(project.links[0]?.icon).toBeUndefined();
  });
});
