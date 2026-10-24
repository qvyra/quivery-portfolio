import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminSecretGuard, AdminSessionGuard } from './auth/admin-guards.js';
import { AdminSessions } from './auth/admin-sessions.js';
import { LOGIN_RATE_LIMITS } from './auth/login-throttler.guard.js';

// Everything under /admin. Only the site's server calls it, with the admin
// secret and the signed-in session's token
@Module({
  imports: [ThrottlerModule.forRoot(LOGIN_RATE_LIMITS)],
  controllers: [AdminAuthController],
  providers: [AdminSessions, AdminSecretGuard, AdminSessionGuard],
})
export class AdminModule {}
