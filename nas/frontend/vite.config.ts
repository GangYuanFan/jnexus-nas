import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/nas/frontend/',
  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/nas/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/nas/icons': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/nas/manifest.json': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/nas/sw.js': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
