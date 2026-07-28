const CACHE_NAME = "ps3d-workbench-v2.0.0-20260728b";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./favicon.svg",
  "./logo.png",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/engine.js",
  "./js/export.js",
  "./js/materials.js",
  "./js/shapes.js",
  "./js/storage.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response?.status === 200 && response.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return new Response("Offline and this resource is not cached.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});
