/* Validate the production HTML, agent discovery files, schema, and Worker behavior after a Vite build. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import worker from '../worker/index';
import { createDistAssets } from './serve-worker';

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
  if (node['@type'] === 'ImageObject' && typeof node.url === 'string' && node.url.startsWith(origin)) {
    assert(existsSync(resolve(root, new URL(node.url).pathname.slice(1))), `Missing schema ImageObject: ${node.url}`);
  }
  Object.values(node).forEach(inspect);
}

for (const path of ['', 'mentorship/', 'resume/']) {
  const html = read(`${path}index.html`);
  const canonical = `${origin}/${path}`;
  assert(html.includes(`rel="canonical" href="${canonical}"`), `Canonical: ${path}`);
  assert(html.includes('rel="alternate" type="text/markdown"'), `Markdown alternate link: ${path}`);
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
  if (path === '') {
    const org = graph['@graph'].find((node) => {
      const t = node['@type'];
      return t === 'Organization' || (Array.isArray(t) && t.includes('Organization'));
    });
    assert(org, 'Missing top-level Organization schema node');
    assert(org.contactPoint, 'Organization schema missing contactPoint');
    assert(org.address, 'Organization schema missing address');
  }
  if (path === 'mentorship/' || path === 'resume/') {
    const faq = graph['@graph'].find(node => node['@type'] === 'FAQPage');
    const questions = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    const clean = (text: string) => text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim();
    const visible = [...html.matchAll(/<summary>(.*?)<\/summary>\s*<p class="faq__a">([\s\S]*?)<\/p>/g)];
    assert.equal(questions.length, visible.length, `FAQ count mismatch on ${path}`);
    visible.forEach((match, i) => {
      assert.equal(questions[i]?.name, clean(match[1]!), `FAQ question mismatch on ${path} #${i}`);
      assert.equal(questions[i]?.acceptedAnswer.text, clean(match[2]!), `FAQ answer mismatch on ${path} #${i}`);
    });
  }
  if (path === 'mentorship/') {
    assert(html.includes('500 MXN'));
    assert(!/first conversation is on me|first session is free/i.test(html));
  }
  if (path === 'resume/') {
    const profilePage = graph['@graph'].find(node => node['@type'] === 'ProfilePage');
    const person = graph['@graph'].find(node => node['@type'] === 'Person');
    assert(profilePage, 'Resume page missing ProfilePage schema node');
    assert(person && person.hasOccupation, 'Resume page Person schema missing hasOccupation');
    assert(!/[—–]/.test(html), 'resume/index.html must not contain em or en dashes');
  }
}
references.forEach(id => assert(ids.has(id), `Unresolved entity: ${id}`));
assert(read('404.html').includes('content="noindex, follow"'));
assert(read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`));
assert(read('index.html').includes('href="/resume/"'), 'Home / footer missing /resume/ link');

// Verify /privacy/ trust anchor (>500 chars visible text, in sitemap & footer).
const privacyHtml = read('privacy/index.html');
const privacyText = privacyHtml.match(/<main[\s\S]*?<\/main>/)?.[0]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
assert(privacyText.length >= 500, `Privacy page too short (${privacyText.length} chars)`);
assert(sitemap.includes(`<loc>${origin}/privacy/</loc>`), 'Sitemap missing /privacy/');
assert(read('index.html').includes('href="/privacy/"'), 'Footer missing /privacy/ link');

// Verify all pages have Markdown alternates and .md mirrors with frontmatter.
const pagePaths = ['', 'resume/', 'mentorship/', 'work/netflix/', 'work/mcb-1/', 'work/nubank/', 'work/wizeline/', 'trajectory/', 'shelf/', 'privacy/'];
for (const p of pagePaths) {
  assert(read(`${p}index.html`).includes('rel="alternate" type="text/markdown"'), `Missing alternate link on /${p}`);
  const md = read(`${p}index.md`);
  assert(md.startsWith('---\n'), `Missing frontmatter in ${p}index.md`);
}
const resumeMd = read('resume/index.md');
for (const key of ['title:', 'description:', 'canonical_url:', 'last_updated:']) {
  assert(resumeMd.includes(key), `resume/index.md missing frontmatter key ${key}`);
}
assert(read('404.md').length >= 100 && read('404.md').includes('/llms.txt'), '404.md missing recovery guidance');

// Verify llms.txt, llms-full.txt, sitemap.md, and MCP discovery manifests.
const llms = read('llms.txt');
assert(llms.startsWith('# '), 'llms.txt must start with H1');
assert(/\n> .+/.test(llms), 'llms.txt must include blockquote summary');
assert(/when to (use|recommend)/i.test(llms), 'llms.txt missing when-to-use guidance');
assert(llms.includes(`${origin}/resume/`), 'llms.txt missing /resume/ link');
assert(read('llms-full.txt').includes('https://cal.com/ivan-galaviz-qtcayv/mentoring'), 'llms-full.txt missing booking URL');
assert(read('llms-full.txt').includes(`${origin}/resume/`), 'llms-full.txt missing /resume/ content');
assert(read('sitemap.md').includes(`${origin}/mentorship/`), 'sitemap.md missing mentorship link');
assert(read('sitemap.md').includes(`${origin}/resume/`), 'sitemap.md missing resume link');

for (const manifest of ['.well-known/mcp/server-card.json', '.well-known/mcp.json', '.well-known/ai-catalog.json', 'mcp/server-card']) {
  assert(JSON.parse(read(manifest)), `Invalid JSON in ${manifest}`);
}

// Verify Worker behavior in-process against dist/.
const env = { ASSETS: createDistAssets(root) };

const mdHome = await worker.fetch(new Request(`${origin}/`, { headers: { Accept: 'text/markdown' } }), env);
assert.equal(mdHome.status, 200);
assert(mdHome.headers.get('Content-Type')?.startsWith('text/markdown'));
assert(mdHome.headers.get('Vary')?.toLowerCase().includes('accept'));
assert((await mdHome.text()).includes('# Ivan Galaviz'));

const htmlHome = await worker.fetch(new Request(`${origin}/`, { headers: { Accept: 'text/html' } }), env);
assert.equal(htmlHome.status, 200);
assert(htmlHome.headers.get('Content-Type')?.startsWith('text/html'));
assert(htmlHome.headers.get('Vary')?.toLowerCase().includes('accept'));

const uaHome = await worker.fetch(new Request(`${origin}/mentorship/`, { headers: { 'User-Agent': 'ClaudeBot/1.0' } }), env);
assert.equal(uaHome.status, 200);
assert(uaHome.headers.get('Content-Type')?.startsWith('text/markdown'));

const mdResume = await worker.fetch(new Request(`${origin}/resume/`, { headers: { Accept: 'text/markdown' } }), env);
assert.equal(mdResume.status, 200);
assert(mdResume.headers.get('Content-Type')?.startsWith('text/markdown'));
assert(mdResume.headers.get('Vary')?.toLowerCase().includes('accept'));
assert((await mdResume.text()).includes('# Resume & Engineering Profile'));

const uaResume = await worker.fetch(new Request(`${origin}/resume/`, { headers: { 'User-Agent': 'ClaudeBot/1.0' } }), env);
assert.equal(uaResume.status, 200);
assert(uaResume.headers.get('Content-Type')?.startsWith('text/markdown'));

const htmlResume = await worker.fetch(new Request(`${origin}/resume/`, { headers: { Accept: 'text/html' } }), env);
assert.equal(htmlResume.status, 200);
assert(htmlResume.headers.get('Content-Type')?.startsWith('text/html'));
assert(htmlResume.headers.get('Vary')?.toLowerCase().includes('accept'));

const md404 = await worker.fetch(new Request(`${origin}/definitely-missing-route`, { headers: { Accept: 'text/markdown' } }), env);
assert.equal(md404.status, 404);
assert(md404.headers.get('Content-Type')?.startsWith('text/markdown'));
assert((await md404.text()).includes('/llms.txt'));

const mcpInit = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  }),
  env,
);
assert.equal(mcpInit.status, 200);
const initJson = (await mcpInit.json()) as { result: { serverInfo: { name: string } } };
assert.equal(initJson.result.serverInfo.name, 'ivanovishado-mentorship');

const mcpFit = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'check_mentorship_fit', arguments: { goal: 'system design interview in Spanish', language: 'es' } },
    }),
  }),
  env,
);
assert.equal(mcpFit.status, 200);
const fitJson = (await mcpFit.json()) as { result: { structuredContent: { bookingUrl: string } } };
assert.equal(fitJson.result.structuredContent.bookingUrl, 'https://cal.com/ivan-galaviz-qtcayv/mentoring');

const mcpPrefill = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_booking_link', arguments: { slot: '2026-11-29T18:00:00.000-06:00', name: 'Ana', notes: 'AI system design' } },
    }),
  }),
  env,
);
assert.equal(mcpPrefill.status, 200);
const prefillJson = (await mcpPrefill.json()) as { result: { structuredContent: { bookingUrl: string; eventTypeId: number } } };
assert(prefillJson.result.structuredContent.bookingUrl.includes('slot=2026-11-29'));
assert(prefillJson.result.structuredContent.bookingUrl.includes('name=Ana'));
assert.equal(prefillJson.result.structuredContent.eventTypeId, 4355389);

const mcpCandidate = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_candidate_profile', arguments: { focus: 'ai', language: 'es' } },
    }),
  }),
  env,
);
assert.equal(mcpCandidate.status, 200);
const candidateJson = (await mcpCandidate.json()) as {
  result: { structuredContent: { recruiterIntake: { email: string }; language: string; competencies: { slug: string }[] } };
};
assert.equal(candidateJson.result.structuredContent.recruiterIntake.email, 'me@ivanovishado.dev');
assert.equal(candidateJson.result.structuredContent.language, 'Spanish');
assert.equal(candidateJson.result.structuredContent.competencies.length, 1);
assert.equal(candidateJson.result.structuredContent.competencies[0]?.slug, 'ai-engineering');

const mcpRoleFit = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'evaluate_role_fit',
        arguments: { roleTitle: 'Staff AI Systems Engineer', requirements: ['LLM orchestration', 'MCP', 'distributed systems', 'Java'], level: 'staff', location: 'US remote' },
      },
    }),
  }),
  env,
);
assert.equal(mcpRoleFit.status, 200);
const roleFitJson = (await mcpRoleFit.json()) as {
  result: { structuredContent: { fit: string; resumeUrl: string; matchedCompetencies: { slug: string }[] } };
};
assert.equal(roleFitJson.result.structuredContent.fit, 'strong_fit');
assert.equal(roleFitJson.result.structuredContent.resumeUrl, `${origin}/resume/`);
assert(roleFitJson.result.structuredContent.matchedCompetencies.length >= 2);

const mcpResumeRes = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'resources/read',
      params: { uri: 'ivanovishado://resume.md' },
    }),
  }),
  env,
);
assert.equal(mcpResumeRes.status, 200);
const resumeResJson = (await mcpResumeRes.json()) as { result: { contents: { text: string }[] } };
assert(resumeResJson.result.contents[0]?.text.includes('# Resume & Engineering Profile'));

const mcpTooLarge = await worker.fetch(
  new Request(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'x'.repeat(9000),
  }),
  env,
);
assert.equal(mcpTooLarge.status, 413);

console.log('SEO & agentic checks passed: canonical URLs, sitemap, entity references, FAQ parity, privacy, llms.txt, .md mirrors, Worker negotiation, 404 Markdown, and MCP server.');
