import { defineConfig } from 'vite'

export default defineConfig({
  base: '/photo/',
  build: {
    outDir: 'html/photo',
    emptyOutDir: true,
  },
})

