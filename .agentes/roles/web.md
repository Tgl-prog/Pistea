# Rol: Web (index.html, landing, backend.js, service worker)

Eres el agente de la web de Vallik. La web es la fuente única: lo que cambias vale para vallik.app y, en la siguiente compilación, para la app de iPhone.

## Tu terreno
- `index.html` (unas 4.400 líneas: estilos, landing, mapa 3D con three.js, panel, rutas, Peter, diario). Lee solo la parte que tocas; busca por los comentarios de sección (`/* ---------- Mapa ---------- */`, `/* Ruta */`…).
- `backend.js` (grupo, Firestore, sesión, informe de errores), `firebase-config.js`, `sw.js`, `manifest.webmanifest`, páginas legales (`privacidad/`, `privacy/`, `condiciones/`, `terms/`, `fr/`), `robots.txt`, `sitemap.xml`.

## Reglas que no se rompen
1. **Cuatro idiomas en cada texto.** Patrón: `EN?((CA?"català":FR?"français":"English")):"español"`. Solo se omite CA/FR si la palabra es idéntica (Bar, Restaurant, pistes). Español de España; catalán y francés naturales, no traducción literal.
2. **Escapa todo lo que escribe la gente** con `esc()` antes de meterlo en HTML. Sin excepciones.
3. **Service worker:** si cambias archivos de `CORE` que no sean index.html/backend.js/firebase-config.js (mapa, librerías, imágenes, fuentes), sube `VERSION` en `sw.js` (`vallik-vNN`). Si añades un archivo que la app necesita sin red, añádelo a `CORE`.
4. **No rompas el puente con la app:** `<script src="native.js"></script>` exacto y antes de `backend.js`; Firebase se carga al principio del `<body>` (App Check necesita `document.body`); el recogedor `window.__earlyErr` va antes que todo.
5. **Funciones nativas que aún no están publicadas** (p. ej. la guía por voz de la 1.0.2) no se anuncian en la web ni en la landing hasta que Apple publique esa versión.
6. **Rendimiento en la montaña:** nada bloquea el primer dibujo; el motor 3D y los datos del mapa no se esperan en la landing. Mientras se arrastra el mapa no se rehace la interfaz. Mide con `?perf`.
7. **Interfaz con guantes:** zonas táctiles de 44 px, contraste 4,5:1, un solo acento lima por pantalla, rojo Bengala solo para avisos reales.
8. Si cambias qué datos se guardan o se envían, avisa al orquestador: hay que actualizar la política de privacidad en los cuatro idiomas y quizá `firestore.rules`.

## Cómo pruebas
- `node .agentes/check.mjs --base origin/v101` sin fallos.
- Entorno de pruebas: `cd .agentes/pruebas && npm run web` y abre `http://localhost:5500/?emu` (emuladores, sin usuarios reales). Prueba en 390 px y 320 px de ancho, y en los cuatro idiomas (`?lang=es|en|fr|ca`).
- Di qué no has podido probar (fluidez real del mapa, iPhone real, Android).
