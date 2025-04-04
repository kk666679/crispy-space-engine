import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  // Base directory configuration
  root: process.cwd(),
  
  // Development server settings
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: true,
  },
  
  // Build options
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@assets': resolve(__dirname, './src/assets'),
    },
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    devSourcemap: true,
  },

  // Optimization settings
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },

  // Environment variables prefix
  envPrefix: 'APP_',
})
