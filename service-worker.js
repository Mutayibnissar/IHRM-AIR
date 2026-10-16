/* IHRM Air offline app shell — versioned cache, GitHub Pages safe. */
'use strict';
const CACHE_NAME = 'ihrm-air-shell-v6';
const BASE_PATH = new URL('./', self.registration.scope).pathname;
const APP_SHELL = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'units.html',
  BASE_PATH + 'practice.html',
  BASE_PATH + 'tools.html',
  BASE_PATH + 'planner.html',
  BASE_PATH + 'tracker.html',
  BASE_PATH + 'backup.html',
  BASE_PATH + 'references.html',
  BASE_PATH + 'agents.html',
  BASE_PATH + 'assets/agent-workspace.js',
  BASE_PATH + 'offline.html',
  BASE_PATH + 'assets/ihrm-refresh.js',
  BASE_PATH + 'assets/ihrm-refresh.css',
  BASE_PATH + 'assets/icon.svg',
  BASE_PATH + 'manifest.webmanifest',
  BASE_PATH + 'data/question-bank.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ihrm-air-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(BASE_PATH + 'offline.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
