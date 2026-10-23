import { botSignal, MIN_FILL_MS } from './spam.js';
import { hashIp } from './ip-hash.js';

describe('botSignal', () => {
  const human = { trap: '', elapsedMs: 45_000 };

  it('passes a person who took their time and left the trap empty', () => {
    expect(botSignal(human)).toBeNull();
  });

  it('catches a filled trap field, even with a slow submit', () => {
    expect(botSignal({ ...human, trap: 'https://spam.example' })).toBe('trap');
  });

  it('ignores whitespace in the trap, which some autofill adds', () => {
    expect(botSignal({ ...human, trap: '  ' })).toBeNull();
  });

  it('catches a submit faster than anyone types', () => {
    expect(botSignal({ ...human, elapsedMs: 800 })).toBe('too-fast');
    expect(botSignal({ ...human, elapsedMs: MIN_FILL_MS - 1 })).toBe(
      'too-fast',
    );
    expect(botSignal({ ...human, elapsedMs: MIN_FILL_MS })).toBeNull();
  });
});

describe('hashIp', () => {
  const secret = 's'.repeat(32);

  it('is stable for one address and never contains it', () => {
    const hash = hashIp('203.0.113.7', secret);
    expect(hash).toBe(hashIp('203.0.113.7', secret));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('203.0.113.7');
  });

  it('differs per address and per secret', () => {
    expect(hashIp('203.0.113.7', secret)).not.toBe(
      hashIp('203.0.113.8', secret),
    );
    expect(hashIp('203.0.113.7', secret)).not.toBe(
      hashIp('203.0.113.7', 't'.repeat(32)),
    );
  });

  it('treats one IPv6 /64 as one visitor', () => {
    expect(hashIp('2001:db8:1:2::1', secret)).toBe(
      hashIp('2001:db8:1:2:ffff::9', secret),
    );
    expect(hashIp('2001:db8:1:2::1', secret)).not.toBe(
      hashIp('2001:db8:1:3::1', secret),
    );
  });
});
