import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.spec.mts'],
    exclude: ['**/.local/**', '**/node_modules/**', '**/build/**', '**/dist/**'],
  },
});
