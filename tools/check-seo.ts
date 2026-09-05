/* Validate the production HTML and discoverability files after a Vite build. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '../dist');
const origin = 'https://www.ivanovishado.dev';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const sitemap = read('sitemap.xml');
const ids = new Set<string>();
const references: string[] = [];

function inspect(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(inspect); return; }
  if (!value || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  if (typeof node['@id'] === 'string') {
    if (node['@type']) ids.add(node['@id']);
    else references.push(node['@id']);
  }
  if (typeof node.image === 'string' && node.image.startsWith(origin)) {
    assert(existsSync(resolve(root, new URL(node.image).pathname.slice(1))), `Missing schema image: ${node.image}`);
  }
  Object.values(node).forEach(inspect);
}

for (const path of ['', 'mentorship/']) {
  const html = read(`${path}index.html`);
  const canonical = `${origin}/${path}`;
  assert(html.includes(`rel="canonical" href="${canonical}"`), `Canonical: ${path}`);
  assert(sitemap.includes(`<loc>${canonical}</loc>`), `Sitemap missing ${canonical}`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert(!/content="[^"]*noindex/.test(html));
  assert(/<meta\s+name="description"\s+content="[^"]+"/.test(html));
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert(json, `Missing JSON-LD: ${path}`);
  const graph = JSON.parse(json) as { '@graph': Record<string, unknown>[] };
  inspect(graph);
  const og = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  assert(og && existsSync(resolve(root, new URL(og).pathname.slice(1))), 'Missing OG image');
  if (path) {
    const faq = graph['@graph'].find(node => node['@type'] === 'FAQPage');
    const questions = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    const clean = (text: string) => text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim();
    const visible = [...html.matchAll(/<summary>(.*?)<\/summary>\s*<p class="faq__a">([\s\S]*?)<\/p>/g)];
    assert.equal(questions.length, visible.length);
    visible.forEach((match, i) => {
      assert.equal(questions[i]?.name, clean(match[1]!));
      assert.equal(questions[i]?.acceptedAnswer.text, clean(match[2]!));
    });
    assert(html.includes('500 MXN'));
    assert(!/first conversation is on me|first session is free/i.test(html));
  }
}
references.forEach(id => assert(ids.has(id), `Unresolved entity: ${id}`));
assert(read('404.html').includes('content="noindex, follow"'));
assert(read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`));
console.log('SEO checks passed: canonical URLs, sitemap, entity references, FAQ parity, pricing, images, and 404 indexing.');
