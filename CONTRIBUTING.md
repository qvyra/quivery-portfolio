# Contributing

This page covers setup, the checks every change has to pass, how content is edited, and how code, comments and commits are written.

## Setup

You need Node 24+, npm 11 and Docker Desktop running.

```sh
npm install                                    # also runs prisma generate
cp apps/backend/.env.example apps/backend/.env # then fill in the values
cp apps/web/.env.example apps/web/.env.local   # same REVALIDATE_SECRET in both
npm run db:up                                  # Postgres in Docker
npm run db:migrate
npm run db:seed
```

Then every day:

```sh
npm run dev
```

That starts Postgres if it isn't running, builds `@repo/shared`, and runs the API and the site in watch mode. Postgres keeps running in Docker until `npm run db:down`.

| What                                | URL                                         |
| ----------------------------------- | ------------------------------------------- |
| Site                                | http://localhost:3000                       |
| A project page                      | http://localhost:3000/projects/geode        |
| Design system (dev only)            | http://localhost:3000/dev/design            |
| API health                          | http://localhost:5005/health                |
| API readiness (checks the database) | http://localhost:5005/health/ready          |
| Homepage content (JSON)             | http://localhost:5005/public/site           |
| Projects (JSON)                     | http://localhost:5005/public/projects       |
| One project (JSON)                  | http://localhost:5005/public/projects/geode |

Both apps check their environment at startup and exit with a clear message if something is missing. The variables are documented in `apps/backend/.env.example` and `apps/web/.env.example`.

## Scripts

Run from the repo root.

| Script                                                | Does                                                 |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                                         | Postgres, then every app in watch mode               |
| `npm run dev:lan`                                     | Same, with the site reachable from a phone           |
| `npm run build`                                       | Production build of everything (the API must be up)  |
| `npm run lint`                                        | ESLint (web, packages) and oxlint (backend)          |
| `npm run check-types`                                 | Type checks every workspace                          |
| `npm test`                                            | Unit tests (Vitest)                                  |
| `npm run test:e2e`                                    | API end-to-end tests, no database needed             |
| `npm run db:up` / `db:down` / `db:status` / `db:logs` | The local Postgres container                         |
| `npm run db:migrate`                                  | Create and apply migrations after a schema change    |
| `npm run db:seed`                                     | Replace the content with `prisma/seed/content.ts`    |
| `npm run test:a11y -w web`                            | axe on a running site (`SITE=http://localhost:3000`) |

CI runs lint, types, unit and end-to-end tests, a production build against a seeded API and a Docker build of the API, so run the same before pushing.

- The site's build (`apps/web/scripts/build.mjs`) prerenders every page from the API, so start the API first. It waits up to 5 minutes for `/health/ready` and fails if it never answers
- Don't run `npm run build` while `npm run dev` is running. The API build replaces the folder the dev API runs from, and the dev API crashes
- Pages named `page.dev.tsx` only exist under `next dev`, so dev tools never reach production
- **Accessibility:** CI runs `apps/web/scripts/a11y.mjs` (axe, WCAG 2.2 A and AA) on the homepage, a project page and the admin sign-in. Locally, build and `next start` the site, run `npx playwright install chromium` once in `apps/web`, then `SITE=http://localhost:3000 npm run test:a11y -w web`

## Content

In production the content is edited in the admin at `/admin`, see [DEPLOY.md](DEPLOY.md#admin). Locally, `apps/backend/prisma/seed/content.ts` gives a fresh database its content: edit it and run `npm run db:seed`, which replaces the content but never deletes uploaded media, contact messages or the admin account. With `NODE_ENV=production` it only fills an empty database and refuses once content exists. The seed validates everything with the same Zod schemas as the API.

- **The admin locally:** put the same `ADMIN_API_SECRET` in `apps/backend/.env` and `apps/web/.env.local`, create the account with `ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run admin:password -w backend`, and sign in at `http://localhost:3000/admin`. Without `BLOB_READ_WRITE_TOKEN`, uploads land in `apps/web/public/uploads`
- **Database tests:** `npm run test:db -w backend` runs the admin's flows against a real Postgres. It empties the tables, so it refuses any `DATABASE_URL` that isn't local. Point it at a throwaway database, never the dev one with content you want

- **Typed models** live in `apps/backend/prisma/schema.prisma`: Profile, Stat, Project, Skill, Service, Testimonial, ContactLink, ContactMessage and Media
- **Sections** make up the homepage, in order. A typed section (`projects`, `skills`...) renders its list and a `custom` section renders only its blocks, like the About section. `titleHighlight` is the part of the title shown in the accent gradient and `navLabel` is a shorter label for the nav. Sections with nothing to show drop out of the page and the nav on their own
- **Blocks** are JSON checked by a Zod discriminated union in `packages/shared/src/content/blocks.ts`: rich text, image, video, gallery, link list, stats row, code snippet and embed. A new block type is one schema there and one renderer in the site, with no migration
- **Publishing:** list items have `publishStatus` (DRAFT or PUBLISHED), `visible` and `sortOrder`. The public API only returns published, visible items
- **Placeholders:** projects flagged `isPlaceholder` fill the layout while developing. They're never seeded or served when `NODE_ENV=production`
- **Contact form:** messages go to the `ContactMessage` table and, when `DISCORD_WEBHOOK_URL` is set, to Discord (see [DEPLOY.md](DEPLOY.md#contact-form)). To use the form locally, put the same `CONTACT_API_SECRET` in `apps/backend/.env` and `apps/web/.env.local`. Leave the webhook unset locally, or use a test webhook, never the production one. When sending fails, the form offers the published `discord` and `email` contact links, so it only shows those once they exist
- **New projects need a rebuild:** the build snapshots which project slugs are published, and any other project URL gets the static 404 without asking the API. Edits to a published project only need a refresh, but publishing, unpublishing or renaming one needs a deploy
- **Refreshing the site:** pages stay cached until something calls `POST /api/revalidate` with the `x-revalidate-secret` header and `{"tags": [...]}`. Tags are `site`, `projects` and `project:<slug>`. The next visit gets the cached page while a fresh one renders, and the one after shows the change
- **Brand artwork** is set in `apps/web/lib/brand.ts`, so swapping the hero Q or the logos is a change to that one file

## Design system

The brand (dark `#0A001D`, purple to pink gradients, Poppins, the highlighted Q) comes from the original static site, which isn't in this repository. Everything is previewed at `/dev/design`.

- **Tokens** live in `apps/web/app/globals.css` under `@theme`: colours, radii, easing curves, motion durations, and fluid type and spacing built with `clamp()`
- **Components** are split into `ui/` (buttons, headings, stats...), `site/` (header, nav, footer, backdrop, hero mark, project card, contact form), `sections/` (one per section type) and `blocks/` (one per block type)
- **Form fields** use `.field-input` from `globals.css`, with a real `<label>`, `aria-invalid` and an `aria-live` error under the field. Errors use the `--color-error` token
- **Icons** come from `lucide-react`. Brand logos are Simple Icons paths (CC0) in `components/ui/icons.tsx`
- **Motion:** only `transform` and `opacity` animate, hover effects only apply on devices that can hover, content is visible without JavaScript, and `prefers-reduced-motion` gets plain fades
- The sample social links preview at `/dev/design?links=sample`

### Fonts

Poppins is self-hosted from `apps/web/public/fonts`, one file per weight (400, 500, 600). It has no arrows, and a glyph missing from the page font makes Windows browsers search the system fonts mid-layout, so `apps/web/scripts/fonts.py` subsets Poppins (latin, Latin Extended-A, math signs) and merges in Inter's arrows, check marks and stars. It writes the files with hashed names, `app/fonts.css`, `lib/fonts.ts` and the TrueType copies the share cards use.

To add characters or a weight, change the script and run it (`pip install fonttools brotli`, then `python scripts/fonts.py` in `apps/web`), then commit everything it wrote. Never edit the outputs by hand. Semibold is preloaded in `app/layout.tsx`; the other weights swap in over an Arial fallback sized to Poppins' metrics, so text doesn't move.

### Site icons

The tab, Apple and installed app icons are rendered from the vectors in `apps/web/icons/` by `npm run icons --workspace web`. Never edit the outputs by hand: change the source or the script and run it again, then commit both.

- **Sources:** `q-logo.png` is the original artwork, `q.svg` is traced from it and is the master. `q-small.svg` leaves out the shaft inside the bowl, and only the 16px tab icon uses it, since the full Q turns to mush at that size
- **Outputs:** `app/favicon.ico` (16, 32 and 48), `app/apple-icon.png` (180 on the site's dark background), and `public/icons/` for the web manifest in `app/manifest.ts` (192, 512, and a 512 maskable with the Q inside the safe circle)
- **Placement:** `DROP` in `apps/web/scripts/generate-icons.mjs` sets how far the Q sits below centre in every icon, so the bowl doesn't look high above the tail
- **The .ico is the only tab icon, on purpose.** With a PNG or SVG icon next to it, Chrome fetches that one at every density and never shows the tuned 16px frame. Don't add `app/icon.*` files

## Testing on a phone

`npm run dev:lan` is `npm run dev` with the site reachable from other devices on the network. It prints the URLs to open. Ignore the "Network" URL Next prints: on Windows it's often a Hyper-V, WSL or Docker adapter (like `172.19.x.x`) that a phone can't reach.

If the phone still loads nothing:

1. Open the exact URL the script printed, with `http`, not `https`
2. The phone has to be on the same network as the PC: not a guest network, mobile data or a VPN
3. Turn off AP or client isolation on the router. Some routers also isolate the 2.4 GHz and 5 GHz bands, or Wi-Fi from Ethernet
4. The Windows network profile should be Private. With both Wi-Fi and Ethernet connected, check both (`Get-NetConnectionProfile`)
5. Allow Node.js through Windows Firewall for Private networks, and check there's no Block rule for node.exe
6. Try `http://<PC address>:3000/favicon.ico` from the phone. If that fails too, it's the network or firewall, not the site

## Database GUI

TablePlus, DBeaver and psql take the plain URL, `postgresql://USER:PASSWORD@localhost:5432/DB_NAME`, with the values from `apps/backend/.env`. Leave off Prisma style parameters like `?schema=public`: most clients reject them, and Prisma doesn't need them.

## Code

- Every response and write is validated with the schemas in `@repo/shared`. Request bodies never go straight to Prisma
- **API input:** the global `ZodValidationPipe` (`apps/backend/src/validation/`) parses every parameter that has a schema, either a `createZodDto(schema)` class or `@Body(new ZodValidationPipe(schema))`. Handlers only get the parsed output, so keys a schema doesn't list never arrive. A body parameter without a schema is refused, and failures answer 400 with a `VALIDATION_FAILURE_<FIELD>` code
- `apps/web/lib/content.ts` is the only place the site reads the API
- No public page waits on the API during a visit
- If you aren't sure how an API or a service behaves, don't guess. Leave a `TODO(verify)` comment saying what's unknown

TypeScript 7 is used everywhere except where a tool still needs the TypeScript JS API, which 7 no longer ships: the backend uses TS 6 for the Nest CLI, and `packages/eslint-config` uses TS 6 for typescript-eslint.

## Comments

Comment the why when the code doesn't make it obvious, and keep it short.

## Commits

Commits follow Conventional Commits:

```
<type>(<scope>): <subject>

<body: why the change exists, what it trades off, anything surprising>
```

- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`
- Scopes are the workspace: `web`, `api`, `shared`, or `repo` for the repository itself
- The subject is imperative, starts lowercase, has no closing period and stays under 72 characters
- One logical change per commit, and every commit passes the checks on its own

## Known constraints

To revisit once upstream catches up. Dependabot opens update pull requests every Monday, and [MAINTENANCE.md](MAINTENANCE.md) says how they're grouped and which are held back:

- **ESLint is pinned to 9:** `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import` don't support ESLint 10 yet
- **`typescript-eslint` stays below 8.72 (on 8.71.2):** 8.72 lets npm hoist `ts-api-utils` to the root, where it loads TypeScript 7 instead of the TS 6 alias and ESLint crashes ("reading 'Intrinsic'")
- **`tsconfck` (through `vite-tsconfig-paths`) declares TypeScript ^5 as a peer:** npm reports a peer warning for it, which is harmless
