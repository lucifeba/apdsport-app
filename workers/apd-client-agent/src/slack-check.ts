interface SlackCheckEnv {
  SLACK_BOT_TOKEN?: string;
  SLACK_CHANNEL_ID?: string;
}

async function slackCall(token: string, url: string) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json<Record<string, unknown>>();
  return { response, payload };
}

export async function checkSlack(env: SlackCheckEnv) {
  const token = (env.SLACK_BOT_TOKEN ?? '').trim();
  const channel = (env.SLACK_CHANNEL_ID ?? '').trim();
  if (!token || !channel) {
    return { ok: false, configured: false, error: 'missing_slack_configuration' };
  }

  const auth = await slackCall(token, 'https://slack.com/api/auth.test');
  const channelInfo = await slackCall(
    token,
    `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channel)}`,
  );

  return {
    ok: Boolean(auth.payload.ok && channelInfo.payload.ok),
    configured: true,
    authenticated: Boolean(auth.payload.ok),
    channelAccessible: Boolean(channelInfo.payload.ok),
    authError: auth.payload.ok ? null : String(auth.payload.error ?? 'unknown_error'),
    channelError: channelInfo.payload.ok ? null : String(channelInfo.payload.error ?? 'unknown_error'),
  };
}
