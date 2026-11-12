/* ==========================================================================
   Shelf renderer — turns content/shelf.yaml into the markup and JSON-LD for
   /shelf/. Called by the html-partials plugin in vite.config.ts (dev and build).
   ========================================================================== */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '..');
export const shelfFile = resolve(root, 'content/shelf.yaml');

const platforms = { pc: 'PC', switch: 'Switch', ps3: 'PS3', ps4: 'PS4', ps5: 'PS5', xbox: 'Xbox', '3ds': '3DS', nds: 'DS', gba: 'GBA', wii: 'Wii', ngc: 'GameCube' } as const;
type Platform = keyof typeof platforms;
type Kind = 'book' | 'game';

interface Item {
  kind: Kind;
  title: string;
  creator: string;
  year: number;
  platform?: Platform;
  cover?: string;
  note?: string;
  pages?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toItem(raw: unknown, kind: Kind, i: number): Item {
  const r = (raw ?? {}) as Record<string, unknown>;
  const where = `shelf.yaml: ${kind} "${typeof r.title === 'string' ? r.title : `#${i + 1}`}"`;
  const text = (key: string, required: boolean): string | undefined => {
    const v = r[key];
    if (v === undefined && !required) return undefined;
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${where}: "${key}" must be text`);
    return v.trim();
  };
  const title = text('title', true)!;
  const creator = text('creator', true)!;
  if (typeof r.year !== 'number') throw new Error(`${where}: "year" must be a number`);
  const cover = text('cover', false);
  if (cover && !existsSync(resolve(root, 'public/covers', cover))) throw new Error(`${where}: cover not found in public/covers/: ${cover}`);
  if (r.pages !== undefined && typeof r.pages !== 'number') throw new Error(`${where}: "pages" must be a number`);
  const item: Item = { kind, title, creator, year: r.year, cover, note: text('note', false), pages: r.pages };
  if (kind === 'game') {
    const p = text('platform', true)!;
    if (!(p in platforms)) throw new Error(`${where}: unknown platform "${p}" (use ${Object.keys(platforms).join(', ')})`);
    item.platform = p as Platform;
  }
  return item;
}

function loadShelf(): { books: Item[]; games: Item[] } {
  const data = (parse(readFileSync(shelfFile, 'utf-8')) ?? {}) as Record<string, unknown>;
  const list = (key: string, kind: Kind) => {
    const v = data[key] ?? [];
    if (!Array.isArray(v)) throw new Error(`shelf.yaml: "${key}" must be a list`);
    return v.map((raw, i) => toItem(raw, kind, i));
  };
  return { books: list('books', 'book'), games: list('games', 'game') };
}

function renderItem(it: Item): string {
  const platform = it.platform ? platforms[it.platform] : '';
  const cls = `cover cover--${it.kind}`;
  const style = [
    // A book's thickness in mm: about 0.05 mm a page plus the two boards.
    it.pages ? `--depth:${Math.round(it.pages * 0.05 + 6)}` : '',
    // A GBA box is printed card: its side carries on from the edge of the front.
    it.platform === 'gba' && it.cover ? `--art:url('/covers/${esc(it.cover)}')` : '',
  ].filter(Boolean).join(';');
  const attr = (it.platform ? ` data-platform="${it.platform}"` : '') + (style ? ` style="${style}"` : '');
  const cover = it.cover
    ? `<span class="${cls} cover--solid"${attr}><img src="/covers/${esc(it.cover)}" alt="" loading="lazy" decoding="async" /></span>`
    // The typeset cover draws its text from attributes, so the page text holds each title once.
    : `<span class="${cls} cover--type"${attr} data-label="${platform}" data-title="${esc(it.title)}" aria-hidden="true"></span>`;
  return `
          <li class="shelf__item">
            <div class="shelf__stand">${cover}</div>
            <div class="shelf__label">
              <p class="shelf__title">${esc(it.title)}</p>
              <p class="muted">${esc(it.creator)}</p>
              <p class="mono muted">${it.year}${platform ? `  ${platform}` : ''}</p>${it.note ? `
              <p class="shelf__note muted">${esc(it.note)}</p>` : ''}
            </div>
          </li>`;
}

function renderGroup(id: string, heading: string, items: Item[]): string {
  if (!items.length) return '';
  return `
      <section class="section section--tight shelf" aria-labelledby="shelf-${id}">
        <header class="section__head grid">
          <h2 class="h-l c-1-4" id="shelf-${id}">${heading}</h2>
          <p class="mono muted c-9-12">${items.length} ${items.length === 1 ? 'item' : 'items'}</p>
        </header>
        <ul class="shelf__row" data-reveal="sweep">${items.map(renderItem).join('')}
        </ul>
      </section>`;
}

export function renderShelf(): string {
  const { books, games } = loadShelf();
  return renderGroup('books', 'Books', books) + renderGroup('games', 'Games', games);
}

export function shelfJsonLd(): string {
  const { books, games } = loadShelf();
  const entity = (it: Item) => it.kind === 'book'
    ? { '@type': 'Book', name: it.title, author: { '@type': 'Person', name: it.creator }, datePublished: String(it.year) }
    : { '@type': 'VideoGame', name: it.title, author: { '@type': 'Organization', name: it.creator }, datePublished: String(it.year), gamePlatform: platforms[it.platform!] };
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Shelf',
    url: 'https://www.ivanovishado.dev/shelf/',
    itemListElement: [...books, ...games].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { ...entity(it), ...(it.note ? { description: it.note } : {}) },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
}
