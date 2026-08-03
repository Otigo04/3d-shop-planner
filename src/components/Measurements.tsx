import { Html } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';
import { openingSpans, wallLength } from '../lib/wallMath';
import { formatLength } from '../lib/units';
import type { Wall } from '../types';

// Wand in Teilstücke zerlegen: Rest | Öffnung | Rest | Öffnung | Rest ...
function wallParts(wall: Wall, length: number) {
  const spans = openingSpans(wall, length);
  const parts: Array<{ from: number; to: number; label: string; opening: boolean }> = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.from > cursor + 0.01)
      parts.push({ from: cursor, to: s.from, label: '', opening: false });
    parts.push({ from: s.from, to: s.to, label: s.label, opening: true });
    cursor = Math.max(cursor, s.to);
  }
  if (cursor < length - 0.01)
    parts.push({ from: cursor, to: length, label: '', opening: false });
  return parts;
}

function WallMeasurements({ wall }: { wall: Wall }) {
  const unit = useShopStore((s) => s.unit);
  const length = wallLength(wall.start, wall.end);
  if (length < 0.01) return null;
  const dirX = (wall.end.x - wall.start.x) / length;
  const dirZ = (wall.end.z - wall.start.z) / length;
  const at = (dist: number, y: number): [number, number, number] => [
    wall.start.x + dirX * dist,
    y,
    wall.start.z + dirZ * dist,
  ];

  const parts = wallParts(wall, length);
  const hasOpenings = parts.some((p) => p.opening);

  return (
    <group>
      {/* Gesamtlänge über der Wand */}
      <Html
        position={at(length / 2, wall.height + 0.35)}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="dim-label">{formatLength(length, unit)}</div>
      </Html>

      {/* Teilstücke: Rest links · Tür · Rest rechts usw. */}
      {hasOpenings &&
        parts.map((p, i) => (
          <Html
            key={i}
            position={at((p.from + p.to) / 2, p.opening ? 1.1 : 0.45)}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className={`dim-label ${p.opening ? 'opening' : 'part'}`}>
              {p.label ? `${p.label} ` : ''}
              {formatLength(p.to - p.from, unit)}
            </div>
          </Html>
        ))}
    </group>
  );
}

export function Measurements() {
  const show = useShopStore((s) => s.showMeasurements);
  const walls = useShopStore((s) => s.walls);
  const dims = useShopStore((s) => s.floorDimensions);
  const unit = useShopStore((s) => s.unit);

  if (!show) return null;

  return (
    <group>
      {walls.map((w) => (
        <WallMeasurements key={w.id} wall={w} />
      ))}

      {/* Raum-Maße an den Kanten */}
      <Html
        position={[0, 0.05, dims.depth / 2 + 0.7]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="dim-label room">↔ {formatLength(dims.width, unit)}</div>
      </Html>
      <Html
        position={[dims.width / 2 + 0.7, 0.05, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="dim-label room">↕ {formatLength(dims.depth, unit)}</div>
      </Html>
    </group>
  );
}
