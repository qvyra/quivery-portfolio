import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { ApiError, ApiSuccess } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // liveness only. Never touches the database, so uptime pings can't keep a
  // serverless Postgres awake
  @Get()
  check(): ApiSuccess<{ uptime: number }> {
    return {
      status: 200,
      data: { uptime: Math.round(process.uptime()) },
      message: 'Service is healthy!',
      code: 'HEALTH_OK',
    };
  }

  // readiness, meaning the API can serve content. Builds call this before
  // fetching, which also wakes a suspended database
  @Get('ready')
  async ready(): Promise<ApiSuccess<null>> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 503,
        message: 'The database is not reachable.',
        code: 'HEALTH_DATABASE_UNAVAILABLE',
      } satisfies ApiError);
    }
    return {
      status: 200,
      data: null,
      message: 'Service is ready!',
      code: 'HEALTH_READY',
    };
  }
}
