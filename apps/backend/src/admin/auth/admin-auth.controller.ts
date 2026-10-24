import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { adminLoginSchema, type ApiError, type ApiSuccess } from '@repo/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { createZodDto } from '../../validation/zod-dto.js';
import {
  AdminSecretGuard,
  AdminSessionGuard,
  CurrentAdmin,
} from './admin-guards.js';
import {
  AdminSessions,
  SESSION_IDLE_MS,
  type AdminIdentity,
} from './admin-sessions.js';
import { LoginThrottlerGuard } from './login-throttler.guard.js';
import { dummyHash, verifyPassword } from './password.js';

class AdminLoginDto extends createZodDto(adminLoginSchema) {}

export type AdminSessionInfo = {
  username: string;
  expiresAt: string;
  idleMinutes: number;
};

// Class guards run before method guards, so the secret is checked first and
// the login limit only counts requests that came through the site
@Controller('admin/auth')
@UseGuards(AdminSecretGuard)
export class AdminAuthController {
  constructor(
    private readonly db: PrismaService,
    private readonly sessions: AdminSessions,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  async login(
    @Body() body: AdminLoginDto,
  ): Promise<ApiSuccess<AdminSessionInfo & { token: string }>> {
    const user = await this.db.adminUser.findUnique({
      where: { username: body.username },
    });
    // a wrong username costs the same hash as a wrong password
    const valid = await verifyPassword(
      body.password,
      user?.passwordHash ?? (await dummyHash()),
    );
    if (!user || !valid) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Wrong username or password.',
        code: 'ADMIN_LOGIN_FAILED',
      } satisfies ApiError);
    }

    const { token, expiresAt } = await this.sessions.start(user.id);
    return {
      status: 200,
      data: {
        token,
        username: user.username,
        expiresAt: expiresAt.toISOString(),
        idleMinutes: SESSION_IDLE_MS / 60_000,
      },
      message: 'Signed in.',
      code: 'ADMIN_SIGNED_IN',
    };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AdminSessionGuard)
  async logout(
    @CurrentAdmin() admin: AdminIdentity,
  ): Promise<ApiSuccess<null>> {
    await this.sessions.end(admin.sessionId);
    return {
      status: 200,
      data: null,
      message: 'Signed out.',
      code: 'ADMIN_SIGNED_OUT',
    };
  }

  @Get('session')
  @UseGuards(AdminSessionGuard)
  session(@CurrentAdmin() admin: AdminIdentity): ApiSuccess<AdminSessionInfo> {
    return {
      status: 200,
      data: {
        username: admin.username,
        expiresAt: admin.expiresAt.toISOString(),
        idleMinutes: SESSION_IDLE_MS / 60_000,
      },
      message: 'Signed in.',
      code: 'ADMIN_SESSION',
    };
  }
}
