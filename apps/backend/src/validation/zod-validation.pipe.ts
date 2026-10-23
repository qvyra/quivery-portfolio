import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import type { z } from 'zod';
import { isZodDto } from './zod-dto.js';
import { ZodValidationException } from './zod-validation.exception.js';

/**
 * Parses handler parameters with their Zod schema: the one passed here, or the
 * one on the parameter's createZodDto class. Handlers only ever get the parsed
 * output, so a key the schema doesn't list never reaches them. Strict schemas,
 * like the input schemas in @repo/shared, reject it, plain ones strip it
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  // for one-off use: @Body(new ZodValidationPipe(statInputSchema))
  constructor(private readonly schema?: z.ZodType) {}

  async transform(value: unknown, metadata: ArgumentMetadata) {
    const schema =
      this.schema ??
      (isZodDto(metadata.metatype) ? metadata.metatype.schema : undefined);

    if (!schema) {
      // a body nothing validates would hand the handler whatever the client
      // sent, which is how mass assignment happens
      if (metadata.type === 'body') {
        throw new Error(
          'Request bodies need a Zod schema: type the parameter with a createZodDto class or pass the schema to ZodValidationPipe',
        );
      }
      return value;
    }

    const result = await schema.safeParseAsync(value);
    if (!result.success) throw new ZodValidationException(result.error);
    return result.data;
  }
}
