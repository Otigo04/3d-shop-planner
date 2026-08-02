import { useEffect, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';
import { catalogItem } from '../lib/furnitureCatalog';
import { FurnitureModel } from './Furniture';
import type { Furniture, Vector2 } from '../types';

const snap = (v: number) => Math.round(v / 0.1) * 0.1;
const MAX_ROW = 60;

interface Row {
  positions: Vector2[];
  rotation: number;
}

export function FurniturePlacer() {
  const mode = useShopStore((s) => s.mode);
  const placingType = useShopStore((s) => s.placingType);

  const [cursor, setCursor] = useState<Vector2 | null>(null);
  const [rotation, setRotation] = useState(0);
  const [anchor, setAnchor] = useState<Vector2 | null>(null);
  const rightDown = useRef<{ x: number; y: number } | null>(null);

  const active = mode === 'furniture-place' && placingType !== null;
  const item = placingType ? catalogItem(placingType) : null;

  // R = 90° drehen, Escape = Modus verlassen
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'r') {
        e.stopImmediatePropagation();
        setRotation((r) => r + Math.PI / 2);
      }
      if (e.key === 'Escape') useShopStore.getState().stopPlacing();
    };
    // capture: läuft vor dem Kamera-Handler (R wäre sonst Kamera-Reset)
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);

  // Rechtsklick ohne Drag = Modus verlassen (Drag bleibt Kamera)
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => {
      if (e.button === 2) rightDown.current = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (e.button !== 2 || !rightDown.current) return;
      const moved = Math.hypot(
        e.clientX - rightDown.current.x,
        e.clientY - rightDown.current.y
      );
      rightDown.current = null;
      if (moved < 5) useShopStore.getState().stopPlacing();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      setCursor(null);
      setRotation(0);
      setAnchor(null);
    }
  }, [active]);

  if (!active || !item) return null;

  // Reihe entlang der Zieh-Linie: Richtung snappt auf 45°,
  // Abstand = Möbel-Länge (Items stehen bündig aneinander)
  const computeRow = (from: Vector2, to: Vector2): Row | null => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist < item.size.x * 0.75) return null;
    const rawAngle = Math.atan2(-dz, dx);
    const snapAngle = (Math.round(rawAngle / (Math.PI / 4)) * Math.PI) / 4;
    const ux = Math.cos(snapAngle);
    const uz = -Math.sin(snapAngle);
    const count = Math.min(Math.floor(dist / item.size.x) + 1, MAX_ROW);
    return {
      positions: Array.from({ length: count }, (_, i) => ({
        x: from.x + ux * i * item.size.x,
        z: from.z + uz * i * item.size.x,
      })),
      rotation: snapAngle,
    };
  };

  const row = anchor && cursor ? computeRow(anchor, cursor) : null;

  const makeItem = (pos: Vector2, rot: number): Furniture => ({
    id: crypto.randomUUID(),
    type: item.type,
    position: { x: pos.x, y: 0, z: pos.z },
    rotation: rot,
    scale: { ...item.size },
    color: item.color,
    material: item.material,
  });

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    setCursor({ x: snap(e.point.x), z: snap(e.point.z) });
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setAnchor({ x: snap(e.point.x), z: snap(e.point.z) });
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 || !anchor) return;
    e.stopPropagation();
    const { addFurniture, addFurnitureBatch } = useShopStore.getState();
    if (row && row.positions.length > 1) {
      addFurnitureBatch(row.positions.map((p) => makeItem(p, row.rotation)));
    } else {
      addFurniture(makeItem(anchor, rotation));
    }
    // Multi-Place: Modus bleibt aktiv
    setAnchor(null);
  };

  const previewItems: Array<{ pos: Vector2; rot: number }> =
    row && row.positions.length > 1
      ? row.positions.map((p) => ({ pos: p, rot: row.rotation }))
      : cursor
        ? [{ pos: anchor ?? cursor, rot: rotation }]
        : [];

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Halbtransparente Preview: einzeln oder ganze Reihe */}
      {previewItems.map((p, i) => (
        <group
          key={i}
          position={[p.pos.x, 0, p.pos.z]}
          rotation={[0, p.rot, 0]}
        >
          <FurnitureModel
            f={{
              type: item.type,
              scale: item.size,
              color: '#06b6d4',
              material: item.material,
            }}
            opacity={0.5}
          />
        </group>
      ))}

      {/* Anzahl-Anzeige beim Reihen-Ziehen */}
      {row && row.positions.length > 1 && anchor && cursor && (
        <Html
          position={[
            (anchor.x + cursor.x) / 2,
            item.size.y + 0.4,
            (anchor.z + cursor.z) / 2,
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="wall-length-label">
            {row.positions.length} × {item.label}
          </div>
        </Html>
      )}
    </group>
  );
}
