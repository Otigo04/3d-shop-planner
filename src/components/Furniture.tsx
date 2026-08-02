import { useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useShopStore } from '../store/shopStore';
import type { Furniture as FurnitureItem, FurnitureMaterial } from '../types';

const ACCENT = '#06b6d4';

export function materialProps(material: FurnitureMaterial) {
  switch (material) {
    case 'metal':
      return { roughness: 0.35, metalness: 0.7 };
    case 'glass':
      return { roughness: 0.1, metalness: 0, transparent: true, opacity: 0.4 };
    case 'wood':
      return { roughness: 0.7, metalness: 0 };
    default:
      return { roughness: 0.5, metalness: 0 };
  }
}

// Strahl auf die Boden-Ebene (y=0) schneiden
function rayToFloor(ray: THREE.Ray): { x: number; z: number } | null {
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;
  return {
    x: ray.origin.x + ray.direction.x * t,
    z: ray.origin.z + ray.direction.z * t,
  };
}

const snap = (v: number) => Math.round(v / 0.1) * 0.1;

// Minimalistisch-realistische Geometrien: erkennbar, nicht hyperdetailliert.
// Alle Maße relativ zu scale (x=Länge, y=Höhe, z=Tiefe), Ursprung am Boden.
export function FurnitureModel({
  f,
  emissive = '#000000',
  emissiveIntensity = 0,
  opacity = 1,
}: {
  f: Pick<FurnitureItem, 'type' | 'scale' | 'color' | 'material'>;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}) {
  const { x: L, y: H, z: D } = f.scale;
  const mat = {
    color: f.color,
    emissive,
    emissiveIntensity,
    ...materialProps(f.material),
    ...(opacity < 1
      ? { transparent: true, opacity, depthWrite: false }
      : {}),
  };

  const box = (
    w: number,
    h: number,
    d: number,
    px: number,
    py: number,
    pz: number,
    key: string | number
  ) => (
    <mesh key={key} position={[px, py, pz]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial {...mat} />
    </mesh>
  );

  switch (f.type) {
    case 'shelf': {
      // Zwei Seitenwangen + Rückwand + 4 sichtbare Böden
      const t = 0.03;
      const boards = 4;
      return (
        <group>
          {box(t, H, D, -L / 2 + t / 2, H / 2, 0, 'l')}
          {box(t, H, D, L / 2 - t / 2, H / 2, 0, 'r')}
          {box(L, H, t, 0, H / 2, -D / 2 + t / 2, 'back')}
          {Array.from({ length: boards }, (_, i) =>
            box(L - 2 * t, t, D - t, 0, ((i + 1) / boards) * (H - t), t / 2, i)
          )}
        </group>
      );
    }
    case 'pegboard':
      return <group>{box(L, H, D, 0, H / 2, 0, 0)}</group>;
    case 'counter':
      // Korpus + überstehende Deckplatte
      return (
        <group>
          {box(L, H - 0.04, D, 0, (H - 0.04) / 2, 0, 'body')}
          {box(L + 0.06, 0.04, D + 0.06, 0, H - 0.02, 0, 'top')}
        </group>
      );
    case 'desk':
      return (
        <group>
          {box(L, H - 0.04, D, 0, (H - 0.04) / 2, 0, 'body')}
          {box(L + 0.04, 0.04, D + 0.04, 0, H - 0.02, 0, 'top')}
        </group>
      );
    case 'rack': {
      // Zwei Standfüße + Pfosten + Kleiderstange oben
      const r = 0.02;
      return (
        <group>
          <mesh position={[-L / 2 + r, H / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r, H, 10]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh position={[L / 2 - r, H / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r, H, 10]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh
            position={[0, H - r, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[r, r, L - 4 * r, 10]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          {box(0.3, 0.02, D, -L / 2 + r, 0.01, 0, 'footl')}
          {box(0.3, 0.02, D, L / 2 - r, 0.01, 0, 'footr')}
        </group>
      );
    }
    case 'table': {
      const legT = 0.05;
      const topT = 0.04;
      return (
        <group>
          {box(L, topT, D, 0, H - topT / 2, 0, 'top')}
          {(
            [
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ] as const
          ).map(([sx, sz], i) =>
            box(
              legT,
              H - topT,
              legT,
              sx * (L / 2 - legT),
              (H - topT) / 2,
              sz * (D / 2 - legT),
              i
            )
          )}
        </group>
      );
    }
    case 'box':
      // Karton mit Klebeband-Streifen oben
      return (
        <group>
          {box(L, H, D, 0, H / 2, 0, 'body')}
          <mesh position={[0, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[L * 0.2, D]} />
            <meshStandardMaterial
              color="#d9c9a3"
              roughness={0.8}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              {...(opacity < 1
                ? { transparent: true, opacity, depthWrite: false }
                : {})}
            />
          </mesh>
        </group>
      );
    case 'boxstack':
      // Stapel aus drei Kartons, leicht versetzt
      return (
        <group>
          {box(L, H * 0.45, D, 0, H * 0.225, 0, 'b1')}
          <group rotation={[0, 0.12, 0]}>
            {box(L * 0.9, H * 0.33, D * 0.9, 0.02, H * 0.45 + H * 0.165, 0, 'b2')}
          </group>
          <group rotation={[0, -0.2, 0]}>
            {box(L * 0.65, H * 0.22, D * 0.65, -0.03, H * 0.78 + H * 0.11, 0.02, 'b3')}
          </group>
        </group>
      );
    case 'pallet': {
      // Europaletten-Look: 3 Kufen unten + 5 Bretter oben
      const skidH = H * 0.55;
      const boardH = H * 0.35;
      return (
        <group>
          {[-L / 2 + 0.05, 0, L / 2 - 0.05].map((px, i) =>
            box(0.1, skidH, D, px, skidH / 2, 0, `skid${i}`)
          )}
          {[-2, -1, 0, 1, 2].map((i) =>
            box(L, boardH, 0.1, 0, skidH + boardH / 2, (i * (D - 0.12)) / 4, `bd${i}`)
          )}
        </group>
      );
    }
    case 'bench': {
      const seatT = 0.06;
      return (
        <group>
          {box(L, seatT, D, 0, H - seatT / 2, 0, 'seat')}
          {box(0.05, H - seatT, D - 0.05, -L / 2 + 0.08, (H - seatT) / 2, 0, 'l1')}
          {box(0.05, H - seatT, D - 0.05, L / 2 - 0.08, (H - seatT) / 2, 0, 'l2')}
        </group>
      );
    }
    case 'plant': {
      // Topf (nutzt Möbel-Farbe) + grüne Krone
      const potH = H * 0.3;
      const leaf = {
        color: '#4a7c4e',
        roughness: 0.9,
        emissive,
        emissiveIntensity,
        ...(opacity < 1
          ? { transparent: true, opacity, depthWrite: false }
          : {}),
      };
      return (
        <group>
          <mesh position={[0, potH / 2, 0]} castShadow>
            <cylinderGeometry args={[L * 0.32, L * 0.24, potH, 12]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh position={[0, potH + (H - potH) * 0.35, 0]} castShadow>
            <sphereGeometry args={[L * 0.42, 10, 8]} />
            <meshStandardMaterial {...leaf} />
          </mesh>
          <mesh position={[0, potH + (H - potH) * 0.75, 0]} castShadow>
            <sphereGeometry args={[L * 0.3, 10, 8]} />
            <meshStandardMaterial {...leaf} />
          </mesh>
        </group>
      );
    }
    case 'mirror':
      // Rahmen (Möbel-Farbe) + spiegelnde Fläche
      return (
        <group>
          {box(L, H, D, 0, H / 2, 0, 'frame')}
          <mesh position={[0, H / 2, D / 2 + 0.002]}>
            <planeGeometry args={[L * 0.86, H * 0.92]} />
            <meshStandardMaterial
              color="#cfe4ec"
              roughness={0.05}
              metalness={0.9}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              {...(opacity < 1
                ? { transparent: true, opacity, depthWrite: false }
                : {})}
            />
          </mesh>
        </group>
      );
    case 'fridge': {
      // Kühlregal: Korpus + 2 Einlegeböden + Glasfront
      const t = 0.05;
      const glass = {
        color: '#bfe3ec',
        roughness: 0.1,
        transparent: true,
        opacity: opacity < 1 ? opacity * 0.5 : 0.3,
        depthWrite: false,
        emissive,
        emissiveIntensity,
      };
      return (
        <group>
          {box(L, H, t, 0, H / 2, -D / 2 + t / 2, 'back')}
          {box(t, H, D, -L / 2 + t / 2, H / 2, 0, 'l')}
          {box(t, H, D, L / 2 - t / 2, H / 2, 0, 'r')}
          {box(L, t, D, 0, H - t / 2, 0, 'top')}
          {box(L, 0.15, D, 0, 0.075, 0, 'base')}
          {[0.35, 0.6].map((f, i) =>
            box(L - 2 * t, 0.03, D - t, 0, H * f, 0, `shelf${i}`)
          )}
          <mesh position={[0, H / 2, D / 2 - 0.01]}>
            <planeGeometry args={[L - 0.05, H - 0.2]} />
            <meshStandardMaterial {...glass} />
          </mesh>
        </group>
      );
    }
    case 'changingroom': {
      // U-Kabine: Rückwand + 2 Seiten + Vorhangstange
      const t = 0.04;
      return (
        <group>
          {box(L, H, t, 0, H / 2, -D / 2 + t / 2, 'back')}
          {box(t, H, D, -L / 2 + t / 2, H / 2, 0, 'l')}
          {box(t, H, D, L / 2 - t / 2, H / 2, 0, 'r')}
          <mesh
            position={[0, H - 0.15, D / 2 - 0.05]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.015, 0.015, L - 2 * t, 8]} />
            <meshStandardMaterial
              color="#9aa0a6"
              roughness={0.3}
              metalness={0.7}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              {...(opacity < 1
                ? { transparent: true, opacity, depthWrite: false }
                : {})}
            />
          </mesh>
        </group>
      );
    }
    default:
      return <group>{box(L, H, D, 0, H / 2, 0, 0)}</group>;
  }
}

function FurnitureInstance({ f }: { f: FurnitureItem }) {
  const selected = useShopStore((s) => s.selection.some((x) => x.id === f.id));
  const mode = useShopStore((s) => s.mode);
  const [hovered, setHovered] = useState(false);
  const dragOffset = useRef<{ x: number; z: number } | null>(null);
  // Gruppen-Drag: Delta wird akkumuliert und in 0,1m-Schritten angewendet
  const groupDrag = useRef<{
    lastX: number;
    lastZ: number;
    pendX: number;
    pendZ: number;
  } | null>(null);

  const interactive = mode === 'view' || mode === 'edit';

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    const store = useShopStore.getState();
    if (e.ctrlKey || e.metaKey) {
      // Strg+Klick: zur Mehrfachauswahl hinzufügen/entfernen, kein Drag
      store.toggleSelected(f.id, 'furniture');
      return;
    }
    const hit = rayToFloor(e.ray);
    // Mitglied einer Mehrfachauswahl: Auswahl NICHT ersetzen → Gruppe ziehen
    const inMulti =
      store.selection.length > 1 &&
      store.selection.some((x) => x.id === f.id);
    if (!inMulti) store.setSelected(f.id, 'furniture');
    if (!hit) return;
    if (inMulti) {
      groupDrag.current = { lastX: hit.x, lastZ: hit.z, pendX: 0, pendZ: 0 };
    } else {
      dragOffset.current = { x: f.position.x - hit.x, z: f.position.z - hit.z };
    }
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const hit = rayToFloor(e.ray);
    if (!hit) return;
    const g = groupDrag.current;
    if (g) {
      g.pendX += hit.x - g.lastX;
      g.pendZ += hit.z - g.lastZ;
      g.lastX = hit.x;
      g.lastZ = hit.z;
      const sx = snap(g.pendX);
      const sz = snap(g.pendZ);
      if (sx !== 0 || sz !== 0) {
        useShopStore.getState().moveSelection(sx, sz, 'sel:drag');
        g.pendX -= sx;
        g.pendZ -= sz;
      }
      return;
    }
    if (!dragOffset.current) return;
    useShopStore.getState().updateFurniture(
      f.id,
      {
        position: {
          x: snap(hit.x + dragOffset.current.x),
          y: 0,
          z: snap(hit.z + dragOffset.current.z),
        },
      },
      `furn:${f.id}:move`
    );
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragOffset.current || groupDrag.current) {
      dragOffset.current = null;
      groupDrag.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <group
      position={[f.position.x, 0, f.position.z]}
      rotation={[0, f.rotation, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // Click nicht zum Boden durchfallen lassen (würde sofort deselektieren)
      onClick={(e) => interactive && e.stopPropagation()}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <FurnitureModel
        f={f}
        emissive={selected || hovered ? ACCENT : '#000000'}
        emissiveIntensity={selected ? 0.3 : hovered ? 0.1 : 0}
      />
    </group>
  );
}

export function FurnitureLayer() {
  const furniture = useShopStore((s) => s.furniture);
  return (
    <group>
      {furniture.map((f) => (
        <FurnitureInstance key={f.id} f={f} />
      ))}
    </group>
  );
}
