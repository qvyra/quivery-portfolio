import { validateEnv } from './env.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/portfolio';

describe('validateEnv', () => {
  it('applies development defaults', () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 5005,
      DATABASE_URL,
      WEB_ORIGIN: 'http://localhost:3000',
    });
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('normalizes WEB_ORIGIN to a bare origin', () => {
    const env = validateEnv({
      DATABASE_URL,
      WEB_ORIGIN: 'https://quivery.dev/some/path/',
    });
    expect(env.WEB_ORIGIN).toBe('https://quivery.dev');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('requires WEB_ORIGIN in production', () => {
    expect(() => validateEnv({ DATABASE_URL, NODE_ENV: 'production' })).toThrow(
      /WEB_ORIGIN/,
    );
  });

  it('requires a REVALIDATE_SECRET of 32+ characters in production', () => {
    const production = {
      DATABASE_URL,
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://quivery.dev',
    };
    expect(() => validateEnv(production)).toThrow(/REVALIDATE_SECRET/);
    expect(() =>
      validateEnv({ ...production, REVALIDATE_SECRET: 'too-short' }),
    ).toThrow(/REVALIDATE_SECRET/);
    expect(
      validateEnv({ ...production, REVALIDATE_SECRET: 'x'.repeat(32) })
        .REVALIDATE_SECRET,
    ).toHaveLength(32);
  });
});
