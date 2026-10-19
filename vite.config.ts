import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function htmlPartials(): Plugin {
  const dir = resolve(__dirname, 'src/partials');
  // Brand icons come straight from bootstrap-icons (MIT): `<!-- icon:github -->` inlines its SVG.
  const icon = (slug: string) =>
    readFileSync(resolve(__dirname, `node_modules/bootstrap-icons/icons/${slug}.svg`), 'utf-8')
      .replace(/ width="16" height="16"/, '')
      .replace(/class="bi bi-[a-z0-9-]+"/, 'class="icon" aria-hidden="true" focusable="false"')
      .replace(/\s*\n\s*/g, '');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        return html
          .replace(/<!-- partial:(\S+) -->/g, (_, name: string) => readFileSync(resolve(dir, `${name}.html`), 'utf-8'))
          .replace(/<!-- icon:([a-z0-9-]+) -->/g, (_, slug: string) => icon(slug));
      },
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [htmlPartials()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mentorship: resolve(__dirname, 'mentorship/index.html'),
        'work-netflix': resolve(__dirname, 'work/netflix/index.html'),
        'work-mcb-1': resolve(__dirname, 'work/mcb-1/index.html'),
        'work-nubank': resolve(__dirname, 'work/nubank/index.html'),
        'work-wizeline': resolve(__dirname, 'work/wizeline/index.html'),
        trajectory: resolve(__dirname, 'trajectory/index.html'),
        '404': resolve(__dirname, '404.html'),
      },
    },
  },
});
