import type { z } from 'zod';

/** A class Nest can see at runtime, carrying the schema its values parse with */
export interface ZodDto<T extends z.ZodType = z.ZodType> {
  new (): z.output<T>;
  readonly schema: T;
}

/**
 * Attaches a schema to a handler parameter. The global ZodValidationPipe finds
 * it through the parameter's type, and the handler gets the parsed output:
 *
 *   class SlugParamsDto extends createZodDto(z.object({ slug: slugSchema })) {}
 *   getProject(@Param() params: SlugParamsDto)
 */
export function createZodDto<T extends z.ZodType>(schema: T): ZodDto<T> {
  class ZodDtoClass {
    static readonly schema = schema;
  }
  return ZodDtoClass as unknown as ZodDto<T>;
}

// duck typed, so a second copy of zod in node_modules can't break the check
export function isZodDto(metatype: unknown): metatype is ZodDto {
  if (typeof metatype !== 'function' || !('schema' in metatype)) return false;
  const schema = metatype.schema as { safeParseAsync?: unknown } | undefined;
  return typeof schema?.safeParseAsync === 'function';
}
