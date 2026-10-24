// Creates the admin account, or resets its password (`npm run admin:password`).
// There's no sign-up route: this is the only way an account comes to exist.
//
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run admin:password -w backend
//
// There's only ever one account, so other usernames are removed, and every
// session ends, since a new password should sign out everywhere. Nothing
// secret is printed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/admin/auth/password.js';

const input = z
  .object({
    ADMIN_USERNAME: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9_.-]{3,64}$/,
        'lowercase letters, numbers, . _ or -, 3 to 64',
      ),
    // long and random beats clever rules: 16+ characters
    ADMIN_PASSWORD: z.string().min(16, 'at least 16 characters').max(200),
    DATABASE_URL: z.url(),
  })
  .safeParse(process.env);

if (!input.success) {
  console.error(
    `Can't set the admin password:\n${z.prettifyError(input.error)}`,
  );
  process.exit(1);
}
const { ADMIN_USERNAME, ADMIN_PASSWORD, DATABASE_URL } = input.data;

const db = new PrismaClient({ adapter: new PrismaPg(DATABASE_URL) });
try {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.$transaction(async (tx) => {
    await tx.adminUser.deleteMany({
      where: { username: { not: ADMIN_USERNAME } },
    });
    const user = await tx.adminUser.upsert({
      where: { username: ADMIN_USERNAME },
      create: { username: ADMIN_USERNAME, passwordHash },
      update: { passwordHash },
    });
    await tx.adminSession.deleteMany({ where: { userId: user.id } });
  });
  console.log(
    `Admin account "${ADMIN_USERNAME}" is set. Every session was signed out.`,
  );
} finally {
  await db.$disconnect();
}
