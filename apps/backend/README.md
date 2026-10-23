# API

The NestJS API behind the portfolio. It owns the content in Postgres through Prisma and serves it to the site.

- `GET /health`: liveness, never touches the database
- `GET /health/ready`: readiness, checks the database (which also wakes a suspended one). Builds call it before fetching
- `GET /public/site`, `/public/projects` and `/public/projects/:slug`: published, visible content only, validated with the shared Zod schemas

| Path                   | What it is                                                            |
| ---------------------- | --------------------------------------------------------------------- |
| `src/config/env.ts`    | Environment validation, startup fails on a missing or bad value       |
| `src/content`          | The public content endpoints and the row to response mappers          |
| `prisma/schema.prisma` | The data model                                                        |
| `prisma/migrations`    | Migrations, applied in production by `prisma migrate deploy` on start |
| `prisma/seed`          | The content file and the seed that loads it                           |
| `Dockerfile`           | The production image, built from the repo root                        |

Setup is in [CONTRIBUTING.md](../../CONTRIBUTING.md), production in [DEPLOY.md](../../DEPLOY.md).
