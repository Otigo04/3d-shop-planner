import type { Furniture, Wall } from '../types';

export interface Clearance {
  origin: { x: number; z: number };
  end: { x: number; z: number };
  dist: number;
}

const MAX_DIST = 50;
const EPS = 1e-9;

// Punkt/Vektor um Y-Achse rotieren (three.js-Konvention)
const rotY = (x: number, z: number, a: number) => ({
  x: x * Math.cos(a) + z * Math.sin(a),
  z: -x * Math.sin(a) + z * Math.cos(a),
});

// Strahl P+tD gegen Strecke A→B (2D, XZ). Liefert t oder null.
function raySegment(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number | null {
  const ex = bx - ax;
  const ez = bz - az;
  const det = -dx * ez + ex * dz;
  if (Math.abs(det) < EPS) return null;
  const wx = ax - px;
  const wz = az - pz;
  const t = (-wx * ez + ex * wz) / det;
  const s = (dx * wz - dz * wx) / det;
  if (t <= 0 || s < 0 || s > 1) return null;
  return t;
}

// Strahl gegen achsenparalleles Rechteck (halbe Ausdehnung hx/hz), 2D-Slab-Test
function rayAabb(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  hx: number,
  hz: number
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  if (Math.abs(dx) < EPS) {
    if (px < -hx || px > hx) return null;
  } else {
    const t1 = (-hx - px) / dx;
    const t2 = (hx - px) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  if (Math.abs(dz) < EPS) {
    if (pz < -hz || pz > hz) return null;
  } else {
    const t1 = (-hz - pz) / dz;
    const t2 = (hz - pz) / dz;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  if (tmax < Math.max(tmin, 0)) return null;
  return tmin > EPS ? tmin : null; // Start innerhalb → kein sinnvoller Abstand
}

// Strahl gegen rotierte Möbel-Box: in deren Lokalraum transformieren
function rayFurniture(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  g: Furniture
): number | null {
  const lp = rotY(px - g.position.x, pz - g.position.z, -g.rotation);
  const ld = rotY(dx, dz, -g.rotation);
  return rayAabb(lp.x, lp.z, ld.x, ld.z, g.scale.x / 2, g.scale.z / 2);
}

// Abstände von allen 4 Seiten eines Möbels zum nächsten Hindernis:
// Wände (abzüglich halber Dicke), andere Möbel, Raum-Grenzen.
export function computeClearances(
  f: Furniture,
  walls: Wall[],
  furniture: Furniture[],
  room: { width: number; depth: number }
): Clearance[] {
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const roomCorners: Array<[number, number, number, number]> = [
    [-hw, -hd, hw, -hd],
    [hw, -hd, hw, hd],
    [hw, hd, -hw, hd],
    [-hw, hd, -hw, -hd],
  ];

  const sides = [
    { ox: f.scale.x / 2, oz: 0, dx: 1, dz: 0 },
    { ox: -f.scale.x / 2, oz: 0, dx: -1, dz: 0 },
    { ox: 0, oz: f.scale.z / 2, dx: 0, dz: 1 },
    { ox: 0, oz: -f.scale.z / 2, dx: 0, dz: -1 },
  ];

  const out: Clearance[] = [];
  for (const side of sides) {
    const o = rotY(side.ox, side.oz, f.rotation);
    const d = rotY(side.dx, side.dz, f.rotation);
    const px = f.position.x + o.x;
    const pz = f.position.z + o.z;

    let best = MAX_DIST;
    for (const w of walls) {
      const t = raySegment(px, pz, d.x, d.z, w.start.x, w.start.z, w.end.x, w.end.z);
      if (t !== null) best = Math.min(best, t - w.thickness / 2);
    }
    for (const [ax, az, bx, bz] of roomCorners) {
      const t = raySegment(px, pz, d.x, d.z, ax, az, bx, bz);
      if (t !== null) best = Math.min(best, t);
    }
    for (const g of furniture) {
      if (g.id === f.id) continue;
      const t = rayFurniture(px, pz, d.x, d.z, g);
      if (t !== null) best = Math.min(best, t);
    }

    if (best > 0.005 && best < MAX_DIST - 0.01) {
      out.push({
        origin: { x: px, z: pz },
        end: { x: px + d.x * best, z: pz + d.z * best },
        dist: best,
      });
    }
  }
  return out;
}
