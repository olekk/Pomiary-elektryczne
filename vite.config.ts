import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        '**/*.ttf',
      ], // <--- DODAJ **/*.ttf
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff2}'],
        maximumFileSizeToCacheInBytes: 3000000,
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
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString()),
  },
})
