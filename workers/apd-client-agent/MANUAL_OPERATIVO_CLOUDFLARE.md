# Manual operativo — Agente Cliente APD simplificado

## Objetivo

El sistema revisa material nuevo o modificado de clientes APD SPORT en Gmail y Google Drive, genera un borrador interno, prioriza el caso y guarda el estado técnico en D1. Nunca responde automáticamente al cliente.

## Arquitectura

- Cloudflare Worker `apd-client-agent`.
- Cron Trigger horario.
- Workers AI para análisis.
- D1 para memoria, auditoría y deduplicación.
- Gmail y Drive como fuentes controladas.
- Google Docs como único destino de borradores.

Slack y Notion no forman parte de la arquitectura actual.

## Flujo de ejecución

1. Lee el checkpoint de D1.
2. Obtiene acceso temporal a Google mediante OAuth.
3. Busca correos con la etiqueta `APD/Entrada Cliente`.
4. Busca archivos dentro de la carpeta de entrada configurada.
5. Extrae texto de Gmail, Google Docs, Google Sheets y archivos de texto compatibles.
6. Filtra material relacionado con seguimiento, entrenamiento, nutrición, analíticas, lesión, competición o recuperación.
7. Deduplica por ID, versión y hash.
8. Genera una referencia anónima `CP-XXXXXXXX`.
9. Recupera el seguimiento anterior asociado.
10. Workers AI crea el análisis comparativo.
11. El código calcula prioridad ROJA, NARANJA o VERDE.
12. Crea un borrador privado en Google Docs.
13. Guarda resultado, enlace, prioridad, análisis y estado en D1.
14. Solo avanza el checkpoint cuando la ejecución termina sin fallos.

## Entradas

### Gmail

Aplica la etiqueta:

`APD/Entrada Cliente`

Solo los mensajes con esa etiqueta entran en el flujo.

### Google Drive

Mueve el archivo a la carpeta privada configurada como `GOOGLE_INBOX_FOLDER_ID`.

## Salidas

Cada caso genera:

- un Google Doc privado;
- referencia anónima;
- resumen;
- objetivo;
- cambios desde el seguimiento anterior;
- mejoras y empeoramientos;
- banderas rojas;
- preguntas pendientes;
- hipótesis no diagnósticas;
- propuestas de entrenamiento, nutrición, fueling y recuperación;
- métricas;
- puntos a revisar;
- mensaje de respuesta propuesto;
- prioridad y score;
- minutos estimados ahorrados.

## Revisión humana

La carpeta de borradores de Google Drive es el centro de revisión. El documento no se envía automáticamente. Pablo revisa, corrige y decide qué hacer con el contenido.

La nueva operativa con agentes GPT se diseñará sobre estos documentos, sin automatizaciones recurrentes y sin depender de Slack o Notion.

## Coste y límites

La configuración actual limita:

- tres materiales por ejecución;
- doce llamadas de IA al día;
- 15.000 caracteres por material;
- solo material nuevo o modificado;
- deduplicación por versión y hash.

El Worker no consume créditos del workspace de ChatGPT.

## Endpoints

- `GET /health`: estado básico.
- `POST /admin/status`: diagnóstico protegido.
- `POST /admin/run`: ejecución manual protegida.
- `POST /admin/reset-checkpoint`: reinicio protegido del checkpoint.
- `POST /admin/check-google`: comprobación protegida de Google.

## Mantenimiento

### Semanal

- revisar la carpeta de borradores;
- comprobar `/health`;
- revisar ejecuciones fallidas en Cloudflare Logs;
- mover fuera de la carpeta de entrada los archivos ya tratados cuando proceda.

### Mensual

- revisar uso de Workers AI;
- revisar D1;
- comprobar permisos de las carpetas privadas;
- confirmar que las automatizaciones recurrentes de ChatGPT siguen desactivadas.

## Limitaciones

- PDF e imágenes no pasan por OCR.
- Los formatos incompatibles se marcan para revisión manual.
- No envía respuestas al cliente.
- No existe ya aprobación mediante reacciones.
- No existe dashboard de Notion asociado.

## Regla de oro

El sistema prepara, compara, prioriza y documenta. Pablo revisa y decide. Nunca diagnostica ni contacta con un cliente por sí solo.
