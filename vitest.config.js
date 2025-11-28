import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js']
    }
  }
})
