import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ContactController } from './contact.controller.js';
import { CONTACT_RATE_LIMITS } from './contact.limits.js';
import { ContactService } from './contact.service.js';
import { DiscordNotifier } from './discord.js';

@Module({
  imports: [ThrottlerModule.forRoot([...CONTACT_RATE_LIMITS])],
  controllers: [ContactController],
  providers: [ContactService, DiscordNotifier],
})
export class ContactModule {}
