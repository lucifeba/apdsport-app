# APD Client Agent

Servicio persistente de revisión de novedades de clientes APD SPORT.

## Estado

Código preparado para despliegue en Docker. Arranca siempre primero con `DRY_RUN=true`.

## Inicio rápido

```bash
cp .env.example .env
# completar secretos
docker compose build
docker compose run --rm apd-client-agent node dist/index.js --once
```

Después de validar:

```bash
# DRY_RUN=false
docker compose up -d
```

Consulta [MANUAL_OPERATIVO.md](./MANUAL_OPERATIVO.md) antes de activar producción.

## Garantías

- No envía nada al cliente.
- Deduplica por fuente, revisión y hash.
- Borradores privados en Drive.
- Slack anonimizado.
- Revisión humana obligatoria.
- Auditoría persistente en SQLite.
