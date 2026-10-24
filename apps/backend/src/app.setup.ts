import { INestApplication } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './filters/prisma-client.filter.js';
import { ZodValidationExceptionFilter } from './filters/zod-validation.filter.js';
import { ZodValidationPipe } from './validation/zod-validation.pipe.js';

// Shared by main.ts and the e2e tests, so tests run the real app setup. No
// CORS: browsers never call the API, only the site's server does
export function configureApp(app: INestApplication) {
  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    new ZodValidationExceptionFilter(),
  );
}
