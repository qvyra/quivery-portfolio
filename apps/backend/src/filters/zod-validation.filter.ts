import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@repo/shared';

@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let message = 'Validation failed.';
    let code = 'VALIDATION_ERROR';
    const rawError = exception.getZodError();

    if (rawError instanceof ZodError) {
      message = rawError.issues
        .map((issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`)
        .join(';');

      const firstIssueField = rawError.issues[0]?.path.join('.') || 'FIELD';
      code = `VALIDATION_FAILURE_${firstIssueField.toUpperCase()}`;
    }

    res.status(HttpStatus.BAD_REQUEST).json({
      status: HttpStatus.BAD_REQUEST,
      message: message,
      code: code,
    } satisfies ApiError);
  }
}
