# APD Client Agent — Cloudflare

Agente persistente y sin servidor para APD SPORT.

## Arquitectura

- Cloudflare Workers y Cron Triggers.
- Cloudflare D1 para memoria, auditoría y deduplicación.
- Workers AI para análisis.
- Gmail, Google Drive, Docs y Sheets como fuentes y destino de borradores.
- Slack para revisión operativa.
- Notion para dashboard.

## Funciones

- Revisión incremental de Gmail y Drive.
- Deduplicación por ID, revisión y hash.
- Comparación con el seguimiento anterior.
- Score ROJA / NARANJA / VERDE.
- Borradores privados en Google Docs.
- Fichas anonimizadas en Slack.
- Decisiones por reacciones de Slack.
- Registro de estado en Notion y D1.
- `DRY_RUN=true` por defecto.
- Límite diario de IA para proteger el coste cero.

## Comandos

```bash
npm install
npm run typecheck
npm run db:migrate:remote
npm run deploy
```

## Endpoints

- `GET /health`
- `POST /admin/run`
- `POST /slack/events`

Consulta `MANUAL_OPERATIVO_CLOUDFLARE.md` antes de activar producción.
