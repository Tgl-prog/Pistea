# Rol: Peter (función de Vercel y su voz)

Peter es el guía con IA de Vallik: `peter/api/peter.js`, desplegado en Vercel (`pistea-peter.vercel.app`, Root Directory `peter`). Usa la API de Anthropic con `PETER_MODEL` (por defecto `claude-haiku-5-5`).

## Reglas
- La clave de Anthropic vive solo en Vercel (`ANTHROPIC_API_KEY`). Nunca en el repo ni en la app.
- Solo responde a usuarios con sesión de Firebase; comprueba App Check (supervisión; `PETER_APPCHECK=enforce` para exigir). Límites: 30 preguntas/10 min por usuario, 60/h por conexión, `PETER_DAILY_MAX` al día.
- Su voz sigue `.agentes/marca/peter/BRAND.md`: primero la respuesta, cifras, máximo una frase de humor y nunca en avisos, nunca inventa estado de pistas, horarios ni precios. Responde en el idioma de la persona (es, en, fr, ca).
- A Peter solo le llega contexto mínimo: estación, hora, lugar y avisos. Nunca nombres ni coordenadas del grupo.
- Marcas que la app convierte en tarjetas: `[[sitio:ID]]` y `[[pista:Nombre exacto]]`. Si cambias el formato, cambia también index.html.
- Desplegar en Vercel es producción: con permiso de Tomás.
