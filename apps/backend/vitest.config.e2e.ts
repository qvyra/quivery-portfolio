import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // real process env wins over .env, so e2e runs never depend on a local one
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      WEB_ORIGIN: 'http://localhost:3000',
      CONTACT_API_SECRET: 'e2e-contact-secret-0123456789abcdef',
      // a dummy, and fetch is mocked in every test that could call it
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/0/e2e-dummy',
    },
  },
});
