import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // The app tsconfig uses Next.js's `jsx: "preserve"`. Vitest (Vite 8 /
  // rolldown) must transform JSX itself when it imports `.tsx` components.
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
