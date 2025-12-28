const CACHE_NAME = "dj1free-records-v8"; // sube el número cuando publiques cambios
const ASSETS = [
  "./",
  "index.html",
  "artistas.html",
  "artista.html",
  "album.html",
  "cancion.html",
  "css/style.css",
  "js/app.js",
  "catalog.json",
  "manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
