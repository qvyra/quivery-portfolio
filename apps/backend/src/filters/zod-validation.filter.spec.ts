import type { ArgumentsHost } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationException } from '../validation/zod-validation.exception.js';
import { ZodValidationExceptionFilter } from './zod-validation.filter.js';

function respond(error: z.ZodError) {
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;

  new ZodValidationExceptionFilter().catch(
    new ZodValidationException(error),
    host,
  );
  return { status: res.status.mock.calls[0], body: json.mock.calls[0]?.[0] };
}

describe('ZodValidationExceptionFilter', () => {
  it('answers 400 with every issue and a code named after the first field', () => {
    const schema = z.strictObject({
      links: z.array(z.strictObject({ url: z.url() })),
      title: z.string(),
    });
    const { error } = schema.safeParse({ links: [{ url: 'nope' }], title: 1 });

    const { status, body } = respond(error!);

    expect(status).toEqual([400]);
    expect(body).toEqual({
      status: 400,
      message:
        'links.0.url: Invalid URL;title: Invalid input: expected string, received number',
      code: 'VALIDATION_FAILURE_LINKS.0.URL',
    });
  });

  it('names an issue without a path "field"', () => {
    const { error } = z.strictObject({}).safeParse({ extra: 1 });

    expect(respond(error!).body).toEqual({
      status: 400,
      message: 'field: Unrecognized key: "extra"',
      code: 'VALIDATION_FAILURE_FIELD',
    });
  });
});
