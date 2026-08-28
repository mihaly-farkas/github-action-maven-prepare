import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.spec.mts'],
    exclude: ['**/.local/**', '**/node_modules/**', '**/build/**', '**/dist/**'],
    tags: [
      {
        name: '@since-v0.1.0',
        description: 'Tests available since version v0.1.0.',
      },
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'html'],
      include: ['index.mts'],
      exclude: ['**/*.spec.mts', '**/.local/**', '**/node_modules/**', '**/build/**', '**/dist/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
