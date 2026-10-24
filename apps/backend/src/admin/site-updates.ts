import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/** What happened to a deploy the admin asked for, shown in the panel */
export type DeployOutcome = 'started' | 'not-configured' | 'failed';

/**
 * Tells the live site about admin changes. Content edits refresh cached pages
 * by tag. Publishing, unpublishing, hiding or renaming a project changes which
 * project URLs exist, and those are fixed at build time (apps/web/proxy.ts),
 * so that needs a full deploy through the Deploy workflow, CI included
 */
@Injectable()
export class SiteUpdates implements OnModuleInit {
  private readonly logger = new Logger(SiteUpdates.name);
  private readonly webOrigin: string;
  private readonly revalidateSecret: string | undefined;
  private readonly deployToken: string | undefined;
  private readonly deployRepo: string;

  constructor(config: ConfigService<Env, true>) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
    this.revalidateSecret = config.get('REVALIDATE_SECRET', { infer: true });
    this.deployToken = config.get('GITHUB_DEPLOY_TOKEN', { infer: true });
    this.deployRepo = config.get('GITHUB_DEPLOY_REPO', { infer: true });
  }

  onModuleInit() {
    if (!this.deployToken) {
      this.logger.warn(
        'GITHUB_DEPLOY_TOKEN is not set: publishing a project will ask for a manual deploy',
      );
    }
  }

  /**
   * Refreshes every cached page. There are few, and the homepage lists
   * projects while every project page shows the site chrome, so a narrower
   * tag would save nothing. Runs in the background and never throws
   */
  refresh(): void {
    if (!this.revalidateSecret) return;
    void this.post(`${this.webOrigin}/api/revalidate`, {
      headers: { 'x-revalidate-secret': this.revalidateSecret },
      body: { tags: ['site', 'projects'] },
    }).then((status) => {
      if (status !== 200) {
        this.logger.error(`Refreshing the site's pages failed (${status})`);
      }
    });
  }

  /** Starts the Deploy workflow on main */
  async deploy(reason: string): Promise<DeployOutcome> {
    if (!this.deployToken) {
      this.logger.warn(`A deploy is needed (${reason}) but no token is set`);
      return 'not-configured';
    }
    const status = await this.post(
      `https://api.github.com/repos/${this.deployRepo}/actions/workflows/deploy.yml/dispatches`,
      {
        headers: {
          authorization: `Bearer ${this.deployToken}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
        body: { ref: 'main' },
      },
    );
    if (status === 204) {
      this.logger.log(`Started the Deploy workflow (${reason})`);
      return 'started';
    }
    this.logger.error(
      `Starting the Deploy workflow failed (${status}, ${reason})`,
    );
    return 'failed';
  }

  // the status code, or a short error name. Never logs the URL's secrets
  private async post(
    url: string,
    { headers, body }: { headers: Record<string, string>; body: unknown },
  ): Promise<number | string> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      return response.status;
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause;
      return cause?.code ?? (error as Error).name;
    }
  }
}
