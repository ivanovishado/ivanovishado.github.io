// Ground-track model of a circular orbit at ISS parameters. Not live tracking: each pass is
// one revolution whose node is chosen so the track crosses a given place.
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
export const INCLINATION = 51.64 * DEG;
/** Westward shift of the ground track per revolution (Earth rotation over a 92.9 min period). */
export const DRIFT = 23.2 * DEG;
export const PERIOD_MIN = 92.9;

export type Pass = { node: number; theta0: number };
export type Place = { name: string; lat: number; lon: number; short?: string };

export const PLACES = {
  gdl: { name: 'Guadalajara', lat: 20.6597, lon: -103.3496 },
  bay: { name: 'Bay Area', lat: 37.39, lon: -122.08 },
  sao: { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  ksc: { name: 'Kennedy Space Center', short: 'Kennedy', lat: 28.6082, lon: -80.6041 },
  toronto: { name: 'Toronto', lat: 43.6629, lon: -79.3957 },
  baku: { name: 'Baku', lat: 40.4093, lon: 49.8671 },
  samara: { name: 'Samara', lat: 53.2001, lon: 50.15 },
  milan: { name: 'Milan', lat: 45.4642, lon: 9.19 },
  nemo: { name: 'Point Nemo', lat: -48.8767, lon: -123.3933 },
} satisfies Record<string, Place>;

/** Home station: every pass is sent from here; the work lands elsewhere. */
export const STATION = PLACES.gdl;

/** Points along the great circle from a to b (degrees), t from 0 to `upto`. */
export function greatCircle(a: Place, b: Place, upto = 1, steps = 72) {
  const v = (p: Place) => {
    const la = p.lat * DEG;
    const lo = p.lon * DEG;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)] as const;
  };
  const [ax, ay, az] = v(a);
  const [bx, by, bz] = v(b);
  const om = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz)));
  const out: { lat: number; lon: number }[] = [];
  const n = Math.max(2, Math.ceil(steps * upto));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * upto;
    const s0 = om ? Math.sin((1 - t) * om) / Math.sin(om) : 1 - t;
    const s1 = om ? Math.sin(t * om) / Math.sin(om) : t;
    const x = s0 * ax + s1 * bx;
    const y = s0 * ay + s1 * by;
    const z = s0 * az + s1 * bz;
    out.push({ lat: Math.atan2(z, Math.hypot(x, y)) / DEG, lon: Math.atan2(y, x) / DEG });
  }
  return out;
}
export type PlaceKey = keyof typeof PLACES;

/** Track position (radians) at `phase` revolutions; longitude is continuous (unwrapped). */
export function trackAt(pass: Pass, phase: number) {
  const th = pass.theta0 + TAU * phase;
  const lat = Math.asin(Math.sin(INCLINATION) * Math.sin(th));
  const base = Math.atan2(Math.cos(INCLINATION) * Math.sin(th), Math.cos(th));
  const lonI = base + TAU * Math.round((th - base) / TAU);
  return { lat, lon: pass.node + lonI - phase * DRIFT };
}

/** A pass that crosses `place` at `lead` revolutions (ascending unless `descending`). Places north of the
 *  inclination are unreachable; the pass then peaks at its highest latitude below them. */
export function passOver(place: Place, lead = 0.3, descending = false): Pass {
  const lim = INCLINATION / DEG - 0.01;
  const phi = Math.max(-lim, Math.min(lim, place.lat)) * DEG;
  const asc = Math.asin(Math.sin(phi) / Math.sin(INCLINATION));
  const thP = descending ? Math.PI - asc : asc;
  const theta0 = thP - TAU * lead;
  const probe = trackAt({ node: 0, theta0 }, lead);
  return { node: place.lon * DEG - probe.lon, theta0 };
}

const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export function formatCoords(latRad: number, lonRad: number) {
  const la = latRad / DEG;
  const lo = wrap180(lonRad / DEG);
  const lat = `${Math.abs(la).toFixed(2).padStart(5, '0')}°${la >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(lo).toFixed(2).padStart(6, '0')}°${lo >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lon}`;
}

/** Subsolar point (degrees) for a date: low-precision, good to about a degree. */
export function subsolar(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const g = (TAU / 365.25) * (day - 1);
  const decl = -23.44 * Math.cos((TAU / 365.25) * (day + 10));
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  return { lat: decl, lon: wrap180(-(utcMin + eot - 720) / 4) };
}

export { DEG, wrap180 };
