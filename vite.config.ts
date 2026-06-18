import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function htmlPartials(): Plugin {
  const dir = resolve(__dirname, 'src/partials');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        return html.replace(/<!-- partial:(\S+) -->/g, (_, name: string) =>
          readFileSync(resolve(dir, `${name}.html`), 'utf-8')
        );
      },
    },
  };
}

export default defineConfig({
  base: './',
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
      },
    },
  },
});
