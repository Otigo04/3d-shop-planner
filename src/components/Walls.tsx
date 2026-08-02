import { useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useShopStore } from '../store/shopStore';
import { wallTransform } from '../lib/wallMath';
import type { Wall } from '../types';

const ACCENT = '#06b6d4';
const EPS = 0.001;
// Klicks, die aus einem Kamera-Drag entstehen, ignorieren (Pixel-Toleranz)
export const CLICK_DRAG_TOLERANCE = 5;

interface SegmentBox {
  from: number;
  to: number;
  y0: number;
  y1: number;
}

// Wand-Länge in Segmente zerlegen: Öffnungen (Türen/Fenster) lassen Löcher,
// darüber/darunter bleiben Sturz- bzw. Brüstungs-Boxen.
function computeSegments(wall: Wall, length: number): SegmentBox[] {
  const H = wall.height;
  const openings = [
    ...wall.doors.map((d) => ({ kind: 'door' as const, o: d })),
    ...wall.windows.map((w) => ({ kind: 'window' as const, o: w })),
  ]
    .map(({ kind, o }) => {
      const w = Math.min(o.width, length);
      const c = Math.min(
        Math.max(o.positionOnWall * length, w / 2),
        length - w / 2
      );
      // Öffnungen defensiv auf Wand-Höhe clampen (Wand niedriger als Tür etc.)
      const clamped =
        kind === 'door'
          ? { ...o, height: Math.min((o as Wall['doors'][number]).height, H) }
          : (() => {
              const win = o as Wall['windows'][number];
              const sill = Math.min(win.sillHeight, Math.max(H - 0.1, 0));
              return {
                ...win,
                sillHeight: sill,
                height: Math.min(win.height, H - sill),
              };
            })();
      return { kind, o: clamped, from: c - w / 2, to: c + w / 2 };
    })
    .sort((a, b) => a.from - b.from);

  const boxes: SegmentBox[] = [];
  let cursor = 0;
  for (const op of openings) {
    if (op.from > cursor + EPS)
      boxes.push({ from: cursor, to: op.from, y0: 0, y1: H });
    if (op.kind === 'door') {
      const d = op.o as Wall['doors'][number];
      if (d.height < H - EPS)
        boxes.push({ from: op.from, to: op.to, y0: d.height, y1: H });
    } else {
      const w = op.o as Wall['windows'][number];
      if (w.sillHeight > EPS)
        boxes.push({ from: op.from, to: op.to, y0: 0, y1: w.sillHeight });
      const top = w.sillHeight + w.height;
      if (top < H - EPS)
        boxes.push({ from: op.from, to: op.to, y0: top, y1: H });
    }
    cursor = Math.max(cursor, op.to);
  }
  if (cursor < length - EPS)
    boxes.push({ from: cursor, to: length, y0: 0, y1: H });
  return boxes;
}

function WallMesh({ wall }: { wall: Wall }) {
  const selected = useShopStore((s) =>
    s.selection.some((x) => x.id === wall.id)
  );
  const mode = useShopStore((s) => s.mode);
  const [hovered, setHovered] = useState(false);

  const { length, position, rotationY } = wallTransform(wall);
  const interactive = mode === 'view' || mode === 'edit';

  const segments = useMemo(() => computeSegments(wall, length), [wall, length]);

  const emissive = selected ? ACCENT : hovered ? ACCENT : '#000000';
  const emissiveIntensity = selected ? 0.35 : hovered ? 0.12 : 0;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || e.delta > CLICK_DRAG_TOLERANCE) return;
    e.stopPropagation();
    const s = useShopStore.getState();
    if (e.ctrlKey || e.metaKey) s.toggleSelected(wall.id, 'wall');
    else s.setSelected(wall.id, 'wall');
  };

  return (
    // Gruppe auf Boden-Niveau (y=0) — Segmente tragen ihre Höhe selbst
    <group
      position={[position[0], 0, position[2]]}
      rotation={[0, rotationY, 0]}
      onClick={onClick}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      {/* Wand-Segmente */}
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={[
            (seg.from + seg.to) / 2 - length / 2,
            (seg.y0 + seg.y1) / 2,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[seg.to - seg.from, seg.y1 - seg.y0, wall.thickness]} />
          <meshStandardMaterial
            color={wall.color}
            roughness={0.9}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}

      {/* Tür-Blätter */}
      {wall.doors.map((d) => {
        const w = Math.min(d.width, length);
        const c = Math.min(Math.max(d.positionOnWall * length, w / 2), length - w / 2);
        const doorH = Math.min(d.height, wall.height);
        const glass = d.material === 'glass';
        return (
          <mesh
            key={d.id}
            position={[c - length / 2, doorH / 2, 0]}
            castShadow={!glass}
          >
            <boxGeometry args={[w, doorH, wall.thickness * 0.35]} />
            <meshStandardMaterial
              color={glass ? '#bfe3ec' : d.color}
              roughness={glass ? 0.15 : 0.6}
              transparent={glass}
              opacity={glass ? 0.4 : 1}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity * 0.5}
            />
          </mesh>
        );
      })}

      {/* Fenster-Scheiben */}
      {wall.windows.map((win) => {
        const w = Math.min(win.width, length);
        const c = Math.min(Math.max(win.positionOnWall * length, w / 2), length - w / 2);
        const sill = Math.min(win.sillHeight, Math.max(wall.height - 0.1, 0));
        const winH = Math.min(win.height, wall.height - sill);
        return (
          <mesh
            key={win.id}
            position={[c - length / 2, sill + winH / 2, 0]}
          >
            <boxGeometry args={[w, winH, wall.thickness * 0.25]} />
            <meshStandardMaterial
              color="#bfe3ec"
              roughness={0.1}
              transparent
              opacity={0.35}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity * 0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function Walls() {
  const walls = useShopStore((s) => s.walls);
  return (
    <group>
      {walls.map((wall) => (
        <WallMesh key={wall.id} wall={wall} />
      ))}
    </group>
  );
}
