import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts (whose `root` points at src/renderer for
// the Electron renderer build) so tests resolve from the project root.
export default defineConfig({
  test: {
    root: __dirname,
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node',
  },
});
