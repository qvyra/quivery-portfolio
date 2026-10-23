import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import type { ApiError } from '@repo/shared';
import { ZodValidationException } from '../validation/zod-validation.exception.js';

@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const { issues } = exception.zodError;

    const message = issues
      .map((issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`)
      .join(';');

    const firstIssueField = issues[0]?.path.join('.') || 'FIELD';
    const code = `VALIDATION_FAILURE_${firstIssueField.toUpperCase()}`;

    res.status(HttpStatus.BAD_REQUEST).json({
      status: HttpStatus.BAD_REQUEST,
      message: message,
      code: code,
    } satisfies ApiError);
  }
}
