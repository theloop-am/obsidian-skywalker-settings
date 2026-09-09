import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/* `obsidian` has no runtime outside the app, so tests resolve it to a stub -
   one stub for the suite, the way Notebook Navigator does it. */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^obsidian$/,
        replacement: fileURLToPath(new URL('./tests/stubs/obsidian.ts', import.meta.url)),
      },
    ],
  },
  test: {
    allowOnly: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 85 },
    },
    /* Everything this plugin does is drawn into real elements, so the suite needs
       a document. */
    environment: 'jsdom',
    /* What the browser has and jsdom does not, in one place. */
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
