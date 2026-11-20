/* Pistea · service worker: la app y el mapa se guardan en el móvil y abren sin cobertura.
 *
 * Todo sale de la copia guardada (caché primero). Solo se vuelve a descargar todo al cambiar VERSION:
 * súbela en cada despliegue que toque el mapa, las librerías o cualquier archivo de CORE.
 *
 * Excepción: la página y los dos scripts propios pequeños (index.html, backend.js, firebase-config.js)
 * van primero a la red con un límite de 2,5 s. Así un despliegue nuevo llega en cuanto hay cobertura,
 * aunque se olvide subir VERSION, y con mala señal la app abre igual desde la copia. Si la red llega
 * tarde, la respuesta se guarda igualmente para la próxima vez.
 */
const VERSION = "vallik-v13";
const CORE = [
  "./", "index.html", "manifest.webmanifest", "backend.js", "native.js", "firebase-config.js",
  "mapdata.json", "pois.json", "dem.json", "relief.jpg",
  "three.min.js", "LineSegmentsGeometry.js", "LineMaterial.js", "LineSegments2.js",
  "firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js",
  "Geist-Variable.woff2", "GeistMono-Variable.woff2",
  "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "favicon-32.png", "icon.svg"
];
const FRESH = /\/(index\.html|backend\.js|firebase-config\.js)?$/;   // la página y los scripts propios
const NET_MS = 2500;

self.addEventListener("install", e => {
  // cache: "reload" salta la caché HTTP del navegador para no guardar copias viejas
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function save(req, r) { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;       // Firebase y el resto de la red van directos
  const nav = req.mode === "navigate";
  const cached = () => caches.match(req, { ignoreSearch: true }).then(hit => hit || (nav ? caches.match("./") : undefined));

  if (nav || FRESH.test(url.pathname)) {
    // Red con límite de tiempo; si no llega, la copia guardada.
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => cached().then(hit => { if (hit && !done) { done = true; resolve(hit); } return hit; });
      const timer = setTimeout(fallback, NET_MS);
      fetch(req).then(r => {
        save(req, r); clearTimeout(timer);
        if (!done) { done = true; resolve(r); }
      }).catch(() => {
        clearTimeout(timer);
        fallback().then(hit => { if (!done) { done = true; resolve(hit || Response.error()); } });
      });
    }));
    return;
  }
  // Todo lo demás (librerías, mapa, relieve, fuentes, iconos): caché primero, sin volver a descargar.
  e.respondWith(cached().then(hit => hit || fetch(req).then(r => save(req, r))));
});
