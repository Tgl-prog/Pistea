# Pistea

El mapa del grupo en la montaña: dónde está cada uno, por dónde bajar y cómo llegar. Mapa 3D de Les 3 Vallées con pistas y remontes de OpenStreetMap, ruta paso a paso hasta un amigo (con opción "sin negras"), sol y sombra, y un diario de las pistas del día.

Funciona en el navegador del móvil, se instala en la pantalla de inicio y abre sin cobertura una vez cargado.

## Puesta en marcha

1. Crea un proyecto en Firebase y activa Authentication (acceso anónimo) y Firestore. Pasos detallados en `PUESTA-EN-MARCHA.md`.
2. Pega los datos de tu app web en `firebase-config.js`.
3. Copia `firestore.rules` en la pestaña Reglas de Firestore y publícalas.
4. Sube esta carpeta a un repositorio de GitHub y activa GitHub Pages (Settings, Pages, rama `main`, carpeta `/ (root)`).

## Estructura

- `index.html`: toda la app (mapa, rutas, interfaz).
- `backend.js`: entrada al grupo y datos compartidos con Firestore.
- `firebase-config.js`: datos de tu proyecto de Firebase (no son secretos; la seguridad está en las reglas).
- `firestore.rules`: quién puede leer y escribir.
- `sw.js` y `manifest.webmanifest`: instalación y uso sin conexión.
- `mapdata.json`, `dem.json`, `relief.jpg`: pistas, remontes y relieve.
- `vendor/`: three.js, Firebase y la tipografía Geist, copiados en local para que la app no dependa de internet.

## Datos y licencias

Pistas y remontes: © colaboradores de OpenStreetMap (ODbL), vía OpenSkiMap. Relieve: Copernicus DEM GLO-30. Tipografía Geist: licencia SIL OFL. three.js: MIT. Firebase SDK: Apache 2.0.
