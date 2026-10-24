import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Tests that need a real, migrated Postgres (npm run test:db). They empty
// tables, so test/db/setup.ts refuses any DATABASE_URL that isn't local
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.db-spec.ts'],
    // one database, so files run one after another
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      WEB_ORIGIN: 'http://localhost:3000',
      REVALIDATE_SECRET: 'db-test-revalidate-secret-0123456789abc',
      CONTACT_API_SECRET: 'db-test-contact-secret-0123456789abcdef',
      ADMIN_API_SECRET: 'db-test-admin-secret-0123456789abcdefgh',
      // a dummy: fetch is mocked, nothing reaches GitHub
      GITHUB_DEPLOY_TOKEN: 'db-test-github-token-0123456789',
    },
  },
});
