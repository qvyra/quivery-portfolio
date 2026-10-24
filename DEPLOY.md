# Deploying

Production runs on three free tiers, all in Frankfurt.

| Part     | Host   | Plan  | URL                                  |
| -------- | ------ | ----- | ------------------------------------ |
| Site     | Vercel | Hobby | https://quivery-portfolio.vercel.app |
| API      | Render | Free  | https://quivery-api.onrender.com     |
| Database | Neon   | Free  | private, AWS eu-central-1            |

GitHub Actions deploys both apps. The hosts' own deploy on push is off, so nothing reaches production without passing CI first.

## How a deploy works

Every push to `main` runs `.github/workflows/deploy.yml`:

1. **CI** (`ci.yml`): secret scan, lint, types, unit and end-to-end tests, a production build of the site against a seeded API, a check that no dev or placeholder page got built, and a build and smoke test of the API's Docker image. Pull requests and other branches run it too, without deploying
2. **API** (`scripts/deploy/render-deploy.mjs`): refuses to go on unless the Render service is on the free plan, in Frankfurt, with auto deploy off. Then it deploys the commit CI tested and waits until it's live. The container runs `prisma migrate deploy` before the server starts. Render only moves traffic to the new version once its health check passes, so if the build, a migration or startup fails, the old version keeps serving
3. **Site** (`vercel deploy --prod`): Vercel builds remotely. The build waits for the API's `/health/ready` first (up to 5 minutes, which wakes a sleeping API and database), then prerenders every page. If the API never answers or the homepage comes back empty, the build fails and the previous deployment stays live
4. **Smoke test** (`scripts/deploy/smoke-test.mjs`): the homepage and a project page answer 200, fake and placeholder project URLs and `/dev` answer 404, and the API answers `/health` with its own JSON

Deploys run one at a time in push order, and a running deploy is never cancelled. To redeploy without a new commit, run the Deploy workflow from the Actions tab.

### Runner image

Every workflow runs on `ubuntu-24.04`, not `ubuntu-latest`, so GitHub moving `latest` to a new Ubuntu can't change the build under a deploy without warning. Bump it on purpose: change `runs-on` in all four workflows in one commit, and let CI and a deploy go green before relying on it. GitHub announces image deprecations in the actions/runner-images repository and as warnings on workflow runs.

## Environment variables

Production secrets are generated fresh, never copied from a local setup. `REVALIDATE_SECRET` has to be the same in Vercel, Render and GitHub, and `CONTACT_API_SECRET` the same in Vercel and Render.

| Variable              | Where                         | Value                                                          |
| --------------------- | ----------------------------- | -------------------------------------------------------------- |
| `API_URL`             | Vercel                        | The Render URL, no trailing slash                              |
| `SITE_URL`            | Vercel                        | The site's public origin, for canonical and OG URLs            |
| `REVALIDATE_SECRET`   | Vercel, Render, GitHub secret | At least 32 random characters                                  |
| `CONTACT_API_SECRET`  | Vercel, Render                | At least 32 random characters, sent with every contact message |
| `DISCORD_WEBHOOK_URL` | Render                        | The webhook that announces new contact messages. Optional      |
| `MEDIA_ORIGIN`        | Vercel, later                 | The object storage origin, once uploads exist                  |
| `DATABASE_URL`        | Render, GitHub secret         | Neon's direct connection string, pooling off                   |
| `WEB_ORIGIN`          | Render                        | Same as `SITE_URL`, the only origin CORS allows                |
| `NODE_ENV`            | set by the Dockerfile         | `production`                                                   |
| `PORT`                | Render                        | `10000`, Render's default                                      |

Vercel doesn't get `DATABASE_URL`: the site only talks to the API.

GitHub keeps these in the `production` environment:

| Name                | Kind     | Used by                                 |
| ------------------- | -------- | --------------------------------------- |
| `RENDER_API_KEY`    | secret   | API deploys                             |
| `VERCEL_TOKEN`      | secret   | Site deploys (a project scoped token)   |
| `DATABASE_URL`      | secret   | The seed workflow only                  |
| `REVALIDATE_SECRET` | secret   | The seed workflow's cache refresh       |
| `RENDER_SERVICE_ID` | variable | API deploys                             |
| `VERCEL_ORG_ID`     | variable | Site deploys                            |
| `VERCEL_PROJECT_ID` | variable | Site deploys                            |
| `API_URL`           | variable | Checks after a deploy                   |
| `SITE_URL`          | variable | Checks after a deploy, the seed refresh |

The repository itself, outside the environment, has one variable: `VERCEL_TOKEN_EXPIRES`, the token's expiry date for the Token expiry workflow.

### Setting secrets without exposing them

The production values live in `.deploy/secrets.local`, which is gitignored. Pipe them from there so they never show up in a terminal or shell history:

```sh
node -e "process.loadEnvFile('.deploy/secrets.local');process.stdout.write(process.env.REVALIDATE_SECRET)" \
  | npx vercel env add REVALIDATE_SECRET production
node -e "process.loadEnvFile('.deploy/secrets.local');process.stdout.write(process.env.REVALIDATE_SECRET)" \
  | gh secret set REVALIDATE_SECRET --env production
```

To rotate `REVALIDATE_SECRET`, generate a new one, set it in Vercel, Render and GitHub, and redeploy. Until both apps are redeployed, revalidation answers 401 and pages keep serving.

### Rotating the Vercel token

`VERCEL_TOKEN` is scoped to the quivery-portfolio project and **expires on 2027-10-24**. Once it does, site deploys fail and the live site keeps serving the last deploy. The repository variable `VERCEL_TOKEN_EXPIRES` holds that date, and the Token expiry workflow (`token-expiry.yml`) fails every Monday from 30 days before it, which sends GitHub's failed run email.

1. In Vercel, with your personal account selected, open Account Settings → Tokens. Create a token, set Scope to the Quivery team and then the quivery-portfolio project (not All Projects), and pick an expiration
2. Put it in `VERCEL_TOKEN` in `.deploy/secrets.local`
3. Update GitHub, piping the value as above, and set the new date:

   ```sh
   node -e "process.loadEnvFile('.deploy/secrets.local');process.stdout.write(process.env.VERCEL_TOKEN)" \
     | gh secret set VERCEL_TOKEN --env production
   gh variable set VERCEL_TOKEN_EXPIRES --body YYYY-MM-DD
   ```

4. Run the Deploy workflow (`gh workflow run deploy.yml`) and wait for it to go green
5. Delete the old token on the same Tokens page

GitHub turns off scheduled workflows in a public repository after 60 days without a commit. If the Actions tab says Token expiry is disabled, turn it back on there.

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
- **API:** revert the bad commit on `main` and push. For an immediate rollback, use Rollback on an earlier deploy in the Render dashboard (the free plan keeps the last two)
- **Database:** migrations only go forward, so fix forward with a new one. Neon's free plan keeps 6 hours of history, and a branch can be restored to a point in time from the Neon console

## The sleeping API

Render's free plan spins the API down after 15 minutes without requests, and waking it takes about a minute, plus `prisma migrate deploy` and the API's own startup. While it wakes, browsers get a Render loading page, so nothing treats a plain 200 as ready: the build, the deploy check and the smoke test all wait for the API's own JSON. Neon suspends after 5 idle minutes and wakes in under a second.

- Visitors don't notice: pages are cached on Vercel and never call the API. Unknown project URLs don't either, `apps/web/proxy.ts` sends them to the static 404 page using the slugs published at build time
- Builds wait for it in `apps/web/scripts/wait-for-api.mjs`, up to 5 minutes
- Refreshes happen in the background and wait up to 90 seconds for it. One that fails keeps the last good page
- The contact form wakes it on the visitor's first focus and waits up to 90 seconds per attempt, see below

## Contact form

The browser posts to the site's `/api/contact` route, which checks the message with the shared schema and hands it to the API's `POST /contact` with the `x-contact-secret` header and the visitor's IP from Vercel's `x-real-ip`. The API refuses anything without the secret, so it never takes messages straight from browsers.

- **Store first:** the API saves the message, then answers, then announces it on Discord in the background with two retries. A Discord failure is logged (`Couldn't announce contact message …`, never the webhook URL) and the message stays in the database. A successful announcement logs `Announced contact message <id> on Discord (204, mentions disabled)`
- **Idempotency:** the form makes one key per draft and sends it with every attempt. The key is unique in the database, so a retry gets the original success and is never stored twice
- **The sleeping API:** the form calls `/api/contact/warm` on first focus, which wakes the API and the database while the visitor types. Sending says "Waking the server, this can take up to a minute" after 3 seconds, waits up to 90 seconds, and retries once by itself. The draft stays in the browser until the API confirms the message is stored
- **Spam:** a hidden field and a 3 second minimum since the first keystroke. Bots get the normal success and nothing is stored or announced. One visitor (by IP, IPv6 by /64) can send 5 an hour and 10 a day. The throttler counts in memory, which the free instance loses when it sleeps, so the daily limit is also counted from stored messages. At most 3 links per message
- **Privacy:** messages keep the name, email, topic, text, time and a keyed hash of the IP, never the IP itself. `status` is the inbox's read flag (`NEW` is unread)
- **Reading messages:** until the admin inbox exists, they're in the `ContactMessage` table and on Discord
- **Cloudflare Turnstile, later:** render the widget in the form, send its token in the submission (one optional field in `contactSubmissionSchema`), and verify it in the site's `/api/contact` route before forwarding, or in the API next to the other checks in `apps/backend/src/contact/spam.ts`. Nothing else has to move

To rotate `CONTACT_API_SECRET`, set the new value in Vercel and Render and redeploy both. No workflow needs it, so GitHub doesn't have it. Messages sent between the two deploys fail and the form offers a retry. The IP hashes are keyed with it, so rotating also restarts the daily counts.

## Limits and cost

| Host   | Free limits (October 2026)                                                                                    | Past the limit                                                                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel | 100 GB transfer, 1M function calls, 4 CPU hours, 5,000 image transforms a month                               | The feature stops until the 30 day window resets. Hobby can't be billed                                                                                                                                                                                                        |
| Render | Free web services (0.1 CPU, 512 MB), 750 instance hours, 5 GB outbound transfer and 500 build minutes a month | No card on file: past the hours or transfer, free services are suspended until next month, and past the build minutes new builds stop while the live one keeps running. Paid plans can't be created without a card, and `render-deploy.mjs` refuses anything but the free plan |
| Neon   | 1 GB storage, 100 compute hours a month                                                                       | Compute suspends or writes stop until next month. No card on file                                                                                                                                                                                                              |

### When to upgrade

- **Vercel Pro ($20 a month):** Hobby is for non-commercial use. This is a job hunting portfolio with no services or pricing section. If a Services section advertising paid work goes live, move to Pro first and turn on Spend Management with a low on-demand budget and "Pause production deployments"
- **Render:** if the wake-up delay gets in the way of the contact form, or the free tier changes. The cheapest paid instance doesn't sleep
- **Neon:** if the database outgrows 1 GB or the compute hours

## Switching to a custom domain

No code changes:

1. In Vercel, add the domain under the project's Settings → Domains and set the DNS records it shows
2. Set `SITE_URL` in Vercel and the GitHub `SITE_URL` variable to `https://<domain>`, and `WEB_ORIGIN` in Render to the same
3. Redeploy. Canonical and Open Graph URLs come from `SITE_URL`, and so will robots.txt and the sitemap

A custom domain for the API works the same way: add it in Render, change `API_URL` in Vercel and GitHub, and redeploy.

## First-time setup

What was done once, to rebuild it from scratch if needed:

1. **Neon:** a project in AWS Europe Central 1 (Frankfurt), its direct connection string in `.deploy/secrets.local`
2. **GitHub:** the `production` environment with the secrets and variables above
3. **Seed:** the Seed production workflow with "Refresh the live site" unticked, since there's no site yet. It creates the schema and loads the content
4. **Render:** a web service from the GitHub repo, created through the API: plan `free`, region `frankfurt`, runtime `docker`, Dockerfile `apps/backend/Dockerfile`, build context the repo root, branch `main`, auto deploy `off`, health check `/health`, and the environment variables above. Its id goes in `RENDER_SERVICE_ID`
5. **Vercel:** a project with Root Directory `apps/web`, Node.js 24.x and no Git connection, since deploys come from Actions. `apps/web/vercel.json` sets the region and the install and build commands. Then its environment variables, and a project scoped token for GitHub
6. Push to `main`, or run the Deploy workflow
