// Loads content.ts into the database (`npm run db:seed`). In development each
// run replaces every content row. In production the admin owns the content, so
// it only fills an empty database and refuses to overwrite anything. It never
// deletes media (uploads) or contact messages (visitor data)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import {
  contactLinkInputSchema,
  mediaInputSchema,
  profileInputSchema,
  projectInputSchema,
  sectionInputSchema,
  serviceInputSchema,
  skillInputSchema,
  slugSchema,
  statInputSchema,
  testimonialInputSchema,
} from '@repo/shared';
import {
  PrismaClient,
  type Prisma,
} from '../../src/generated/prisma/client.js';
import { collectMediaIds } from '../../src/content/media-refs.js';
import * as content from './content.js';

const isProduction = process.env.NODE_ENV === 'production';

// validates up front, so a bad entry fails before the database is touched
function validate<S extends z.ZodType>(
  schema: S,
  items: readonly unknown[],
  name: string,
): z.output<S>[] {
  return items.map((item, index) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      throw new Error(
        `content.ts → ${name}[${index}] is invalid:\n${z.prettifyError(result.error)}`,
      );
    }
    return result.data;
  });
}

// order in the content file is the order on the site
const inFileOrder = <T extends object>(items: T[]) =>
  items.map((item, index) => ({ ...item, sortOrder: index }));

const json = (value: unknown) => value as Prisma.InputJsonValue;

async function hasContent(tx: Prisma.TransactionClient): Promise<boolean> {
  const counts = await Promise.all([
    tx.profile.count(),
    tx.section.count(),
    tx.project.count(),
    tx.stat.count(),
    tx.skill.count(),
    tx.service.count(),
    tx.testimonial.count(),
    tx.contactLink.count(),
  ]);
  return counts.some((count) => count > 0);
}

async function main() {
  const media = validate(
    mediaInputSchema.required({ id: true }),
    content.media,
    'media',
  );
  const [profile] = validate(profileInputSchema, [content.profile], 'profile');
  const sections = validate(sectionInputSchema, content.sections, 'sections');
  const stats = validate(statInputSchema, content.stats, 'stats');
  const services = validate(serviceInputSchema, content.services, 'services');
  const skills = validate(skillInputSchema, content.skills, 'skills');
  const contactLinks = validate(
    contactLinkInputSchema,
    content.contactLinks,
    'contactLinks',
  );
  const projects = validate(
    projectInputSchema,
    content.projects,
    'projects',
  ).filter((project) => !(isProduction && project.isPlaceholder));
  const testimonials = validate(
    testimonialInputSchema
      .omit({ projectId: true })
      .extend({ projectSlug: slugSchema.optional() }),
    content.testimonials,
    'testimonials',
  );

  const db = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
  });

  try {
    await db.$transaction(async (tx) => {
      if (isProduction && (await hasContent(tx))) {
        throw new Error(
          'Production already has content, which the admin owns now. The seed ' +
            'only fills an empty database. Edit it in the admin, or restore a ' +
            'dump (DEPLOY.md, Backups and recovery)',
        );
      }

      for (const item of media) {
        await tx.media.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }

      // blocks reference media by id inside JSON, which no foreign key checks
      const referenced = collectMediaIds([
        sections.map((section) => section.blocks),
        projects.map((project) => project.body),
      ]);
      const found = await tx.media.findMany({
        where: { id: { in: [...referenced] } },
        select: { id: true },
      });
      const missing = [...referenced].filter(
        (id) => !found.some((row) => row.id === id),
      );
      if (missing.length > 0) {
        throw new Error(
          `content.ts references media that doesn't exist: ${missing.join(', ')}`,
        );
      }

      await tx.testimonial.deleteMany();
      await tx.section.deleteMany();
      await tx.project.deleteMany();
      await tx.stat.deleteMany();
      await tx.skill.deleteMany();
      await tx.service.deleteMany();
      await tx.contactLink.deleteMany();

      await tx.profile.upsert({
        where: { id: 1 },
        create: { id: 1, ...profile },
        update: profile,
      });
      await tx.section.createMany({
        data: inFileOrder(sections).map((section) => ({
          ...section,
          blocks: json(section.blocks),
        })),
      });
      await tx.stat.createMany({ data: inFileOrder(stats) });
      await tx.service.createMany({ data: inFileOrder(services) });
      await tx.skill.createMany({ data: inFileOrder(skills) });
      await tx.contactLink.createMany({ data: inFileOrder(contactLinks) });
      await tx.project.createMany({
        data: inFileOrder(projects).map((project) => ({
          ...project,
          body: json(project.body),
          links: json(project.links),
        })),
      });

      const projectIds = new Map(
        (await tx.project.findMany({ select: { id: true, slug: true } })).map(
          (project) => [project.slug, project.id],
        ),
      );
      await tx.testimonial.createMany({
        data: inFileOrder(testimonials).map(
          ({ projectSlug, givenAt, ...testimonial }) => {
            const projectId = projectSlug && projectIds.get(projectSlug);
            if (projectSlug && !projectId) {
              throw new Error(
                `A testimonial points at project "${projectSlug}", which isn't seeded`,
              );
            }
            return {
              ...testimonial,
              projectId: projectId || null,
              givenAt: givenAt ? new Date(givenAt) : null,
            };
          },
        ),
      });
    });
  } finally {
    await db.$disconnect();
  }

  console.log(
    `Seeded ${isProduction ? 'production' : 'development'} content: ` +
      `${sections.length} sections, ${projects.length} projects, ${stats.length} stats, ` +
      `${skills.length} skills, ${services.length} services, ` +
      `${testimonials.length} testimonials, ${contactLinks.length} contact links, ` +
      `${media.length} media.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
