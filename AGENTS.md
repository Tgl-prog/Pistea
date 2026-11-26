# AGENTS.md · Vallik

Guía para cualquier agente que trabaje en Vallik, y en especial para el **orquestador** que reparte el trabajo desde T3. Léela entera antes de tocar nada. Si algo de aquí choca con lo que ves en el código o en los documentos del proyecto, avisa y propón corregir este archivo.

## 0. Antes de empezar: los documentos del proyecto

Los documentos viven **fuera del repo**, en `~/Documents/Vallik/claude/` (ruta absoluta: `/Users/tgl/Documents/Vallik/claude/`). Orden de lectura:

1. `README.md`: el índice.
2. `estado.md`: qué está publicado, qué está en revisión en Apple, qué pieza es la buena y las próximas fechas. **Es la fuente de verdad del estado.**
3. Según la tarea:
   - `proceso-publicacion.md`: reglas para publicar.
   - `checklist-envio-apple.md`: cada envío a Apple.
   - `backlog-proxima-version.md`: lo que entra en la siguiente versión.
   - `checklist-legal-y-calidad.md`: legal, seguridad y operación.
   - `brand/BRAND.md` y `brand/peter/BRAND.md`: marca.
   - `sistema-visual-y-videos.md` y `para-la-app-degradado-y-huella.md`: sistema visual, vídeos y K.
   - `reels/README.md`: plantillas de reels.
   - `business-plan-brief.md`: negocio.

**Reglas de esos documentos:**
- **La carpeta del Mac es la oficial** (decisión de Tomás, 26/11). Los agentes leen y escriben aquí y no hay que copiar nada a claude.ai. El proyecto «Vallik» de claude.ai queda como apoyo: si Tomás quiere usarlo, sube allí los archivos que necesite. Si un agente cambia algo en `claude/`, el orquestador lo dice en su resumen. Si notas que algo de `claude/` contradice al repo, pregunta cuál vale; no lo resuelvas por tu cuenta.
- **`claude/legal/rat-y-eipd.md` y `business-plan-brief.md` son internos.** Nunca se copian al repo, ni se citan en commits, PR o issues. El repo es público porque vallik.app se publica desde él. `.gitignore` y `.agentes/check.mjs` lo vigilan.
- **Lo que no está en `claude/`:** el código de los reels (`VallikReel.tsx`) y los scripts de Blender del teaser se bajan desde el proyecto de claude.ai. No se copian a mano: si hacen falta, pídeselos a Tomás. Los diseños son artifacts de claude.ai (enlaces en `README.md`) y solo se abren con la cuenta de Tomás.

## 1. Qué es Vallik

Vallik («Todo el valle. Todo el grupo.») es la app para que un grupo de amigos o una familia esquíe junto sin perderse en la estación. Incluye:
- cada uno en el mapa 3D;
- rutas por pistas y remontes hasta un amigo o un bar;
- punto de encuentro y avisos;
- «Volver a casa» antes de que cierren los remontes;
- diario del día;
- guía por voz y Actividad en Directo;
- **Peter**, el guía con IA que conoce la montaña.

Hoy funciona en Les 3 Vallées, en español, inglés, francés y catalán. Es gratis y **no es la app oficial de la estación**.

**Dónde vive cada parte:**
- **Web:** https://vallik.app. GitHub Pages publica desde `main`. El repo `Tgl-prog/Pistea` es **público**.
- **iPhone:** App Store, bundle `app.vallik`, id 6838083819. Es la misma web empaquetada con Capacitor 8, más plugins nativos.
- **Peter:** función de Vercel en `peter/`. **Vercel la publica desde `main`.**
- **Datos:** Firebase `pistea-94bf0` (Auth, Firestore en eur3, App Check).
- **Android:** solo la web. Google Play está aparcado.

**Pistea** es el nombre antiguo. Sigue en el repo, en variables (`PISTEA_*`) y en textos internos: no lo cambies salvo que te lo pidan. Hacia fuera, todo es Vallik.

**Personas.** Tomás decide el producto y la marca: trabaja en comunicación y diseño, no programa. Prueba en su iPhone y es quien dice «publícalo». Juanjo hizo la primera versión y Peter. Con Tomás se habla en español de España, claro y sin jerga. Si hace falta un término técnico, se explica en una frase. Las decisiones se le plantean como pregunta con una recomendación.

## 2. Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `index.html` | Toda la app y la landing: estilos, mapa 3D (three.js), panel, rutas, Peter, diario y textos en 4 idiomas. Unas 4.400 líneas. |
| `backend.js` | Grupo y datos con Firestore, sesión (anónima, Apple o Google) e informe de errores. Sin configuración, arranca en modo ejemplo. |
| `native.js` | Puente con la app de iPhone: GPS en segundo plano, App Check, inicio de sesión nativo, Actividad en Directo y valoración. En la web no hace nada. |
| `firebase-config.js` | Configuración pública de Firebase, URL de Peter e interruptores (`PISTEA_LOGIN`, `PISTEA_TTL`, `PISTEA_APPCHECK`). Aquí no hay secretos. |
| `firestore.rules` | Quién lee y escribe qué, con validación de cada campo. Tomás las pega en la consola. |
| `sw.js` | Service worker: la web abre sin cobertura. `VERSION` = `vallik-vNN`. |
| `version.json` | `ios.minBuild`: obliga a actualizar la app. Se lee de vallik.app. |
| `mapdata.json`, `dem.json`, `pois.json`, `relief.webp` | Pistas y remontes (OpenStreetMap, ODbL), relieve (Copernicus), bares y restaurantes. |
| `privacidad/`, `privacy/`, `condiciones/`, `terms/`, `fr/` | Páginas legales en ES, EN y FR. |
| `web/` | Imágenes de la página promocional. Solo web: no van a la app. |
| `app/` | Proyecto de iPhone. `npm run sync` copia la web a `app/www`. Los plugins Swift propios están en `app/ios/App/App/VallikNav*` y el icono en `app/ios/App/App/AppIcon.icon`. |
| `peter/api/peter.js` | Peter (Vercel). |
| `.github/workflows/` | `comprobar.yml` (cada PR) e `ios-testflight.yml` (manual). |
| `.agentes/` | Lo de los agentes: roles, comprobaciones, pruebas, servidor local y skills. No se publica en la web ni va a la app. |

Fuera del repo, en `~/Documents/Vallik/`, están `claude/` (documentos), `icono/` (copia de trabajo del icono en Icon Composer) y `capturas-app-store/`.

## 3. Cómo publicamos

Resumen de `claude/proceso-publicacion.md`. Si hay duda, manda ese documento.

**Ramas.**
- `main` es lo publicado: lo que entra en `main` está en vallik.app en un par de minutos, llega a los móviles por el service worker y, si toca `peter/`, **Vercel publica Peter**.
- `v101` es la rama de trabajo.
- Cada tarea va en su propia rama desde `v101` (`tarea/<nombre-corto>`), en su propio worktree.

**Pasos:**
1. **Tarea → rama → PR a `v101`.** Commits pequeños, en español, que cuentan lo que nota quien usa la app (ver §6).
2. **Comprobaciones en verde** (§5) y **revisión** del agente revisor, que mira capacidad (lecturas y escrituras de Firestore, tope de Peter), seguridad (claves, reglas, App Check) y privacidad.
3. **Merge a `v101`** cuando la revisión aprueba.
4. **A `main` solo con un «publícalo» explícito de Tomás.** Vale también para un arreglo que surja después de un «publícalo» anterior. Se publica con un avance rápido de `v101`.
5. **Después de publicar,** se prueba en vallik.app de verdad, no solo en local; algunos fallos solo aparecen en el dominio real. Se comprueba que la `VERSION` del service worker cambió en vivo y se le dice a Tomás qué queda pendiente y qué riesgos hay.

**Reglas de orden:**
- **Servidor antes que cliente.** Si la app empieza a mandar algo nuevo a Peter, primero se publica Peter y se comprueba en vivo. Después, la web.
- **Reglas de Firestore antes que la app que las usa.** Tomás las pega en la consola. Tienen que ser compatibles con la versión de la app que ya está en la tienda.
- **Colección nueva:** borrado automático (TTL) activado con Cloud Shell.
- **Cada dato nuevo que la app guarde o envíe** obliga, en la misma tarea, a actualizar la política de privacidad (ES/EN/FR) **y** las etiquetas de privacidad de Apple en App Store Connect.

**App de iPhone:**
- La app lleva la web dentro: cada cambio de la web necesita un build nuevo de TestFlight para llegar a la app.
- No se mandan versiones con un solo cambio: se juntan en `claude/backlog-proxima-version.md`. Excepción: un error grave.
- Cada envío sigue `claude/checklist-envio-apple.md` entera, incluida la prueba en el simulador de Xcode de este Mac (§5). Las capturas del App Store se preparan **antes** de enviar a revisión.
- Publicación manual: Apple aprueba y Tomás lanza.
- `ios.minBuild` sube solo a un build **publicado y aprobado** en la App Store.
- Al probar, nunca salir del grupo de Apple Review; el código está en la checklist.

**Siempre con permiso explícito de Tomás:**
- Push a `main`.
- Lanzar TestFlight y subir `minBuild`.
- Tocar la consola de Firebase, Google Cloud, App Store Connect o Vercel.
- Activar el bloqueo de App Check.
- Publicar en redes.
- Borrar ramas o datos.

## 4. Reglas de producto que no se rompen

- **Cuatro idiomas en todo texto visible.** Patrón: `EN?((CA?"català":FR?"français":"English")):"español"`. Español de España, sin giros rioplatenses. Catalán y francés naturales.
- **Textos:**
  - No presentar Vallik como app de la estación ni decir «el mapa de Les 3 Vallées en directo». La fórmula es «Esta temporada, en Les 3 Vallées. Vallik no es una app oficial de la estación.».
  - Se dice «Temporada 26/27».
  - Peter se presenta como «Tu guía de esquí con IA» (AI Act).
- **Funciones nativas sin publicar:** lo que solo trae una versión que Apple aún no ha publicado no se anuncia en la web hasta entonces. Por ejemplo, la frase de la guía por voz vuelve a la web cuando salga la 1.0.2.
- **Hecha para la montaña:**
  - sin cobertura, la app abre y las escrituras esperan;
  - botones de 44 px, porque se usa con guantes;
  - con mala red, nada bloquea el primer dibujo.
- **Privacidad:**
  - a Peter solo le llegan estación, hora, lugar y avisos; nunca nombres ni coordenadas del grupo;
  - sin analítica, publicidad ni cookies de seguimiento;
  - datos mínimos y con TTL;
  - informe de errores sin datos personales.
- **Seguridad:**
  - todo lo que escribe la gente pasa por `esc()`;
  - ninguna clave privada en el repo: la de Anthropic está solo en Vercel y las de Apple en los secretos de GitHub;
  - la clave web de Firebase y la de reCAPTCHA son públicas por diseño.
- **No inventar datos:** ni estado de pistas, ni horarios, ni cifras de usuarios, ni testimonios. La fuente oficial (les3vallees.com) se muestra.
- **Marca:** `claude/brand/BRAND.md`. Geometría de la K vigente desde el 25/11:
  - huella con trazo 5,5 como **recorte (máscara)**, no como trazo de color;
  - cuña lima `56,65.114 66,54.432 88,84 67,84`.

  Además:
  - un solo acento lima por pantalla;
  - Bengala solo para avisos reales, y encima de Bengala el texto va en Alpino;
  - contraste mínimo de 4,5:1;
  - Geist y Geist Mono;
  - fondos a pantalla completa con el degradado «Cielo de altura».
- **Cuando cambia algo que se ve** (icono, logo, landing, pantallas), en la misma tarea se actualizan las capturas del App Store, la pantalla de arranque (Splash.imageset), og.png, los iconos de la web y la K de la landing y de las páginas legales. Y se avisa a Tomás para Instagram.

## 5. Comprobaciones antes de entregar

| Qué | Comando | Cuándo |
|---|---|---|
| Web: JS y JSON sin errores, 4 idiomas, `VERSION` del service worker, puente con la app, nada secreto ni interno | `node .agentes/check.mjs --base origin/v101` | Siempre |
| Reglas de Firestore con el emulador | `cd .agentes/pruebas && npm ci && npm run reglas` | Si cambian `firestore.rules` o los datos |
| App de iPhone | `cd app && npm ci && npm run sync`, y compilar y abrir en el simulador de Xcode de este Mac | Si cambian `app/`, `native.js`, el arranque o lo que se ve |
| A ojo, en el entorno de pruebas | ver abajo | Si cambia algo visible |

GitHub Actions repite las dos primeras en cada PR (`comprobar.yml`). Un PR en rojo no se fusiona.

**Entorno de pruebas (sin usuarios reales).**
- `cd .agentes/pruebas && npm run web` arranca los emuladores de Firebase (Auth y Firestore, con panel en http://localhost:4000) y la web en **http://localhost:5500/?emu**.
- Con `?emu`, y solo en localhost, `backend.js` usa los emuladores.
- No hay service worker ni caché.
- Peter no responde aquí, porque su servidor exige usuarios reales.
- Prueba crear un grupo, entrar con código, el enlace de invitación, cambiar el código, el buscador y las páginas legales.
- Prueba a 390 px y a 320 px, y con `?lang=es|en|fr|ca`.
- Para un grupo de varias personas, abre ventanas privadas.

**Como app, antes de compilar** (lecciones del 25/11):
- Simular en el navegador con el agente de usuario de la app, **con y sin** el puente nativo (PisteaNative).
- Usar los márgenes reales del iPhone: barra de estado de 47 px y barra inferior de 34 px.
- Forzar **un error antes de `backend.js`**.
- Después, en el simulador de Xcode: arranca en la pantalla de inicio y no en «Ejemplo»; Apple y Google abren su ventana; la Actividad en Directo aparece con ⌘L.
- Lo que depende del hardware (GPS en segundo plano, App Attest, voz con el móvil bloqueado) no se da por bueno hasta que Tomás lo prueba en su iPhone con una lista concreta.

**No lances navegadores automáticos contra vallik.app.** reCAPTCHA los puntúa bajo y deja ese navegador sin sello de App Check durante 24 horas (pasó el 24/11). Las pruebas automáticas van contra localhost.

**Herramientas de este Mac** (en `~/.local/bin`): Node 22, npm, Firebase CLI y Java 21 (para los emuladores). Xcode 27 está instalado. Para contenido (desde el 26/11):
- ffmpeg y ffprobe 9.1 (binario estático arm64 de martin-riedl.de);
- Blender 5.3.0 en `~/Applications/Blender.app`, con el enlace `blender`;
- Remotion va por proyecto (`npm install` en la carpeta de reels; la skill `it-reelsmaker` la crea con `kit.py new`). Probado con Remotion 4.0.526;
- Python 3.9 del sistema con Pillow, OpenCV y faster-whisper (instalados con `pip --user`), y el modelo de Whisper `medium` ya bajado. El modelo de caras YuNet está en `~/.local/share/modelos/face_detection_yunet_2023mar.onnx` (se indica en `it-reelsmaker.json` como `face_model`). No está rembg (recortar a la persona): pide Python 3.10 o más.

Si una terminal no las encuentra:

```sh
export PATH="$HOME/.local/bin:$PATH" JAVA_HOME="$HOME/.local/jdk/Contents/Home"
```

Al entregar, di siempre **qué no has podido probar**.

## 6. Convenciones

- **Commits en español**, en una línea que cuenta el efecto para quien usa la app.
  - Prefijo cuando ayuda: `Web: …`, `1.0.3: …`, `iOS: …`, `TestFlight: …`, `Legal: …`, `Peter: …`, `Reglas: …`.
  - Ejemplo real: «Ruta que avanza sola con el GPS, aviso de mucha gente, os espero arriba, cerrado en el mapa y K centrada».
- **Comentarios en el código en español**, explicando el porqué.
- **Sin dependencias nuevas en la web.** Todo va en local (three.js, Firebase compat, Geist) para que funcione sin red. Firebase JS 13 llegará cuando lleve unos meses estable.
- **Interruptores** en `firebase-config.js` para lo que depende de la consola (como `PISTEA_TTL`).
- **Enlaces de campaña** del App Store: formato y canales en `claude/estado.md`. Pegatinas y carteles nuevos usan `vallik.app/?ref=<canal>`, con minúsculas, números y guiones.
- **Medidor:** `vallik.app/?perf` muestra los fotogramas por segundo en el móvil.

## 7. Lecciones aprendidas (no repetir)

1. Los plugins nativos no funcionaron hasta la 1.0.2: faltaba `capacitor.js` antes de `native.js` (ahora lo añade `copiar-web.mjs`). En el navegador todo se veía bien. Por eso existe la prueba «como app» de §5.
2. Un error previo a `backend.js` tiraba la app al modo ejemplo. Los errores tempranos se guardan en `window.__earlyErr` y se envían después.
3. `SceneDelegate` creaba `CAPBridgeViewController` en vez de `VallikViewController`, así que el plugin VallikNav no se registraba.
4. App Check en la web (reCAPTCHA) necesita `document.body`: Firebase se carga al principio del `<body>`.
5. El plugin de App Check choca de nombre en Swift Package Manager. Se copia a `ios/plugins` con `arreglar-spm.mjs`.
6. **TestFlight:**
   - el archive se firma ad hoc y se firma para distribución al exportar; si no, se pierde App Attest;
   - Node 22 y Xcode 26 o posterior (Xcode 27 desde abril de 2027);
   - un «401 NOT_AUTHORIZED» con la compilación bien suele ser pasajero: se reintenta una vez antes de tocar claves.
7. El agente de usuario de iPhone hace esperar a Firebase Auth por un iframe: la app usa uno propio (`overrideUserAgent`).
8. Google no deja iniciar sesión en una ventana web dentro de apps: se usa el plugin nativo con `skipNativeAuth`.
9. El TTL exige el plan Blaze y las reglas publicadas antes. El orden es: consola y reglas, código detrás de un interruptor y, por último, la política.
10. GitHub Pages cachea 10 minutos. El service worker pide `index.html`, `backend.js` y `firebase-config.js` a la red; el resto solo se renueva al subir `VERSION`.
11. La landing no puede esperar al motor 3D: con 4G malo bajó de 2,2 s a 0,9 s.
12. Rehacer la interfaz mientras se arrastra el mapa da tirones: se mide el mapa una vez por gesto.
13. La 1.0.2 se mandó con el icono nuevo y las capturas viejas. Las capturas se revisan una a una contra el build **antes** de enviar: con «Waiting for Review» no se pueden cambiar.
14. En la build 116 no salían Apple ni Google, y los idiomas tapaban la hora. Hay que mirar capturas de cada pantalla con los márgenes reales del iPhone.
15. Los navegadores automáticos contra vallik.app quedan 24 h sin App Check. Las pruebas, en localhost.
16. Tres nombres para el mismo botón de ayuda confundían: un solo nombre por acción.
17. Quitar a alguien no basta si guardó el código. Para eso existe «cambiar el código del grupo», con las reglas `movido` y `nuevo`.
18. Peter sin topes se podía gastar creando cuentas anónimas. Ahora tiene límites por usuario, por conexión y diarios, además de App Check.
19. Si `npm run sync` falla a medias, deja `app/www` roto (quedó `app/.www_roto_*`). Se repite `npm ci && npm run sync` desde cero.

## 8. Orquestación desde T3

### El orquestador
Es el hilo principal en T3, con Claude Opus. No escribe código salvo arreglos pequeños. Su trabajo:
- entender lo que pide Tomás;
- partirlo en tareas y delegarlas;
- revisar el resultado;
- contárselo a Tomás en español claro.

**Por cada petición:**
1. Leer `claude/README.md`, `claude/estado.md` y lo que toque del código. Si la petición es ambigua o afecta a producción, preguntar a Tomás con una recomendación.
2. Hacer un plan corto: tareas, qué rol hace cada una, en qué orden y qué se puede hacer a la vez.
3. Delegar cada tarea con `delegate_task`, **modelo Claude Opus 5.5** e `isolation: "worktree"` desde `v101`. El encargo incluye:
   - el rol (`.agentes/roles/<rol>.md`);
   - el objetivo en una frase;
   - los archivos que puede tocar y los que no;
   - las comprobaciones que tiene que pasar;
   - el formato de entrega: rama, commits, qué probó y qué no.

   Las rutas a `claude/` van siempre en absoluto, porque cada agente trabaja en otra carpeta.
4. Cuando el agente entrega, delegar una **revisión** nueva con el rol revisor: otro `delegate_task`, nunca el mismo hilo. Si la tarea toca datos personales, textos legales, campañas con personas o creadores, o acuerdos, delegar además una revisión con el rol legal (`legal.md`). Los arreglos pequeños de la revisión los hace el orquestador.
5. Abrir el PR a `v101`, esperar a que `comprobar.yml` salga en verde y explicarle a Tomás qué cambia, cómo probarlo y qué falta.
6. Publicar solo con su «publícalo» (§3), siguiendo `claude/proceso-publicacion.md` y, para Apple, `claude/checklist-envio-apple.md`.
7. Al cerrar:
   - actualizar `claude/estado.md` (y el backlog si toca);
   - decirle a Tomás qué cambió en `claude/`;
   - si se aprendió algo, añadirlo a §7 de este archivo.

**En paralelo sí, choques no.** `index.html` es un único archivo enorme: **nunca dos agentes a la vez en `index.html`**. Sí pueden ir a la vez web y reglas, web y iPhone (si no tocan los mismos archivos), Peter, contenido e innovación. Si dos tareas necesitan `index.html`, van una detrás de otra, y la segunda se rebasa sobre la primera.

**Recordatorios.** En claude.ai, Claude programa los recordatorios de Tomás y corre una revisión semanal los lunes a las 8:41. Si una tarea deja un pendiente con fecha, dilo en el resumen para que quede anotado allí.

### Roles (`.agentes/roles/`)
Todos usan Claude Opus 5.5.

| Rol | Archivo | Para qué |
|---|---|---|
| Web | `web.md` | index.html, landing, backend.js, service worker, páginas legales |
| iPhone | `ios.md` | Capacitor, Swift, native.js, TestFlight, `version.json`, envío a Apple |
| Datos | `datos.md` | firestore.rules y sus pruebas, App Check, TTL, privacidad |
| Peter | `peter.md` | función de Vercel, voz y límites de Peter |
| Revisor | `revisor.md` | revisar cada entrega antes del PR |
| Creador de contenido | `contenido.md` | director de arte, montador y motion designer: reels, animación 3D, carruseles, capturas e impresos con el libro de marca, y que se vean y se compartan |
| Estratega de marca | `estratega.md` | plan de Instagram y de la temporada, guiones de reels, creadores y colaboraciones, cómo crece la marca a más estaciones; propone, Tomás decide |
| Desarrollo de negocio | `negocio.md` | monetización, estaciones nuevas, alianzas y contactos; todo confidencial en `claude/negocio/`; propone, Tomás decide |
| Legal y privacidad | `legal.md` | RGPD, LSSI, publicidad e influencers, AI Act, Apple y países nuevos; revisa que lo que hace la app coincida con lo que dicen los textos |
| Innovador | `innovador.md` | tendencias, competencia y propuestas con fuentes, también de contenido para redes (cada dos semanas, al estratega); propone, no implementa |
