/* Pistea · service worker: la app y el mapa se guardan en el móvil y abren sin cobertura. */
const VERSION = "pistea-v4";
const CORE = [
  "./", "index.html", "manifest.webmanifest", "backend.js", "firebase-config.js",
  "mapdata.json", "dem.json", "relief.jpg",
  "three.min.js", "LineSegmentsGeometry.js", "LineMaterial.js", "LineSegments2.js",
  "firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js",
  "Geist-Variable.woff2", "GeistMono-Variable.woff2",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-32.png", "icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;       // Firebase y el resto de la red van directos
  // Primero la red para la propia app (para ver las novedades), con la copia guardada como respaldo.
  // Los archivos grandes del mapa salen de la copia y se refrescan en segundo plano.
  const big = /\.(json|jpg|woff2|png)$/.test(url.pathname);
  if (big) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then(hit => hit || caches.match("./"))));
  }
});
