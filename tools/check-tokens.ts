/* Validate design token usage and parity across CSS, TypeScript, HTML, and DESIGN.md. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cssPath = resolve(root, 'src/styles/site.css');
const designPath = resolve(root, 'DESIGN.md');
const headPartialRel = 'src/partials/site-head.html';

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const CSS_COLOR_FN_RE = /\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch|color)\(/gi;
const TS_COLOR_FN_RE = /\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(\s*[\d.]/gi;
const NAMED_COLORS = `
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
  cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
  midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen
`.trim().split(/\s+/).join('|');
const NAMED_COLOR_RE = new RegExp(`(?<![\\w.#-])(?:${NAMED_COLORS})(?![\\w(-])`, 'gi');
const TS_NAMED_COLOR_RE = new RegExp(`(['"\`])(?:${NAMED_COLORS})\\1`, 'gi');
const TS_READABLE_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TOKEN_OK_RE = /token-ok\s*:\s*\S/;
const ROOT_PREFIX_RE = /^--(?:c|t|f|z|e)-/;
const SKIP_DIRS = new Set(['dist', 'node_modules', '.git', '.agents', '.devin']);

const errors: string[] = [];
const fail = (file: string, line: number, message: string) => {
  errors.push(`${file}:${line}: ${message}`);
};

const normColor = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function blankStringsAndUrls(src: string): string {
  return src.replace(/url\([^)]*\)|'[^']*'|"[^"]*"/g, (m) => ' '.repeat(m.length));
}

function stripBlockCommentsPreserveLines(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function lineNumberAt(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

function walkFiles(dir: string, ext: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, ext, out);
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

// 1. Parse :root tokens and local custom property declarations from src/styles/site.css.
const cssRaw = readFileSync(cssPath, 'utf8');
const cssClean = stripBlockCommentsPreserveLines(cssRaw);
const rootMatch = /:root\s*\{([\s\S]*?)\}/.exec(cssClean);
if (!rootMatch || rootMatch.index === undefined) {
  console.error('src/styles/site.css:1: missing :root block');
  process.exit(1);
}

const rootStart = rootMatch.index;
const rootEnd = rootStart + rootMatch[0].length;
const rootTokens = new Map<string, string>();
for (const m of rootMatch[1]!.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
  rootTokens.set(m[1]!, m[2]!.trim());
}
const colorTokens = new Map([...rootTokens].filter(([k]) => k.startsWith('--c-')));

// Collect all custom properties declared in CSS blocks, HTML inline styles, and TS/tooling.
const definedVars = new Set<string>(rootTokens.keys());

function collectCssBlockVars(src: string): void {
  let depth = 0;
  let token = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === '{') { depth++; token = ''; continue; }
    if (ch === '}') { depth = Math.max(0, depth - 1); token = ''; continue; }
    if (depth > 0) token += ch;
    if (depth > 0 && (ch === ';' || src[i + 1] === '}')) {
      const m = /^\s*(--[a-zA-Z0-9_-]+)\s*:/.exec(token);
      if (m) definedVars.add(m[1]!);
      token = '';
    }
  }
}
collectCssBlockVars(cssClean);

const htmlFiles = walkFiles(root, '.html');
const tsFiles = [...walkFiles(resolve(root, 'src/js'), '.ts'), resolve(root, 'tools/shelf.ts')];

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)) {
    for (const v of m[1]!.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) definedVars.add(v[1]!);
  }
}
for (const file of tsFiles) {
  const ts = readFileSync(file, 'utf8');
  for (const m of ts.matchAll(/setProperty\(\s*['"](--[a-zA-Z0-9_-]+)['"]/g)) definedVars.add(m[1]!);
  for (const m of ts.matchAll(/`[^`]*(--[a-zA-Z0-9_-]+)\s*:/g)) definedVars.add(m[1]!);
}

function checkVarRefs(file: string, text: string, baseOffset: number, fullSrc: string): void {
  for (const m of text.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
    const name = m[1]!;
    const line = lineNumberAt(fullSrc, baseOffset + (m.index ?? 0));
    if (ROOT_PREFIX_RE.test(name)) {
      if (!rootTokens.has(name)) fail(file, line, `undefined design token "${name}" (not in :root)`);
    } else if (!definedVars.has(name)) {
      fail(file, line, `undefined CSS custom property "${name}"`);
    }
  }
}

// 2. Check src/styles/site.css outside :root for raw colors and undefined var() refs.
const cssRel = relative(root, cssPath);
checkVarRefs(cssRel, cssClean, 0, cssRaw);

const cssRawLines = cssRaw.split('\n');
{
  let depth = 0;
  let inValue = false;
  let valStart = 0;
  let valBuf = '';

  const flushDecl = () => {
    if (!inValue) return;
    const inRoot = valStart >= rootStart && valStart < rootEnd;
    if (!inRoot) {
      for (const m of valBuf.matchAll(HEX_RE)) {
        const line = lineNumberAt(cssRaw, valStart + (m.index ?? 0));
        if (!TOKEN_OK_RE.test(cssRawLines[line - 1] ?? '')) {
          fail(cssRel, line, `raw color literal "${m[0]}" outside :root; use a --c-* token`);
        }
      }
      for (const m of valBuf.matchAll(CSS_COLOR_FN_RE)) {
        const line = lineNumberAt(cssRaw, valStart + (m.index ?? 0));
        if (!TOKEN_OK_RE.test(cssRawLines[line - 1] ?? '')) {
          fail(cssRel, line, `raw color function "${m[0]}...)" outside :root; use a --c-* token or color-mix()`);
        }
      }
      for (const m of blankStringsAndUrls(valBuf).matchAll(NAMED_COLOR_RE)) {
        const line = lineNumberAt(cssRaw, valStart + (m.index ?? 0));
        if (!TOKEN_OK_RE.test(cssRawLines[line - 1] ?? '')) {
          fail(cssRel, line, `named color "${m[0]}" outside :root; use a --c-* token`);
        }
      }
    }
    inValue = false;
    valBuf = '';
  };

  for (let i = 0; i < cssClean.length; i++) {
    const ch = cssClean[i]!;
    if (ch === '{') { flushDecl(); depth++; continue; }
    if (ch === '}') { flushDecl(); depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) continue;
    if (ch === ';') { flushDecl(); continue; }
    if (!inValue && ch === ':') {
      // Distinguish pseudo-classes in nested @media selectors from property declarations by checking if a '{' comes before ';' or '}'.
      const nextBrace = cssClean.indexOf('{', i + 1);
      const nextSemi = cssClean.indexOf(';', i + 1);
      const nextClose = cssClean.indexOf('}', i + 1);
      const nextStop = Math.min(nextSemi === -1 ? Infinity : nextSemi, nextClose === -1 ? Infinity : nextClose);
      if (nextBrace !== -1 && nextBrace < nextStop) continue;
      inValue = true;
      valStart = i + 1;
      valBuf = '';
      continue;
    }
    if (inValue) valBuf += ch;
  }
  flushDecl();
}

// 3. Check TypeScript sources under src/js/ for raw color literals and undefined token reads.
for (const file of tsFiles) {
  const rel = relative(root, file);
  const raw = readFileSync(file, 'utf8');
  const noBlock = stripBlockCommentsPreserveLines(raw);
  const rawLines = raw.split('\n');
  const cleanLines = noBlock.split('\n');

  cleanLines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const rawLine = rawLines[idx] ?? '';
    if (TOKEN_OK_RE.test(rawLine)) return;
    // Strip // line comments outside simple URLs (keep http:// and https://).
    const code = line.replace(/(^|[^:])\/\/.*$/, '$1');
    for (const m of code.matchAll(HEX_RE)) {
      if ((m.index ?? 0) > 0 && code[(m.index ?? 0) - 1] === '/') continue;
      fail(rel, lineNo, `raw hex color "${m[0]}" in TS; read a CSS token or document with "// token-ok: <reason>"`);
    }
    for (const m of code.matchAll(TS_COLOR_FN_RE)) {
      fail(rel, lineNo, `raw color literal "${m[0]}...)" in TS; derive from CSS tokens`);
    }
    for (const m of code.matchAll(TS_NAMED_COLOR_RE)) {
      fail(rel, lineNo, `named color ${m[0]} in TS; read a CSS token or document with "// token-ok: <reason>"`);
    }
    for (const m of code.matchAll(/['"](--(?:c|t|f|z|e)-[a-zA-Z0-9_-]+)['"]/g)) {
      const name = m[1]!;
      const value = rootTokens.get(name);
      if (value === undefined) fail(rel, lineNo, `undefined design token "${name}" referenced in TS`);
      else if (name.startsWith('--c-') && !TS_READABLE_RE.test(value)) {
        fail(rel, lineNo, `design token "${name}" is read in TS, so its :root value must be a hex color (found "${value}")`);
      }
    }
  });
}

// 4. Targeted HTML scanning (color presentation attributes, inline style="", and <style> blocks).
const bgExpected = rootTokens.get('--c-bg');
const fgExpected = rootTokens.get('--c-fg');

for (const file of htmlFiles) {
  const rel = relative(root, file);
  const raw = readFileSync(file, 'utf8');
  // Blank out <script> bodies so JSON-LD IDs/URLs never produce false positives.
  const scan = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' '));
  const rawLines = raw.split('\n');

  if (rel === headPartialRel) {
    const themeMatch = /<meta\s+name="theme-color"\s+content="([^"]+)"/i.exec(scan);
    if (!themeMatch) {
      fail(rel, 1, 'missing <meta name="theme-color">');
    } else if (bgExpected && normColor(themeMatch[1]!) !== normColor(bgExpected)) {
      fail(rel, lineNumberAt(raw, themeMatch.index), `theme-color "${themeMatch[1]}" does not match --c-bg "${bgExpected}"`);
    }

    const styleMatch = /<style\b[^>]*>([\s\S]*?)<\/style>/i.exec(scan);
    if (!styleMatch) {
      fail(rel, 1, 'missing inline critical <style> block');
    } else {
      const styleLine = lineNumberAt(raw, styleMatch.index);
      const body = styleMatch[1]!;
      const bgMatch = /background\s*:\s*([^;}\s]+)/i.exec(body);
      const fgMatch = /(?:^|[;{\s])color\s*:\s*([^;}\s]+)/i.exec(body);
      if (!bgMatch || !bgExpected || normColor(bgMatch[1]!) !== normColor(bgExpected)) {
        fail(rel, styleLine, `critical <style> background "${bgMatch?.[1] ?? ''}" does not match --c-bg "${bgExpected ?? ''}"`);
      }
      if (!fgMatch || !fgExpected || normColor(fgMatch[1]!) !== normColor(fgExpected)) {
        fail(rel, styleLine, `critical <style> color "${fgMatch?.[1] ?? ''}" does not match --c-fg "${fgExpected ?? ''}"`);
      }
      const allowedCritical = new Set([bgExpected, fgExpected].filter(Boolean).map((c) => normColor(c!)));
      for (const m of body.matchAll(HEX_RE)) {
        if (!allowedCritical.has(normColor(m[0]))) {
          fail(rel, styleLine, `unexpected color "${m[0]}" in critical <style>`);
        }
      }
      for (const m of body.matchAll(CSS_COLOR_FN_RE)) {
        fail(rel, styleLine, `unexpected color function "${m[0]}...)" in critical <style>`);
      }
    }
  } else {
    for (const m of scan.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      const body = m[1]!;
      const offset = (m.index ?? 0) + m[0].indexOf(body);
      checkVarRefs(rel, body, offset, raw);
      for (const hm of body.matchAll(HEX_RE)) {
        const line = lineNumberAt(raw, offset + (hm.index ?? 0));
        if (!TOKEN_OK_RE.test(rawLines[line - 1] ?? '')) fail(rel, line, `raw hex color "${hm[0]}" in inline <style>`);
      }
      for (const fm of body.matchAll(CSS_COLOR_FN_RE)) {
        const line = lineNumberAt(raw, offset + (fm.index ?? 0));
        if (!TOKEN_OK_RE.test(rawLines[line - 1] ?? '')) fail(rel, line, `raw color function "${fm[0]}...)" in inline <style>`);
      }
      for (const nm of blankStringsAndUrls(body).matchAll(NAMED_COLOR_RE)) {
        const line = lineNumberAt(raw, offset + (nm.index ?? 0));
        if (!TOKEN_OK_RE.test(rawLines[line - 1] ?? '')) fail(rel, line, `named color "${nm[0]}" in inline <style>`);
      }
    }
  }

  // Presentation color attributes on HTML/SVG tags (ignores href, id, data-*, entities).
  for (const m of scan.matchAll(/(?<![\w-])(fill|stroke|stop-color|flood-color|lighting-color|color|bgcolor)\s*=\s*["']([^"']*)["']/gi)) {
    const attr = m[1]!;
    const val = m[2]!;
    const idx = m.index ?? 0;
    const line = lineNumberAt(raw, idx);
    if (TOKEN_OK_RE.test(rawLines[line - 1] ?? '')) continue;
    checkVarRefs(rel, val, idx, raw);
    for (const hm of val.matchAll(HEX_RE)) {
      fail(rel, line, `raw color "${hm[0]}" in ${attr} attribute; move styling to src/styles/site.css with a --c-* token`);
    }
    for (const fm of val.matchAll(CSS_COLOR_FN_RE)) {
      fail(rel, line, `raw color function "${fm[0]}...)" in ${attr} attribute; move styling to src/styles/site.css`);
    }
    for (const nm of val.matchAll(NAMED_COLOR_RE)) {
      fail(rel, line, `named color "${nm[0]}" in ${attr} attribute; move styling to src/styles/site.css with a --c-* token`);
    }
  }

  // Inline style="..." attributes.
  for (const m of scan.matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)) {
    const val = m[1]!;
    const idx = m.index ?? 0;
    const line = lineNumberAt(raw, idx);
    if (TOKEN_OK_RE.test(rawLines[line - 1] ?? '')) continue;
    checkVarRefs(rel, val, idx, raw);
    for (const hm of val.matchAll(HEX_RE)) {
      fail(rel, line, `raw color "${hm[0]}" in inline style attribute; use a CSS class or --c-* token`);
    }
    for (const fm of val.matchAll(CSS_COLOR_FN_RE)) {
      fail(rel, line, `raw color function "${fm[0]}...)" in inline style attribute; use a CSS class or --c-* token`);
    }
    for (const nm of blankStringsAndUrls(val).matchAll(NAMED_COLOR_RE)) {
      fail(rel, line, `named color "${nm[0]}" in inline style attribute; use a CSS class or --c-* token`);
    }
  }
}

// 5. Check DESIGN.md palette parity and token references.
const designRel = relative(root, designPath);
const designRaw = readFileSync(designPath, 'utf8');
const paletteHeading = /^### Palette\b/m.exec(designRaw);
if (!paletteHeading || paletteHeading.index === undefined) {
  fail(designRel, 1, 'missing "### Palette" section');
} else {
  const rest = designRaw.slice(paletteHeading.index + paletteHeading[0].length);
  const nextHeading = /\n##+ /.exec(rest);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;
  const sectionOffset = paletteHeading.index + paletteHeading[0].length;
  const documented = new Set<string>();

  for (const m of section.matchAll(/^\|\s*`(--c-[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)) {
    const token = m[1]!;
    const docVal = m[2]!.trim();
    const line = lineNumberAt(designRaw, sectionOffset + (m.index ?? 0));
    documented.add(token);
    const cssVal = colorTokens.get(token);
    if (!cssVal) {
      fail(designRel, line, `palette table documents unknown token "${token}" (not in src/styles/site.css :root)`);
    } else if (normColor(docVal) !== normColor(cssVal)) {
      fail(designRel, line, `palette table value for "${token}" is "${docVal}", expected "${cssVal}" from src/styles/site.css`);
    }
  }

  for (const [token, val] of colorTokens) {
    if (!documented.has(token)) {
      fail(designRel, lineNumberAt(designRaw, paletteHeading.index), `palette table is missing "${token}" (${val}) from src/styles/site.css`);
    }
  }
}

const allowedDocColors = new Set([...colorTokens.values()].map(normColor));
for (const m of designRaw.matchAll(HEX_RE)) {
  if (!allowedDocColors.has(normColor(m[0]))) {
    fail(designRel, lineNumberAt(designRaw, m.index ?? 0), `stale or undocumented color "${m[0]}" in DESIGN.md (not in src/styles/site.css :root)`);
  }
}
for (const m of designRaw.matchAll(/\brgba?\(\s*\d[^)]*\)/gi)) {
  if (!allowedDocColors.has(normColor(m[0]))) {
    fail(designRel, lineNumberAt(designRaw, m.index ?? 0), `stale or undocumented color "${m[0]}" in DESIGN.md (not in src/styles/site.css :root)`);
  }
}
for (const m of designRaw.matchAll(/`(--(?:c|t|f|z|e)-[a-z0-9-]+)`/g)) {
  const name = m[1]!;
  if (!rootTokens.has(name)) {
    fail(designRel, lineNumberAt(designRaw, m.index ?? 0), `undefined design token "${name}" referenced in DESIGN.md`);
  }
}

if (errors.length > 0) {
  console.error(`Design token check failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

console.log(
  `Design token checks passed: ${rootTokens.size} :root tokens (${colorTokens.size} color tokens), ` +
  `src/styles/site.css, ${tsFiles.length} TS files, ${htmlFiles.length} HTML files, and DESIGN.md in parity.`,
);
