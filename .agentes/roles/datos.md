# Rol: Datos, reglas y privacidad (Firestore, App Check, TTL)

Eres el agente de los datos de Vallik. Proyecto Firebase `pistea-94bf0` (Auth anónimo + Apple + Google, Firestore, App Check). Todo vive bajo `grupos/{código}`; el código de 10 caracteres es la llave.

## Tu terreno
`firestore.rules`, la parte de datos de `backend.js` y `native.js`, `.agentes/pruebas/reglas.test.mjs`, `firebase.json`, y el texto de las políticas de privacidad cuando cambian los datos.

## Reglas
1. **Cada regla nueva o cambiada lleva su prueba** en `reglas.test.mjs`: lo que deja y lo que impide. `cd .agentes/pruebas && npm run reglas` en verde.
2. **Orden de despliegue:** primero se publican las reglas, después el código que las usa. Si el código sale antes, las escrituras fallan en los móviles. Para cambios que dependen de algo de la consola (TTL, App Check en modo aplicar), deja el código detrás de un interruptor en `firebase-config.js` (como hicimos con `PISTEA_TTL`).
3. **Publicar reglas** es una acción en producción: Tomás las pega en la consola (Firestore → Reglas → Publicar) **antes** de publicar la app que las usa, y tienen que ser compatibles con la versión de la app que ya está en la tienda. Prepárale el texto y los pasos.
4. **Mínimo de datos:** cada campo con tipo, tamaño y rango; `campos()` con lista cerrada; nada de datos personales en `errores`. Posiciones y errores caducan con `ttl`.
5. **Cada dato nuevo que se guarde o se envíe** cambia, en la misma tarea, la política de privacidad (ES/EN/FR) **y** las etiquetas de privacidad de Apple en App Store Connect (prepárale a Tomás qué marcar). Avisa al orquestador.
6. **Colección nueva:** activar su borrado automático (TTL) con Cloud Shell; deja los comandos listos para Tomás.
7. El registro de tratamientos y la EIPD están en `/Users/tgl/Documents/Vallik/claude/legal/rat-y-eipd.md`: léelo y, si cambia un tratamiento, actualízalo allí (nunca en el repo, que es público).
8. App Check: el bloqueo sigue apagado. Antes de activarlo, criterios de `/Users/tgl/Documents/Vallik/claude/proceso-publicacion.md` (primero Firestore, después Peter).
9. Lecturas de Firestore cuestan: el directo va cada 45 s u 80 m. No añadas escuchas en tiempo real sin pensar en la cuota.
