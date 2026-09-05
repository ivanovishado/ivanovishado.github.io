/* Cached Webb-inspired stars, with gentle twinkling while the hero is visible. */

type RGB = readonly [number, number, number];

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: RGB;
  bright: boolean;
}

interface Palette {
  core: RGB;
  blue: RGB;
  warm: RGB;
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

const MAX_ORDINARY_STARS = 360;
const MAX_BRIGHT_STARS = 5;
const TAU = Math.PI * 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
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

function createStars(palette: Palette): Star[] {
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

  return stars;
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
  const stars = createStars(palette);
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let ordinaryCount = 0;
  let brightCount = 0;
  let starfieldCache: HTMLCanvasElement | null = null;
  let starSprites: StarSprites | null = null;
  let raf = 0;
  let hasSize = false;
  let isIntersecting = false;
  let pageVisible = documentRef.visibilityState !== 'hidden';
  let reducedMotion = mediaQuery.matches;
  let cleaned = false;
  let lastTwinkle = 0;
  let twinkleTime = 0;

  function spriteFor(color: RGB): StarSprite | null {
    if (!starSprites) return null;
    if (color === palette.blue) return starSprites.blue;
    if (color === palette.warm) return starSprites.warm;
    return starSprites.core;
  }

  function clearCaches(): void {
    starfieldCache = null;
    starSprites = null;
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
      ctx.globalAlpha = star.alpha * clamp01(brightReveal) * (reducedMotion ? 1 : 0.83 + Math.sin(twinkleTime * (0.00055 + index * 0.00009) + index * 2.4) * 0.17);
      ctx.drawImage(sprite.glow, x, y, size, size);
      ctx.drawImage(sprite.sharp, x, y, size, size);
    }
    ctx.restore();
  }

  function drawFinal(): void {
    if (!hasSize) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawCachedStars(1, 1);
    canvas.dataset.rendered = 'true';
  }

  function updateTwinkle(): void {
    if (cleaned) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (reducedMotion) drawFinal();
    else if (pageVisible && isIntersecting && hasSize) raf = requestAnimationFrame(twinkle);
  }

  function twinkle(timestamp: number): void {
    raf = 0;
    if (cleaned || reducedMotion || !pageVisible || !isIntersecting || !hasSize) return;
    // The cached star field and five tiny sprites only need 15 frames per second.
    if (timestamp - lastTwinkle >= 1000 / 15) {
      twinkleTime = timestamp;
      lastTwinkle = timestamp;
      drawFinal();
    }
    raf = requestAnimationFrame(twinkle);
  }

  function resize(): void {
    if (cleaned) return;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = rect.width;
    const nextHeight = rect.height;
    if (nextWidth <= 0 || nextHeight <= 0) {
      hasSize = false;
      updateTwinkle();
      return;
    }

    width = nextWidth;
    height = nextHeight;
    const mobile = width < 880;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    ordinaryCount = Math.min(
      mobile ? 180 : 360,
      Math.max(mobile ? 100 : 220, Math.round((width * height) / (mobile ? 2400 : 4000))),
    );
    brightCount = mobile ? 3 : 5;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hasSize = true;
    buildCaches();

    drawFinal();
    updateTwinkle();
  }

  function onIntersection(entries: IntersectionObserverEntry[]): void {
    if (cleaned) return;
    const entry = entries[0];
    if (!entry) return;
    isIntersecting = entry.isIntersecting;
    updateTwinkle();
  }

  function onVisibilityChange(): void {
    pageVisible = documentRef.visibilityState !== 'hidden';
    updateTwinkle();
  }

  function onReducedMotionChange(event: MediaQueryListEvent): void {
    reducedMotion = event.matches;
    updateTwinkle();
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
    isIntersecting = true;
  }
  resize();


  return () => {
    if (cleaned) return;
    cleaned = true;
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
