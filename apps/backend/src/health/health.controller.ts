import { Controller, Get } from '@nestjs/common';
import type { ApiSuccess } from '@repo/shared';

@Controller('health')
export class HealthController {
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
}
