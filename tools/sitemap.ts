/* ==========================================================================
   Sitemap generator — updates public/sitemap.xml with lastmod from git.
   Run: bun run tools/sitemap.ts  (also wired into `bun run build`)
   ========================================================================== */

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pages: { loc: string; file: string; priority: string }[] = [
  { loc: 'https://www.ivanovishado.dev/', file: 'index.html', priority: '1.0' },
  { loc: 'https://www.ivanovishado.dev/mentorship/', file: 'mentorship/index.html', priority: '0.9' },
];

function lastmod(file: string): string {
  try {
    return execSync(`git log -1 --format=%cI -- ${file}`, { cwd: root })
      .toString().trim().split('T')[0] ?? '';
  } catch {
    return new Date().toISOString().split('T')[0] ?? '';
  }
}

const urls = pages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod(p.file)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

const out = resolve(root, 'public/sitemap.xml');
writeFileSync(out, xml);
console.log(`✓ Sitemap generated → public/sitemap.xml (${pages.length} urls)`);
