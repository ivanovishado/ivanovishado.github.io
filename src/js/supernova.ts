/* ==========================================================================
   Supernova — a one-shot, Webb-inspired stellar event for the homepage hero.
   The event is deliberately finite: after four seconds only a still field of
   diffraction stars remains. All points are seeded once in normalized space
   so a resize changes the projection, never the composition.
   ========================================================================== */

type RGB = readonly [number, number, number];

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: RGB;
  bright: boolean;
}

interface Ejecta {
  angle: number;
  distance: number;
  width: number;
  curve: number;
  alpha: number;
  color: RGB;
}

interface Palette {
  core: RGB;
  blue: RGB;
  warm: RGB;
  ink: RGB;
}

interface StarSprite {
  glow: HTMLCanvasElement;
  sharp: HTMLCanvasElement;
  size: number;
}

interface StarSprites {
  core: StarSprite;
  blue: StarSprite;
  warm: StarSprite;
}

type Lifecycle = 'initial' | 'animating' | 'settled' | 'destroyed';

const DURATION = 4000;
const CONTRACTION_END = 600;
const RELEASE_END = 1100;
const EXPANSION_END = 2600;
const SHELL_POINTS = 56;
const MAX_ORDINARY_STARS = 360;
const MAX_BRIGHT_STARS = 5;
const MAX_EJECTA = 64;
const TAU = Math.PI * 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function rgba(color: RGB, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${clamp01(alpha)})`;
}

function parseColor(value: string, fallback: RGB): RGB {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex?.[1]) {
    const digits = hex[1];
    if (digits.length === 3) {
      return [
        Number.parseInt(`${digits[0]}${digits[0]}`, 16),
        Number.parseInt(`${digits[1]}${digits[1]}`, 16),
        Number.parseInt(`${digits[2]}${digits[2]}`, 16),
      ];
    }
    return [
      Number.parseInt(digits.slice(0, 2), 16),
      Number.parseInt(digits.slice(2, 4), 16),
      Number.parseInt(digits.slice(4, 6), 16),
    ];
  }

  const channels = trimmed.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (channels?.[1] && channels[2] && channels[3]) {
    return [
      Math.round(Number(channels[1])),
      Math.round(Number(channels[2])),
      Math.round(Number(channels[3])),
    ];
  }

  return fallback;
}

function readPalette(canvas: HTMLCanvasElement): Palette {
  const styles = canvas.ownerDocument.defaultView?.getComputedStyle(canvas);
  const get = (name: string): string => styles?.getPropertyValue(name) ?? '';
  return {
    core: parseColor(get('--star-core'), [255, 249, 237]),
    blue: parseColor(get('--star-blue'), [169, 207, 255]),
    warm: parseColor(get('--star-warm'), [239, 191, 133]),
    ink: parseColor(get('--color-ink'), [9, 10, 12]),
  };
}

function makeSeededGenerator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

function chooseColor(value: number, palette: Palette): RGB {
  if (value < 0.24) return palette.core;
  if (value < 0.58) return palette.warm;
  return palette.blue;
}

function createElements(palette: Palette): { stars: Star[]; ejecta: Ejecta[]; shellNoise: Float32Array } {
  const random = makeSeededGenerator(0x51a7e2b9);
  const stars: Star[] = [];

  for (let index = 0; index < MAX_ORDINARY_STARS; index += 1) {
    stars.push({
      x: random(),
      y: random(),
      radius: 0.35 + random() * 0.55,
      alpha: 0.16 + random() * 0.3,
      color: chooseColor(random(), palette),
      bright: false,
    });
  }

  for (let index = 0; index < MAX_BRIGHT_STARS; index += 1) {
    stars.push({
      x: 0.54 + random() * 0.4,
      y: 0.08 + random() * 0.82,
      radius: 0.72 + random() * 0.48,
      alpha: 0.7 + random() * 0.22,
      color: chooseColor(random(), palette),
      bright: true,
    });
  }

  const ejecta: Ejecta[] = [];
  for (let index = 0; index < MAX_EJECTA; index += 1) {
    ejecta.push({
      angle: random() * TAU,
      distance: 0.2 + random() * 0.72,
      width: 0.38 + random() * 0.9,
      curve: (random() * 2 - 1) * 0.18,
      alpha: 0.22 + random() * 0.56,
      color: chooseColor(random(), palette),
    });
  }

  const shellNoise = new Float32Array(SHELL_POINTS);
  for (let index = 0; index < SHELL_POINTS; index += 1) {
    shellNoise[index] = random() * 2 - 1;
  }

  return { stars, ejecta, shellNoise };
}

function createCanvas(documentRef: Document, width: number, height: number): HTMLCanvasElement {
  const canvas = documentRef.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function createStarSprite(
  documentRef: Document,
  color: RGB,
  dpr: number,
): StarSprite {
  const size = 48;
  const glow = createCanvas(documentRef, size * dpr, size * dpr);
  const glowContext = glow.getContext('2d');
  if (glowContext) {
    glowContext.scale(dpr, dpr);
    const center = size / 2;
    const gradient = glowContext.createRadialGradient(center, center, 0, center, center, size * 0.5);
    gradient.addColorStop(0, rgba(color, 0.38));
    gradient.addColorStop(0.18, rgba(color, 0.15));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, size, size);
  }

  const sharp = createCanvas(documentRef, size * dpr, size * dpr);
  const sharpContext = sharp.getContext('2d');
  if (sharpContext) {
    sharpContext.scale(dpr, dpr);
    const center = size / 2;
    const axes = [Math.PI / 6, Math.PI / 2, (Math.PI * 5) / 6];
    sharpContext.save();
    sharpContext.globalCompositeOperation = 'lighter';
    sharpContext.lineCap = 'round';
    sharpContext.lineWidth = 0.52;
    sharpContext.strokeStyle = rgba(color, 0.56);
    for (const angle of axes) {
      const dx = Math.cos(angle) * 16;
      const dy = Math.sin(angle) * 16;
      sharpContext.beginPath();
      sharpContext.moveTo(center - dx, center - dy);
      sharpContext.lineTo(center + dx, center + dy);
      sharpContext.stroke();
    }

    sharpContext.lineWidth = 0.36;
    sharpContext.strokeStyle = rgba(color, 0.22);
    sharpContext.beginPath();
    sharpContext.moveTo(center - 6, center);
    sharpContext.lineTo(center + 6, center);
    sharpContext.stroke();
    sharpContext.restore();

    const core = sharpContext.createRadialGradient(center, center, 0, center, center, 2.3);
    core.addColorStop(0, rgba([255, 255, 255], 0.96));
    core.addColorStop(0.34, rgba(color, 0.92));
    core.addColorStop(1, rgba(color, 0));
    sharpContext.fillStyle = core;
    sharpContext.beginPath();
    sharpContext.arc(center, center, 2.3, 0, TAU);
    sharpContext.fill();
  }

  return { glow, sharp, size };
}

export function initSupernova(canvasEl: HTMLCanvasElement | null): () => void {
  if (!canvasEl) return () => {};

  const canvas = canvasEl;
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ctx = context;
  const documentRef = canvas.ownerDocument;
  const palette = readPalette(canvas);
  const { stars, ejecta, shellNoise } = createElements(palette);
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state: Lifecycle = 'initial';
  let width = 0;
  let height = 0;
  let centerX = 0;
  let centerY = 0;
  let scale = 0;
  let dpr = 1;
  let ordinaryCount = 0;
  let brightCount = 0;
  let ejectaCount = 0;
  let starfieldCache: HTMLCanvasElement | null = null;
  let glowCache: HTMLCanvasElement | null = null;
  let starSprites: StarSprites | null = null;
  let glowSize = 0;
  let raf = 0;
  let startedAt = 0;
  let elapsed = 0;
  let hasSize = false;
  let intersectionReady = false;
  let isIntersecting = false;
  let pageVisible = documentRef.visibilityState !== 'hidden';
  let reducedMotion = mediaQuery.matches;
  let cleaned = false;

  function spriteFor(color: RGB): StarSprite | null {
    if (!starSprites) return null;
    if (color === palette.blue) return starSprites.blue;
    if (color === palette.warm) return starSprites.warm;
    return starSprites.core;
  }

  function clearCaches(): void {
    starfieldCache = null;
    glowCache = null;
    starSprites = null;
    glowSize = 0;
  }

  function buildCaches(): void {
    if (!hasSize) return;
    clearCaches();

    starfieldCache = createCanvas(documentRef, width * dpr, height * dpr);
    const starContext = starfieldCache.getContext('2d');
    if (starContext) {
      starContext.scale(dpr, dpr);
      for (let index = 0; index < ordinaryCount; index += 1) {
        const star = stars[index];
        if (!star || star.bright) continue;
        starContext.beginPath();
        starContext.arc(star.x * width, star.y * height, star.radius, 0, TAU);
        starContext.fillStyle = rgba(star.color, star.alpha);
        starContext.fill();
      }
    }

    glowSize = Math.min(520, Math.max(240, Math.min(width, height) * 0.72));
    glowCache = createCanvas(documentRef, glowSize * dpr, glowSize * dpr);
    const glowContext = glowCache.getContext('2d');
    if (glowContext) {
      glowContext.scale(dpr, dpr);
      const center = glowSize / 2;
      const gradient = glowContext.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, rgba(palette.core, 0.95));
      gradient.addColorStop(0.09, rgba(palette.core, 0.58));
      gradient.addColorStop(0.26, rgba(palette.warm, 0.2));
      gradient.addColorStop(0.54, rgba(palette.blue, 0.1));
      gradient.addColorStop(0.82, rgba(palette.ink, 0.025));
      gradient.addColorStop(1, rgba(palette.ink, 0));
      glowContext.fillStyle = gradient;
      glowContext.fillRect(0, 0, glowSize, glowSize);
    }

    starSprites = {
      core: createStarSprite(documentRef, palette.core, dpr),
      blue: createStarSprite(documentRef, palette.blue, dpr),
      warm: createStarSprite(documentRef, palette.warm, dpr),
    };
  }

  function drawCachedStars(starReveal: number, brightReveal: number): void {
    if (starfieldCache) {
      ctx.save();
      ctx.globalAlpha = clamp01(starReveal);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(starfieldCache, 0, 0, width, height);
      ctx.restore();
    }

    if (!starSprites || brightReveal <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < brightCount; index += 1) {
      const star = stars[MAX_ORDINARY_STARS + index];
      if (!star) continue;
      const sprite = spriteFor(star.color);
      if (!sprite) continue;
      const size = sprite.size * (0.86 + star.radius * 0.18);
      const x = star.x * width - size / 2;
      const y = star.y * height - size / 2;
      ctx.globalAlpha = star.alpha * clamp01(brightReveal);
      ctx.drawImage(sprite.glow, x, y, size, size);
      ctx.drawImage(sprite.sharp, x, y, size, size);
    }
    ctx.restore();
  }

  function drawGlow(shellRadius: number, shellAlpha: number, coreAlpha: number): void {
    if (!glowCache || glowSize <= 0 || shellAlpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const broadSize = glowSize * (0.2 + clamp01(shellRadius / 0.72) * 0.86);
    ctx.globalAlpha = shellAlpha * 0.68;
    ctx.drawImage(glowCache, centerX - broadSize / 2, centerY - broadSize / 2, broadSize, broadSize);

    if (starSprites) {
      const sharpSize = Math.max(30, glowSize * (0.055 + clamp01(coreAlpha) * 0.12));
      ctx.globalAlpha = coreAlpha * 0.76;
      ctx.drawImage(
        starSprites.core.glow,
        centerX - sharpSize / 2,
        centerY - sharpSize / 2,
        sharpSize,
        sharpSize,
      );
    }
    ctx.restore();
  }

  function drawIrregularShell(shellRadius: number, shellAlpha: number, coreAlpha: number, phase: number): void {
    if (shellAlpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const outerRadius = Math.max(1, shellRadius * scale * 0.72);

    // Smooth adjoining control points keep the shell gaseous rather than jagged.
    const radiusAt = (index: number, radius: number): number => {
      const i = (index + SHELL_POINTS) % SHELL_POINTS;
      const noise = ((shellNoise[(i + SHELL_POINTS - 1) % SHELL_POINTS] ?? 0)
        + (shellNoise[i] ?? 0) * 2 + (shellNoise[(i + 1) % SHELL_POINTS] ?? 0)) / 4;
      return radius * (1 + noise * 0.055 + Math.sin(i * TAU / SHELL_POINTS * 3 + phase * 0.12) * 0.045);
    };
    const traceShell = (radius: number): void => {
      ctx.beginPath();
      for (let index = 0; index <= SHELL_POINTS; index += 1) {
        const angle = index / SHELL_POINTS * TAU;
        const nextAngle = (index + 1) / SHELL_POINTS * TAU;
        const r = radiusAt(index, radius);
        const next = radiusAt(index + 1, radius);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r * 0.88;
        const midX = (x + centerX + Math.cos(nextAngle) * next) / 2;
        const midY = (y + centerY + Math.sin(nextAngle) * next * 0.88) / 2;
        if (index === 0) ctx.moveTo(midX, midY);
        else ctx.quadraticCurveTo(x, y, midX, midY);
      }
      ctx.closePath();
    };

    // Several translucent widths feather the rim without a full-canvas blur.
    for (let layer = 0; layer < 2; layer += 1) {
      const radius = outerRadius * (layer === 0 ? 1 : 0.7);
      const color = layer === 0 ? palette.blue : palette.warm;
      traceShell(radius);
      for (let pass = 3; pass >= 0; pass -= 1) {
        ctx.lineWidth = Math.max(1, radius * (0.012 + pass * 0.024));
        ctx.strokeStyle = rgba(color, shellAlpha * (pass === 0 ? 0.15 : 0.055));
        ctx.stroke();
      }
    }

    if (glowCache && coreAlpha > 0) {
      const coreSize = Math.max(40, scale * (0.09 + coreAlpha * 0.12));
      ctx.globalAlpha = coreAlpha;
      ctx.drawImage(glowCache, centerX - coreSize / 2, centerY - coreSize / 2, coreSize, coreSize);
      if (starSprites) {
        const sharpSize = Math.max(24, coreSize * 0.65);
        ctx.drawImage(starSprites.core.sharp, centerX - sharpSize / 2, centerY - sharpSize / 2, sharpSize, sharpSize);
      }
    }
    ctx.restore();
  }

  function drawFilaments(eventProgress: number, filamentAlpha: number): void {
    if (filamentAlpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (let index = 0; index < ejectaCount; index += 1) {
      const item = ejecta[index];
      if (!item) continue;
      const reveal = smoothstep(item.distance * 0.34, item.distance * 0.92, eventProgress);
      if (reveal <= 0) continue;
      const length = item.distance * scale * (0.06 + easeOutCubic(reveal) * 0.66);
      const directionX = Math.cos(item.angle);
      const directionY = Math.sin(item.angle);
      const normalX = -directionY;
      const normalY = directionX;
      const curve = item.curve * scale * smoothstep(0, 1, reveal);
      const endX = centerX + directionX * length;
      const endY = centerY + directionY * length;
      const control1X = centerX + directionX * length * 0.3 + normalX * curve;
      const control1Y = centerY + directionY * length * 0.3 + normalY * curve;
      const control2X = centerX + directionX * length * 0.8 - normalX * curve * 0.7;
      const control2Y = centerY + directionY * length * 0.8 - normalY * curve * 0.7;
      const alpha = filamentAlpha * item.alpha * smoothstep(0.02, 0.2, reveal);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
      ctx.lineWidth = Math.max(1, item.width * 4.8);
      ctx.strokeStyle = rgba(item.color, alpha * 0.11);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
      ctx.lineWidth = Math.max(0.42, item.width * (0.34 + reveal * 0.56));
      ctx.strokeStyle = rgba(item.color, alpha * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFinal(): void {
    if (!hasSize) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawCachedStars(1, 1);
    elapsed = DURATION;
    canvas.dataset.rendered = 'true';
  }

  function drawAt(time: number): void {
    if (!hasSize) return;
    const current = Math.min(DURATION, Math.max(0, time));
    const normalized = current / DURATION;
    const starReveal = 0.26 + easeOutCubic(normalized) * 0.74;
    const brightReveal = smoothstep(0.42, 0.95, normalized);

    let shellRadius = 0.1;
    let shellAlpha = 0;
    let coreAlpha = 0;
    let filamentProgress = 0;
    let filamentAlpha = 0;

    if (current < CONTRACTION_END) {
      const progress = easeOutCubic(current / CONTRACTION_END);
      shellRadius = 0.13 - progress * 0.075;
      shellAlpha = 0.42 + progress * 0.12;
      coreAlpha = 0.42 + progress * 0.16;
    } else if (current < RELEASE_END) {
      const progress = easeOutCubic((current - CONTRACTION_END) / (RELEASE_END - CONTRACTION_END));
      shellRadius = 0.055 + progress * 0.14;
      shellAlpha = 0.5 + progress * 0.24;
      coreAlpha = 0.58 + progress * 0.26;
      filamentProgress = progress * 0.22;
      filamentAlpha = progress * 0.38;
    } else if (current < EXPANSION_END) {
      const progress = easeOutCubic((current - RELEASE_END) / (EXPANSION_END - RELEASE_END));
      shellRadius = 0.195 + progress * 0.55;
      shellAlpha = 0.74 - progress * 0.43;
      coreAlpha = 0.8 - progress * 0.68;
      filamentProgress = 0.18 + progress * 0.82;
      filamentAlpha = 0.42 + progress * 0.5;
    } else {
      const progress = smoothstep(0, 1, (current - EXPANSION_END) / (DURATION - EXPANSION_END));
      shellRadius = 0.745 + progress * 0.18;
      shellAlpha = 0.31 * (1 - progress);
      coreAlpha = 0.12 * (1 - progress);
      filamentProgress = 1;
      filamentAlpha = 0.92 * (1 - progress);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawCachedStars(starReveal, brightReveal);
    drawGlow(shellRadius, shellAlpha, coreAlpha);
    drawIrregularShell(shellRadius, shellAlpha, coreAlpha, current * 0.0021);
    drawFilaments(filamentProgress, filamentAlpha);
    canvas.dataset.rendered = 'true';
  }

  function settle(): void {
    if (state === 'destroyed' || state === 'settled') return;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    state = 'settled';
    if (hasSize) drawFinal();
  }

  function frame(timestamp: number): void {
    if (state !== 'animating') return;
    elapsed = Math.min(DURATION, Math.max(0, timestamp - startedAt));
    if (elapsed >= DURATION) {
      state = 'settled';
      raf = 0;
      drawFinal();
      return;
    }
    drawAt(elapsed);
    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (state !== 'initial' || reducedMotion || !pageVisible || !isIntersecting || !hasSize) return;
    state = 'animating';
    startedAt = performance.now() - elapsed;
    raf = requestAnimationFrame(frame);
  }

  function decideInitialState(): void {
    if (state !== 'initial') return;
    if (reducedMotion || !pageVisible) {
      settle();
      return;
    }
    if (!intersectionReady) return;
    if (!isIntersecting) {
      settle();
      return;
    }
    if (!hasSize) return;
    start();
  }

  function resize(): void {
    if (state === 'destroyed') return;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = rect.width;
    const nextHeight = rect.height;
    if (nextWidth <= 0 || nextHeight <= 0) {
      hasSize = false;
      if (state === 'animating') settle();
      decideInitialState();
      return;
    }

    width = nextWidth;
    height = nextHeight;
    const mobile = width < 880;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    centerX = width * (mobile ? 0.56 : 0.76);
    centerY = mobile ? Math.min(200, height * 0.5) : height * 0.44;
    scale = Math.min(width, height);
    ordinaryCount = Math.min(
      mobile ? 180 : 360,
      Math.max(mobile ? 100 : 220, Math.round((width * height) / (mobile ? 2400 : 4000))),
    );
    brightCount = mobile ? 3 : 5;
    ejectaCount = mobile ? 32 : 64;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hasSize = true;
    buildCaches();

    if (state === 'settled') {
      drawFinal();
    } else if (state === 'animating') {
      drawAt(elapsed);
    } else {
      drawAt(0);
      decideInitialState();
    }
  }

  function onIntersection(entries: IntersectionObserverEntry[]): void {
    if (state === 'destroyed') return;
    const entry = entries[0];
    if (!entry) return;
    isIntersecting = entry.isIntersecting;
    intersectionReady = true;
    if (state === 'animating' && !isIntersecting) {
      settle();
      return;
    }
    decideInitialState();
  }

  function onVisibilityChange(): void {
    pageVisible = documentRef.visibilityState !== 'hidden';
    if (!pageVisible && state === 'animating') settle();
    if (state === 'initial') decideInitialState();
  }

  function onReducedMotionChange(event: MediaQueryListEvent): void {
    reducedMotion = event.matches;
    if (reducedMotion && state === 'animating') settle();
    if (state === 'initial') decideInitialState();
  }

  const intersectionObserver = typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(onIntersection, { threshold: 0.01 });
  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(resize);

  mediaQuery.addEventListener('change', onReducedMotionChange);
  documentRef.addEventListener('visibilitychange', onVisibilityChange);
  intersectionObserver?.observe(canvas);
  resizeObserver?.observe(canvas);

  if (!intersectionObserver) {
    intersectionReady = true;
    isIntersecting = true;
  }
  resize();

  if (reducedMotion && hasSize) settle();

  return () => {
    if (cleaned) return;
    cleaned = true;
    state = 'destroyed';
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    mediaQuery.removeEventListener('change', onReducedMotionChange);
    documentRef.removeEventListener('visibilitychange', onVisibilityChange);
    clearCaches();
    canvas.removeAttribute('data-rendered');
  };
}
