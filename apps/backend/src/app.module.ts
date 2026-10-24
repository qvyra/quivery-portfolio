import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module.js';
import { validateEnv } from './config/env.js';
import { ContactModule } from './contact/contact.module.js';
import { ContentModule } from './content/content.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // fails startup with a readable error if an env var is missing or invalid
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    ContentModule,
    ContactModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
