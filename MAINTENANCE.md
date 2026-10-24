# Maintenance

What needs attention after launch, and when. [DEPLOY.md](DEPLOY.md) has the details behind each item.

## What expires

| What                  | Expires              | Warning                                                        | If it lapses                                                                             |
| --------------------- | -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`        | 2027-10-24           | Token expiry fails, and emails, every Monday from 30 days out  | Site deploys fail. The live site keeps serving the last deploy                           |
| `GITHUB_DEPLOY_TOKEN` | 2027-10-23 23:00 UTC | The same workflow, from the `GH_DEPLOY_TOKEN_EXPIRES` variable | Publishing or renaming a project stops starting a deploy, the admin asks for one by hand |

Nothing else expires: the Render API key, the age key, the admin password and the shared secrets last until you rotate them. Rotation steps for both tokens are in DEPLOY.md, Rotating the deploy tokens. Update the date variable whenever you rotate one.

## What runs on its own

| When                    | What                              | It does                                                                                                 |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Sunday 03:17 UTC        | Backup (`backup.yml`)             | An age-encrypted `pg_dump` of production, kept 14 days                                                  |
| Monday 06:00 UTC        | Dependabot                        | Dependency pull requests, see below                                                                     |
| Monday 08:00 UTC        | Token expiry (`token-expiry.yml`) | Fails from 30 days before a token expires                                                               |
| Wednesday 05:23 UTC     | Keepalive (`keepalive.yml`)       | Keeps the schedules on, and fails if the last good backup is over 8 days old or `main` is 50 days quiet |
| Every push to `main`    | Deploy (`deploy.yml`)             | CI, the API, the site, a smoke test, and turns the schedules back on                                    |
| When a fix is published | Dependabot security updates       | A pull request for a vulnerable dependency, as soon as a fixed version exists                           |

A failed scheduled run emails the repository owner. Neon also keeps 6 hours of instant restore on its own.

### Keeping the schedules alive

In a public repository GitHub turns scheduled workflows off after 60 days without activity, and says nothing. That would stop the backups and the token warnings together. Three things stand in the way:

1. **Keepalive** re-enables Backup, Token expiry and itself through the API every week. That's reported to restart the 60-day clock without a commit, but GitHub doesn't document it, so:
2. **From day 50 without a commit on `main`, Keepalive fails**, which emails you twice before day 60. Merge a Dependabot pull request or push any real change
3. **Every deploy turns the schedules back on**, since a disabled schedule stays off even after the next commit

If the Actions tab ever shows one as disabled: `gh workflow enable backup.yml`, and the same for `token-expiry.yml` and `keepalive.yml`, then run Backup by hand.

## Dependency updates

Dependabot (`.github/dependabot.yml`) checks npm and the GitHub Actions every Monday:

- **Minor and patch updates come grouped by area:** nest, prisma, next-react, zod, lint-format, tests, build-tooling, site (everything else), and one group for the actions
- **Every major update is its own pull request**
- Releases younger than 7 days wait, and security updates don't
- **Nothing merges by itself.** CI runs on each pull request, and merging to `main` runs CI again before anything deploys
- To skip one: comment `@dependabot ignore this major version` (or `minor`, or `dependency`) on its pull request

Dependabot was picked over Renovate because it's built into GitHub: no third-party app with write access to a public repository, nothing to install or sign up for, and its security updates come from the same advisories `npm audit` reads. Renovate groups more cleverly and could also bump the tool versions pinned inside workflows, but that didn't outweigh another app holding write access.

**Not covered, bump by hand now and then:** the CLI versions pinned in workflows and the Dockerfile (`vercel@63.1.0`, gitleaks `v8.30.1`, `turbo@2.10.12`, `postgres:18-alpine`, which has to match Neon's major version). The API's base image is `node:24-slim`, which picks up Node 24 patches on every build.

## Restoring a backup

From the repo root, with Docker running. DEPLOY.md, Backups and recovery, has every command:

1. Download the artifact from the Backup run in the Actions tab (or `gh run download <run id> --dir .deploy/backups`), into `.deploy/backups/`
2. Decrypt it with `BACKUP_AGE_SECRET_KEY` (from `.deploy/secrets.local`, or your password manager)
3. Restore it into a throwaway Postgres 18 container and check it
4. For production, restore into a new Neon branch, check it, then point `DATABASE_URL` in Render, GitHub and the secrets file at it

Uploaded media isn't in the dump. It lives in Vercel Blob.

## Rotating secrets

Generate new values fresh (32 random characters at least) and keep `.deploy/secrets.local` in step. Pipe values from that file rather than pasting them, as DEPLOY.md shows.

| Secret                  | Change it in                                                                  | Then                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `REVALIDATE_SECRET`     | Vercel, Render, GitHub (`production`)                                         | Redeploy. Until both apps are out, refreshes answer 401 and pages keep serving                                  |
| `CONTACT_API_SECRET`    | Vercel, Render                                                                | Redeploy. Messages sent in between fail and the form offers a retry. Restarts the daily per-visitor counts      |
| `ADMIN_API_SECRET`      | Vercel, Render                                                                | Redeploy. The admin fails until both apps are out                                                               |
| `ADMIN_PASSWORD`        | The secrets file                                                              | `npx tsx --env-file=.deploy/secrets.local apps/backend/prisma/admin-password.ts`, which signs every session out |
| `VERCEL_TOKEN`          | Vercel, GitHub, `VERCEL_TOKEN_EXPIRES`                                        | DEPLOY.md, Rotating the deploy tokens                                                                           |
| `GITHUB_DEPLOY_TOKEN`   | GitHub, Render, `GH_DEPLOY_TOKEN_EXPIRES`                                     | The same section                                                                                                |
| `RENDER_API_KEY`        | Render → Account Settings → API Keys, GitHub                                  | Run Deploy to check it, then delete the old key                                                                 |
| `DATABASE_URL`          | Neon (reset the role's password), Render, GitHub                              | Redeploy the API. Backups and the seed read the GitHub copy                                                     |
| `DISCORD_WEBHOOK_URL`   | Discord (new webhook), Render                                                 | Redeploy the API, delete the old webhook                                                                        |
| `BLOB_READ_WRITE_TOKEN` | Set by the store connection in Vercel                                         | Disconnect and reconnect the store under the project's Storage tab, then redeploy                               |
| `BACKUP_AGE_*`          | `age-keygen`, the GitHub variable, the secrets file and your password manager | Keep the old private key until the last artifact encrypted to it has expired (14 days)                          |

## Switching to a custom domain

1. Vercel → the project → Settings → Domains: add the domain, set the DNS records it shows, and redirect `quivery-portfolio.vercel.app` to it
2. Set `SITE_URL` in Vercel and in the GitHub `production` variables, and `WEB_ORIGIN` in Render, to `https://<domain>`
3. Run Deploy. Canonical URLs, share cards, the sitemap and robots.txt all follow `SITE_URL`, and the smoke test checks the new origin
4. Update the live link in README.md
5. **HSTS preload**, once the domain has served HTTPS without trouble for a while: add `; preload` to the `Strict-Transport-Security` value in `apps/web/lib/security-headers.ts`, deploy, and submit the domain at [hstspreload.org](https://hstspreload.org). It already sends two years and `includeSubDomains`, which preload requires. **Every subdomain has to serve HTTPS from then on, and leaving the list takes months**, so only do it for a domain you'll keep

A domain for the API works the same way: add it in Render, change `API_URL` in Vercel and GitHub, and redeploy.

## When to move Vercel to Pro

Hobby is for non-commercial use only. The site is a portfolio for job hunting today. **Before a Services section that offers paid work goes live**, move to Pro ($20 a month), and turn on Spend Management with a low budget and "Pause production deployments" so it can't bill past it. Nothing else here needs paying for until Render's sleep or Neon's 1 GB gets in the way (DEPLOY.md, When to upgrade).

## Known constraints

- **multer:** `npm audit` reports 4 high findings for multer below 2.5.0 (GHSA-q7qp-rjg7-q26m). Nest 12.2.0 pins multer 2.4.0. They can't be reached here, since nothing parses multipart (uploads go straight to Blob). The nest group or a security update brings the fix once Nest ships it, and the findings clear when that pull request merges
- **ESLint stays on 9:** the React and a11y lint plugins don't support ESLint 10 yet. Dependabot ignores ESLint majors. Check the plugins now and then, and remove the ignore when they do
- **typescript-eslint stays on 8.68:** later releases let npm hoist `ts-api-utils` next to TypeScript 7 and ESLint crashes. Dependabot opens a pull request for each new release, and a green lint step means it's fixed
- **TypeScript 6 in two places:** the backend (for the Nest CLI) and `packages/eslint-config` (for typescript-eslint) need the TypeScript JS API, which 7 doesn't ship. Close a pull request moving them to 7 with `@dependabot ignore this major version`

CONTRIBUTING.md, Known constraints, has the background.
