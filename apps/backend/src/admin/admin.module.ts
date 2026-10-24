import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ContentModule } from '../content/content.module.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminSecretGuard, AdminSessionGuard } from './auth/admin-guards.js';
import { AdminSessions } from './auth/admin-sessions.js';
import { LOGIN_RATE_LIMITS } from './auth/login-throttler.guard.js';
import { AdminContentController } from './content/admin-content.controller.js';
import { AdminContentService } from './content/admin-content.service.js';
import { AdminSiteController } from './content/admin-site.controller.js';
import { AdminInboxController } from './inbox/admin-inbox.controller.js';
import { AdminMediaController } from './media/admin-media.controller.js';
import { AdminMediaService } from './media/admin-media.service.js';
import { SiteUpdates } from './site-updates.js';

// Everything under /admin. Only the site's server calls it, with the admin
// secret and the signed-in session's token
@Module({
  imports: [ThrottlerModule.forRoot(LOGIN_RATE_LIMITS), ContentModule],
  controllers: [
    AdminAuthController,
    AdminContentController,
    AdminSiteController,
    AdminMediaController,
    AdminInboxController,
  ],
  providers: [
    AdminSessions,
    AdminSecretGuard,
    AdminSessionGuard,
    AdminContentService,
    AdminMediaService,
    SiteUpdates,
  ],
})
export class AdminModule {}
