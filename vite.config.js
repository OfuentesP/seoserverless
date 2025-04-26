import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'esnext',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue': ['vue'],
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false
    }
  }
})
