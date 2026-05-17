const CACHE_NAME = 'notebookmd-v2'

const BASE = self.registration ? self.registration.scope : '/'

const APP_SHELL = [BASE, BASE + 'index.html', BASE + 'manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => cache.add(BASE))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  // Only cache GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network fetch for cache update (clone request to avoid "already read" error)
      const networkFetch = fetch(event.request.clone()).then((response) => {
        if (response.ok && response.status < 400) {
          // Clone response before putting in cache — original is returned to browser
          const toCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache)).catch(() => {})
        }
        return response
      }).catch(() => cached) // fall back to cache on network error

      // Cache-first for app shell, network-first for others
      if (cached) {
        // Return cache immediately and update in background
        networkFetch.catch(() => {}) // fire and forget
        return cached
      }
      return networkFetch
    })
  )
})
