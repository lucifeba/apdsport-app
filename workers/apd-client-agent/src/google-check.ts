interface GoogleCheckEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRAFTS_FOLDER_ID?: string;
}

async function getAccessToken(env: GoogleCheckEnv) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
    refresh_token: env.GOOGLE_REFRESH_TOKEN ?? '',
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    return { ok: false, stage: 'oauth', status: response.status };
  }

  const data = (await response.json()) as { access_token?: string };
  return data.access_token
    ? { ok: true, token: data.access_token }
    : { ok: false, stage: 'oauth', status: 500 };
}

export async function checkGoogle(env: GoogleCheckEnv) {
  const configured = Boolean(
    env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN &&
      env.GOOGLE_DRAFTS_FOLDER_ID,
  );

  if (!configured) {
    return { ok: false, configured: false, stage: 'configuration' };
  }

  const tokenResult = await getAccessToken(env);
  if (!tokenResult.ok || !tokenResult.token) {
    return { ok: false, configured: true, stage: tokenResult.stage, status: tokenResult.status };
  }

  const headers = { authorization: `Bearer ${tokenResult.token}` };
  const [gmailResponse, driveResponse] = await Promise.all([
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers }),
    fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(env.GOOGLE_DRAFTS_FOLDER_ID ?? '')}?fields=id,name,mimeType,trashed`,
      { headers },
    ),
  ]);

  return {
    ok: gmailResponse.ok && driveResponse.ok,
    configured: true,
    oauth: true,
    gmail: gmailResponse.ok,
    driveFolder: driveResponse.ok,
    gmailStatus: gmailResponse.status,
    driveStatus: driveResponse.status,
  };
}
