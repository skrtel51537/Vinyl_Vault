import path from 'path';
import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the CSP/Tailwind plugins are not loaded for tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    // jsdom provides File, FileReader, Blob and document for the import/export code;
    // fake-indexeddb (loaded in the setup file) stands in for the browser's IndexedDB.
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
