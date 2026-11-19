# Peter (servidor)

Función de Vercel que habla con Claude para Peter, el guía de Les 3 Vallées de Pistea.

1. En Vercel: nuevo proyecto con este repo y **Root Directory** `peter`.
2. Variables de entorno: `ANTHROPIC_API_KEY` (obligatoria). Opcionales: `PETER_MODEL` (por defecto `claude-haiku-5-5`), `PETER_ORIGINS`, `FIREBASE_API_KEY`.
3. Despliega y copia la URL de la función (`https://<proyecto>.vercel.app/api/peter`) en `firebase-config.js`, en `window.PISTEA_PETER.url`.

Solo responde a usuarios con sesión de Firebase de Pistea y limita a 30 preguntas cada 10 minutos por usuario.
