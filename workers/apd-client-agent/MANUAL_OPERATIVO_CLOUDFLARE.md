# Manual operativo — Agente Cliente APD en Cloudflare

## Objetivo

El sistema revisa material nuevo o modificado de clientes APD SPORT en Gmail y Google Drive, genera un borrador interno, prioriza los casos y registra el trabajo en Slack, Notion y D1. Nunca responde automáticamente al cliente.

## Arquitectura

- Cloudflare Worker `apd-client-agent`.
- Cron Trigger horario.
- Binding `AI` para Workers AI.
- Binding `DB` para D1.
- Gmail, Drive, Docs y Sheets como fuentes.
- Google Docs como destino de borradores.
- Slack para revisión operativa.
- Notion para dashboard.

No utiliza VPS, Docker, n8n ni OpenAI API.

## Flujo de ejecución

1. Lee el checkpoint de D1.
2. Obtiene acceso temporal a Google mediante OAuth.
3. Busca mensajes recientes en Gmail y archivos modificados en Drive.
4. Filtra material relacionado con seguimiento, entrenamiento, nutrición, analíticas, lesión, competición o recuperación.
5. Extrae texto de Gmail, Google Docs, Google Sheets y archivos de texto compatibles.
6. Calcula ID, versión y hash.
7. Ignora una fuente si no ha cambiado.
8. Genera una referencia anónima `CP-XXXXXXXX`.
9. Recupera el seguimiento anterior de esa referencia.
10. Workers AI crea el análisis comparativo.
11. El código ajusta la prioridad con reglas adicionales.
12. En producción crea un borrador privado, una ficha en Slack y una entrada en Notion.
13. Guarda el estado en D1.
14. Solo avanza el checkpoint cuando la ejecución termina sin fallos.

## Tablas D1

La migración crea:

- `checkpoints`
- `runs`
- `sources`
- `decisions`
- `daily_usage`
- `event_receipts`

No crees tablas manualmente. Aplica la migración incluida en el repositorio.

## Secretos que debes añadir en Cloudflare

En el Worker, entra en `Configuración → Variables y secretos` y añade como secretos cifrados:

- credenciales OAuth de Google;
- refresh token de Google;
- token del bot de Slack;
- secreto de firma de Slack;
- token de la integración de Notion;
- token administrativo interno.

No guardes estos valores en GitHub, Slack, Notion, Drive ni conversaciones.

## Google

Activa estas APIs:

- Gmail API
- Google Drive API
- Google Docs API
- Google Sheets API

Permisos mínimos:

- lectura de Gmail;
- lectura de Drive;
- creación de archivos de la aplicación;
- lectura de Sheets.

El sistema no solicita permisos para enviar correo.

## Slack

Crea una app de Slack con permisos para:

- publicar mensajes;
- leer reacciones;
- leer información básica del canal.

Invita el bot a `#apd-produccion`.

Configura el endpoint de eventos del Worker y suscribe el evento `reaction_added`.

Reacciones interpretadas:

- ✅ → APROBADO
- 🔁 → REVISAR
- ⏸ → POSPUESTO
- ❌ → DESCARTADO

La decisión se guarda en D1 y actualiza Notion.

## Notion

Crea una integración interna con permisos de insertar y actualizar contenido. Comparte con ella la base `APD — Producción Cliente`.

Notion recibe solo metadatos anonimizados:

- referencia anónima;
- tipo de material;
- estado;
- prioridad y score;
- origen y fechas;
- puntos de revisión redactados;
- enlace al borrador;
- minutos ahorrados;
- hash externo.

## Conectar GitHub con Cloudflare

Configura el Worker con:

- repositorio: `lucifeba/apdsport-app`;
- rama inicial: `codex/apd-client-agent-cloudflare`;
- directorio raíz: `workers/apd-client-agent`;
- comando de compilación y despliegue: `npm install && npm run deploy:full`.

Tras validar y fusionar, cambia la rama de producción a `main`.

## Prueba segura

### Fase 1 — simulación

1. Mantén `DRY_RUN=true`.
2. Despliega el Worker.
3. Aplica la migración D1.
4. Abre `/health`.
5. Crea un Google Doc ficticio con `check-in` en el título.
6. Ejecuta manualmente el Worker.
7. Comprueba una fila en `runs` y otra `SIMULADO` en `sources`.
8. Repite sin modificar: debe omitirse.
9. Modifica el documento: debe reprocesarse.

Con `DRY_RUN=true` se validan Google, D1 y Workers AI, pero no se crean Docs, Slack ni Notion.

### Fase 2 — producción controlada

1. Cambia `DRY_RUN=false`.
2. Despliega otra vez.
3. Modifica el documento ficticio.
4. Ejecuta manualmente.
5. Verifica el Google Doc privado, la ficha de Slack, la entrada de Notion y una reacción.
6. Elimina el material ficticio cuando termine la prueba.

## Protección de coste cero

La configuración incluye:

- máximo tres materiales por ejecución;
- máximo doce llamadas de IA al día;
- máximo 15.000 caracteres por material;
- solo fuentes nuevas o modificadas;
- deduplicación por versión y hash;
- sin OpenAI API;
- sin VPS;
- sin infraestructura adicional de pago.

Al alcanzar el límite diario, el sistema detiene nuevos análisis y los retoma más tarde.

## Monitorización

El endpoint `/health` muestra:

- checkpoint;
- última ejecución;
- modo simulación;
- conteo por estado.

Revisa además:

- Worker → Observabilidad → Logs;
- Worker → Métricas;
- D1 → lecturas y escrituras;
- Workers AI → uso diario.

## Limitaciones actuales

- Los PDF y las imágenes no pasan por OCR.
- Los archivos no compatibles se marcan para revisión manual.
- Ningún mensaje se envía automáticamente al cliente.

## Checklist final

- [x] Worker creado
- [x] Binding AI
- [x] Binding DB
- [x] D1 creada
- [x] Código Worker
- [x] Migración D1
- [x] Cron
- [x] Receptor Slack
- [x] Manual
- [ ] Secretos de Google
- [ ] Credenciales de Slack
- [ ] Integración de Notion
- [ ] Token administrativo
- [ ] GitHub conectado al Worker
- [ ] Migración remota aplicada
- [ ] Prueba en simulación
- [ ] Prueba controlada de producción
- [ ] Automatización provisional de ChatGPT desactivada

## Regla de oro

El sistema prepara, compara, prioriza y registra. Pablo revisa y decide. Nunca diagnostica ni contacta con un cliente por sí solo.
