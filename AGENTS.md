# AGENTS.md · Vallik

Guía para cualquier agente que trabaje en Vallik, y en especial para el **orquestador** que reparte el trabajo desde T3. Léela entera antes de tocar nada. Si algo de aquí choca con lo que ves en el código, gana el código: avisa y propón corregir este archivo.

## 1. Qué es Vallik

Vallik («Nadie baja solo.») es la app para que un grupo de amigos o una familia esquíe junto sin perderse en la estación: cada uno en el mapa 3D, rutas por pistas y remontes hasta un amigo o un bar, punto de encuentro, avisos, «Volver a casa» antes de que cierren los remontes, diario del día y **Peter**, el guía con IA que conoce la montaña. Hoy funciona en Les 3 Vallées, en español, inglés, francés y catalán. Es gratis.

- **Web:** https://vallik.app (GitHub Pages desde `main`; el repo es público: `Tgl-prog/Pistea`).
- **iPhone:** App Store, bundle `app.vallik`. La misma web empaquetada con Capacitor y plugins nativos.
- **Peter:** función de Vercel (`peter/`) que llama a Claude.
- **Datos:** Firebase `pistea-94bf0` (Auth, Firestore, App Check).
- **Pistea** es el nombre antiguo. Sigue en el repo, en variables (`PISTEA_*`) y en textos internos; no lo cambies salvo que te lo pidan. Hacia fuera, todo es Vallik.

**Personas.** Tomás es el dueño del producto y de la marca (comunicación y diseño, no programador): decide, prueba en su iPhone y aprueba lo que se publica. Juanjo hizo la primera versión y Peter. Hablamos siempre en español, claro y sin jerga; si hace falta un término técnico, se explica en una frase.

**Estado y calendario:** `.agentes/estado.md`. Léelo al empezar y actualízalo al terminar.

## 2. Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `index.html` | Toda la app y la landing: estilos, mapa 3D (three.js), panel, rutas, Peter, diario, textos en 4 idiomas. ~4.400 líneas. |
| `backend.js` | Grupo y datos con Firestore, sesión (anónima, Apple, Google), informe de errores. Sin config arranca en modo ejemplo. |
| `native.js` | Puente con la app de iPhone (GPS en segundo plano, App Check, inicio de sesión nativo, Actividad en Directo, valoración). En la web no hace nada. |
| `firebase-config.js` | Config pública de Firebase, URL de Peter e interruptores (`PISTEA_LOGIN`, `PISTEA_TTL`, `PISTEA_APPCHECK`). No hay secretos aquí: la seguridad está en las reglas. |
| `firestore.rules` | Quién lee y escribe qué, con validación de cada campo. |
| `sw.js` | Service worker: la web abre sin cobertura. `VERSION` = `vallik-vNN`. |
| `version.json` | `ios.minBuild`: obliga a actualizar la app. Se lee de vallik.app. |
| `mapdata.json`, `dem.json`, `pois.json`, `relief.webp` | Pistas y remontes (OpenStreetMap/OpenSkiMap, ODbL), relieve (Copernicus), bares y restaurantes. |
| `privacidad/`, `privacy/`, `condiciones/`, `terms/`, `fr/` | Páginas legales. |
| `web/` | Imágenes de la página promocional (solo web, no van a la app). |
| `app/` | Proyecto Capacitor de iPhone. `npm run sync` copia la web a `app/www` y prepara Xcode. Plugins Swift propios en `app/ios/App/App/VallikNav*`. |
| `peter/api/peter.js` | Peter (Vercel). |
| `.github/workflows/` | `comprobar.yml` (cada PR) e `ios-testflight.yml` (manual). |
| `.agentes/` | Todo lo de los agentes: roles, marca, comprobaciones, pruebas, estado, skills. No se publica en la web (Jekyll ignora carpetas con punto) ni va a la app. |

## 3. Cómo se trabaja (flujo de publicación)

**Ramas.** `main` es producción: lo que entra en `main` está en vallik.app en un par de minutos y llega a los móviles por el service worker. `v101` es la rama de trabajo de la próxima versión. Cada tarea va en su propia rama desde `v101` (`tarea/<nombre-corto>`), en su propio worktree.

1. **Tarea → rama → PR a `v101`.** Commits pequeños, en español, que describen lo que nota la persona que usa la app (ver §6).
2. **Comprobaciones en verde** (§5) y **revisión** del agente revisor. El orquestador resume a Tomás qué cambia y cómo probarlo.
3. **Merge a `v101`** cuando la revisión aprueba.
4. **Pasar a `main` (publicar en vallik.app) solo con el «sí» de Tomás**, como avance rápido de `v101`. Antes, mirar §4: lo nativo sin publicar no se anuncia en la web.
5. **App de iPhone:** Tomás (o el orquestador con su permiso) lanza GitHub → Actions → «iPhone a TestFlight». Después Tomás la prueba en su iPhone y la manda a revisión de Apple.

**Acciones que siempre piden permiso explícito de Tomás:** push a `main`, publicar reglas de Firestore, desplegar Peter en Vercel, lanzar TestFlight, cambiar `ios.minBuild`, tocar la consola de Firebase, Google Cloud, App Store Connect o Vercel, publicar contenido en redes, borrar ramas o datos.

## 4. Reglas de producto que no se rompen

- **Cuatro idiomas en todo texto visible.** Patrón: `EN?((CA?"català":FR?"français":"English")):"español"`. Español de España; catalán y francés naturales. Las páginas legales existen en ES, EN y FR.
- **Web y app comparten código.** Lo que cambias en la web llega a la app en la siguiente compilación. Lo que solo existe en una versión nativa que Apple aún no ha publicado (p. ej. la guía por voz de la 1.0.2) se oculta o no se anuncia en la web hasta entonces.
- **Hecha para la montaña:** sin cobertura la app abre y las escrituras esperan; con guantes, botones de 44 px; con mala red, nada bloquea el primer dibujo.
- **Privacidad:** a Peter solo le llega estación, hora, lugar y avisos, nunca nombres ni coordenadas del grupo. Nada de analítica de terceros. Si cambia qué se guarda o cuánto dura: reglas + política de privacidad (ES/EN/FR) + avisar a Tomás.
- **Seguridad:** todo lo que escribe la gente pasa por `esc()`. Ninguna clave privada en el repo (la de Anthropic solo en Vercel; las de Apple en los secretos de GitHub). La clave web de Firebase y la de reCAPTCHA son públicas por diseño.
- **No inventar datos:** ni estado de pistas, ni horarios, ni cifras de usuarios, ni testimonios. Fuente oficial visible (les3vallees.com).
- **Marca:** `.agentes/marca/BRAND.md` (Vallik) y `.agentes/marca/peter/BRAND.md` (Peter). Un solo acento lima por pantalla, Bengala solo para avisos reales, contraste 4,5:1, Geist y Geist Mono, voz de amigo que conoce la estación.

## 5. Comprobaciones antes de entregar

| Qué | Comando | Cuándo |
|---|---|---|
| Web: JS y JSON sin errores, 4 idiomas, `VERSION` del service worker, puente con la app, nada secreto | `node .agentes/check.mjs --base origin/v101` | Siempre |
| Reglas de Firestore con el emulador | `cd .agentes/pruebas && npm ci && npm run reglas` | Si cambian `firestore.rules` o los datos |
| App de iPhone | `cd app && npm ci && npm run sync` (y `xcodebuild … build` si hay Xcode) | Si cambian `app/`, `native.js` o el arranque |
| A ojo, en el entorno de pruebas | ver abajo | Si cambia algo visible |

GitHub Actions repite las dos primeras en cada PR (`comprobar.yml`). Un PR en rojo no se fusiona.

**Entorno de pruebas (sin usuarios reales).** `cd .agentes/pruebas && npm run web` arranca los emuladores de Firebase (Auth y Firestore, panel en http://localhost:4000) y la web en **http://localhost:5500/?emu**. Con `?emu` y solo en localhost, `backend.js` usa los emuladores. Sin service worker y sin caché. Peter no responde aquí (su servidor exige usuarios reales). Prueba a 390 px y 320 px, y con `?lang=es|en|fr|ca`. Para crear un grupo de varias personas, abre otra ventana privada.

**Herramientas en este Mac** (en `~/.local/bin`): Node 22, npm, Firebase CLI y Java 21 (para los emuladores). Xcode 27 está instalado. Si una terminal no los encuentra: `export PATH="$HOME/.local/bin:$PATH" JAVA_HOME="$HOME/.local/jdk/Contents/Home"`.

Al entregar, di siempre **qué no has podido probar** (iPhone real, pantalla bloqueada, fluidez del mapa, Android).

## 6. Convenciones

- **Commits en español**, en una línea que cuenta el efecto para quien usa la app, con prefijo cuando ayuda: `Web: …`, `1.0.2: …`, `iOS: …`, `TestFlight: …`, `Legal: …`, `Peter: …`, `Reglas: …`. Si hace falta, cuerpo con viñetas. Ejemplo real: «Ruta que avanza sola con el GPS, aviso de mucha gente, os espero arriba, cerrado en el mapa y K centrada».
- **Comentarios en el código en español**, explicando el porqué (como los que ya hay).
- **Sin dependencias nuevas** en la web: todo va en local (three.js, Firebase compat, Geist) para que funcione sin red. Firebase se actualiza en una rama propia y se prueba.
- **Interruptores** en `firebase-config.js` para lo que depende de la consola (como `PISTEA_TTL`).
- **Medidor:** `vallik.app/?perf` muestra fotogramas por segundo en el móvil.

## 7. Lecciones aprendidas (no repetir)

1. `capacitor.js` tiene que cargarse antes de `native.js`. Sin él no funcionaba ningún plugin nativo (`copiar-web.mjs` lo añade).
2. Los errores que pasan antes de `backend.js` se guardan en `window.__earlyErr` y se envían después; antes la app caía en modo ejemplo sin avisar.
3. App Check en la web (reCAPTCHA) necesita `document.body`: Firebase se carga al principio del `<body>`, no en `<head>`.
4. El plugin de App Check choca de nombre con el paquete de Google en Swift Package Manager: se copia a `ios/plugins` (`arreglar-spm.mjs`).
5. TestFlight: archive con firma ad hoc y firma de distribución al exportar, o se pierde App Attest. Node 22 para Capacitor 8. Xcode 26 o posterior.
6. El agente de usuario de iPhone hace que Firebase Auth espere un iframe que nunca responde: la app usa uno propio (`overrideUserAgent`).
7. El inicio de sesión de Google en ventana web no funciona dentro de apps: plugin nativo con `skipNativeAuth` y la sesión la abre el SDK web.
8. El borrado automático (`ttl`) exige el plan Blaze y publicar antes las reglas: se activó detrás de `PISTEA_TTL` y se quitó de la política hasta que fue real. Primero reglas y consola, luego código, luego la política.
9. GitHub Pages cachea 10 minutos: el service worker pide `index.html`, `backend.js` y `firebase-config.js` a la red (con 2,5 s de límite). El resto solo se renueva al subir `VERSION`.
10. La landing no puede esperar al motor 3D: con 4G malo pasó de 2,2 s a 0,9 s al dejar de esperarlo. Nada pesado antes del primer dibujo.
11. Rehacer la interfaz mientras se arrastra el mapa lo hace ir a tirones: se mide el mapa una vez por gesto.
12. Funciones de una versión nativa sin publicar no se anuncian en la web (la guía por voz esperó a la 1.0.2).
13. Tres nombres para el mismo botón de ayuda confundían: un solo nombre por acción.
14. Quitar a alguien no basta si guardó el código: existe «cambiar el código del grupo» y las reglas `movido`/`nuevo`.
15. Peter sin topes se podía gastar creando cuentas anónimas: límites por usuario, por conexión y diarios, y App Check.
16. Los botones de idioma y del pie medían 24 px: con guantes no se aciertan. 44 px.
17. Si `npm run sync` falla a medias deja `app/www` roto (quedó `app/.www_roto_*`): repetir `npm ci && npm run sync` desde cero.

## 8. Orquestación desde T3

### El orquestador
Es el hilo principal en T3, con Claude Opus. No escribe código salvo arreglos pequeños: entiende lo que pide Tomás, lo parte en tareas, las delega, revisa el resultado y se lo cuenta a Tomás en español claro. Mantiene `.agentes/estado.md`.

**Por cada petición:**
1. Leer `.agentes/estado.md` y lo que toque del código. Si la petición es ambigua o afecta a producción, preguntar a Tomás con una recomendación, no con una lista de opciones.
2. Plan corto: tareas, qué rol hace cada una, en qué orden, qué se puede hacer a la vez.
3. Delegar cada tarea con `delegate_task`, **modelo Claude Opus 5.5**, `isolation: "worktree"` desde `v101`. El encargo lleva: el rol (pegar o señalar `.agentes/roles/<rol>.md`), el objetivo en una frase, los archivos que puede tocar, qué no debe tocar, las comprobaciones que tiene que pasar y el formato de entrega (rama, commits, qué probó y qué no).
4. Cuando entrega, delegar una **revisión** nueva con el rol revisor (otro `delegate_task`, nunca el mismo hilo). Arreglos pequeños de la revisión los hace el orquestador.
5. Abrir el PR a `v101`, esperar a `comprobar.yml` en verde y explicarle a Tomás qué cambia, cómo probarlo (enlace a `localhost:5500/?emu` o TestFlight) y qué falta.
6. Publicar (`main`, TestFlight, reglas, Vercel) solo con su «sí».
7. Actualizar `.agentes/estado.md` y, si se aprendió algo, §7 de este archivo.

**Paralelo sí, choque no.** `index.html` es un único archivo enorme: **nunca dos agentes a la vez en `index.html`**. En paralelo sí: web + reglas, web + iPhone (si no tocan los mismos archivos), Peter, contenido, innovación. Si dos tareas necesitan `index.html`, van una detrás de otra, rebasando la segunda sobre la primera.

### Roles (`.agentes/roles/`)
| Rol | Archivo | Para qué |
|---|---|---|
| Web | `web.md` | index.html, landing, backend.js, service worker, páginas legales |
| iPhone | `ios.md` | Capacitor, Swift, native.js, TestFlight, `version.json` |
| Datos | `datos.md` | firestore.rules y sus pruebas, App Check, TTL, privacidad |
| Peter | `peter.md` | función de Vercel, voz y límites de Peter |
| Revisor | `revisor.md` | revisar cada entrega antes del PR |
| Creador de contenido | `contenido.md` | motion graphics, animación 3D, reels, carruseles, capturas, impresos; siempre con el libro de marca y las skills de `.agentes/skills/` |
| Innovador | `innovador.md` | tendencias, competencia y propuestas con fuentes; propone, no implementa |

Todos los agentes usan Claude Opus 5.5.

### Referencias de marca y negocio (privadas, en claude.ai)
- Libro de marca: https://claude.ai/artifact/8aZ2as26buGKuNBycw3rin (copia de sus BRAND.md en `.agentes/marca/`)
- Estrategia de marca 26/27: https://claude.ai/artifact/JMBU1r4Prz12ZCW4hMjKsQ
- Auditoría de seguridad, UX, fluidez, legal y SEO (21 nov): https://claude.ai/artifact/QKBuY8azww4ompTabrTCFG
- Sistema visual: https://claude.ai/artifact/VCE4vhVUFWeP763Gom2H1b · Sistema de marca: https://claude.ai/artifact/Crm4DSb41S7GyADCwY9ZvD
- Plan de Instagram: https://claude.ai/artifact/BzT6kny9rn5AW14xdVoRpL · Primeras 9: https://claude.ai/artifact/Pb6PsQZzKq4SSEWbHGpJg1 · Pegatinas: https://claude.ai/artifact/9NsgyCTAY2S4GzetykAZ4w
- Envío al App Store: https://claude.ai/artifact/DmPgGzbYGsvZU9gKvzaYat · Plan de negocio para estaciones: https://claude.ai/artifact/1iy2jUumLTZs4okMiCHB8K · Presentación ejecutiva: https://claude.ai/artifact/QgUTZFD1bZJVXsUNYNowwP
