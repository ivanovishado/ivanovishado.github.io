// Canvas renderer for the ground track. Land exists only inside the swath the track has flown;
// the graticule and a ghost of the unflown Earth are always visible. Night follows the real sun.
// Cost per frame is two drawImage calls plus the track strokes: track points are cached per
// resize, and the swath is added to the reveal mask only as the track advances.
import { DEG, INCLINATION, distanceKm, formatCoords, greatCircle, subsolar, trackAt, wrap180, type Pass, type Place } from './orbit';
import { landRowAt } from './land';

/** `side: 'left'` sets a label west of (on narrow maps, above) its marker, apart from a close neighbor. */
export type Link = { to: Place; kind: 'trip' | 'signal'; label?: string; key?: string; side?: 'left' };

export type MapOptions = {
  /** The ground track. Without one, the map draws only the station and its links. */
  pass?: Pass;
  /** Home station: drawn with its coverage ring; links start here. */
  station?: Place;
  /** Trips (solid amber, they reveal the land they cross) and signals (dashed ink). */
  links?: Link[];
  /** Mark the farthest latitudes the orbit reaches. */
  reach?: boolean;
  /** Concentric distance rings for Point Nemo. */
  oceanRings?: boolean;
  /** Enable precision pointer reticle and station inspection on desktop. */
  interactive?: boolean;
  place?: Place;
  /** Phase at which the track crosses `place`. */
  placePhase?: number;
  /** Minimum degrees of latitude visible (or a function of the CSS size). */
  latSpan: number | ((w: number, h: number) => number);
  center: (w: number, h: number) => { lon: number; lat: number };
  /** Swath width in degrees. */
  swath: number;
  labels?: boolean;
};

type Rgb = readonly [number, number, number];

type Palette = {
  bg: Rgb;
  fg: Rgb;
  accent: Rgb;
  landSolid: string;
  inkSolid: string;
  accentSolid: string;
  night: string;
  terminator: string;
  grid: string;
  tick: string;
  equator: string;
  oceanRing: string;
  halo: string;
};

function parseRgb(raw: string): Rgb {
  const s = raw.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const m = s.match(/\d+/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

function alpha([r, g, b]: Rgb, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const raw = cs.getPropertyValue(name).trim();
    return { raw, rgb: parseRgb(raw) };
  };
  const bg = read('--c-bg');
  const fg = read('--c-fg');
  const accent = read('--c-accent');
  const land = read('--c-land');
  return {
    bg: bg.rgb,
    fg: fg.rgb,
    accent: accent.rgb,
    landSolid: land.raw,
    inkSolid: fg.raw,
    accentSolid: accent.raw,
    night: alpha(bg.rgb, 0.56),
    terminator: alpha(accent.rgb, 0.26),
    grid: alpha(fg.rgb, 0.065),
    tick: alpha(fg.rgb, 0.18),
    equator: alpha(fg.rgb, 0.16),
    oceanRing: alpha(land.rgb, 0.2),
    halo: alpha(bg.rgb, 0.9),
  };
}

const STEP = 1 / 360; // one cached sample per degree of orbit
const CHUNK = 0.25; // flown track is stroked in quarter revolutions, fading with age

export class TrackMap {
  private ctx: CanvasRenderingContext2D;
  private pal: Palette;
  private ground: HTMLCanvasElement; // on-screen layer under the track: base + lit land
  private land = document.createElement('canvas'); // full-tone scanline Earth
  private base = document.createElement('canvas'); // graticule + ghost Earth
  private mask = document.createElement('canvas'); // flown swath (accumulates)
  private lit = document.createElement('canvas'); // land inside the swath
  private deco = document.createElement('canvas'); // station, arrived links and labels
  private w = 0;
  private h = 0;
  private dpr = 1;
  private k = 1;
  private c = { lon: 0, lat: 0 };
  private landAt = 0;
  private xs = new Float32Array(0);
  private ys = new Float32Array(0);
  private count = 0;
  private revealed = -1;
  private linked = -1;
  private narrow = false;
  private baked = false; // arrived links are drawn into the ground layer once
  private pointer: { x: number; y: number } | null = null;
  private highlight: string | null = null;
  private highlightPlace: Place | null = null; // a ledger stop without an arc, e.g. an earlier home

  constructor(private canvas: HTMLCanvasElement, private o: MapOptions) {
    this.ctx = canvas.getContext('2d')!;
    this.pal = readPalette();
    // The ground layer only changes when the swath grows; the track layer redraws every frame.
    const prev = canvas.previousElementSibling;
    if (prev instanceof HTMLCanvasElement && prev.dataset.ground !== undefined) this.ground = prev;
    else {
      this.ground = document.createElement('canvas');
      this.ground.dataset.ground = '';
      this.ground.setAttribute('aria-hidden', 'true');
      canvas.before(this.ground);
    }
  }

  static supported(canvas: HTMLCanvasElement) {
    return !!canvas.getContext('2d');
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    // Touch devices draw at 1x: the scanlines still read, at less than half the fill cost.
    this.dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    this.w = Math.round(r.width * this.dpr);
    this.h = Math.round(r.height * this.dpr);
    for (const cv of [this.canvas, this.ground, this.land, this.base, this.mask, this.lit, this.deco]) { cv.width = this.w; cv.height = this.h; }
    const span = typeof this.o.latSpan === 'function' ? this.o.latSpan(r.width, r.height) : this.o.latSpan;
    this.k = Math.max(this.h / span, this.w / 360);
    this.narrow = r.width < 560;
    this.c = this.o.center(r.width, r.height);
    this.count = 0;
    this.revealed = -1;
    this.linked = -1;
    this.arcs.clear();
    this.baked = false;
    this.buildLand();
    return true;
  }

  private x(lon: number) { return this.w / 2 + wrap180(lon - this.c.lon) * this.k; }
  private y(lat: number) { return this.h / 2 - (lat - this.c.lat) * this.k; }

  /** Scanline land in one tone, darkened on the real night side. Rebuilt once a minute. */
  private buildLand() {
    const g = this.land.getContext('2d')!;
    g.clearRect(0, 0, this.w, this.h);
    g.fillStyle = this.pal.landSolid;
    const gap = Math.max(3, Math.round(2.6 * this.dpr));
    const t = Math.max(1, Math.round(this.dpr));
    const span = 360 * this.k;
    for (let py = gap / 2; py < this.h; py += gap) {
      const lat = this.c.lat + (this.h / 2 - py) / this.k;
      if (lat > 89 || lat < -89) continue;
      const row = landRowAt(lat);
      if (!row) continue;
      for (let i = 0; i + 1 < row.length; i += 2) {
        const x0 = this.x(row[i]!);
        const len = (row[i + 1]! - row[i]!) * this.k;
        g.fillRect(x0, py, len, t);
        if (x0 + len > span / 2 + this.w / 2) g.fillRect(x0 - span, py, len, t);
      }
    }
    // Night side: sin(lat)sin(d) + cos(lat)cos(d)cos(dLon) < 0.
    const sun = subsolar(new Date());
    const d = (Math.abs(sun.lat) < 0.5 ? 0.5 : sun.lat) * DEG;
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = this.pal.night;
    g.beginPath();
    const cols = 96;
    for (let i = 0; i <= cols; i++) {
      const px = (i / cols) * this.w;
      const lon = this.c.lon + (px - this.w / 2) / this.k;
      const py = this.y(Math.atan(-Math.cos((lon - sun.lon) * DEG) / Math.tan(d)) / DEG);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    const edge = d > 0 ? this.h + 10 : -10; // night holds the pole away from the sun
    g.lineTo(this.w, edge);
    g.lineTo(0, edge);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';

    // Base: graticule every 30° (equator brighter), fiducial ticks, terminator line, and ghost Earth.
    const b = this.base.getContext('2d')!;
    b.clearRect(0, 0, this.w, this.h);
    b.lineWidth = Math.max(1, this.dpr * 0.75);
    b.strokeStyle = this.pal.grid;
    b.beginPath();
    for (let lon = -180; lon < 180; lon += 30) { const x = this.x(lon); b.moveTo(x, 0); b.lineTo(x, this.h); }
    for (let lat = -60; lat <= 60; lat += 30) if (lat) { const y = this.y(lat); b.moveTo(0, y); b.lineTo(this.w, y); }
    b.stroke();

    // Tiny cartographic crosshairs at 30° graticule intersections.
    const tick = 2.5 * this.dpr;
    b.strokeStyle = this.pal.tick;
    b.beginPath();
    for (let lon = -180; lon < 180; lon += 30) {
      const gx = this.x(lon);
      if (gx < 0 || gx > this.w) continue;
      for (let lat = -60; lat <= 60; lat += 30) {
        const gy = this.y(lat);
        if (gy < 0 || gy > this.h) continue;
        b.moveTo(gx - tick, gy); b.lineTo(gx + tick, gy);
        b.moveTo(gx, gy - tick); b.lineTo(gx, gy + tick);
      }
    }
    b.stroke();

    b.strokeStyle = this.pal.equator;
    b.beginPath(); b.moveTo(0, this.y(0)); b.lineTo(this.w, this.y(0)); b.stroke();

    // Subtle real-time solar terminator line across the map.
    b.setLineDash([this.dpr * 3, this.dpr * 5]);
    b.strokeStyle = this.pal.terminator;
    b.lineWidth = Math.max(1, this.dpr * 0.85);
    b.beginPath();
    for (let i = 0; i <= cols; i++) {
      const px = (i / cols) * this.w;
      const lon = this.c.lon + (px - this.w / 2) / this.k;
      const py = this.y(Math.atan(-Math.cos((lon - sun.lon) * DEG) / Math.tan(d)) / DEG);
      if (i === 0) b.moveTo(px, py); else b.lineTo(px, py);
    }
    b.stroke();
    b.setLineDash([]);

    if (this.o.oceanRings && this.o.place) {
      const nx = this.x(this.o.place.lon);
      const ny = this.y(this.o.place.lat);
      b.setLineDash([this.dpr * 2, this.dpr * 6]);
      b.strokeStyle = this.pal.oceanRing;
      b.lineWidth = Math.max(1, this.dpr * 0.8);
      for (const degR of [9, 18, 24.2]) {
        b.beginPath(); b.arc(nx, ny, degR * this.k, 0, Math.PI * 2); b.stroke();
      }
      b.setLineDash([]);
    }

    if (this.o.reach) {
      const lim = INCLINATION / DEG;
      b.setLineDash([this.dpr * 3, this.dpr * 6]);
      b.strokeStyle = alpha(this.pal.accent, 0.42);
      b.font = `${11 * this.dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      b.fillStyle = alpha(this.pal.accent, 0.78);
      for (const lat of [lim, -lim]) {
        const y = this.y(lat);
        b.beginPath(); b.moveTo(0, y); b.lineTo(this.w, y); b.stroke();
        if (!this.narrow) b.fillText(`ISS reach ${lim.toFixed(1)}°${lat > 0 ? 'N' : 'S'}`, 12 * this.dpr, y - 6 * this.dpr);
      }
      b.setLineDash([]);
    }
    b.globalAlpha = 0.11;
    b.drawImage(this.land, 0, 0);
    b.globalAlpha = 1;

    this.landAt = Date.now();
    this.compose();
  }

  /** Cache track samples up to `phase`. */
  private ensure(phase: number) {
    const need = Math.ceil(phase / STEP) + 2;
    if (need <= this.count) return;
    if (need > this.xs.length) {
      const size = Math.max(need, this.xs.length * 2, 1024);
      const nx = new Float32Array(size); nx.set(this.xs.subarray(0, this.count)); this.xs = nx;
      const ny = new Float32Array(size); ny.set(this.ys.subarray(0, this.count)); this.ys = ny;
    }
    for (let i = this.count; i < need; i++) {
      const s = trackAt(this.o.pass!, i * STEP);
      this.xs[i] = this.x(s.lon / DEG);
      this.ys[i] = this.y(s.lat / DEG);
    }
    this.count = need;
  }

  private point(phase: number) {
    const s = trackAt(this.o.pass!, phase);
    return [this.x(s.lon / DEG), this.y(s.lat / DEG)] as const;
  }

  /** Polyline between two phases, broken where it wraps across the view. */
  private path(g: CanvasRenderingContext2D, a: number, b: number) {
    if (b <= a) return;
    this.ensure(b);
    const half = this.w / 2;
    const [ax, ay] = this.point(a);
    g.moveTo(ax, ay);
    let px = ax;
    const i0 = Math.floor(a / STEP) + 1;
    const i1 = Math.ceil(b / STEP) - 1;
    for (let i = i0; i <= i1; i++) {
      const x = this.xs[i]!;
      const y = this.ys[i]!;
      if (Math.abs(x - px) > half) g.moveTo(x, y); else g.lineTo(x, y);
      px = x;
    }
    const [bx, by] = this.point(b);
    if (Math.abs(bx - px) > half) g.moveTo(bx, by); else g.lineTo(bx, by);
  }

  /** Progress (0 to 1) of link i when the links as a whole are at `p`. */
  private linkAt(i: number, p: number) {
    const n = this.o.links?.length ?? 0;
    const span = (n - 1) * 0.45 + 1;
    return Math.max(0, Math.min(1, p * span - i * 0.45));
  }

  private arcs = new Map<Place, { x: number; y: number }[]>();

  /** Great-circle arc from the station, projected once per resize. */
  private arcPts(to: Place) {
    let pts = this.arcs.get(to);
    if (!pts) {
      pts = greatCircle(this.o.station!, to, 1, 96).map((q) => ({ x: this.x(q.lon), y: this.y(q.lat) }));
      this.arcs.set(to, pts);
    }
    return pts;
  }

  private arc(g: CanvasRenderingContext2D, to: Place, upto: number) {
    const pts = this.arcPts(to);
    const n = Math.max(1, Math.round(upto * (pts.length - 1)));
    let px = 0;
    for (let i = 0; i <= n; i++) {
      const { x, y } = pts[i]!;
      if (!i || Math.abs(x - px) > this.w / 2) g.moveTo(x, y); else g.lineTo(x, y);
      px = x;
    }
    return pts[n]!;
  }

  /** Trips reveal the land under their arcs, like the swath does for the track. */
  private revealLinks(p: number) {
    if (!this.o.station || !this.o.links || (p <= this.linked + 0.035 && p < 1) || p <= this.linked) return;
    const m = this.mask.getContext('2d')!;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.lineWidth = this.o.swath * this.k;
    m.strokeStyle = '#000'; // token-ok: alpha mask for destination-in compositing
    m.beginPath();
    this.o.links.forEach((l, i) => { const t = this.linkAt(i, p); if (l.kind === 'trip' && t > 0) this.arc(m, l.to, t); });
    m.stroke();
    this.linked = p;
    this.compose();
  }

  /** Grow the flown swath to `phase` and recompose the lit land. */
  private reveal(phase: number) {
    // Grow in 2° steps: the swath is far wider, and each step recomposites the ground.
    if (!this.o.pass || phase <= this.revealed + 0.0055) return;
    const m = this.mask.getContext('2d')!;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.lineWidth = this.o.swath * this.k;
    m.strokeStyle = '#000'; // token-ok: alpha mask for destination-in compositing
    m.beginPath();
    this.path(m, Math.max(0, this.revealed - 0.004), phase);
    m.stroke();
    this.revealed = phase;
    this.compose();
  }

  private compose() {
    const l = this.lit.getContext('2d')!;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, this.w, this.h);
    l.drawImage(this.land, 0, 0);
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(this.mask, 0, 0);
    l.globalCompositeOperation = 'source-over';
    const g = this.ground.getContext('2d')!;
    g.clearRect(0, 0, this.w, this.h);
    g.drawImage(this.base, 0, 0);
    g.drawImage(this.lit, 0, 0);
    if (this.baked) g.drawImage(this.deco, 0, 0);
  }

  setPointer(clientX: number | null, clientY: number | null) {
    if (clientX === null || clientY === null) { this.pointer = null; return; }
    const r = this.canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) {
      this.pointer = null;
      return;
    }
    this.pointer = { x: (clientX - r.left) * this.dpr, y: (clientY - r.top) * this.dpr };
  }

  setHighlight(key: string | null, place: Place | null = null) {
    this.highlight = key;
    this.highlightPlace = place;
  }

  coordsAt(phase: number) {
    if (this.o.pass) return trackAt(this.o.pass, phase);
    const p = this.o.station ?? { lat: 0, lon: 0 };
    return { lat: p.lat * DEG, lon: p.lon * DEG };
  }

  /** `links` is the links' progress (0 to 1); maps without a track use `phase` for it. */
  render(phase: number, time = 0, links = this.o.pass ? 1 : phase) {
    if (!this.w) return;
    if (Date.now() - this.landAt > 60000) this.buildLand();
    if (phase > 0) this.reveal(phase);
    if (links > 0) this.revealLinks(links);
    const g = this.ctx;
    const dpr = this.dpr;
    g.clearRect(0, 0, this.w, this.h);
    if (links >= 1 && this.o.station) {
      if (!this.baked) {
        const d = this.deco.getContext('2d')!;
        d.clearRect(0, 0, this.w, this.h);
        this.drawLinks(d, 1, 0, 'static');
        this.baked = true;
        this.compose();
      }
      this.drawLinks(g, 1, time, 'packets');
    } else this.drawLinks(g, links, time, 'all');

    this.drawHighlightAndPointer(g, time);
    if (!this.o.pass) return;

    // Flown track: older revolutions fade.
    g.lineCap = 'round';
    const start = Math.max(0, phase - 3);
    for (let a = Math.floor(start / CHUNK) * CHUNK; a < phase; a += CHUNK) {
      const age = phase - (a + CHUNK / 2);
      g.strokeStyle = alpha(this.pal.accent, Math.max(0.14, Math.min(1, 1 - age / 2.2)));
      g.lineWidth = dpr * (age < 0.8 ? 1.65 : 1);
      g.beginPath();
      this.path(g, Math.max(a, start), Math.min(a + CHUNK, phase));
      g.stroke();
    }

    // Predicted path, dashed.
    g.setLineDash([dpr * 2, dpr * 5]);
    g.strokeStyle = alpha(this.pal.accent, 0.45);
    g.lineWidth = dpr;
    g.beginPath();
    this.path(g, phase, phase + 0.22);
    g.stroke();
    g.setLineDash([]);

    // Place: a cross, then its name once the track has reached it.
    const o = this.o;
    const atStation = o.station && o.place && o.place.lat === o.station.lat && o.place.lon === o.station.lon;
    const linked = o.links?.some((l) => l.to === o.place);
    if (o.place && o.labels && !atStation && !linked) {
      const x = this.x(o.place.lon);
      const y = this.y(o.place.lat);
      const reached = Math.max(0, Math.min(1, (phase - (o.placePhase ?? 0)) * 12 + 0.5));
      g.strokeStyle = alpha(this.pal.fg, 0.35 + reached * 0.65);
      g.lineWidth = dpr;
      const s = 6 * dpr;
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      if (reached > 0) {
        g.globalAlpha = reached;
        this.label(g, x, y, this.narrow ? o.place.short ?? o.place.name : o.place.name);
        g.globalAlpha = 1;
      }
    }

    // Marker, swath footprint ring, and slow ping.
    const [mx, my] = this.point(phase);
    const footR = this.o.swath * 0.45 * this.k;
    if (footR > 12 * dpr && footR < 140 * dpr) {
      g.strokeStyle = alpha(this.pal.accent, 0.2);
      g.lineWidth = dpr * 0.85;
      g.beginPath(); g.arc(mx, my, footR, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = this.pal.accentSolid;
    g.beginPath(); g.arc(mx, my, 3.75 * dpr, 0, Math.PI * 2); g.fill();
    const pulse = (time * 0.5) % 1;
    g.strokeStyle = alpha(this.pal.accent, 0.55 * (1 - pulse));
    g.lineWidth = dpr;
    g.beginPath(); g.arc(mx, my, (6 + pulse * 18) * dpr, 0, Math.PI * 2); g.stroke();
  }

  private drawHighlightAndPointer(g: CanvasRenderingContext2D, time: number) {
    const o = this.o;
    const dpr = this.dpr;

    // Resolve either external ledger highlight or nearby pointer hover target.
    let activeKey = this.highlight;
    let snapped: { x: number; y: number; name: string; sub: string } | null = null;

    if (o.interactive && this.pointer && !this.narrow) {
      const { x: px, y: py } = this.pointer;
      const hitR = 44 * dpr;
      let bestDist = hitR;
      if (o.station) {
        const sx = this.x(o.station.lon);
        const sy = this.y(o.station.lat);
        const d = Math.hypot(px - sx, py - sy);
        if (d < bestDist) {
          bestDist = d;
          activeKey = 'cdmx';
          snapped = { x: sx, y: sy, name: o.station.name, sub: 'Home station' };
        }
      }
      for (const l of o.links ?? []) {
        const lx = this.x(l.to.lon);
        const ly = this.y(l.to.lat);
        const d = Math.hypot(px - lx, py - ly);
        if (d < bestDist) {
          bestDist = d;
          activeKey = l.key ?? null;
          const km = o.station ? `${distanceKm(o.station, l.to).toLocaleString('en-US')} km from ${o.station.name}` : '';
          snapped = { x: lx, y: ly, name: l.to.name, sub: km };
        }
      }

      // Precision reticle + live coordinate telemetry under pointer.
      const rx = snapped ? snapped.x : px;
      const ry = snapped ? snapped.y : py;
      const arm = snapped ? 16 * dpr : 14 * dpr;
      g.strokeStyle = snapped ? alpha(this.pal.accent, 0.85) : alpha(this.pal.fg, 0.28);
      g.lineWidth = dpr;
      g.beginPath();
      g.moveTo(rx - arm, ry); g.lineTo(rx - 5 * dpr, ry);
      g.moveTo(rx + 5 * dpr, ry); g.lineTo(rx + arm, ry);
      g.moveTo(rx, ry - arm); g.lineTo(rx, ry - 5 * dpr);
      g.moveTo(rx, ry + 5 * dpr); g.lineTo(rx, ry + arm);
      g.stroke();

      if (!snapped) {
        const lonDeg = wrap180(this.c.lon + (px - this.w / 2) / this.k);
        const latDeg = Math.max(-89, Math.min(89, this.c.lat + (this.h / 2 - py) / this.k));
        const coordText = formatCoords(latDeg * DEG, lonDeg * DEG);
        g.font = `500 ${11 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
        const tw = g.measureText(coordText).width;
        const flip = px + tw + 26 * dpr > this.w;
        const tx = flip ? px - tw - 14 * dpr : px + 14 * dpr;
        const ty = py < 36 * dpr ? py + 20 * dpr : py - 10 * dpr;
        g.lineWidth = 3.5 * dpr;
        g.strokeStyle = this.pal.halo;
        g.strokeText(coordText, tx, ty);
        g.fillStyle = alpha(this.pal.fg, 0.72);
        g.fillText(coordText, tx, ty);
      } else if (snapped.sub) {
        g.font = `500 ${11 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
        const tw = g.measureText(snapped.sub).width;
        const flip = snapped.x + tw + 30 * dpr > this.w;
        const tx = flip ? snapped.x - tw - 16 * dpr : snapped.x + 16 * dpr;
        const ty = snapped.y + 24 * dpr;
        g.lineWidth = 4 * dpr;
        g.strokeStyle = alpha(this.pal.bg, 0.92);
        g.strokeText(snapped.sub, tx, ty);
        g.fillStyle = this.pal.accentSolid;
        g.fillText(snapped.sub, tx, ty);
      }
    }

    // Highlight active link arc + target ring (from ledger hover or pointer snap).
    if (!activeKey || !o.station) return;
    if (activeKey === 'cdmx') {
      const sx = this.x(o.station.lon);
      const sy = this.y(o.station.lat);
      const pulse = (time * 0.7) % 1;
      g.strokeStyle = alpha(this.pal.accent, 0.85 * (1 - pulse * 0.5));
      g.lineWidth = dpr * 1.5;
      g.beginPath(); g.arc(sx, sy, (8 + pulse * 14) * dpr, 0, Math.PI * 2); g.stroke();
      return;
    }
    const target = (o.links ?? []).find((l) => l.key === activeKey);
    if (!target) {
      const at = activeKey === this.highlight ? this.highlightPlace : null;
      if (!at) return;
      const ax = this.x(at.lon);
      const ay = this.y(at.lat);
      const pulse = (time * 0.75) % 1;
      g.strokeStyle = alpha(this.pal.accent, 0.85 * (1 - pulse * 0.5));
      g.lineWidth = dpr * 1.5;
      g.beginPath(); g.arc(ax, ay, (7 + pulse * 14) * dpr, 0, Math.PI * 2); g.stroke();
      g.fillStyle = this.pal.accentSolid;
      g.beginPath(); g.arc(ax, ay, 3.2 * dpr, 0, Math.PI * 2); g.fill();
      return;
    }
    g.strokeStyle = this.pal.accentSolid;
    g.lineWidth = dpr * 2.2;
    g.setLineDash(target.kind === 'trip' ? [] : [dpr * 5, dpr * 4]);
    g.beginPath();
    const end = this.arc(g, target.to, 1);
    g.stroke();
    g.setLineDash([]);
    const pulse = (time * 0.75) % 1;
    g.strokeStyle = alpha(this.pal.accent, 0.85 * (1 - pulse * 0.5));
    g.lineWidth = dpr * 1.5;
    g.beginPath(); g.arc(end.x, end.y, (7 + pulse * 14) * dpr, 0, Math.PI * 2); g.stroke();
    g.fillStyle = this.pal.accentSolid;
    g.beginPath(); g.arc(end.x, end.y, 3.2 * dpr, 0, Math.PI * 2); g.fill();
  }

  private label(g: CanvasRenderingContext2D, x: number, y: number, text: string, sub?: string, side?: 'left') {
    const dpr = this.dpr;
    const pad = 12 * dpr;
    if (this.narrow) {
      g.lineWidth = 3.5 * dpr;
      g.strokeStyle = this.pal.halo;
      g.font = `500 ${11 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      const tw = g.measureText(text).width;
      const cx = Math.max(pad + tw / 2, Math.min(this.w - pad - tw / 2, x));
      const cy = Math.max(20 * dpr, Math.min(this.h - 10 * dpr, y + (side ? -10 : 18) * dpr));
      g.textAlign = 'center';
      g.strokeText(text, cx, cy);
      g.fillStyle = this.pal.inkSolid;
      g.fillText(text, cx, cy);
      g.textAlign = 'left';
      return;
    }
    g.font = `500 ${12 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
    const tw = Math.max(g.measureText(text).width, sub ? g.measureText(sub).width : 0);
    const right = side === 'left' || x + tw + 24 * dpr > this.w;
    g.textAlign = right ? 'right' : 'left';
    const rawX = right ? x - 12 * dpr : x + 12 * dpr;
    const tx = right ? Math.max(pad + tw, rawX) : Math.min(this.w - pad - tw, rawX);
    const ty = Math.max(24 * dpr, Math.min(this.h - 24 * dpr, y - 8 * dpr));
    // A ground-colored halo keeps labels legible where the track crosses them.
    g.lineWidth = 4 * dpr;
    g.strokeStyle = this.pal.halo;
    g.strokeText(text, tx, ty);
    g.fillStyle = this.pal.inkSolid;
    g.fillText(text, tx, ty);
    if (sub) {
      g.font = `${11 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      g.strokeText(sub, tx, ty + 16 * dpr);
      g.fillStyle = alpha(this.pal.fg, 0.65);
      g.fillText(sub, tx, ty + 16 * dpr);
    }
    g.textAlign = 'left';
  }

  /** Home station with its coverage ring, then each link as a great-circle arc. */
  private drawLinks(g: CanvasRenderingContext2D, p: number, time: number, part: 'all' | 'static' | 'packets') {
    const o = this.o;
    if (!o.station) return;
    const dpr = this.dpr;
    if (part === 'packets') {
      // Arrived: a packet keeps travelling each link at rest.
      (o.links ?? []).forEach((l, i) => {
        const pts = this.arcPts(l.to);
        const pk = pts[Math.round(((time / 5 + i * 0.37) % 1) * (pts.length - 1))]!;
        g.fillStyle = l.kind === 'trip' ? alpha(this.pal.accent, 0.9) : alpha(this.pal.fg, 0.8);
        g.beginPath(); g.arc(pk.x, pk.y, 2 * dpr, 0, Math.PI * 2); g.fill();
      });
      return;
    }
    const sx = this.x(o.station.lon);
    const sy = this.y(o.station.lat);
    // Coverage: roughly the 2,000 km a ground station can see of a low orbit.
    g.setLineDash([dpr * 2, dpr * 4]);
    g.strokeStyle = alpha(this.pal.fg, 0.35);
    g.lineWidth = dpr;
    g.beginPath(); g.arc(sx, sy, 18 * this.k, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);

    (o.links ?? []).forEach((l, i) => {
      const t = this.linkAt(i, p);
      if (t <= 0) return;
      const trip = l.kind === 'trip';
      g.strokeStyle = trip ? alpha(this.pal.accent, 0.9) : alpha(this.pal.fg, 0.7);
      g.lineWidth = dpr * (trip ? 1.5 : 1);
      g.setLineDash(trip ? [] : [dpr * 4, dpr * 4]);
      g.beginPath();
      const end = this.arc(g, l.to, t);
      g.stroke();
      g.setLineDash([]);
      const ex = end.x;
      const ey = end.y;
      if (t < 1) {
        g.fillStyle = trip ? this.pal.accentSolid : this.pal.inkSolid;
        g.beginPath(); g.arc(ex, ey, 3 * dpr, 0, Math.PI * 2); g.fill();
        return;
      }
      if (part === 'all') {
        const pts = this.arcPts(l.to);
        const pk = pts[Math.round(((time / 5 + i * 0.37) % 1) * (pts.length - 1))]!;
        g.fillStyle = trip ? alpha(this.pal.accent, 0.9) : alpha(this.pal.fg, 0.8);
        g.beginPath(); g.arc(pk.x, pk.y, 2 * dpr, 0, Math.PI * 2); g.fill();
      }
      const s = 5 * dpr;
      g.strokeStyle = this.pal.inkSolid;
      g.lineWidth = dpr;
      g.beginPath(); g.moveTo(ex - s, ey); g.lineTo(ex + s, ey); g.moveTo(ex, ey - s); g.lineTo(ex, ey + s); g.stroke();
      const inView = ex >= -16 * dpr && ex <= this.w + 16 * dpr && ey >= 12 * dpr && ey <= this.h - 12 * dpr;
      if (o.labels && inView) this.label(g, ex, ey, this.narrow ? l.to.short ?? l.to.name : l.to.name, l.label, l.side);
    });

    const stationInView = sx >= -16 * dpr && sx <= this.w + 16 * dpr && sy >= 12 * dpr && sy <= this.h - 12 * dpr;
    g.strokeStyle = this.pal.inkSolid;
    g.fillStyle = this.pal.inkSolid;
    g.lineWidth = dpr * 1.5;
    g.beginPath(); g.arc(sx, sy, 4.5 * dpr, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(sx, sy, 1.5 * dpr, 0, Math.PI * 2); g.fill();
    if (o.labels && !this.narrow && stationInView) this.label(g, sx, sy, o.station.name, 'home station');
  }
}
