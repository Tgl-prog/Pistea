# Peter (servidor)

Función de Vercel que habla con Claude para Peter, el guía de Les 3 Vallées de Pistea.

1. En Vercel: nuevo proyecto con este repo y **Root Directory** `peter`.
2. Variables de entorno: `ANTHROPIC_API_KEY` (obligatoria). Opcionales: `PETER_MODEL` (por defecto `claude-haiku-5-5`), `PETER_ORIGINS`, `FIREBASE_API_KEY`.
3. Despliega y copia la URL de la función (`https://<proyecto>.vercel.app/api/peter`) en `firebase-config.js`, en `window.PISTEA_PETER.url`.

Solo responde a usuarios con sesión de Firebase. Límites: 30 preguntas cada 10 minutos por usuario, 60 por hora por conexión y `PETER_DAILY_MAX` al día en total (500 por defecto). El tope de verdad es el límite de gasto mensual de la consola de Anthropic (Settings → Limits).
