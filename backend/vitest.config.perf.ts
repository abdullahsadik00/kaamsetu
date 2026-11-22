import { defineConfig } from 'vitest/config';

/** Speed check at pilot scale (T5.4). Not part of CI: run with `npm run test:perf`. */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.perf-spec.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
