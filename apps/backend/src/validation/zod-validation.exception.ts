import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

// a 400 even without ZodValidationExceptionFilter, which shapes the response
export class ZodValidationException extends BadRequestException {
  constructor(readonly zodError: z.ZodError) {
    super('Validation failed.');
  }
}
