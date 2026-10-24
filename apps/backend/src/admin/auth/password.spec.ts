import { dummyHash, hashPassword, verifyPassword } from './password.js';

describe('hashPassword and verifyPassword', () => {
  it('verifies the right password and nothing else', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(hash).not.toContain('correct horse');
    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
    await expect(
      verifyPassword('correct horse battery stapl', hash),
    ).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects a malformed or tampered hash', async () => {
    const hash = await hashPassword('secret');
    const parts = hash.split('$');
    parts[5] = 'A'.repeat(parts[5]!.length);

    await expect(verifyPassword('secret', parts.join('$'))).resolves.toBe(
      false,
    );
    await expect(verifyPassword('secret', 'plain-text')).resolves.toBe(false);
  });

  it('has a dummy hash nothing matches, for unknown usernames', async () => {
    await expect(verifyPassword('', await dummyHash())).resolves.toBe(false);
  });
});
