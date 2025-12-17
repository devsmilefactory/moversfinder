import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/utils/testing/testSetup.js'],
    include: ['src/**/__tests__/**/*.test.js', 'src/**/*.test.js'],
    exclude: ['node_modules', 'build'],
  },
});
