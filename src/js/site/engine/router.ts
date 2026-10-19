// Adapter for a multi-page static site: same-origin links are fetched, <main> is swapped, and the
// engine lifecycle runs around the swap. Anything the router can't handle falls back to a normal
// navigation (files, new tabs, modifier clicks, pages without a #main).
import { cleanup, enter, leave } from './index';
import { scrollToTarget } from './scroll';

const cache = new Map<string, Promise<Document | null>>();
let busy = false;

function load(href: string) {
  const key = href.split('#')[0]!;
  let p = cache.get(key);
  if (!p) {
    p = fetch(key, { credentials: 'same-origin' })
      .then((r) => (r.ok || r.status === 404 ? r.text() : null))
      .then((t) => (t ? new DOMParser().parseFromString(t, 'text/html') : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

function routable(a: HTMLAnchorElement) {
  if (a.target && a.target !== '_self') return null;
  if (a.hasAttribute('download') || a.dataset.reload !== undefined) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('.html')) return null;
  return url;
}

function swap(doc: Document) {
  document.title = doc.title;
  for (const sel of ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:url"]', 'meta[property="og:title"]']) {
    const next = doc.head.querySelector(sel);
    const cur = document.head.querySelector(sel);
    if (next && cur) cur.replaceWith(document.importNode(next, true));
  }
  const main = document.getElementById('main');
  const next = doc.getElementById('main');
  if (main && next) main.replaceWith(document.importNode(next, true));
  document.body.className = doc.body.className;
}

function announce() {
  const live = document.getElementById('route-announcer');
  if (live) live.textContent = document.title;
  document.getElementById('main')?.focus({ preventScroll: true });
}

async function go(url: URL, opts: { push: boolean; pop?: boolean; y?: number; label?: { title: string; label: string } }) {
  if (busy) return;
  busy = true;
  const docP = load(url.href);
  if (opts.pop) {
    const doc = await docP;
    if (!doc?.getElementById('main')) { location.reload(); return; }
    cleanup();
    swap(doc);
    await enter({ transition: false, scrollY: opts.y ?? 0 });
  } else {
    history.replaceState({ y: scrollY }, '');
    const [, doc] = await Promise.all([leave(opts.label ?? { title: '', label: '' }), docP]);
    if (!doc?.getElementById('main')) { location.assign(url.href); return; }
    cleanup();
    swap(doc);
    if (opts.push) history.pushState({ y: 0 }, '', url.href);
    await enter();
    if (url.hash) scrollToTarget(url.hash);
  }
  announce();
  busy = false;
}

export function initRouter() {
  history.scrollRestoration = 'manual';
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a');
    if (!a) return;
    const url = routable(a);
    if (!url) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      e.preventDefault();
      const target = url.hash ? document.querySelector<HTMLElement>(decodeURIComponent(url.hash)) : null;
      scrollToTarget(target ?? 0);
      if (target?.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      return;
    }
    e.preventDefault();
    const title = a.dataset.title ?? a.textContent?.trim().split('\n')[0] ?? '';
    go(url, { push: true, label: { title, label: a.dataset.coords ?? '' } });
  });
  // Prefetch on intent.
  const prefetch = (e: Event) => {
    const a = (e.target as Element).closest?.('a');
    const url = a && routable(a);
    if (url && url.pathname !== location.pathname) load(url.href);
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);
  addEventListener('popstate', (e) => {
    go(new URL(location.href), { push: false, pop: true, y: (e.state as { y?: number } | null)?.y ?? 0 });
  });
}
