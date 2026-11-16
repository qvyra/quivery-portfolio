import type { Media, PageDetail, ProjectDetail, Site } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/benchmarks", () => ({
  benchmarkBlocks: () => [],
  getBenchData: async () => null,
}));

const { pagePreview, previewImages, projectPreview, sitePreview } =
  await import("./previews");

const site = {
  profile: {
    brandName: "Quivery",
    displayName: "Badreddine",
    headline: "Roblox systems engineer",
    tagline: "Data layers and tooling for live games.",
  },
  sections: [],
} as unknown as Site;

const media = (overrides: Partial<Media> = {}): Media => ({
  id: "5ada64af-6035-40db-a966-172616d316e6",
  kind: "IMAGE",
  url: "https://media.example/geode-cover.webp",
  mimeType: "image/webp",
  width: 2560,
  height: 1440,
  alt: "Geode cover: a crystal cave",
  captionsUrl: null,
  ...overrides,
});

const project = (overrides: Partial<ProjectDetail> = {}) =>
  ({
    slug: "geode",
    title: "Geode",
    summary: "A data framework for Roblox.",
    releaseStatus: "IN_DEVELOPMENT",
    version: null,
    openSource: true,
    cover: null,
    mobileCover: null,
    ...overrides,
  }) as unknown as ProjectDetail;

const image = (preview: Parameters<typeof previewImages>[0]) => {
  const [first] = previewImages(preview) as [
    { url: string; width: number; height: number; type: string; alt: string },
  ];
  return first;
};

describe("project previews", () => {
  it("use a landscape cover, as JPEG at the share size with its alt", () => {
    const preview = image(projectPreview(project({ cover: media() }), site));
    expect(preview).toMatchObject({
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: "Geode cover: a crystal cave",
    });
    expect(preview.url).toMatch(/^\/og\/projects\/geode\?v=[0-9a-f]{12}$/);
  });

  it("fall back to the card without a cover, or with a portrait one", () => {
    for (const cover of [null, media({ width: 1440, height: 1800 })]) {
      const preview = image(projectPreview(project({ cover }), site));
      expect(preview.type).toBe("image/png");
      expect(preview.alt).toBe("The project's card: title, status and summary");
    }
  });

  it("never use the mobile cover", () => {
    const withMobile = projectPreview(
      project({ mobileCover: media({ url: "https://media.example/m.webp" }) }),
      site,
    );
    expect(withMobile.source.kind).toBe("card");
  });

  it("describe a cover with no alt text by the project", () => {
    const preview = image(
      projectPreview(project({ cover: media({ alt: "" }) }), site),
    );
    expect(preview.alt).toBe("Geode: A data framework for Roblox.");
  });

  it("get a new URL when the cover is replaced, and only then", () => {
    const url = (cover: Media) =>
      image(projectPreview(project({ cover }), site)).url;
    expect(url(media())).toBe(url(media()));
    expect(url(media({ url: "https://media.example/new.webp" }))).not.toBe(
      url(media()),
    );
    // the alt isn't in the picture, so editing it keeps the URL
    expect(url(media({ alt: "Another description" }))).toBe(url(media()));
  });

  it("get a new URL when the card's text changes", () => {
    const url = (summary: string) =>
      image(projectPreview(project({ summary }), site)).url;
    expect(url("One")).not.toBe(url("Two"));
  });
});

describe("card previews", () => {
  it("name the homepage and page images as PNG at the share size", () => {
    const page = {
      slug: "architecture",
      title: "How I build systems",
      eyebrow: null,
      seoDescription: "The architecture behind my Roblox systems.",
    } as unknown as PageDetail;
    for (const preview of [sitePreview(site), pagePreview(page, site)]) {
      expect(image(preview)).toMatchObject({
        width: 1200,
        height: 630,
        type: "image/png",
      });
    }
    expect(image(pagePreview(page, site)).url).toMatch(
      /^\/og\/pages\/architecture\?v=/,
    );
    expect(image(sitePreview(site)).url).toMatch(/^\/og\/site\?v=/);
  });

  it("change the homepage URL when the headline changes", () => {
    const edited = {
      ...site,
      profile: { ...site.profile, headline: "Something else" },
    } as Site;
    expect(image(sitePreview(edited)).url).not.toBe(
      image(sitePreview(site)).url,
    );
  });
});
