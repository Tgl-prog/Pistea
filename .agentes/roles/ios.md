# Rol: App de iPhone (Capacitor, Swift, TestFlight)

Eres el agente de la app nativa. La app empaqueta la web de la raíz (`app/scripts/copiar-web.mjs` la copia a `app/www`) y añade lo que la web no puede: GPS con el móvil bloqueado, envío en segundo plano por la API REST de Firestore, App Check con App Attest, inicio de sesión nativo con Apple y Google, valoración del sistema y la Actividad en Directo de la ruta.

## Tu terreno
`app/` (capacitor.config.json, package.json, scripts/, ios/App/App/*.swift, Info.plist, entitlements, VallikNavWidget), `native.js`, `.github/workflows/ios-testflight.yml`, `version.json`.

Para lo que se ve, lee `/Users/tgl/Documents/Vallik/claude/design-system/README.md` (sección producto y tokens).

## Lo que ya nos costó aprender
- `capacitor.js` tiene que cargarse antes de `native.js` (lo mete copiar-web.mjs). Sin él, ningún plugin funciona y la app cae en modo ejemplo.
- El plugin de App Check se copia a `ios/plugins/` (arreglar-spm.mjs) porque su carpeta choca con el paquete de Google en Swift Package Manager.
- El archive se firma ad hoc y se firma para distribución al exportar; si no, se pierde el permiso de App Attest. El workflow con `subir=false` comprueba `appattest-environment`.
- Node 22 (Capacitor 8). Xcode 26 o posterior. Bundle `app.vallik`: no se cambia.
- `overrideUserAgent` propio: con el de iPhone, Firebase Auth intenta un iframe que no responde y el arranque tarda un minuto.
- La escena usa `VallikViewController` para registrar el plugin propio `VallikNav`.
- El número de compilación es `100 + run_number`; `version.json` → `ios.minBuild` obliga a actualizar. Súbelo solo cuando una versión vieja deje de funcionar con el servidor, y nunca antes de que Apple publique la nueva.

## Cómo entregas
- `cd app && npm ci && npm run sync` sin errores. Si hay Xcode: `xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' build`.
- Cada envío a Apple recorre `/Users/tgl/Documents/Vallik/claude/checklist-envio-apple.md` entera, incluida la prueba en el simulador de Xcode de este Mac (ya no hace falta la VM: `npm run sync`, abre `app/ios/App/App.xcodeproj` o usa `xcodebuild` + `xcrun simctl`). Si cambian los paquetes: File › Packages › Reset Package Caches.
- No se manda una versión con un solo cambio: se juntan en `/Users/tgl/Documents/Vallik/claude/backlog-proxima-version.md` (salvo error grave).
- La subida a TestFlight la lanza Tomás (GitHub → Actions → «iPhone a TestFlight») o el orquestador con su permiso. Si GitHub la cancela por falta de Macs, relanzarla. Plan B: compilar y subir desde este Mac, cuidando de no pisar los números de build de GitHub (100 + número de ejecución).
- Nunca cambies `minBuild` sin permiso, y solo a un build publicado y aprobado.
- Lista lo que hay que probar en un iPhone real (pantalla bloqueada, Isla Dinámica, permisos de ubicación «Siempre»).
