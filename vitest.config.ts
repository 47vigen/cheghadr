import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/lib/**',
        'src/server/**',
        'src/types/**',
        'src/trpc/**',
        'src/hooks/**',
      ],
      exclude: [
        'src/modules/API/**',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // next-auth imports `next/server` without extension; Vitest/Node ESM needs the file URL
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
})
