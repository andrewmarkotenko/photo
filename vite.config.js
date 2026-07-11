import { defineConfig } from 'vite'

export default defineConfig({
  base: '/photo/',
  build: {
    outDir: 'html/photo',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Maps localized dynamic web views back to the express background daemon registry
      '/photo/api/live-data': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/photo/, '')
      }
    }
  }
})
