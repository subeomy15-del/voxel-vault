import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLobbyService, HttpError } from './server/lobbies.js';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const staticRoots = new Set(['src', 'vendor', 'assets', 'lingo-loop']);
const staticFiles = new Set(['index.html', 'style.css', 'favicon.svg']);

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send application/json.');
  if (Number(req.headers['content-length']) > 8192) throw new HttpError(413, 'Request is too large.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new HttpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new HttpError(400, 'Expected a JSON object.');
  return value;
}

/** A dependency-free HTTP + SSE server. Rooms are intentionally held in memory. */
export function createServer(options = {}) {
  const service = createLobbyService(options);
  const allowedOrigins = new Set(options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || 'https://subeomy15-del.github.io').split(',').map(value => value.trim()).filter(Boolean));
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.startsWith('/api/')) {
        const origin = req.headers.origin;
        if (origin) {
          let sameOrigin = false;
          try { const parsed = new URL(origin); sameOrigin = ['http:', 'https:'].includes(parsed.protocol) && parsed.host === req.headers.host; } catch {}
          if (!sameOrigin && !allowedOrigins.has(origin)) throw new HttpError(403, 'This website is not allowed to access this server.');
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
          return res.end();
        }
        service.checkRequest(req.socket.remoteAddress || 'unknown');
        if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { multiplayer: true, mode: 'creative', maxPlayers: 8, reconnectGraceSeconds: service.reconnectGraceMs / 1000, persistence: 'memory' });
        if (req.method === 'GET' && pathname === '/api/rooms') return json(res, 200, { rooms: service.list() });
        if (req.method === 'POST' && pathname === '/api/rooms') {
          const body = await readBody(req);
          service.checkAdmission(req.socket.remoteAddress || 'unknown');
          return json(res, 201, service.create(body));
        }
        const match = /^\/api\/rooms\/([a-zA-Z0-9]{6})(?:\/(join|action|events))?$/.exec(pathname);
        if (match) {
          const code = match[1].toUpperCase(), route = match[2];
          if (req.method === 'POST' && route === 'join') {
            const body = await readBody(req);
            service.checkAdmission(req.socket.remoteAddress || 'unknown');
            return json(res, 200, service.join(code, body));
          }
          if (req.method === 'POST' && route === 'action') return json(res, 200, service.action(code, await readBody(req)));
          if (req.method === 'GET' && route === 'events') return service.connect(code, url.searchParams.get('token'), res);
          if (req.method === 'GET' && !route) return json(res, 200, service.get(code, url.searchParams.get('token')));
        }
        throw new HttpError(404, 'Endpoint or lobby not found.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
      const relative = pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : '');
      const segments = relative.split('/');
      if (segments.some(segment => !segment || segment.startsWith('.') || segment.includes('\\')) || (!staticFiles.has(relative) && !staticRoots.has(segments[0])) || !types[extname(relative)]) throw new HttpError(404, 'Not found.');
      const file = await realpath(resolve(root, relative));
      if (!file.startsWith(root + sep)) throw new HttpError(404, 'Not found.');
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache', 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      if (res.headersSent) return res.end();
      const status = error.status || (error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : error instanceof URIError ? 400 : 500);
      if (status === 429) res.setHeader('Retry-After', '1');
      json(res, status, { error: status === 500 ? 'Server error. Please try again.' : error.message });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  // Closing the server also releases long-lived event streams and its sweep timer.
  const close = server.close.bind(server);
  server.close = callback => { service.close(); return close(callback); };
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';
  createServer().listen(port, host, () => console.log(`Voxel Vault: http://localhost:${port} (multiplayer enabled; listening on ${host})`));
}
