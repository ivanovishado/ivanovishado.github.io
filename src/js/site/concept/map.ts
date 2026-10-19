// Canvas renderer for the ground track. Land exists only inside the swath the track has flown;
// the graticule and a ghost of the unflown Earth are always visible. Night follows the real sun.
// Cost per frame is two drawImage calls plus the track strokes: track points are cached per
// resize, and the swath is added to the reveal mask only as the track advances.
import { DEG, INCLINATION, greatCircle, subsolar, trackAt, wrap180, type Pass, type Place } from './orbit';
import { landRowAt } from './land';

export type Link = { to: Place; kind: 'trip' | 'signal'; label?: string };

export type MapOptions = {
  /** The ground track. Without one, the map draws only the station and its links. */
  pass?: Pass;
  /** Home station: drawn with its coverage ring; links start here. */
  station?: Place;
  /** Trips (solid amber, they reveal the land they cross) and signals (dashed ink). */
  links?: Link[];
  /** Mark the farthest latitudes the orbit reaches. */
  reach?: boolean;
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

const COLOR = {
  land: '#7a8ca1',
  night: 'rgba(7, 9, 12, 0.42)',
  grid: 'rgba(236, 235, 230, 0.07)',
  equator: 'rgba(236, 235, 230, 0.16)',
  track: '245, 165, 36',
  ink: '#ecebe6',
};

const STEP = 1 / 360; // one cached sample per degree of orbit
const CHUNK = 0.25; // flown track is stroked in quarter revolutions, fading with age

export class TrackMap {
  private ctx: CanvasRenderingContext2D;
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

  constructor(private canvas: HTMLCanvasElement, private o: MapOptions) {
    this.ctx = canvas.getContext('2d')!;
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
    g.fillStyle = COLOR.land;
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
    g.fillStyle = COLOR.night;
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

    // Base: graticule every 30° (equator brighter) and a ghost of the unflown Earth.
    const b = this.base.getContext('2d')!;
    b.clearRect(0, 0, this.w, this.h);
    b.lineWidth = Math.max(1, this.dpr * 0.75);
    b.strokeStyle = COLOR.grid;
    b.beginPath();
    for (let lon = -180; lon < 180; lon += 30) { const x = this.x(lon); b.moveTo(x, 0); b.lineTo(x, this.h); }
    for (let lat = -60; lat <= 60; lat += 30) if (lat) { const y = this.y(lat); b.moveTo(0, y); b.lineTo(this.w, y); }
    b.stroke();
    b.strokeStyle = COLOR.equator;
    b.beginPath(); b.moveTo(0, this.y(0)); b.lineTo(this.w, this.y(0)); b.stroke();
    if (this.o.reach) {
      const lim = INCLINATION / DEG;
      b.setLineDash([this.dpr * 3, this.dpr * 6]);
      b.strokeStyle = `rgba(${COLOR.track}, 0.4)`;
      b.font = `${11 * this.dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      b.fillStyle = `rgba(${COLOR.track}, 0.75)`;
      for (const lat of [lim, -lim]) {
        const y = this.y(lat);
        b.beginPath(); b.moveTo(0, y); b.lineTo(this.w, y); b.stroke();
        if (!this.narrow) b.fillText(`ISS reach ${lim.toFixed(1)}°${lat > 0 ? 'N' : 'S'}`, 12 * this.dpr, y - 6 * this.dpr);
      }
      b.setLineDash([]);
    }
    b.globalAlpha = 0.09;
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
    m.strokeStyle = '#000';
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
    m.strokeStyle = '#000';
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
    if (!this.o.pass) return;

    // Flown track: older revolutions fade.
    g.lineCap = 'round';
    const start = Math.max(0, phase - 3);
    for (let a = Math.floor(start / CHUNK) * CHUNK; a < phase; a += CHUNK) {
      const age = phase - (a + CHUNK / 2);
      g.strokeStyle = `rgba(${COLOR.track}, ${Math.max(0.14, Math.min(1, 1 - age / 2.2))})`;
      g.lineWidth = dpr * (age < 0.8 ? 1.5 : 1);
      g.beginPath();
      this.path(g, Math.max(a, start), Math.min(a + CHUNK, phase));
      g.stroke();
    }

    // Predicted path, dashed.
    g.setLineDash([dpr * 2, dpr * 5]);
    g.strokeStyle = `rgba(${COLOR.track}, 0.45)`;
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
      g.strokeStyle = `rgba(236, 235, 230, ${0.35 + reached * 0.65})`;
      g.lineWidth = dpr;
      const s = 6 * dpr;
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      if (reached > 0) {
        g.globalAlpha = reached;
        g.font = `500 ${12 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
        g.fillStyle = COLOR.ink;
        const right = x + 160 * dpr > this.w;
        g.textAlign = right ? 'right' : 'left';
        g.fillText(o.place.name, right ? x - 12 * dpr : x + 12 * dpr, y - 8 * dpr);
        g.textAlign = 'left';
        g.globalAlpha = 1;
      }
    }

    // Marker, with a slow ping.
    const [mx, my] = this.point(phase);
    g.fillStyle = `rgb(${COLOR.track})`;
    g.beginPath(); g.arc(mx, my, 3.5 * dpr, 0, Math.PI * 2); g.fill();
    const pulse = (time * 0.5) % 1;
    g.strokeStyle = `rgba(${COLOR.track}, ${0.55 * (1 - pulse)})`;
    g.lineWidth = dpr;
    g.beginPath(); g.arc(mx, my, (6 + pulse * 16) * dpr, 0, Math.PI * 2); g.stroke();
  }

  private label(g: CanvasRenderingContext2D, x: number, y: number, text: string, sub?: string) {
    const dpr = this.dpr;
    const right = x + 170 * dpr > this.w;
    g.textAlign = right ? 'right' : 'left';
    const tx = right ? x - 12 * dpr : x + 12 * dpr;
    // Narrow frames: smaller labels set below the cross, clear of the arcs above it.
    if (this.narrow) {
      g.lineWidth = 3 * dpr;
      g.strokeStyle = 'rgba(7, 9, 12, 0.85)';
      g.font = `500 ${10 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.strokeText(text, x, y + 16 * dpr);
      g.fillStyle = COLOR.ink;
      g.fillText(text, x, y + 16 * dpr);
      g.textAlign = 'left';
      return;
    }
    // A ground-colored halo keeps labels legible where the track crosses them.
    g.lineWidth = 4 * dpr;
    g.strokeStyle = 'rgba(7, 9, 12, 0.85)';
    g.font = `500 ${12 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
    g.strokeText(text, tx, y - 8 * dpr);
    g.fillStyle = COLOR.ink;
    g.fillText(text, tx, y - 8 * dpr);
    if (sub && !this.narrow) {
      g.font = `${11 * dpr}px "JetBrains Mono Variable", ui-monospace, monospace`;
      g.strokeText(sub, tx, y + 8 * dpr);
      g.fillStyle = 'rgba(236, 235, 230, 0.6)';
      g.fillText(sub, tx, y + 8 * dpr);
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
        g.fillStyle = l.kind === 'trip' ? `rgba(${COLOR.track}, 0.9)` : 'rgba(236, 235, 230, 0.8)';
        g.beginPath(); g.arc(pk.x, pk.y, 2 * dpr, 0, Math.PI * 2); g.fill();
      });
      return;
    }
    const sx = this.x(o.station.lon);
    const sy = this.y(o.station.lat);
    // Coverage: roughly the 2,000 km a ground station can see of a low orbit.
    g.setLineDash([dpr * 2, dpr * 4]);
    g.strokeStyle = 'rgba(236, 235, 230, 0.35)';
    g.lineWidth = dpr;
    g.beginPath(); g.arc(sx, sy, 18 * this.k, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);

    (o.links ?? []).forEach((l, i) => {
      const t = this.linkAt(i, p);
      if (t <= 0) return;
      const trip = l.kind === 'trip';
      g.strokeStyle = trip ? `rgba(${COLOR.track}, 0.9)` : 'rgba(236, 235, 230, 0.7)';
      g.lineWidth = dpr * (trip ? 1.5 : 1);
      g.setLineDash(trip ? [] : [dpr * 4, dpr * 4]);
      g.beginPath();
      const end = this.arc(g, l.to, t);
      g.stroke();
      g.setLineDash([]);
      const ex = end.x;
      const ey = end.y;
      if (t < 1) {
        g.fillStyle = trip ? `rgb(${COLOR.track})` : COLOR.ink;
        g.beginPath(); g.arc(ex, ey, 3 * dpr, 0, Math.PI * 2); g.fill();
        return;
      }
      if (part === 'all') {
        const pts = this.arcPts(l.to);
        const pk = pts[Math.round(((time / 5 + i * 0.37) % 1) * (pts.length - 1))]!;
        g.fillStyle = trip ? `rgba(${COLOR.track}, 0.9)` : 'rgba(236, 235, 230, 0.8)';
        g.beginPath(); g.arc(pk.x, pk.y, 2 * dpr, 0, Math.PI * 2); g.fill();
      }
      const s = 5 * dpr;
      g.strokeStyle = COLOR.ink;
      g.lineWidth = dpr;
      g.beginPath(); g.moveTo(ex - s, ey); g.lineTo(ex + s, ey); g.moveTo(ex, ey - s); g.lineTo(ex, ey + s); g.stroke();
      if (o.labels) this.label(g, ex, ey, this.narrow ? l.to.short ?? l.to.name : l.to.name, l.label);
    });

    g.strokeStyle = COLOR.ink;
    g.fillStyle = COLOR.ink;
    g.lineWidth = dpr * 1.5;
    g.beginPath(); g.arc(sx, sy, 4.5 * dpr, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(sx, sy, 1.5 * dpr, 0, Math.PI * 2); g.fill();
    if (o.labels && !this.narrow) this.label(g, sx, sy, o.station.name, 'home station');
  }
}
