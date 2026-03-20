import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // next-auth imports `next/server` without extension; Vitest/Node ESM needs the file URL
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
})
