/* ==========================================================================
   Local Cloudflare Worker preview server (runs worker/index.ts against dist/).
   Use for offline @vercel/agent-readability audits, curl checks, MCP testing,
   or exposing via a tunnel (cloudflared / tailscale funnel) for npx is-agentic.
   Run: bun run preview:worker
   ========================================================================== */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import worker, { type AssetFetcher } from '../worker/index';

const dist = resolve(import.meta.dirname, '../dist');
const port = Number(process.env.PORT ?? 4173);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export function createDistAssets(distDir = dist): AssetFetcher {
  return {
    async fetch(input: Request | string): Promise<Response> {
      const req = typeof input === 'string' ? new Request(input) : input;
      const pathname = decodeURIComponent(new URL(req.url).pathname);
      const rel = pathname.replace(/^\/+/, '');
      let filePath = resolve(distDir, rel);
      if (!filePath.startsWith(distDir)) return new Response('Forbidden', { status: 403 });
      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = resolve(filePath, 'index.html');
      }
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        return new Response('Not Found', { status: 404 });
      }
      const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      const data = readFileSync(filePath);
      return new Response(req.method === 'HEAD' ? null : data, {
        status: 200,
        headers: { 'Content-Type': type },
      });
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const env = { ASSETS: createDistAssets(dist) };
  const server = createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const host = req.headers.host ?? `localhost:${port}`;
    const url = `http://${host}${req.url ?? '/'}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((item) => headers.append(k, item));
      else if (v !== undefined) headers.set(k, v);
    }
    const chunks: Buffer[] = [];
    if (method !== 'GET' && method !== 'HEAD') {
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const response = await worker.fetch(new Request(url, { method, headers, body }), env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(method === 'HEAD' ? undefined : buf);
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`✓ Local Worker preview running at http://localhost:${port}`);
    console.log(`  Audit locally: bunx @vercel/agent-readability audit http://localhost:${port}`);
  });
}
