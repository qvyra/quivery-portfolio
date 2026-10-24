import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const scrypt = (
  password: string,
  salt: Buffer,
  length: number,
  options: ScryptOptions,
) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );

// OWASP's recommended scrypt cost. It needs 128 MB per hash, above Node's
// default 32 MB cap, hence maxmem
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const MAX_MEMORY = 256 * 1024 * 1024;
const KEY_LENGTH = 32;

/** scrypt$N$r$p$salt$key, so the cost can rise later without a migration */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEMORY,
  });
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, n, r, p, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await scrypt(
    password,
    Buffer.from(salt, 'base64url'),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    },
  );
  return timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;

/**
 * A hash to check against when the username doesn't exist, so a wrong
 * username takes as long as a wrong password and doesn't give itself away
 */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(16).toString('hex'));
  return dummy;
}
