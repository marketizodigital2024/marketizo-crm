const CACHE_NAME = "marketizo-crm-20261023-codeks-r1";
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
  "styles.css?v=20261014-audit-fix-r7",
  "app.js?v=20261015-audit-fix-r12",
  "cost-calculation.js?v=20261008-repair",
  "client-portal.js?v=20261014-audit-fix-r7",
  "employee-portal.js?v=20261023-reports-r1",
  "remote-state.js?v=20261014-audit-fix-r7",
  "lib/state-patch.js?v=20261014-audit-fix-r7",
  "admin-auth.js?v=20261014-audit-fix-r7",
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
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("marketizo-crm-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Application data must always come from the server. Caching API responses
  // can make an installed PWA appear stale while an incognito tab looks current.
  if (requestUrl.pathname.startsWith("/api/") || /^\/(marketizo-sign|sign|kodeks)(?:\.html)?\/?$/.test(requestUrl.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate" || event.request.destination === "script" || event.request.destination === "style") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Navigations to .html URLs use a platform clean-URL redirect.
          // Its opaque redirect response has status 0 and must reach the browser.
          if (response.type === "opaqueredirect") return response;
          if (!response.ok) throw new Error("Static asset is unavailable");
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const path = requestUrl.pathname.replace(/^\//, "");
          if (event.request.mode === "navigate") {
            const page = !path ? "index.html" : path.includes(".") ? path : `${path}.html`;
            return (await caches.match(page)) || Response.error();
          }
          return Response.error();
        })
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


