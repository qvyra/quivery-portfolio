# Deploying

Production runs on three free tiers, all in Frankfurt.

| Part     | Host   | Plan          | URL                       |
| -------- | ------ | ------------- | ------------------------- |
| Site     | Vercel | Hobby         | LIVE_SITE_URL             |
| API      | Koyeb  | Free instance | LIVE_API_URL              |
| Database | Neon   | Free          | private, AWS eu-central-1 |

GitHub Actions deploys both apps. The hosts' own deploy on push is off, so nothing reaches production without passing CI first.

## How a deploy works

Every push to `main` runs `.github/workflows/deploy.yml`:

1. **CI** (`ci.yml`): secret scan, lint, types, unit and end-to-end tests, a production build of the site against a seeded API, a check that no dev or placeholder page got built, and a build and smoke test of the API's Docker image. Pull requests and other branches run it too, without deploying
2. **API** (`scripts/deploy/koyeb-deploy.mjs`): refuses to go on unless the Koyeb service only uses the free instance type, redeploys it at the commit CI tested and waits until it's healthy. The container runs `prisma migrate deploy` before the server starts. Koyeb only sends traffic to the new version once its health check passes, so if the build, a migration or startup fails, the old version keeps serving
3. **Site** (`vercel deploy --prod`): Vercel builds remotely. The build waits for the API's `/health/ready` first (up to 4 minutes, which wakes a sleeping API and database), then prerenders every page. If the API never answers or the homepage comes back empty, the build fails and the previous deployment stays live
4. **Smoke test** (`scripts/deploy/smoke-test.mjs`): the homepage and a project page answer 200, fake and placeholder project URLs and `/dev` answer 404, and the API answers `/health`

Deploys run one at a time in push order, and a running deploy is never cancelled. To redeploy without a new commit, run the Deploy workflow from the Actions tab.

## Environment variables

Production secrets are generated fresh, never copied from a local setup. `REVALIDATE_SECRET` has to be the same in Vercel, Koyeb and GitHub.

| Variable            | Where                        | Value                                               |
| ------------------- | ---------------------------- | --------------------------------------------------- |
| `API_URL`           | Vercel                       | The Koyeb URL, no trailing slash                    |
| `SITE_URL`          | Vercel                       | The site's public origin, for canonical and OG URLs |
| `REVALIDATE_SECRET` | Vercel, Koyeb, GitHub secret | At least 32 random characters                       |
| `MEDIA_ORIGIN`      | Vercel, later                | The object storage origin, once uploads exist       |
| `DATABASE_URL`      | Koyeb, GitHub secret         | Neon's direct connection string, pooling off        |
| `WEB_ORIGIN`        | Koyeb                        | Same as `SITE_URL`, the only origin CORS allows     |
| `NODE_ENV`          | set by the Dockerfile        | `production`                                        |
| `PORT`              | Koyeb                        | `8000`                                              |

Vercel doesn't get `DATABASE_URL`: the site only talks to the API.

GitHub keeps these in the `production` environment:

| Name                | Kind     | Used by                                 |
| ------------------- | -------- | --------------------------------------- |
| `KOYEB_TOKEN`       | secret   | API deploys                             |
| `VERCEL_TOKEN`      | secret   | Site deploys (a project scoped token)   |
| `DATABASE_URL`      | secret   | The seed workflow only                  |
| `REVALIDATE_SECRET` | secret   | The seed workflow's cache refresh       |
| `KOYEB_SERVICE_ID`  | variable | API deploys                             |
| `VERCEL_ORG_ID`     | variable | Site deploys                            |
| `VERCEL_PROJECT_ID` | variable | Site deploys                            |
| `API_URL`           | variable | Checks after a deploy                   |
| `SITE_URL`          | variable | Checks after a deploy, the seed refresh |

### Setting secrets without exposing them

The production values live in `.deploy/secrets.local`, which is gitignored. Pipe them from there so they never show up in a terminal or shell history:

```sh
node -e "process.loadEnvFile('.deploy/secrets.local');process.stdout.write(process.env.REVALIDATE_SECRET)" \
  | npx vercel env add REVALIDATE_SECRET production
node -e "process.loadEnvFile('.deploy/secrets.local');process.stdout.write(process.env.REVALIDATE_SECRET)" \
  | gh secret set REVALIDATE_SECRET --env production
```

To rotate `REVALIDATE_SECRET`, generate a new one, set it in Vercel, Koyeb and GitHub, and redeploy. Until both apps are redeployed, revalidation answers 401 and pages keep serving.

## Migrations

- Create them locally with `npm run db:migrate`, commit and push. The API container applies them with `prisma migrate deploy` as it starts
- **Never run `prisma migrate reset` or `migrate dev` against production**, only `migrate deploy`
- The new API version starts while the old one still serves, so a migration has to work with both. Add first, and only drop or rename what the old version no longer reads in a later deploy
- To apply them by hand, set `DATABASE_URL` to the production URL and run `npm run db:deploy --workspace backend`

## Seeding production

Until the admin panel exists, `apps/backend/prisma/seed/content.ts` is the content. To publish changes to it, run **Seed production** from the Actions tab, type `seed production` and keep "Refresh the live site" ticked.

- It applies pending migrations, replaces the content without the placeholder projects, and refreshes the site's cached pages
- It never runs on deploy. Once the admin panel exists, the database owns the content and this would overwrite edits made there, so it goes away then
- Uploaded media and contact messages are never touched

## Refreshing cached pages

The site keeps serving cached pages until it's told to refresh. The API will do that after admin edits. By hand:

```sh
SITE_URL=<site url> node scripts/deploy/revalidate.mjs site projects
```

`REVALIDATE_SECRET` is read from `.deploy/secrets.local`. Tags are `site`, `projects` and `project:<slug>`. The next visit gets the cached page while a fresh one renders, and the one after shows the change.

## Rolling back

- **Site:** in Vercel, open the project's Deployments, pick the last good one and use Instant Rollback (or `npx vercel rollback <url>`). It's immediate, with no rebuild. The next deploy from `main` replaces it, so revert the bad commit too
- **API:** revert the bad commit on `main` and push. For an immediate rollback, redeploy the previous deployment from the Koyeb dashboard
- **Database:** migrations only go forward, so fix forward with a new one. Neon's free plan keeps 6 hours of history, and a branch can be restored to a point in time from the Neon console

## The sleeping API

The free Koyeb instance scales to zero after an hour without requests and takes about 1 to 5 seconds to wake, plus the API's own startup. Neon suspends after 5 idle minutes and wakes in under a second.

- Visitors don't notice: pages are cached on Vercel and never call the API
- Builds wait for it in `apps/web/scripts/wait-for-api.mjs`
- Refreshes happen in the background. One that hits a sleeping API waits for it, and one that fails keeps the last good page
- HTTP/2 requests can't wake a Koyeb instance. Node's `fetch` uses HTTP/1.1, so the site's requests do
- The contact form will wake it from a server route, with a loading state, a timeout and one retry

## Limits and cost

| Host   | Free limits (October 2026)                                                      | Past the limit                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel | 100 GB transfer, 1M function calls, 4 CPU hours, 5,000 image transforms a month | The feature stops until the 30 day window resets. Hobby can't be billed                                                                                  |
| Koyeb  | One free web service (0.1 vCPU, 512 MB), 100 GB transfer                        | The free instance is never billed. Anything else would be, so `koyeb-deploy.mjs` refuses other instance types, and the card is a low balance prepaid one |
| Neon   | 1 GB storage, 100 compute hours a month                                         | Compute suspends or writes stop until next month. No card on file                                                                                        |

### When to upgrade

- **Vercel Pro ($20 a month):** Hobby is for non-commercial use. This is a job hunting portfolio with no services or pricing section. If a Services section advertising paid work goes live, move to Pro first and turn on Spend Management with a low on-demand budget and "Pause production deployments"
- **Koyeb:** if the wake-up delay on the contact form gets in the way, or the free tier changes
- **Neon:** if the database outgrows 1 GB or the compute hours

## Switching to a custom domain

No code changes:

1. In Vercel, add the domain under the project's Settings → Domains and set the DNS records it shows
2. Set `SITE_URL` in Vercel and the GitHub `SITE_URL` variable to `https://<domain>`, and `WEB_ORIGIN` in Koyeb to the same
3. Redeploy. Canonical and Open Graph URLs come from `SITE_URL`, and so will robots.txt and the sitemap

A custom domain for the API works the same way: add it in Koyeb, change `API_URL` in Vercel and GitHub, and redeploy.

## First-time setup

What was done once, to rebuild it from scratch if needed:

1. **Neon:** a project in AWS Europe Central 1 (Frankfurt), its direct connection string in `.deploy/secrets.local`
2. **GitHub:** the `production` environment with the secrets and variables above
3. **Seed:** the Seed production workflow with "Refresh the live site" unticked, since there's no site yet. It creates the schema and loads the content
4. **Koyeb:** secrets for `DATABASE_URL` and `REVALIDATE_SECRET`, then the service: `--instance-type free`, `--regions fra`, deploy on push off, the Docker builder with `apps/backend/Dockerfile`, port 8000 and an HTTP health check on `/health`. Its id goes in `KOYEB_SERVICE_ID`
5. **Vercel:** a project with Root Directory `apps/web`, Node.js 24.x and no Git connection, since deploys come from Actions. `apps/web/vercel.json` sets the region and the install and build commands. Then its environment variables, and a project scoped token for GitHub
6. Push to `main`, or run the Deploy workflow
