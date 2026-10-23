import { createHmac, hkdfSync } from 'node:crypto';
import { normalizeIp } from '@nestjs/throttler';

/**
 * A keyed hash of the sender's IP, so abuse from one address shows up without
 * storing the address. A plain hash of an IPv4 address can be reversed by
 * trying all 4 billion of them, a keyed one can't without the secret. IPv6
 * addresses are cut to their /64 first, since one connection gets a whole /64
 */
export function hashIp(ip: string, secret: string): string {
  const key = Buffer.from(
    hkdfSync('sha256', secret, '', 'contact-ip-hash', 32),
  );
  return createHmac('sha256', key).update(normalizeIp(ip)).digest('hex');
}
