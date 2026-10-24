import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  blockSchema,
  sectionTypeSchema,
  type ContactLink,
  type Media,
  type ProjectDetail,
  type ProjectSummary,
  type ResolvedBlock,
  type Service,
  type Site,
  type SiteSection,
  type Skill,
  type Stat,
  type Testimonial,
} from '@repo/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Env } from '../config/env.js';
import { withDraft } from './drafts.js';
import { attachMedia, collectMediaIds } from './media-refs.js';
import {
  parseJsonList,
  toContactLink,
  toMedia,
  toProfile,
  toProjectSummary,
  toService,
  toSkill,
  toStat,
  toTestimonial,
} from './mappers.js';

// what the public may see: published and not hidden
const live = { publishStatus: 'PUBLISHED', visible: true } as const;
// what the admin's preview shows: everything not hidden, drafts applied
const previewed = { visible: true } as const;

/** Preview shows the site as it will be once every draft is published */
export type ContentMode = { preview?: boolean };
const ordered = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

@Injectable()
export class PublicContentService {
  private readonly logger = new Logger(PublicContentService.name);
  private readonly production: boolean;

  constructor(
    private db: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  // placeholder projects are for local layout work only
  private projectsWhere(preview: boolean): Prisma.ProjectWhereInput {
    const base = preview ? previewed : live;
    return this.production ? { ...base, isPlaceholder: false } : base;
  }

  async getSite({ preview = false }: ContentMode = {}): Promise<Site> {
    const where = preview ? previewed : live;
    // one transaction, so the page is built from a consistent snapshot
    const [
      profile,
      contactLinks,
      sections,
      stats,
      services,
      projects,
      skills,
      testimonials,
    ] = await this.db.$transaction([
      this.db.profile.findUnique({
        where: { id: 1 },
        include: { avatar: true, cv: true },
      }),
      this.db.contactLink.findMany({ where, orderBy: [...ordered] }),
      this.db.section.findMany({ where, orderBy: [...ordered] }),
      this.db.stat.findMany({ where, orderBy: [...ordered] }),
      this.db.service.findMany({
        where,
        orderBy: [...ordered],
        include: { icon: true },
      }),
      this.db.project.findMany({
        where: this.projectsWhere(preview),
        orderBy: [...ordered],
        include: { cover: true },
      }),
      this.db.skill.findMany({
        where,
        orderBy: [...ordered],
        include: { icon: true },
      }),
      this.db.testimonial.findMany({
        where,
        orderBy: [...ordered],
        include: { avatar: true },
      }),
    ]);

    if (!profile) {
      throw new NotFoundException({
        status: 404,
        message: 'The site profile has not been created yet. Run the seed.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    const draft = <R extends { draft: unknown }>(rows: R[]) =>
      preview ? rows.map(withDraft) : rows;
    const lists = {
      stats: draft(stats).map(toStat),
      services: (await this.previewMedia(draft(services), 'icon', preview)).map(
        toService,
      ),
      projects: (
        await this.previewMedia(draft(projects), 'cover', preview)
      ).map(toProjectSummary),
      skills: (await this.previewMedia(draft(skills), 'icon', preview)).map(
        toSkill,
      ),
      testimonials: (
        await this.previewMedia(draft(testimonials), 'avatar', preview)
      ).map(toTestimonial),
      contactLinks: draft(contactLinks).map(toContactLink),
    };

    const parsed = draft(sections).map((section) => ({
      section,
      blocks: parseJsonList(
        blockSchema,
        section.blocks,
        `Section(${section.slug}).blocks`,
      ),
    }));
    const media = await this.findMedia(parsed.map(({ blocks }) => blocks));

    const siteSections = parsed.flatMap(({ section, blocks }) => {
      const type = sectionTypeSchema.safeParse(section.type);
      if (!type.success) {
        this.logger.warn(
          `Section(${section.slug}) has unknown type "${section.type}", skipping it`,
        );
        return [];
      }
      const base = {
        id: section.id,
        slug: section.slug,
        title: section.title,
        titleHighlight: section.titleHighlight,
        eyebrow: section.eyebrow,
        navLabel: section.navLabel,
        blocks: attachMedia(blocks, media) as ResolvedBlock[],
      };
      const built = buildSection(type.data, base, lists);
      return built ? [built] : [];
    });

    return {
      profile: toProfile(profile),
      contactLinks: lists.contactLinks,
      sections: siteSections,
    };
  }

  async getProjects(): Promise<ProjectSummary[]> {
    const projects = await this.db.project.findMany({
      where: this.projectsWhere(false),
      orderBy: [...ordered],
      include: { cover: true },
    });
    return projects.map(toProjectSummary);
  }

  async getProject(slug: string): Promise<ProjectDetail> {
    return this.loadProject({ ...this.projectsWhere(false), slug }, false);
  }

  /**
   * A project as it will be once published, by id rather than slug, since a
   * draft can rename it. Hidden ones are previewed too, so they can be checked
   */
  async getProjectPreview(id: string): Promise<ProjectDetail> {
    return this.loadProject({ id }, true);
  }

  private async loadProject(
    where: Prisma.ProjectWhereInput,
    preview: boolean,
  ): Promise<ProjectDetail> {
    const row = await this.db.project.findFirst({
      where,
      include: {
        cover: true,
        testimonials: {
          where: preview ? previewed : live,
          orderBy: [...ordered],
          include: { avatar: true },
        },
      },
    });
    const [project] = row
      ? await this.previewMedia(
          [preview ? withDraft(row) : row],
          'cover',
          preview,
        )
      : [];
    if (!project) {
      throw new NotFoundException({
        status: 404,
        message: 'Project not found!',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const body = parseJsonList(
      blockSchema,
      project.body,
      `Project(${project.slug}).body`,
    );
    const media = await this.findMedia([body]);

    return {
      ...toProjectSummary(project),
      body: attachMedia(body, media) as ResolvedBlock[],
      testimonials: (
        await this.previewMedia(
          preview ? project.testimonials.map(withDraft) : project.testimonials,
          'avatar',
          preview,
        )
      ).map(toTestimonial),
    };
  }

  // A draft can point at another file than the one the row's relation loaded
  // (a new cover, say), so in preview the relation is looked up again from the
  // id. Live rows have no draft applied and are returned as they are
  private async previewMedia<R extends Record<string, unknown>>(
    rows: R[],
    relation: 'cover' | 'icon' | 'avatar',
    preview: boolean,
  ): Promise<R[]> {
    if (!preview || rows.length === 0) return rows;
    const idKey = `${relation}Id`;
    const ids = [
      ...new Set(
        rows
          .map((row) => row[idKey])
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const media =
      ids.length > 0
        ? await this.db.media.findMany({ where: { id: { in: ids } } })
        : [];
    const byId = new Map(media.map((item) => [item.id, item]));
    return rows.map((row) => ({
      ...row,
      [relation]:
        typeof row[idKey] === 'string' ? (byId.get(row[idKey]) ?? null) : null,
    }));
  }

  // every media item the blocks reference, at any depth, in one query
  private async findMedia(blockLists: unknown[]): Promise<Map<string, Media>> {
    const ids = collectMediaIds(blockLists);
    if (ids.size === 0) return new Map();

    const rows = await this.db.media.findMany({
      where: { id: { in: [...ids] } },
    });
    return new Map(rows.map((row) => [row.id, toMedia(row)!]));
  }
}

type SectionBase = {
  id: string;
  slug: string;
  title: string;
  titleHighlight: string | null;
  eyebrow: string | null;
  navLabel: string | null;
  blocks: ResolvedBlock[];
};

type Lists = {
  stats: Stat[];
  services: Service[];
  projects: ProjectSummary[];
  skills: Skill[];
  testimonials: Testimonial[];
  contactLinks: ContactLink[];
};

// Attaches each typed section's list. Returns null when there's nothing to
// show, so the section is left out instead of rendering empty or faked
function buildSection(
  type: SiteSection['type'],
  base: SectionBase,
  lists: Lists,
): SiteSection | null {
  switch (type) {
    case 'hero':
      return { ...base, type };
    case 'contact':
      return lists.contactLinks.length > 0 ? { ...base, type } : null;
    case 'custom':
      return base.blocks.length > 0 ? { ...base, type } : null;
    case 'stats':
      return lists.stats.length > 0
        ? { ...base, type, stats: lists.stats }
        : null;
    case 'services':
      return lists.services.length > 0
        ? { ...base, type, services: lists.services }
        : null;
    case 'projects':
      return lists.projects.length > 0
        ? { ...base, type, projects: lists.projects }
        : null;
    case 'skills':
      return lists.skills.length > 0
        ? { ...base, type, skills: lists.skills }
        : null;
    case 'testimonials':
      return lists.testimonials.length > 0
        ? { ...base, type, testimonials: lists.testimonials }
        : null;
  }
}
