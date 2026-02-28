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
  },
});
