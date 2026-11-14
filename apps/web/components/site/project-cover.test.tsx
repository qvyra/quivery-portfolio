import type { Media, ProjectDetail } from "@repo/shared";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "./project-card";
import { ProjectCover } from "./project-cover";

const image = (name: string, width: number, height: number): Media => ({
  id: "00000000-0000-4000-8000-000000000001",
  kind: "IMAGE",
  url: `/uploads/${name}.png`,
  mimeType: "image/png",
  width,
  height,
  alt: "Geode's dashboard",
  captionsUrl: null,
});
const cover = image("cover", 1600, 900);
const portrait = image("portrait", 900, 1600);

const project: ProjectDetail = {
  id: "00000000-0000-4000-8000-000000000002",
  slug: "geode",
  title: "Geode",
  summary: "Summary",
  tags: [],
  links: [],
  releaseStatus: "RELEASED",
  version: null,
  featured: false,
  openSource: false,
  isPlaceholder: false,
  benchmarkUrl: null,
  robloxPlaceId: null,
  robloxUniverseId: null,
  cover,
  mobileCover: portrait,
  updatedAt: "2026-11-14T00:00:00.000Z",
  body: [],
  benchmarks: [],
  testimonials: [],
};

// the preloads React hoists, then the markup, in one string
const render = (node: React.ReactNode) => renderToString(node);
const preloads = (html: string) =>
  html.match(/<link rel="preload"[^>]*>/g) ?? [];

describe("ProjectCover", () => {
  it("is a plain image when no mobile cover is set", () => {
    const html = render(<ProjectCover cover={cover} mobileCover={null} />);
    expect(html).not.toContain("<picture");
    expect(html).not.toContain("<source");
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain("cover.png");
    expect(html).toContain('fetchPriority="high"');
  });

  it("is a <picture> with the mobile cover on phones when one is set", () => {
    const html = render(<ProjectCover cover={cover} mobileCover={portrait} />);
    expect(html).toContain("<picture>");
    expect(html).toMatch(
      /<source media="\(max-width: 639px\)" srcSet="[^"]*portrait\.png[^"]*"/,
    );
    const img = html.match(/<img [^>]*>/)![0];
    expect(img).toContain("cover.png");
    expect(img).toContain('alt="Geode&#x27;s dashboard"');
    expect(img).toContain('fetchPriority="high"');
    // each version in its own shape, so the swap can't shift the layout
    expect(img).toContain("--ratio-main:1.7777777777777777");
    expect(img).toContain("--ratio-phone:0.5625");
  });

  it("preloads each version only on the screens that show it", () => {
    const links = preloads(
      render(<ProjectCover cover={cover} mobileCover={portrait} />),
    );
    expect(links).toHaveLength(2);
    const phone = links.find((link) => link.includes("portrait.png"))!;
    const wide = links.find((link) => link.includes("cover.png"))!;
    expect(phone).toContain('media="(max-width: 639px)"');
    expect(wide).toContain('media="(min-width: 640px)"');
  });

  it("ignores a mobile cover without a cover", () => {
    expect(render(<ProjectCover cover={null} mobileCover={portrait} />)).toBe(
      "",
    );
  });
});

describe("ProjectCard", () => {
  it("always uses the cover, never the mobile cover", () => {
    for (const flagship of [false, true]) {
      const html = render(
        <ProjectCard project={project} flagship={flagship} />,
      );
      expect(html).toContain("cover.png");
      expect(html).not.toContain("portrait.png");
      expect(html).not.toContain("<picture");
    }
  });
});
