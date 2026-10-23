import type { ArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';
import { projectInputSchema } from '@repo/shared';
import { createZodDto } from './zod-dto.js';
import { ZodValidationException } from './zod-validation.exception.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

class ProjectInputDto extends createZodDto(projectInputSchema) {}
class LooseDto extends createZodDto(
  z.object({ name: z.string(), owner: z.object({ id: z.string() }) }),
) {}

const body = (metatype?: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
});

const project = {
  slug: 'geode',
  title: '  Geode  ',
  summary: 'Data service',
  releaseStatus: 'RELEASED',
  links: [{ label: 'Docs', url: 'https://example.com', type: 'documentation' }],
};

async function issuesOf(promise: Promise<unknown>) {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ZodValidationException);
  return (error as ZodValidationException).zodError.issues;
}

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();

  it('returns the parsed output for valid input, with defaults and trimming', async () => {
    const result = await pipe.transform(project, body(ProjectInputDto));

    expect(result).toMatchObject({
      title: 'Geode',
      publishStatus: 'DRAFT',
      visible: true,
    });
  });

  it('rejects unknown fields on a strict schema', async () => {
    const issues = await issuesOf(
      pipe.transform({ ...project, id: 'x' }, body(ProjectInputDto)),
    );

    expect(issues[0]).toMatchObject({
      code: 'unrecognized_keys',
      keys: ['id'],
    });
  });

  it('strips unknown fields on a plain schema, at every depth', async () => {
    const result = await pipe.transform(
      { name: 'a', isAdmin: true, owner: { id: '1', role: 'admin' } },
      body(LooseDto),
    );

    expect(result).toEqual({ name: 'a', owner: { id: '1' } });
  });

  it('rejects bad types with the path of the field', async () => {
    const issues = await issuesOf(
      pipe.transform({ ...project, title: 42 }, body(ProjectInputDto)),
    );

    expect(issues[0]?.path).toEqual(['title']);
  });

  it('checks nested objects too: unknown keys and bad values in a link', async () => {
    const unknownKey = await issuesOf(
      pipe.transform(
        { ...project, links: [{ ...project.links[0], clicks: 3 }] },
        body(ProjectInputDto),
      ),
    );
    const badUrl = await issuesOf(
      pipe.transform(
        { ...project, links: [{ ...project.links[0], url: 'javascript:x' }] },
        body(ProjectInputDto),
      ),
    );

    expect(unknownKey[0]).toMatchObject({
      path: ['links', 0],
      keys: ['clicks'],
    });
    expect(badUrl[0]?.path).toEqual(['links', 0, 'url']);
  });

  it('uses a schema passed to it over the parameter type', async () => {
    const slugOnly = new ZodValidationPipe(
      z.strictObject({ slug: z.string() }),
    );

    await expect(
      slugOnly.transform({ slug: 'a' }, body(ProjectInputDto)),
    ).resolves.toEqual({ slug: 'a' });
  });

  it('passes params without a schema through untouched', async () => {
    await expect(
      pipe.transform('geode', {
        type: 'param',
        metatype: String,
        data: 'slug',
      }),
    ).resolves.toBe('geode');
  });

  it('refuses a body without a schema', async () => {
    await expect(
      pipe.transform({ any: 'thing' }, body(Object)),
    ).rejects.toThrow('Request bodies need a Zod schema');
  });
});
