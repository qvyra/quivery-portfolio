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
const ordered = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

@Injectable()
export class PublicContentService {
  private readonly logger = new Logger(PublicContentService.name);
  private readonly liveProjects: Prisma.ProjectWhereInput;

  constructor(
    private db: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    // placeholder projects are for local layout work only
    this.liveProjects =
      config.get('NODE_ENV', { infer: true }) === 'production'
        ? { ...live, isPlaceholder: false }
        : live;
  }

  async getSite(): Promise<Site> {
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
      this.db.contactLink.findMany({ where: live, orderBy: [...ordered] }),
      this.db.section.findMany({ where: live, orderBy: [...ordered] }),
      this.db.stat.findMany({ where: live, orderBy: [...ordered] }),
      this.db.service.findMany({
        where: live,
        orderBy: [...ordered],
        include: { icon: true },
      }),
      this.db.project.findMany({
        where: this.liveProjects,
        orderBy: [...ordered],
        include: { cover: true },
      }),
      this.db.skill.findMany({
        where: live,
        orderBy: [...ordered],
        include: { icon: true },
      }),
      this.db.testimonial.findMany({
        where: live,
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

    const lists = {
      stats: stats.map(toStat),
      services: services.map(toService),
      projects: projects.map(toProjectSummary),
      skills: skills.map(toSkill),
      testimonials: testimonials.map(toTestimonial),
      contactLinks: contactLinks.map(toContactLink),
    };

    const parsed = sections.map((section) => ({
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
      where: this.liveProjects,
      orderBy: [...ordered],
      include: { cover: true },
    });
    return projects.map(toProjectSummary);
  }

  async getProject(slug: string): Promise<ProjectDetail> {
    const project = await this.db.project.findFirst({
      where: { ...this.liveProjects, slug },
      include: {
        cover: true,
        testimonials: {
          where: live,
          orderBy: [...ordered],
          include: { avatar: true },
        },
      },
    });
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
      testimonials: project.testimonials.map(toTestimonial),
    };
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
