const CACHE_NAME = "marketizo-crm-v83";
const ASSETS = [
  "index.html",
  "client-login.html",
  "employee-login.html",
  "admin-login.html",
  "employees-overview.html",
  "employees-hours.html",
  "employees-absences.html",
  "employees-ratings.html",
  "employees-recognitions.html",
  "employees-goals.html",
  "employees-settings.html",
  "styles.css?v=78",
  "app.js?v=79",
  "client-portal.js?v=6",
  "employee-portal.js?v=64",
  "remote-state.js?v=7",
  "admin-auth.js?v=4",
  "marketizo-logo.png",
  "manifest.webmanifest",
  "employee-manifest.webmanifest",
  "icons/marketizo-180.png",
  "icons/marketizo-192.png",
  "icons/marketizo-512.png",
  "icons/marketizo-maskable-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate" || event.request.destination === "script" || event.request.destination === "style") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
