import app from './index';

interface Env {
  DB: D1Database;
  SYSTEM_ENABLED?: string;
  DRY_RUN?: string;
}

const asBool = (value: string | undefined, fallback = false) =>
  value == null ? fallback : value.toLowerCase() === 'true';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

async function health(env: Env) {