/* ==========================================================================
   OG image compositor — bakes branded wordmarks onto generated bases.
   Run: bun run tools/og-image.ts  (also wired into `bun run build`)
   ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { ReactNode } from 'react';
import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const W = 1200;
const H = 675;

const fontData = {
  Fraunces: readFileSync(resolve(__dirname, 'fonts/Fraunces-Regular.ttf')),
  FrauncesItalic: readFileSync(resolve(__dirname, 'fonts/Fraunces-Italic.ttf')),
  JetBrainsMono: readFileSync(resolve(__dirname, 'fonts/JetBrainsMono-Regular.ttf')),
  NeueMontreal: readFileSync(resolve(__dirname, 'fonts/NeueMontreal-Regular.otf')),
};

const fonts: Font[] = [
  { name: 'Fraunces', data: fontData.Fraunces, weight: 400, style: 'normal' },
  { name: 'Fraunces', data: fontData.FrauncesItalic, weight: 400, style: 'italic' },
  { name: 'JetBrainsMono', data: fontData.JetBrainsMono, weight: 400, style: 'normal' },
  { name: 'JetBrainsMono', data: fontData.JetBrainsMono, weight: 500, style: 'normal' },
  { name: 'NeueMontreal', data: fontData.NeueMontreal, weight: 400, style: 'normal' },
];

async function writeJpeg(tree: ReactNode, output: string) {
  const svg = await satori(tree, { width: W, height: H, fonts });
  const pngBuffer = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const jpg = await sharp(pngBuffer).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  writeFileSync(output, jpg);
}

async function build() {
  const base = readFileSync(resolve(__dirname, 'og-image-base.png'));
  const baseDataUri = `data:image/png;base64,${base.toString('base64')}`;

  const mentorshipTree = {
    type: 'div',
    props: {
      style: { width: W, height: H, display: 'flex', position: 'relative' },
      children: [
        {
          type: 'img',
          props: { src: baseDataUri, style: { width: W, height: H, objectFit: 'cover', position: 'absolute', top: 0, left: 0 } },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 64,
              bottom: 56,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'FrauncesItalic',
                    fontSize: 64,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: '#ECE4D2',
                    lineHeight: 1,
                    letterSpacing: -1.5,
                  },
                  children: 'Ivan Galaviz',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'JetBrainsMono',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#E8B04B',
                    letterSpacing: 6,
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  },
                  children: 'Field Notes',
                },
              },
            ],
          },
        },
      ],
    },
  };

  await writeJpeg(mentorshipTree as unknown as ReactNode, resolve(root, 'public/og-image.jpg'));
  console.log(`✓ OG image composited → public/og-image.jpg (${W}×${H})`);

  const starfield = readFileSync(resolve(root, 'public/starfield-fallback.svg'));
  const starfieldDataUri = `data:image/svg+xml;base64,${starfield.toString('base64')}`;
  const portfolioTree = {
    type: 'div',
    props: {
      style: { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#090A0C' },
      children: [
        {
          type: 'img',
          props: {
            src: starfieldDataUri,
            style: { width: 650, height: H, objectFit: 'cover', position: 'absolute', top: 0, right: 0 },
          },
        },
        {
          type: 'div',
          props: { style: { width: 610, height: H, position: 'absolute', top: 0, left: 0, backgroundColor: '#090A0C' } },
        },
        {
          type: 'div',
          props: {
            style: { position: 'absolute', left: 72, top: 242, display: 'flex', flexDirection: 'column', gap: 16 },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'NeueMontreal',
                    fontSize: 86,
                    fontWeight: 400,
                    color: '#ECE4D2',
                    lineHeight: 0.98,
                    letterSpacing: -1.6,
                  },
                  children: 'Ivan Galaviz',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'NeueMontreal',
                    fontSize: 24,
                    fontWeight: 400,
                    color: '#ECE4D2',
                    lineHeight: 1.1,
                  },
                  children: 'Senior Software Engineer',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'JetBrainsMono',
                    fontSize: 15,
                    fontWeight: 400,
                    color: '#E8B04B',
                    letterSpacing: 2.4,
                    lineHeight: 1,
                  },
                  children: 'www.ivanovishado.dev',
                },
              },
            ],
          },
        },
      ],
    },
  };

  await writeJpeg(portfolioTree as unknown as ReactNode, resolve(root, 'public/portfolio-og.jpg'));
  console.log(`✓ OG image composited → public/portfolio-og.jpg (${W}×${H})`);
}

build().catch((error: unknown) => { console.error(error); process.exit(1); });
