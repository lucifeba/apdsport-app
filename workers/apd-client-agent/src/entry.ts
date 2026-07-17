import app from './index';
import { checkGoogle } from './google-check';

interface Env {
  DB: D1Database;
  SYSTEM_ENABLED?: string;
  DRY_RUN?: string;
  ADMIN_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRAFTS_FOLDER_ID?: string;
}

const asBool = (value: string | undefined, fallback = false) =>
  value == null ? fallback : value.toLowerCase() === 'true';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const authorized = (request: Request, env: Env) => {
  const auth = request.headers.get('authorization') ?? '';
  return Boolean(env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`);
};

async function health(env: Env) {
  const checkpoint = await env.DB.prepare(
    "SELECT value FROM checkpoints WHERE key = 'last_successful_scan'",
  ).first<{ value: string }>();
  const latestRun = await env.DB.prepare(
    'SELECT * FROM runs ORDER BY id DESC LIMIT 1',
  ).first();
  const sourceCounts = (
    await env.DB.prepare(
      'SELECT status, COUNT(*) AS total FROM sources GROUP BY status',
    ).all()
  ).results;

  return {
    ok: true,
    service: 'apd-client-agent',
    enabled: asBool(env.SYSTEM_ENABLED, false),
    dryRun: asBool(env.DRY_RUN, true),
    checkpoint: checkpoint?.value ?? null,
    latestRun,
    sourceCounts,
  };
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (!asBool(env.SYSTEM_ENABLED, false)) {
      console.log('APD Client Agent disabled: scheduled run skipped');
      return;
    }
    return app.scheduled(controller, env as never, ctx);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json(await health(env));
    }

    if (request.method === 'POST' && url.pathname === '/admin/check-google') {
      if (!authorized(request, env)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }
      return json(await checkGoogle(env));
    }

    if (
      request.method === 'POST' &&
      url.pathname === '/admin/run' &&
      !asBool(env.SYSTEM_ENABLED, false)
    ) {
      return json(
        {
          ok: false,
          error: 'system_disabled',
          message: 'Activa SYSTEM_ENABLED solo después de validar credenciales.',
        },
        503,
      );
    }

    return app.fetch(request, env as never, ctx);
  },
};
