const CACHE_NAME = "marketizo-crm-v2";
const ASSETS = [
  "index.html",
  "client-login.html",
  "employee-login.html",
  "admin-login.html",
  "styles.css",
  "app.js",
  "client-portal.js",
  "employee-portal.js",
  "admin-auth.js",
  "marketizo-logo.png",
  "manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
