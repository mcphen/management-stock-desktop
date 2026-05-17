import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Vite gère uniquement le renderer (Vue 3)
// Le main process Electron est compilé séparément par tsc
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  base: process.env['VITE_DEV_SERVER_URL'] ? '/' : './',
})
