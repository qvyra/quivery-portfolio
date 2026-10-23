import { Controller, Get, Param } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  slugSchema,
  type ApiSuccess,
  type ProjectDetail,
  type ProjectSummary,
  type Site,
} from '@repo/shared';
import { PublicContentService } from './public-content.service.js';

class SlugParamsDto extends createZodDto(z.object({ slug: slugSchema })) {}

// Read-only published content. The web app only calls these at build and
// revalidation time, never while serving a visitor
@Controller('public')
export class PublicContentController {
  constructor(private content: PublicContentService) {}

  @Get('site')
  async getSite(): Promise<ApiSuccess<Site>> {
    return {
      status: 200,
      data: await this.content.getSite(),
      message: 'Successfully fetched the site!',
      code: 'SITE_FETCHED',
    };
  }

  @Get('projects')
  async getProjects(): Promise<ApiSuccess<ProjectSummary[]>> {
    return {
      status: 200,
      data: await this.content.getProjects(),
      message: 'Successfully fetched projects! (Could be empty)',
      code: 'PROJECTS_FETCHED',
    };
  }

  @Get('projects/:slug')
  async getProject(
    @Param() params: SlugParamsDto,
  ): Promise<ApiSuccess<ProjectDetail>> {
    return {
      status: 200,
      data: await this.content.getProject(params.slug),
      message: 'Successfully fetched project!',
      code: 'PROJECT_FETCHED',
    };
  }
}
