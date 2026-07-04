// Nila service worker. Hand-rolled (no Workbox) so it stays small, legible, and
// friendly to Turbopack. It never touches health data: Supabase and /api are
// always network-only, so nothing encrypted or personal is ever cached here.
//
// Strategy:
//   - App shell routes + offline page: precached at install, served
//     network-first so the user gets fresh HTML online and a real page offline.
//   - Static build assets (/_next/static, icons, fonts, splash): cache-first,
//     they are content-hashed and immutable.
//   - Everything cross-origin, non-GET, Supabase, or /api: untouched (network).
//
// Bump CACHE_VERSION on any shell/asset change to retire the old caches.
const CACHE_VERSION = 'nila-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const OFFLINE_URL = '/offline';

// The route shells worth having ready before the first offline moment.
const PRECACHE_URLS = [
  '/',
  '/home',
  '/calendar',
  '/insights',
  '/journal',
  '/settings',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Best-effort: one missing URL must not fail the whole install.
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept another origin, Supabase, or our own API routes.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Static, content-hashed assets: cache-first, then fill the cache.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigations (and other same-origin GETs): network-first, fall back to the
  // cached shell for this route, then to the offline page.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (
            (await caches.match(OFFLINE_URL)) ||
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      })
  );
});

// Let the page tell a waiting worker to take over immediately after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nila', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'nila',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/home';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(target);
    })
  );
});
