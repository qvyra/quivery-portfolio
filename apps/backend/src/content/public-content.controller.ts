import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import {
  slugSchema,
  type ApiSuccess,
  type PageDetail,
  type PageSummary,
  type ProjectDetail,
  type ProjectSummary,
  type Site,
} from '@repo/shared';
import { createZodDto } from '../validation/zod-dto.js';
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

  @Get('pages')
  async getPages(): Promise<ApiSuccess<PageSummary[]>> {
    return {
      status: 200,
      data: await this.content.getPages(),
      message: 'Successfully fetched pages! (Could be empty)',
      code: 'PAGES_FETCHED',
    };
  }

  @Get('pages/:slug')
  async getPage(
    @Param() params: SlugParamsDto,
  ): Promise<ApiSuccess<PageDetail>> {
    return {
      status: 200,
      data: await this.content.getPage(params.slug),
      message: 'Successfully fetched page!',
      code: 'PAGE_FETCHED',
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
