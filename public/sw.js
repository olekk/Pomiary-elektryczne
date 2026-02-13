import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// ✅ Workbox precache — vite-plugin-pwa injects the manifest here automatically
precacheAndRoute(self.__WB_MANIFEST)

// Cache Google Fonts (CacheFirst — fonts rarely change)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// Cache local font files (CacheFirst)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'local-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// Cache images (CacheFirst with expiration)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
)

// Navigation requests — NetworkFirst (for SPA routing)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
)

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.skipWaiting()
self.clients.claim()
