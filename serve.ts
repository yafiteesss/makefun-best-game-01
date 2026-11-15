// Serve game/ on http://localhost:8080 for local play-testing and screenshots.
// A tiny static server (Node 22, standard library only): it serves only files
// under game/, with the right content type, and nothing else.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(join(here, 'game'));
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path === '/') path = '/index.html';
  const file = resolve(join(root, normalize(path)));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found\n');
    return;
  }
  const extension = file.slice(file.lastIndexOf('.'));
  response.writeHead(200, { 'content-type': TYPES[extension] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});

server.listen(port, () => {
  console.log(`Lumen Drift at http://localhost:${port}`);
});
