# Puesta en marcha

Todo es gratis para un grupo de amigos. No hace falta tarjeta.

## 1. GitHub

1. Crea tu cuenta en github.com con el plan Free.
2. Pulsa New repository. Nombre `pistea`, público, sin README (ya hay uno).
3. Sube el contenido de esta carpeta al repositorio.
4. Settings, Pages: Source "Deploy from a branch", rama `main`, carpeta `/ (root)`. Guarda.
5. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/pistea/`.

## 2. Firebase

1. Entra en console.firebase.google.com con tu cuenta de Google y pulsa Crear un proyecto. Nombre `pistea`. Puedes desactivar Google Analytics.
2. Menú Compilación, Authentication, Comenzar. En Método de acceso activa Anónimo.
3. Menú Compilación, Firestore Database, Crear base de datos. Elige una región europea (por ejemplo `eur3`) y empieza en modo de producción.
4. En la pestaña Reglas pega el contenido de `firestore.rules` y pulsa Publicar.
5. Engranaje de Descripción general, Configuración del proyecto, Tus apps, icono Web (`</>`). Ponle nombre `pistea` y registra la app. Copia el bloque `firebaseConfig`.
6. Pega esos valores en `firebase-config.js` y sube el cambio a GitHub.
7. Authentication, Configuración, Dominios autorizados: añade `TU-USUARIO.github.io`.

## 3. Probar con el grupo

1. Abre la app. La primera vez pide tu nombre: pulsa «Crear un grupo nuevo».
2. En el panel principal, "Invitar al grupo" comparte un enlace con el código del grupo.
3. Cada amigo abre el enlace, pone su nombre y ya aparece en el mapa. Si ya tenía Pistea en la pantalla de inicio del iPhone, que la abra y pegue el enlace o el código (en el panel, «Copiar código»).
4. "Estoy aquí" y luego "Usar mi ubicación" marca tu posición real con el GPS.

## Notas

- El código del grupo va en el enlace (`#g=...`). Quien lo tiene entra en el grupo, así que compártelo solo con tus amigos.
- Si alguien borra los datos del navegador, entra de nuevo con el mismo enlace.
- Antes de subir, abre la app una vez con wifi para que el mapa quede guardado en el móvil.
- Cada vez que publiques cambios, sube `VERSION` en `sw.js` (por ejemplo `pistea-v7`). Así los móviles descargan la versión nueva entera.
- Si cambias `firestore.rules`, pégalas otra vez en la pestaña Reglas de Firestore y pulsa Publicar.
