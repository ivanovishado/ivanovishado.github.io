/* ==========================================================================
   Trajectory — a mission-chart hero for the mentorship page.
   A plotted transfer arc with a traveling point and fading trail,
   against a chart-grid starfield. Mentorship as trajectory correction.
   Respects reduced-motion & viewport.
   ========================================================================== */

interface Point { x: number; y: number; }
interface Star { x: number; y: number; r: number; tw: number; sp: number; drift: number; }

const INK = '#090a0c';
const PAPER: number[] = [236, 228, 210];
const AMBER: number[] = [232, 176, 75];

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rand(min: number, max: number): number { return min + Math.random() * (max - min); }

// cubic bezier point
function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export function initTrajectory(canvasEl: HTMLCanvasElement | null): () => void {
  if (!canvasEl) return () => {};
  const canvas = canvasEl;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return () => {};
  const ctx = context;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let raf = 0;
  let running = false;
  let mouse = { tx: 0, ty: 0, x: 0, y: 0 };
  let stars: Star[] = [];
  let t = 0;
  const trail: Point[] = [];
  const trailMax = 60;

  // control points (relative coords), set on resize
  let main: Point[] = [];
  let ref: Point[] = [];
  let apex: Point = { x: 0, y: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // main ascending trajectory: bottom-left -> upper-right
    main = [
      { x: 0.06 * w, y: 0.94 * h },
      { x: 0.28 * w, y: 0.96 * h },
      { x: 0.52 * w, y: 0.08 * h },
      { x: 0.96 * w, y: 0.20 * h },
    ];
    // reference (uncorrected) flatter path
    ref = [
      { x: 0.06 * w, y: 0.94 * h },
      { x: 0.38 * w, y: 0.74 * h },
      { x: 0.70 * w, y: 0.62 * h },
      { x: 0.98 * w, y: 0.56 * h },
    ];
    apex = bezier(0.5, main[0], main[1], main[2], main[3]);

    stars = Array.from({ length: 44 }, (): Star => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rand(0.3, 1.1),
      tw: rand(0, Math.PI * 2),
      sp: rand(0.4, 1.4),
      drift: rand(0.02, 0.08),
    }));
  }

  function drawAxis() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},0.06)`;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5); ctx.lineTo(w, h - 0.5);
    ctx.moveTo(0.5, 0); ctx.lineTo(0.5, h);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},0.10)`;
    for (let i = 1; i < 10; i++) {
      const x = (i / 10) * w;
      const y = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x, h - 6);
      ctx.moveTo(0, y); ctx.lineTo(6, y);
      ctx.stroke();
    }
  }

  function drawStars(time: number) {
    for (const s of stars) {
      s.x += s.drift * 0.15;
      if (s.x > w) s.x = 0;
      const a = 0.10 + 0.10 * Math.sin(time * 0.001 * s.sp + s.tw);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PAPER[0]},${PAPER[1]},${PAPER[2]},${a})`;
      ctx.fill();
    }
  }

  function drawArc(pts: Point[], color: number[], alpha: number, dash: number[]) {
    ctx.setLineDash(dash);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.bezierCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawWaypoints() {
    for (const tt of [0.18, 0.42, 0.72]) {
      const p = bezier(tt, main[0], main[1], main[2], main[3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.85)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.25)`;
      ctx.stroke();
    }
  }

  function drawApex() {
    ctx.strokeStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(apex.x - 10, apex.y); ctx.lineTo(apex.x + 10, apex.y);
    ctx.moveTo(apex.x, apex.y - 10); ctx.lineTo(apex.x, apex.y + 10);
    ctx.stroke();
  }

  function drawTraveler() {
    const n = trail.length;
    if (n < 1) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const p0 = trail[i - 1], p1 = trail[i];
      const a = (i / n) * 0.6;
      ctx.strokeStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},${a})`;
      ctx.lineWidth = 1.4 * (i / n) + 0.4;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    const head = trail[n - 1];
    const halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 16);
    halo.addColorStop(0, `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.6)`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(head.x - 16, head.y - 16, 32, 32);
    ctx.beginPath();
    ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.95)`;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(time: number) {
    if (!running) return;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const px = mouse.x * w * 0.02;
    const py = mouse.y * h * 0.02;

    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(px, py);
    drawAxis();
    drawStars(time);
    drawArc(ref, PAPER, 0.10, [1, 5]);
    drawArc(main, AMBER, 0.32, [2, 6]);
    drawWaypoints();
    drawApex();
    t += 0.0024;
    if (t > 1) { t = 0; trail.length = 0; }
    const p = bezier(t, main[0], main[1], main[2], main[3]);
    trail.push(p);
    if (trail.length > trailMax) trail.shift();
    drawTraveler();
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  function staticFrame() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    drawAxis();
    drawStars(0);
    drawArc(ref, PAPER, 0.10, [1, 5]);
    drawArc(main, AMBER, 0.36, [2, 6]);
    drawWaypoints();
    drawApex();
    const p = apex;
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
    halo.addColorStop(0, `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.6)`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(p.x - 16, p.y - 16, 32, 32);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},0.95)`;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    if (prefersReduced) return;
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function onMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
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
    window.addEventListener('mousemove', onMove, { passive: true });
    start();
  }

  init();

  return () => {
    stop();
    io.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMove);
  };
}
