import { Module } from '@nestjs/common';
import { PublicContentController } from './public-content.controller.js';
import { PublicContentService } from './public-content.service.js';

@Module({
  controllers: [PublicContentController],
  providers: [PublicContentService],
  // the admin previews drafts with the same code that builds the public site
  exports: [PublicContentService],
})
export class ContentModule {}
