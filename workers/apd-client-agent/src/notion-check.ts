interface NotionCheckEnv {
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_VERSION?: string;
}

export async function checkNotion(env: NotionCheckEnv) {
  const token = (env.NOTION_TOKEN ?? '').trim();
  const dataSourceId = (env.NOTION_DATA_SOURCE_ID ?? '').trim();
  const version = (env.NOTION_VERSION ?? '2025-09-03').trim();

  if (!token || !dataSourceId) {
    return { ok: false, configured: false, error: 'missing_notion_configuration' };
  }

  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        'notion-version': version,
      },
    },
  );

  const payload = await response.json<Record<string, unknown>>();
  return {
    ok: response.ok,
    configured: true,
    dataSourceAccessible: response.ok,
    status: response.status,
    error: response.ok ? null : String(payload.code ?? payload.message ?? 'unknown_error'),
  };
}
