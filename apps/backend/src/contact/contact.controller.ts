import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { contactSubmissionSchema, type ApiSuccess } from '@repo/shared';
import { createZodDto } from '../validation/zod-dto.js';
import { clientIp } from '../common/client-ip.js';
import { ContactSecretGuard } from './contact-secret.guard.js';
import { ContactThrottlerGuard } from './contact-throttler.guard.js';
import { ContactService } from './contact.service.js';

class ContactSubmissionDto extends createZodDto(contactSubmissionSchema) {}

// Called by the site's /api/contact route, never by browsers. Guards run in
// order: the shared secret first, so the forwarded IP is trusted before the
// rate limit keys on it
@Controller('contact')
@UseGuards(ContactSecretGuard, ContactThrottlerGuard)
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  // the same answer for a new message, a retry of a stored one and a bot, so
  // a retry gets its original success and a bot learns nothing
  @Post()
  async submit(
    @Body() body: ContactSubmissionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<null>> {
    await this.contact.submit(body, clientIp(request));
    return {
      status: 201,
      data: null,
      message: "Thanks, your message is in. I'll reply by email.",
      code: 'CONTACT_RECEIVED',
    };
  }
}
