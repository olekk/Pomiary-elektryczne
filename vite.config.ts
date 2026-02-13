import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        // Include font files in SW precache — required for offline PDF generation
        // @react-pdf/renderer fetches fonts via plain fetch(), not as font requests,
        // so runtime caching with request.destination === 'font' won't work
        globPatterns: ['**/*.{js,css,html,png,webmanifest,ttf}'],
      },
      manifest: {
        name: 'Pomiary Elektryczne',
        short_name: 'Pomiary',
        description: 'Aplikacja do pomiarów elektrycznych',
        theme_color: '#1e293b',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
          ],
          'vendor-ui': ['lucide-react', 'zustand', 'clsx', 'tailwind-merge'],
          'pdf-lib': ['@react-pdf/renderer'],
        },
      },
    },
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString()),
  },
})
