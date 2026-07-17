import fs from 'node:fs';

const file = new URL('../src/entry.ts', import.meta.url);
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\n    runtimeSecrets: \{[\s\S]*?\n    \},/,
  '',
);

if (!code.includes("url.pathname === '/admin/status'")) {
  const marker = "    if (request.method === 'POST' && url.pathname === '/admin/check-google') {";
  const routes = `    if (request.method === 'POST' && url.pathname === '/admin/status') {\n      if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);\n      return json(await health(env));\n    }\n\n    if (request.method === 'POST' && url.pathname === '/admin/reset-checkpoint') {\n      if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);\n      const value = new Date().toISOString();\n      await env.DB.prepare(\`INSERT INTO checkpoints(key,value,updated_at) VALUES('last_successful_scan',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at\`).bind(value,value).run();\n      return json({ ok: true, checkpoint: value });\n    }\n\n`;
  if (!code.includes(marker)) throw new Error('Entry route marker not found');
  code = code.replace(marker, routes + marker);
}

fs.writeFileSync(file, code);
console.log('Entry security patch applied');
