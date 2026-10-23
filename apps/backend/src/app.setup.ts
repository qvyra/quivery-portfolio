import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { PrismaClientExceptionFilter } from './filters/prisma-client.filter.js';
import { ZodValidationExceptionFilter } from './filters/zod-validation.filter.js';
import type { Env } from './config/env.js';

// shared by main.ts and the e2e tests, so tests run the real app setup
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    new ZodValidationExceptionFilter(),
  );
}
