import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase':  ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'framer':    ['framer-motion'],
          'recharts':  ['recharts'],
          'gemini':    ['@google/generative-ai'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'framer-motion'],
  }
})