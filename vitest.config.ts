import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'], // monolithic entry point — tested via integration
    },
    testTimeout: 5000,   // unit/schema tests
    hookTimeout: 10000,  // setup/teardown
    // Integration tests make real HTTP calls and need a longer timeout.
    // Override per-suite via: it('...', async () => { ... }, 30_000)
    // or run all integration tests with: npm run test:integration
  },
  projects: [
    {
      test: {
        include: ['tests/integration/**/*.test.ts'],
        testTimeout: 30000,  // real API calls can be slow
        hookTimeout: 30000,
      },
    },
  ],
});
