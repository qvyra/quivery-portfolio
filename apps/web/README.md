# Site

The Next.js site. Every public page is prerendered from the API and cached, see the [README](../../README.md).

| Path                       | What it is                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| `app/(site)`               | The public pages: homepage, project pages and the 404            |
| `app/api/revalidate`       | Tag revalidation, protected by `REVALIDATE_SECRET`               |
| `lib/content.ts`           | The only place the site reads the API: cached, tagged, validated |
| `lib/env.ts`               | Environment validation per stage (dev, build, server)            |
| `components`               | `ui`, `site`, `sections` and `blocks`                            |
| `scripts/wait-for-api.mjs` | Runs before `next build` and waits for the API to be ready       |
| `vercel.json`              | Vercel build settings: region and monorepo commands              |

Setup is in [CONTRIBUTING.md](../../CONTRIBUTING.md), production in [DEPLOY.md](../../DEPLOY.md).
