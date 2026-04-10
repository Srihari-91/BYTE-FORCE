import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/static/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/session': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/compare': 'http://127.0.0.1:8000',
      '/history': 'http://127.0.0.1:8000',
      '/conversation': 'http://127.0.0.1:8000',
      '/export': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
})
