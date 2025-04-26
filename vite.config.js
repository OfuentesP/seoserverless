import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      buffer: 'buffer',
      util: 'util',
      process: 'process/browser',
      events: 'events',
      timers: 'timers-browserify',
      '@': resolve(__dirname, 'src'),
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'events',
      'stream-browserify',
      'util',
      'timers-browserify'
    ]
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 🔥 corregido a 3000
        changeOrigin: true,
        secure: false,
      }
    }
  }
})