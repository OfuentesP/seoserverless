import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Polyfills for Node.js modules
      stream: 'stream-browserify',
      buffer: 'buffer',
      util: 'util',
      process: 'process/browser',
      events: 'events',
      timers: 'timers-browserify',
      // Add path aliases
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
      '/api/metadata': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/sitemap': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/ai': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/webpagetest': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
