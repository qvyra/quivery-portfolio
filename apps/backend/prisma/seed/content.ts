// The site's content. Until the admin panel exists this file is the source of
// truth: edit it, then run `npm run db:seed` from the repo root.
// - list order is the order on the site
// - everything goes through the API's Zod schemas, so a typo fails the seed
//   instead of reaching the site
// - only published (`publishStatus: 'PUBLISHED'`) and visible items go live,
//   and a section with nothing published hides itself
// - testimonials must be real, never placeholders
// - any performance or safety claim about Geode needs a `benchmarkUrl` linking
//   the benchmark code and method
import type {
  ContactLinkInput,
  MediaInput,
  ProfileInput,
  ProjectInput,
  SectionInput,
  ServiceInput,
  SkillInput,
  StatInput,
  TestimonialInput,
} from '@repo/shared';

// Files content can point at (covers, avatars, the CV, images in blocks). Each
// needs a fixed `id` so references survive reseeding. Static files go in
// apps/web/public, with a `url` starting with '/'
export const media: (MediaInput & { id: string })[] = [];

export const profile: ProfileInput = {
  brandName: 'Quivery',
  displayName: 'Quivery',
  headline: 'Roblox systems engineer',
  // subline shown under the hero title
  tagline:
    'I design the data layers, architecture and tooling that live Roblox games depend on, backed by 6 years of Luau.',
  // TODO: cvId, once the CV PDF is added to `media`
};

// the homepage, top to bottom
export const sections: SectionInput[] = [
  {
    slug: 'hero',
    type: 'hero',
    eyebrow: "Quivery's Development",
    // hero headline. The subline is profile.tagline
    title: 'The systems behind the gameplay.',
    // shown in the accent gradient. Must match part of the title exactly
    titleHighlight: 'the gameplay.',
    publishStatus: 'PUBLISHED',
  },
  {
    // the bio, its text is in the block below
    slug: 'about',
    type: 'custom',
    title: "Hi, I'm Quivery",
    titleHighlight: 'Quivery',
    navLabel: 'About',
    publishStatus: 'PUBLISHED',
    blocks: [
      {
        id: 'bio',
        type: 'richText',
        markdown:
          "I'm a Roblox systems engineer with 6 years of Luau experience, focused on data, architecture and tooling for live games.",
      },
    ],
  },
  {
    slug: 'stats',
    type: 'stats',
    title: 'At a glance',
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'services',
    type: 'services',
    title: 'Services',
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'works',
    type: 'projects',
    title: 'Works',
    publishStatus: 'PUBLISHED',
  },
  {
    // TODO: just an outline from my notes. Write the real text, then publish
    slug: 'architecture',
    type: 'custom',
    title: 'How I architect systems',
    navLabel: 'Architecture',
    publishStatus: 'DRAFT',
    blocks: [
      {
        id: 'lifecycle',
        type: 'richText',
        markdown:
          '### Lifecycle\n\nControllers, services and components share one lifecycle: `new` → `init` → `start`.',
      },
      {
        id: 'geode-layers',
        type: 'richText',
        markdown:
          '### How Geode is layered\n\n- DataStore\n- MemoryStore\n- MessagingService\n- Guards\n- Sync',
      },
    ],
  },
  {
    slug: 'skills',
    type: 'skills',
    title: 'Skills',
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'ratings',
    type: 'testimonials',
    title: 'Ratings',
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'contact',
    type: 'contact',
    title: 'Contact',
    publishStatus: 'PUBLISHED',
  },
];

export const stats: StatInput[] = [
  { value: '6', label: 'Years of Luau experience', publishStatus: 'PUBLISHED' },
];

// none yet, so the Services section stays hidden until one is published
export const services: ServiceInput[] = [];

export const projects: ProjectInput[] = [
  {
    slug: 'geode',
    title: 'Geode',
    summary:
      'Open-source, multi-layer Roblox data service (DataStore + MemoryStore + MessagingService) with guards, reactive mutations and server→client sync.',
    body: [
      {
        id: 'overview',
        type: 'richText',
        markdown:
          'Geode layers DataStore, MemoryStore and MessagingService into one data service, with guards, reactive mutations and server→client sync.\n\nWritten in Luau and published on Wally. A roblox-ts version is planned.',
      },
    ],
    tags: ['Luau', 'Wally'],
    links: [
      {
        label: 'GitHub',
        url: 'https://github.com/qvyra/geode',
        type: 'repository',
      },
      // TODO: the Wally package link
    ],
    releaseStatus: 'RELEASED',
    version: '0.5.0',
    featured: true,
    openSource: true,
    // benchmarkUrl is required before making any performance or safety claim
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'loupe',
    title: 'Loupe',
    summary:
      'Studio data manager plugin. Raw mode edits any DataStore key regardless of library; a "view as" lens shows data through Geode, with other libraries planned.',
    body: [
      {
        id: 'overview',
        type: 'richText',
        markdown:
          'Loupe is a data manager plugin for Roblox Studio.\n\n- **Raw mode** edits any DataStore key, whichever library wrote it.\n- **View as** shows data through Geode, with other libraries planned.\n\nFree and supported by donations, coming to the Creator Store.',
      },
    ],
    tags: ['Studio plugin'],
    links: [
      // TODO: the Creator Store link once it's live
    ],
    // TODO: 'RELEASED' once it's on the Creator Store, and update the body's
    // last line
    releaseStatus: 'IN_DEVELOPMENT',
    featured: true,
    openSource: false,
    publishStatus: 'PUBLISHED',
  },
  // layout filler for local development, never seeded or served in production
  {
    slug: 'placeholder-one',
    title: 'Placeholder project',
    summary: 'Layout filler for local development. Never shown in production.',
    tags: ['Placeholder'],
    releaseStatus: 'RELEASED',
    isPlaceholder: true,
    publishStatus: 'PUBLISHED',
  },
  {
    slug: 'placeholder-two',
    title: 'Placeholder project',
    summary: 'Layout filler for local development. Never shown in production.',
    tags: ['Placeholder'],
    releaseStatus: 'IN_DEVELOPMENT',
    isPlaceholder: true,
    publishStatus: 'PUBLISHED',
  },
];

export const skills: SkillInput[] = [
  { name: 'Luau', tier: 'PRIMARY', publishStatus: 'PUBLISHED' },
  {
    name: 'DataStore, MemoryStore & MessagingService',
    tier: 'PRIMARY',
    publishStatus: 'PUBLISHED',
  },
  {
    name: 'TypeScript',
    tier: 'SECONDARY',
    description: 'roblox-ts and tooling',
    publishStatus: 'PUBLISHED',
  },
];

// Real testimonials only. Link one to a project with `projectSlug`. The
// Ratings section stays hidden until one is published
export const testimonials: (Omit<TestimonialInput, 'projectId'> & {
  projectSlug?: string;
})[] = [];

// the featured link is shown prominently (meant for the Discord handle)
export const contactLinks: ContactLinkInput[] = [
  {
    type: 'discord',
    label: 'Discord',
    value: 'ultrapro',
    url: 'https://discord.com/users/602557127399309344',
    featured: true,
    publishStatus: 'PUBLISHED',
  },
  {
    type: 'email',
    label: 'Email',
    value: 'badro.zitouni.dev@gmail.com',
    url: 'mailto:badro.zitouni.dev@gmail.com',
    publishStatus: 'PUBLISHED',
  },
  {
    type: 'github',
    label: 'GitHub',
    value: 'qvyra',
    url: 'https://github.com/qvyra',
    publishStatus: 'PUBLISHED',
  },
  {
    type: 'kofi',
    label: 'Ko-fi',
    value: 'quivery',
    url: 'https://ko-fi.com/quivery',
    publishStatus: 'PUBLISHED',
  },
  // TODO: Roblox Talent Hub
];
