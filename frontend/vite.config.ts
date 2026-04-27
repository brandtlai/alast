import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    outDir: process.env.BUILD_TARGET === 'preview' ? 'dist-preview' : 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
