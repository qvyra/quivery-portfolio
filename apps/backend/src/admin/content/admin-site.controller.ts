import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  adminProfileSchema,
  type ApiError,
  type ApiSuccess,
  type ProjectDetail,
  type Site,
} from '@repo/shared';
import { PublicContentService } from '../../content/public-content.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { createZodDto } from '../../validation/zod-dto.js';
import { AdminSecretGuard, AdminSessionGuard } from '../auth/admin-guards.js';
import { SiteUpdates } from '../site-updates.js';

class ProfileDto extends createZodDto(adminProfileSchema) {}
class IdParams extends createZodDto(z.strictObject({ id: z.uuid() })) {}

type ProfileContent = z.output<typeof adminProfileSchema>;

// The profile singleton, and the live preview: the site and project pages as
// they'll look once every draft is published
@Controller('admin')
@UseGuards(AdminSecretGuard, AdminSessionGuard)
export class AdminSiteController {
  constructor(
    private readonly db: PrismaService,
    private readonly content: PublicContentService,
    private readonly site: SiteUpdates,
  ) {}

  @Get('profile')
  async profile(): Promise<ApiSuccess<ProfileContent>> {
    const row = await this.db.profile.findUnique({ where: { id: 1 } });
    if (!row) {
      throw new NotFoundException({
        status: 404,
        message: 'The profile has not been created yet. Run the seed.',
        code: 'PROFILE_NOT_FOUND',
      } satisfies ApiError);
    }
    return {
      status: 200,
      data: {
        brandName: row.brandName,
        displayName: row.displayName,
        headline: row.headline,
        tagline: row.tagline,
        avatarId: row.avatarId,
        cvId: row.cvId,
      },
      message: 'Fetched.',
      code: 'ADMIN_PROFILE',
    };
  }

  // the profile has no publish state, so a save goes live straight away
  @Put('profile')
  async saveProfile(@Body() body: ProfileDto): Promise<ApiSuccess<null>> {
    await this.db.profile.update({ where: { id: 1 }, data: body });
    this.site.refresh();
    return {
      status: 200,
      data: null,
      message: 'Saved.',
      code: 'ADMIN_PROFILE_SAVED',
    };
  }

  @Get('preview/site')
  async previewSite(): Promise<ApiSuccess<Site>> {
    return {
      status: 200,
      data: await this.content.getSite({ preview: true }),
      message: 'Preview.',
      code: 'ADMIN_PREVIEW',
    };
  }

  @Get('preview/projects/:id')
  async previewProject(
    @Param() { id }: IdParams,
  ): Promise<ApiSuccess<ProjectDetail>> {
    return {
      status: 200,
      data: await this.content.getProjectPreview(id),
      message: 'Preview.',
      code: 'ADMIN_PREVIEW',
    };
  }
}
