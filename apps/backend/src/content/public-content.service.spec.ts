import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PublicContentService } from './public-content.service.js';

const now = new Date('2026-10-22T12:00:00.000Z');
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const profile = {
  id: 1,
  brandName: 'Quivery',
  displayName: 'Quivery',
  headline: 'Roblox systems engineer',
  tagline: 'Tagline',
  avatarId: null,
  avatar: null,
  cvId: null,
  cv: null,
  updatedAt: now,
};

const section = (n: number, type: string, blocks: unknown = []) => ({
  id: id(n),
  slug: `section-${n}`,
  type,
  title: `Section ${n}`,
  titleHighlight: null,
  eyebrow: null,
  navLabel: null,
  blocks,
  linkPage: null,
  linkLabel: null,
  publishStatus: 'PUBLISHED',
  visible: true,
  sortOrder: n,
  createdAt: now,
  updatedAt: now,
});

const project = (n: number, overrides: object = {}) => ({
  id: id(100 + n),
  slug: `project-${n}`,
  title: `Project ${n}`,
  summary: 'Summary',
  body: [],
  tags: [],
  links: [],
  releaseStatus: 'RELEASED',
  version: null,
  featured: false,
  openSource: false,
  isPlaceholder: false,
  benchmarkUrl: null,
  robloxPlaceId: null,
  robloxUniverseId: null,
  coverId: null,
  cover: null,
  createdAt: now,
  updatedAt: now,
  testimonials: [],
  ...overrides,
});

function setup({
  nodeEnv = 'development',
  sections = [] as unknown[],
  projects = [] as unknown[],
  profileRow = profile as unknown,
  media = [] as unknown[],
  pages = [] as unknown[],
} = {}) {
  const db = {
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
    profile: { findUnique: vi.fn().mockResolvedValue(profileRow) },
    contactLink: { findMany: vi.fn().mockResolvedValue([]) },
    section: { findMany: vi.fn().mockResolvedValue(sections) },
    stat: { findMany: vi.fn().mockResolvedValue([]) },
    service: { findMany: vi.fn().mockResolvedValue([]) },
    project: {
      findMany: vi.fn().mockResolvedValue(projects),
      findFirst: vi.fn().mockResolvedValue(projects[0] ?? null),
    },
    skill: { findMany: vi.fn().mockResolvedValue([]) },
    testimonial: { findMany: vi.fn().mockResolvedValue([]) },
    media: { findMany: vi.fn().mockResolvedValue(media) },
    page: {
      findMany: vi.fn().mockResolvedValue(pages),
      findFirst: vi.fn().mockResolvedValue(pages[0] ?? null),
    },
  };
  const config = {
    get: () => nodeEnv,
  } as unknown as ConfigService<Env, true>;
  const service = new PublicContentService(
    db as unknown as PrismaService,
    config,
  );
  return { db, service };
}

describe('PublicContentService', () => {
  it('only queries published, visible content', async () => {
    const { db, service } = setup();
    await service.getSite();
    for (const model of [
      'section',
      'stat',
      'skill',
      'testimonial',
      'page',
    ] as const) {
      expect(db[model].findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { publishStatus: 'PUBLISHED', visible: true },
        }),
      );
    }
  });

  it('serves placeholder projects in development only', async () => {
    const dev = setup({ nodeEnv: 'development' });
    await dev.service.getProjects();
    expect(dev.db.project.findMany.mock.calls[0][0].where).not.toHaveProperty(
      'isPlaceholder',
    );

    const prod = setup({ nodeEnv: 'production' });
    await prod.service.getProjects();
    expect(prod.db.project.findMany.mock.calls[0][0].where).toMatchObject({
      isPlaceholder: false,
    });
  });

  it('leaves out sections with nothing to show', async () => {
    const { service } = setup({
      sections: [
        section(1, 'hero'),
        section(2, 'testimonials'),
        section(3, 'services'),
        section(4, 'contact'),
        section(5, 'custom'),
        section(6, 'projects'),
      ],
      projects: [project(1)],
    });
    const site = await service.getSite();
    expect(site.sections.map((s) => s.type)).toEqual(['hero', 'projects']);
  });

  it('skips sections with an unknown type', async () => {
    const { service } = setup({
      sections: [section(1, 'hero'), section(2, 'marquee')],
    });
    const site = await service.getSite();
    expect(site.sections.map((s) => s.type)).toEqual(['hero']);
  });

  it('drops invalid blocks but keeps the valid ones', async () => {
    const { service } = setup({
      sections: [
        section(1, 'custom', [
          { id: 'ok', type: 'richText', markdown: 'Kept' },
          { id: 'bad', type: 'richText' },
          { id: 'odd', type: 'marquee' },
        ]),
      ],
    });
    const site = await service.getSite();
    expect(site.sections[0]!.blocks.map((b) => b.id)).toEqual(['ok']);
  });

  it('resolves block media in one query', async () => {
    const logo = {
      id: id(900),
      kind: 'IMAGE',
      url: '/logo.png',
      storageKey: null,
      mimeType: 'image/png',
      sizeBytes: null,
      width: 10,
      height: 10,
      alt: 'Logo',
      createdAt: now,
      updatedAt: now,
    };
    const { db, service } = setup({
      sections: [
        section(1, 'custom', [
          { id: 'img', type: 'image', image: { mediaId: logo.id } },
        ]),
      ],
      media: [logo],
    });
    const site = await service.getSite();
    expect(db.media.findMany).toHaveBeenCalledTimes(1);
    expect(site.sections[0]!.blocks[0]).toMatchObject({
      image: { mediaId: logo.id, media: { url: '/logo.png', alt: 'Logo' } },
    });
  });

  it('throws PROFILE_NOT_FOUND before the seed has run', async () => {
    const { service } = setup({ profileRow: null });
    await expect(service.getSite()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws PROJECT_NOT_FOUND for unknown or unpublished projects', async () => {
    const { service } = setup();
    await expect(service.getProject('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('pages', () => {
    const page = {
      id: id(200),
      slug: 'architecture',
      title: 'How I build systems',
      titleHighlight: 'systems',
      eyebrow: 'Architecture',
      seoTitle: null,
      seoDescription: 'How I build',
      blocks: [
        { id: 'a', type: 'image', image: { mediaId: id(300) }, wide: true },
      ],
      draft: null,
      updatedAt: now,
    };
    const media = {
      id: id(300),
      kind: 'IMAGE',
      url: '/uploads/a.png',
      alt: 'Diagram',
      width: 2400,
      height: 1400,
      mimeType: 'image/png',
      captions: null,
    };

    it('links a section to its page only while the page is live', async () => {
      const linked = {
        ...section(1, 'custom', [
          { id: 't', type: 'richText', markdown: 'Hi' },
        ]),
        linkPage: 'architecture',
        linkLabel: 'Read more',
      };
      const live = await setup({
        sections: [linked],
        pages: [page],
      }).service.getSite();
      expect(live.sections[0]!.link).toEqual({
        label: 'Read more',
        href: '/architecture',
      });

      const gone = await setup({
        sections: [linked],
        pages: [],
      }).service.getSite();
      expect(gone.sections[0]!.link).toBeNull();
    });

    it('serves a live page with its media attached', async () => {
      const { db, service } = setup({ pages: [page], media: [media] });
      const detail = await service.getPage('architecture');
      expect(db.page.findFirst).toHaveBeenCalledWith({
        where: {
          publishStatus: 'PUBLISHED',
          visible: true,
          slug: 'architecture',
        },
      });
      expect(detail).toMatchObject({
        slug: 'architecture',
        titleHighlight: 'systems',
        eyebrow: 'Architecture',
        updatedAt: now.toISOString(),
      });
      const block = detail.blocks[0] as { image: { media: { url: string } } };
      expect(block.image.media.url).toBe('/uploads/a.png');
    });

    it('throws PAGE_NOT_FOUND for a page that is not live', async () => {
      const { service } = setup({ pages: [] });
      await expect(service.getPage('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('previews a page with its draft applied', async () => {
      const { service } = setup({
        pages: [{ ...page, draft: { title: 'How I build things' } }],
      });
      const preview = await service.getPagePreview(page.id);
      expect(preview.title).toBe('How I build things');
    });
  });
});
