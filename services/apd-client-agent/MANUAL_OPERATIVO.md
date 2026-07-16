# Manual operativo — Agente Cliente APD

## 1. Propósito

Servicio persistente para detectar material nuevo o modificado de clientes APD SPORT en Gmail y Google Drive, deduplicarlo, analizarlo con revisión humana obligatoria, crear un borrador privado en Drive, publicar una ficha anonimizada en Slack y registrar el caso en Notion.

Nunca envía mensajes al cliente ni emite diagnósticos médicos cerrados.

## 2. Arquitectura

- Ejecución: contenedor Docker en VPS.
- Estado: SQLite persistente en `/data/apd-client-agent.sqlite`.
- Fuentes: Gmail y Google Drive mediante Google OAuth.
- Análisis: OpenAI API.
- Borradores: Google Docs dentro de `BORRADORES PRIVADOS`.
- Avisos: Slack `#apd-produccion`, channel ID `C0BGS1D8YJW`.
- Panel: Notion `APD — Producción Cliente`.
- Código: `services/apd-client-agent`.

## 3. Flujo de cada ejecución

1. Lee el último registro persistido en SQLite.
2. Busca correos y archivos posteriores al checkpoint, con margen de solape de 10 minutos.
3. Filtra cuestionarios, check-ins, formularios, analíticas, informes y datos relacionados con entrenamiento, nutrición o fueling.
4. Calcula `source_key`, revisión y hash de contenido.
5. Descarta contenido idéntico ya procesado.
6. Analiza el material y genera un identificador anónimo `CP-XXXXXXXX`.
7. Crea un Google Doc privado con resumen, objetivo, cambios, banderas rojas, preguntas, hipótesis, entrenamiento, nutrición/fueling, recuperación, métricas y mensaje propuesto.
8. Publica solo metadatos anonimizados en Slack.
9. Añade el caso al panel de Notion.
10. Guarda el resultado y la auditoría en SQLite.

Si no encuentra novedades, no publica nada.

## 4. Recursos creados

### Google Drive

- Carpeta principal: `APD PRODUCCIÓN — AGENTE CLIENTE`
- Carpeta protegida: `BORRADORES PRIVADOS`
- ID de la carpeta de borradores: `1iwBrmrThuFcLEwwywSQhH7LDou_xSi-Y`

### Slack

- Canal: `#apd-produccion`
- Channel ID: `C0BGS1D8YJW`

### Notion

- Base: `APD — Producción Cliente`
- Database ID: `fe076e97b3f64af4b1bc3a7b7833d564`
- Collection/data source ID: `5ae4e655-88ef-4758-86c3-f3e318f17296`
- Vistas: `Pendientes por prioridad` y `Producción completa`.

## 5. Conectores y credenciales

Los MCP conectados a ChatGPT no transfieren sus tokens al contenedor. El servicio necesita credenciales de ejecución propias.

### Google

Crear un proyecto en Google Cloud, activar Gmail API, Drive API y Docs API, y generar OAuth 2.0 con refresh token.

Scopes mínimos recomendados:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/documents`

Variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

### Slack

Crear o reutilizar una Slack App e instalar el bot en el workspace y en `#apd-produccion`.

Scopes mínimos:

- `chat:write`
- `channels:read`
- `channels:history`
- `reactions:read` para una futura sincronización automática de decisiones.

Variable: `SLACK_BOT_TOKEN`.

### Notion

Crear una integración interna, compartir con ella la base `APD — Producción Cliente` y copiar el token.

Variable: `NOTION_TOKEN`.

### OpenAI

Crear una API key de proyecto con límite de gasto y rotación controlada.

Variable: `OPENAI_API_KEY`.

## 6. Preparación del VPS

Requisitos:

- Docker Engine y Docker Compose v2.
- Git.
- Acceso saliente HTTPS a Google, Slack, Notion y OpenAI.
- Copias de seguridad de volúmenes Docker.

Comandos:

```bash
git clone https://github.com/lucifeba/apdsport-app.git
cd apdsport-app
git checkout codex/apd-client-agent
cd services/apd-client-agent
cp .env.example .env
nano .env
```

Primera prueba obligatoria:

```bash
# Mantener DRY_RUN=true
docker compose build
docker compose run --rm apd-client-agent node dist/index.js --once
```

Activación:

```bash
# Cambiar DRY_RUN=false
docker compose up -d
docker compose logs -f --tail=200
```

## 7. Modos de ejecución

- `DRY_RUN=true`: analiza y registra sin crear documentos ni publicar mensajes reales.
- `DRY_RUN=false`: producción.
- `--once`: una sola ejecución.
- Sin `--once`: bucle permanente según `POLL_INTERVAL_MINUTES`.

## 8. Deduplicación

Una fuente se identifica como `GMAIL:<message_id>` o `DRIVE:<file_id>`.

Se reprocesa solo cuando cambia al menos uno de estos elementos:

- revisión o versión;
- fecha de modificación;
- hash del contenido.

El margen de solape evita perder documentos modificados durante una ejecución.

## 9. Priorización

El análisis devuelve un score entre 0 y 100:

- 75–100: ROJA.
- 45–74: NARANJA.
- 0–44: VERDE.

La prioridad es orientativa y siempre requiere revisión profesional.

## 10. Privacidad y seguridad

- Nunca poner secretos en GitHub.
- El archivo `.env` está ignorado.
- Los borradores se crean en carpeta privada y se eliminan permisos ajenos al propietario cuando es posible.
- Slack solo recibe identificador anónimo y metadatos no sensibles.
- Notion solo almacena metadatos anonimizados.
- SQLite contiene identificadores técnicos; el volumen debe quedar restringido al administrador.
- No abrir puertos públicos para este servicio.
- Rotar tokens ante cualquier sospecha de exposición.

## 11. Revisión humana

La ficha de Slack termina con:

`✅ aprobar · 🔁 revisar · ⏸ posponer · ❌ descartar`

En esta primera versión, esas opciones son instrucciones visuales. La decisión debe registrarse en Notion hasta habilitar el receptor de interacciones/reacciones de Slack.

Nunca copiar y enviar automáticamente el mensaje propuesto al cliente.

## 12. Operación diaria

1. Abrir la vista `Pendientes por prioridad`.
2. Revisar primero ROJA, después NARANJA y VERDE.
3. Abrir el borrador protegido.
4. Contrastar con TrainingPeaks, contexto reciente y conversación real.
5. Corregir el borrador.
6. Cambiar estado en Notion.
7. Responder al cliente manualmente por el canal habitual.

## 13. Monitorización

Comandos:

```bash
docker compose ps
docker compose logs --tail=200 apd-client-agent
docker inspect --format='{{json .State.Health}}' apd-client-agent
```

Consultas SQLite:

```bash
docker compose exec apd-client-agent node -e "const D=require('better-sqlite3');const d=new D('/data/apd-client-agent.sqlite');console.table(d.prepare('select * from runs order by id desc limit 10').all())"
```

Indicadores:

- ejecuciones OK/ERROR;
- descubiertos, procesados y omitidos;
- minutos ahorrados;
- casos por prioridad y estado;
- fuentes con errores repetidos.

## 14. Copias de seguridad

Realizar copia diaria del volumen Docker y conservar al menos 14 días.

```bash
docker run --rm -v apd-client-agent-data:/data -v "$PWD":/backup alpine tar czf /backup/apd-client-agent-$(date +%F).tgz -C /data .
```

No subir las copias a repositorios públicos.

## 15. Actualización

```bash
git pull
docker compose build --no-cache
docker compose up -d
docker compose logs --tail=100
```

Antes de actualizar, guardar una copia del volumen.

## 16. Recuperación ante fallos

- `Missing env`: completar la variable en `.env`.
- Google `invalid_grant`: renovar refresh token.
- Slack `not_in_channel`: invitar el bot al canal.
- Notion `object_not_found`: compartir la base con la integración y comprobar ID.
- Repetición de casos: revisar hash, revisión y reloj del VPS.
- Sin resultados: ampliar `GOOGLE_LOOKBACK_MINUTES` y comprobar palabras clave.
- Error de permisos en Drive: comprobar scopes y propiedad de la carpeta.

## 17. Puesta en producción segura

Checklist:

- [ ] Credenciales creadas y guardadas solo en `.env` del VPS.
- [ ] `DRY_RUN=true` probado sin errores.
- [ ] Un caso de prueba detectado una sola vez.
- [ ] Borrador creado con acceso restringido.
- [ ] Slack sin datos personales o clínicos.
- [ ] Notion recibe la ficha correcta.
- [ ] Segundo ciclo omite el mismo caso.
- [ ] Modificar el caso provoca reprocesamiento.
- [ ] Backup probado.
- [ ] Cambiar `DRY_RUN=false`.
- [ ] Desactivar la automatización provisional de ChatGPT para evitar doble procesamiento.

## 18. Limitaciones actuales y siguiente iteración

- Los PDF escaneados sin texto requieren OCR o análisis multimodal adicional.
- Las decisiones de Slack todavía no actualizan automáticamente SQLite/Notion.
- No existe acceso SSH conectado desde este entorno, por lo que el despliegue final en el VPS requiere proporcionar una vía de ejecución segura.
- El servicio no consulta TrainingPeaks porque no hay conector/API configurado.

Siguiente versión recomendada: ingestión robusta de PDFs, sincronización de reacciones de Slack, endpoint interno de salud, cifrado del volumen y comparador explícito contra el seguimiento anterior del mismo cliente.
