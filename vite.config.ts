import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo>/.
  base: './',
  // three.js alone is ~550 kB minified; that's expected for this app.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
