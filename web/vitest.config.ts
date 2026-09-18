import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      reportsDirectory: './node_modules/.tmp/coverage',
      include: [
        'src/hooks/useChat.ts',
        'src/components/Chat/Message.tsx',
        'src/components/Chat/EscalateButton.tsx',
        'src/components/Layout/ThemeToggle.tsx',
        'src/lib/theme.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
})
