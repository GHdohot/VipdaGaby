import { existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { default: handler } = await import('../api/handler.js');
const publicDir = path.resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) { await handler(req, res); return; }
  const pathname = ['/', '/admin', '/dashboard'].includes(url.pathname) ? (url.pathname === '/' ? '/index.html' : '/dashboard/admin.html') : decodeURIComponent(url.pathname);
  const file = path.resolve(publicDir, '.' + pathname);
  if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403).end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not_found');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Não encontrado'); }
}).listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => console.log('Ready http://localhost:' + (process.env.PORT || 3000)));
