# APD Client Agent — Cloudflare

Agente persistente y sin servidor para APD SPORT.

## Arquitectura actual

- Cloudflare Workers y Cron Triggers.
- Cloudflare D1 para memoria, auditoría y deduplicación.
- Workers AI para análisis.
- Gmail y Google Drive como fuentes controladas.
- Google Docs como destino único de borradores privados.

Slack y Notion han sido retirados del sistema.

## Funciones

- Revisión incremental de Gmail y Drive.
- Entrada de Gmail limitada a la etiqueta `APD/Entrada Cliente`.
- Entrada de Drive limitada a la carpeta configurada.
- Soporte de Google Docs, Sheets y archivos de texto compatibles.
- Deduplicación por ID, revisión y hash.
- Comparación con el seguimiento anterior.
- Priorización ROJA / NARANJA / VERDE.
- Creación de borradores privados en Google Docs.
- Registro interno de estado en D1.
- Límite diario de IA para proteger el coste.
- Ningún envío automático al cliente.

## Flujo

Gmail o Drive → Cloudflare Worker → Workers AI → Google Docs → D1

## Comandos

```bash
npm install
npm run db:migrate:remote
npm run deploy
```

## Endpoints

- `GET /health`
- `POST /admin/status`
- `POST /admin/run`
- `POST /admin/reset-checkpoint`
- `POST /admin/check-google`

## Revisión diaria

Los borradores se crean en la carpeta privada de Google Drive configurada como `GOOGLE_DRAFTS_FOLDER_ID`. La revisión y decisión final se realiza manualmente sobre esos documentos o mediante la futura operativa de los agentes GPT.
