# Pistea para iPhone

La app nativa es la misma web de la raíz del repo empaquetada con Capacitor, más dos cosas que la web no puede hacer:

- **GPS con el móvil bloqueado.** El plugin `@capacitor-community/background-geolocation` sigue enviando tu posición en directo con la pantalla apagada.
- **Envío en segundo plano.** Con la app en segundo plano, `native.js` manda la posición por HTTP nativo a la API REST de Firestore, porque la conexión de Firestore del navegador se duerme. Usa el mismo documento, los mismos campos y las mismas reglas.

La web sigue siendo la única fuente: lo que cambies en `index.html` vale para GitHub Pages y para la app.

## Necesitas

- Un Mac con Xcode 26 o posterior (Apple no acepta compilaciones de versiones anteriores) y Node 20 o posterior.

Sin Mac: GitHub → Actions → **iPhone a TestFlight** compila y sube la app sola (ver `.github/workflows/ios-testflight.yml`).
- Una cuenta de Apple Developer (para instalarla en iPhones de otros y repartirla por TestFlight).

## Compilar

```sh
cd app
npm install
npm run ios        # copia la web a www/, sincroniza el proyecto y lo abre en Xcode
```

En Xcode:

1. Selecciona el proyecto **App** y luego el target **App**. En **Signing & Capabilities**, elige tu equipo en **Team**.
2. El **Bundle Identifier** es `app.vallik`. No lo cambies: es el de la ficha en App Store Connect.
3. Elige tu iPhone o un simulador y pulsa ▶︎.

Para probar el directo en el simulador: **Features › Location › Freeway Drive** y bloquea la pantalla (⌘L).

## Repartirla al grupo con TestFlight

1. En Xcode: **Product › Archive** y después **Distribute App › App Store Connect › Upload**.
2. En App Store Connect, en la app y la pestaña **TestFlight**, añade a tus amigos como probadores. A los de fuera de tu equipo, Apple hace una revisión rápida la primera vez.
3. Cada uno instala TestFlight y acepta la invitación. Cada versión dura 90 días.

## Cada vez que cambie la web

```sh
cd app && npm run sync
```

Después, en Xcode, ▶︎ o un nuevo Archive.

## Detalles que conviene saber

- **Agente de usuario propio** (`overrideUserAgent` en `capacitor.config.json`). Con el de iPhone, Firebase Auth intenta cargar un iframe de inicio de sesión que en la app no responde, y el arranque se retrasa hasta un minuto. El acceso anónimo no lo necesita.
- **Clave de API de Firebase.** Si en Google Cloud la clave está limitada por dominio (HTTP referrer), la app no podrá conectarse. Tiene que estar sin restricción de dominio o limitada por API (Identity Toolkit, Token Service y Firestore).
- **Permiso «Siempre».** Antes del primer directo, la app explica por qué lo pide. Si alguien elige «Al usar la app», el directo funciona solo con Pistea abierta. Se cambia en **Ajustes › Pistea › Ubicación**.
- **Sin service worker.** La app ya lleva el mapa dentro, así que `sw.js` no se copia.
