import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      },
      external: [
        'playwright',
        'puppeteer',
        'sitemap',
        'sitemap-validator',
        'xml2js',
        'webpagetest',
        'stream',
        'util',
        'buffer',
        'events',
        'timers',
        'process'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      'playwright',
      'puppeteer',
      'sitemap',
      'sitemap-validator',
      'xml2js',
      'webpagetest'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
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
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})