-- Retirada definitiva de Slack y Notion del Agente Cliente APD.
-- Conserva el esquema histórico para compatibilidad, pero elimina los datos vinculados.

UPDATE sources
SET slack_channel = '',
    slack_ts = '',
    notion_page_id = '',
    updated_at = datetime('now');

DELETE FROM decisions;
DELETE FROM event_receipts;
