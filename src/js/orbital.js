/* ==========================================================================
   Orbital — a generative celestial-mechanics field for the hero.
   Hairline guide orbits + bodies leaving fading light trails.
   Contemplative. Respects reduced-motion & viewport.
   ========================================================================== */

const INK = '#090a0c';
const PAPER = [236, 228, 210];
const AMBER = [232, 176, 75];

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rand(min, max) { return min + Math.random() * (max - min); }

export function initOrbital(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, cx = 0, cy = 0, scale = 1;
  let raf = 0;
  let running = false;
  let stars = [];

  // Bodies: elliptical orbits around the focus.
  const bodies = [
    { a: 0.34, b: 0.22, phi: -0.35, speed: 0.052, phase: 0.0,  color: AMBER,  weight: 1.0, trail: 64, head: 2.6 },
    { a: 0.52, b: 0.40, phi: 0.55,  speed: 0.031, phase: 1.2,  color: PAPER,  weight: 0.7, trail: 80, head: 1.8 },
    { a: 0.66, b: 0.30, phi: 1.15,  speed: 0.022, phase: 2.4,  color: PAPER,  weight: 0.5, trail: 90, head: 1.5 },
    { a: 0.78, b: 0.58, phi: -0.9,  speed: 0.014, phase: 3.6,  color: AMBER,  weight: 0.35, trail: 110, head: 1.3 },
    { a: 0.22, b: 0.16, phi: 0.1,   speed: 0.078, phase: 4.5,  color: PAPER,  weight: 0.85, trail: 52, head: 2.0 },
  ].map(b => ({ ...b, hist: [], t: b.phase }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h * 0.54;
    scale = Math.min(w, h) * 1.05;
    // regenerate stars relative to size
    stars = Array.from({ length: 46 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rand(0.3, 1.1),
      tw: rand(0, Math.PI * 2),
      sp: rand(0.4, 1.4),
    }));
  }

  function point(body, t) {
    const a = body.a * scale;
    const b = body.b * scale;
    const cos = Math.cos(body.phi), sin = Math.sin(body.phi);
    const px = a * Math.cos(t);
    const py = b * Math.sin(t);
    return { x: cx + (px * cos - py * sin), y: cy + (px * sin + py * cos) };
  }

  function drawGuides() {
    ctx.lineWidth = 1;
    for (const body of bodies) {
      const a = body.a * scale, b = body.b * scale;
      const cos = Math.cos(body.phi), sin = Math.sin(body.phi);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(body.phi);
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},${0.075 * body.weight})`;
      ctx.stroke();
      // cardinal tick marks — observatory chart detail
      ctx.fillStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},${0.18 * body.weight})`;
      for (const [tx, ty] of [[a, 0], [-a, 0], [0, b], [0, -b]]) {
        ctx.beginPath();
        ctx.arc(tx, ty, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStars(time) {
    for (const s of stars) {
      const a = 0.10 + 0.10 * Math.sin(time * 0.001 * s.sp + s.tw);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},${a})`;
      ctx.fill();
    }
  }

  function drawFocus() {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.16);
    g.addColorStop(0, `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.22)`);
    g.addColorStop(0.4, `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.06)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - scale * 0.16, cy - scale * 0.16, scale * 0.32, scale * 0.32);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.9)`;
    ctx.fill();
  }

  function drawTrails() {
    ctx.globalCompositeOperation = 'lighter';
    for (const body of bodies) {
      const hist = body.hist;
      const n = hist.length;
      if (n < 2) continue;
      const [cr, cg, cb] = body.color;
      ctx.lineWidth = body.head * 0.9;
      ctx.lineCap = 'round';
      for (let i = 1; i < n; i++) {
        const p0 = hist[i - 1], p1 = hist[i];
        const a = (i / n) * 0.55 * body.weight;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      // head glow
      const head = hist[n - 1];
      const halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, body.head * 4);
      halo.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 * body.weight})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(head.x - body.head * 4, head.y - body.head * 4, body.head * 8, body.head * 8);
      ctx.beginPath();
      ctx.arc(head.x, head.y, body.head, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.95 * body.weight})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(time) {
    if (!running) return;

    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    drawStars(time);
    drawGuides();
    drawFocus();
    for (const body of bodies) {
      body.t += body.speed;
      const p = point(body, body.t);
      body.hist.push(p);
      if (body.hist.length > body.trail) body.hist.shift();
    }
    drawTrails();
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  function staticFrame() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    drawStars(0);
    drawGuides();
    drawFocus();
    for (const body of bodies) {
      const p = point(body, body.phase + 1.4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(p.x, p.y, body.head, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${body.color[0]},${body.color[1]},${body.color[2]},0.8)`;
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function start() {
    if (prefersReduced) return;
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) start(); else stop();
    }
  }, { threshold: 0.01 });

  function init() {
    resize();
    if (prefersReduced) { staticFrame(); return; }
    io.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    start();
  }

  init();

  return () => {
    stop();
    io.disconnect();
    window.removeEventListener('resize', resize);
  };
}
