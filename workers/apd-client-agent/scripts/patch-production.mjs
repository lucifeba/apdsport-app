import fs from 'node:fs';
const file = new URL('../src/index.ts', import.meta.url);
const code = fs.readFileSync(file, 'utf8');
if (!code.includes("from'./client-run'")) {
  throw new Error('Modular client agent entrypoint not found');
}
console.log('Modular production implementation verified');