import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/*.integration.test.ts'],
    coverage: {
      include: ['src/utils/**'],
      // Browser-only modules (DOM toasts, PDF blob/download) can't run in the
      // node test environment; the barrel file has no statements of its own.
      exclude: [
        'src/utils/toast.ts',
        'src/utils/generatePdf.tsx',
        'src/utils/index.ts',
      ],
      thresholds: {
        statements: 90,
      },
    },
  },
})
