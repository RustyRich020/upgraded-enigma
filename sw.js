const CACHE_NAME = 'jobsynk-v2.2.0';
const APP_SHELL = [
  '/', '/index.html', '/manifest.json',
  '/css/variables.css', '/css/base.css', '/css/layout.css',
  '/css/components.css', '/css/views.css', '/css/animations.css',
  '/css/responsive.css', '/css/themes/default.css', '/css/themes/dark.css',
  '/js/app.js', '/js/config.js', '/js/utils.js', '/js/state.js', '/js/router.js',
];
const CDN_CACHE = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API calls: network-first
  if (url.hostname.includes('api.') || url.hostname.includes('remotive') ||
      url.hostname.includes('generativelanguage') || url.hostname.includes('ntfy') ||
      url.hostname.includes('hunter') || url.hostname.includes('bls.gov')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // CDN: cache-first with background update
  if (CDN_CACHE.some(c => e.request.url.startsWith(c))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    })));
    return;
  }
  // App shell: cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
