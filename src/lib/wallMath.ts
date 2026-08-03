import type { Vector2, Wall } from '../types';

export interface OpeningSpan {
  kind: 'door' | 'window';
  label: string;
  from: number; // Abstand vom Wand-Start in Metern
  to: number;
}

// Öffnungen einer Wand als [from,to]-Spannen entlang der Wand,
// geclampt und sortiert — Basis für Segment-Maße.
export function openingSpans(wall: Wall, length: number): OpeningSpan[] {
  return [
    ...wall.doors.map((d) => ({ kind: 'door' as const, w: d.width, p: d.positionOnWall })),
    ...wall.windows.map((w) => ({ kind: 'window' as const, w: w.width, p: w.positionOnWall })),
  ]
    .map(({ kind, w, p }) => {
      const width = Math.min(w, length);
      const c = Math.min(Math.max(p * length, width / 2), length - width / 2);
      return {
        kind,
        label: kind === 'door' ? 'Tür' : 'Fenster',
        from: c - width / 2,
        to: c + width / 2,
      };
    })
    .sort((a, b) => a.from - b.from);
}

export function wallLength(start: Vector2, end: Vector2): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

// Transform für BoxGeometry, die entlang der X-Achse liegt
export function wallTransform(wall: Pick<Wall, 'start' | 'end' | 'height'>) {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.hypot(dx, dz);
  return {
    length,
    position: [
      (wall.start.x + wall.end.x) / 2,
      wall.height / 2,
      (wall.start.z + wall.end.z) / 2,
    ] as [number, number, number],
    rotationY: Math.atan2(-dz, dx),
  };
}

// Grid-Snap auf 0,1m-Inkremente
export function snapToGrid(p: Vector2, step = 0.1): Vector2 {
  return {
    x: Math.round(p.x / step) * step,
    z: Math.round(p.z / step) * step,
  };
}

// Endpunkt-Snap: fängt bei existierenden Wand-Endpunkten (Toleranz in Metern)
export function snapToEndpoints(
  p: Vector2,
  walls: Wall[],
  tolerance = 0.1
): { point: Vector2; snapped: boolean } {
  let best: Vector2 | null = null;
  let bestDist = tolerance;
  for (const wall of walls) {
    for (const candidate of [wall.start, wall.end]) {
      const d = Math.hypot(candidate.x - p.x, candidate.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        best = candidate;
      }
    }
  }
  return best
    ? { point: { ...best }, snapped: true }
    : { point: p, snapped: false };
}

// Kanten-Snap an den Raum-Grenzen (Boden-Rechteck um den Ursprung)
export function snapToRoomEdges(
  p: Vector2,
  dims: { width: number; depth: number },
  tolerance = 0.2
): Vector2 {
  const hw = dims.width / 2;
  const hd = dims.depth / 2;
  let { x, z } = p;
  if (Math.abs(x + hw) < tolerance) x = -hw;
  else if (Math.abs(x - hw) < tolerance) x = hw;
  if (Math.abs(z + hd) < tolerance) z = -hd;
  else if (Math.abs(z - hd) < tolerance) z = hd;
  return { x, z };
}
