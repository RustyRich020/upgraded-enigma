import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    open: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    open: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: true,
    watch: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
