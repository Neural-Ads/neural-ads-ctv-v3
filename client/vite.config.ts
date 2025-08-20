import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    root: '.', // Explicitly set root to current directory
    base: '/',
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['axios'],
            router: ['react-router-dom']
          },
          // Clean filenames for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Enable CSS code splitting
      cssCodeSplit: true
    },
    server: { 
      port: 8081,
      host: '198.179.69.83',
      proxy: env.VITE_API_URL ? {
        '/api': env.VITE_API_URL,
        '/chat': env.VITE_API_URL,
        '/agent': env.VITE_API_URL,
        '/vector': env.VITE_API_URL
      } : {
        '/api': 'http://198.179.69.83:8000',
        '/chat': 'http://198.179.69.83:8000',
        '/agent': 'http://198.179.69.83:8000',
        '/vector': 'http://198.179.69.83:8000'
      }
    },
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || process.env.npm_package_version || 'dev'),
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'Neural Ads CTV Platform'),
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'axios', 'react-router-dom', 'buffer', 'crypto-browserify', 'stream-browserify']
    },
    // Environment variables configuration
    envPrefix: 'VITE_',
    // Preview configuration for production testing
    preview: {
      port: 4173,
      host: true
    },
    resolve: {
      alias: {
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer'
      }
    }
  }
})
