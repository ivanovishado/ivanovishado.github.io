import { LAND, LAND_RES } from './land-data';

/** Land spans per row, in degrees of longitude: [lon0, lon1, lon0, lon1, ...]. */
let rows: Float32Array[] | null = null;

export function landRows() {
  if (rows) return rows;
  rows = LAND.split('|').map((row) => {
    if (!row) return new Float32Array(0);
    const n = row.split(',').map((s) => parseInt(s, 36));
    const out = new Float32Array(n.length);
    for (let i = 0; i + 1 < n.length; i += 2) {
      out[i] = n[i]! / LAND_RES - 180;
      out[i + 1] = (n[i]! + n[i + 1]!) / LAND_RES - 180;
    }
    return out;
  });
  return rows;
}

export const landRowAt = (lat: number) => landRows()[Math.floor((90 - lat) * LAND_RES)];
