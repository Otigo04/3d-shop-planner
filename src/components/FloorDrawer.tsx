import { useEffect, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';
import { snapToGrid, snapToRoomEdges } from '../lib/wallMath';
import { formatLength } from '../lib/units';
import type { Vector2 } from '../types';

const DEFAULT_COLOR = '#cbb79a';
const MIN_SIZE = 0.2;

export function FloorDrawer() {
  const mode = useShopStore((s) => s.mode);
  const unit = useShopStore((s) => s.unit);

  const [start, setStartState] = useState<Vector2 | null>(null);
  const [cursor, setCursor] = useState<Vector2 | null>(null);
  const rightDown = useRef<{ x: number; y: number } | null>(null);
  // Ref-Spiegel: Handler dürfen keinen Store-Call im setState-Updater machen
  const startRef = useRef<Vector2 | null>(null);
  const setStart = (v: Vector2 | null) => {
    startRef.current = v;
    setStartState(v);
  };

  const active = mode === 'floor-draw';

  // Rechtsklick ohne Drag / Escape: abbrechen bzw. Modus verlassen
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
      if (moved < 5) {
        if (startRef.current) setStart(null);
        else useShopStore.getState().setMode('view');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (startRef.current) setStart(null);
      else useShopStore.getState().setMode('view');
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      setStart(null);
      setCursor(null);
    }
  }, [active]);

  if (!active) return null;

  const resolvePoint = (e: ThreeEvent<PointerEvent>): Vector2 => {
    const { floorDimensions } = useShopStore.getState();
    return snapToRoomEdges(
      snapToGrid({ x: e.point.x, z: e.point.z }),
      floorDimensions
    );
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    setCursor(resolvePoint(e));
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = resolvePoint(e);
    if (!start) {
      setStart(p);
      return;
    }
    const w = Math.abs(p.x - start.x);
    const d = Math.abs(p.z - start.z);
    if (w >= MIN_SIZE && d >= MIN_SIZE) {
      const { addFloor, setSelected } = useShopStore.getState();
      const id = crypto.randomUUID();
      // Ecken normalisieren: start = Min, end = Max
      addFloor({
        id,
        start: { x: Math.min(start.x, p.x), z: Math.min(start.z, p.z) },
        end: { x: Math.max(start.x, p.x), z: Math.max(start.z, p.z) },
        color: DEFAULT_COLOR,
      });
      setSelected(id, 'floor');
      setStart(null);
    }
  };

  const w = start && cursor ? Math.abs(cursor.x - start.x) : 0;
  const d = start && cursor ? Math.abs(cursor.z - start.z) : 0;
  const preview = start && cursor && w >= MIN_SIZE && d >= MIN_SIZE;

  return (
    <group>
      {/* Unsichtbare Raycast-Ebene */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Start-Marker */}
      {start && (
        <mesh position={[start.x, 0.02, start.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.09, 24]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      )}

      {/* Rechteck-Preview + Maße */}
      {preview && start && cursor && (
        <>
          <mesh
            position={[(start.x + cursor.x) / 2, 0.015, (start.z + cursor.z) / 2]}
          >
            <boxGeometry args={[w, 0.02, d]} />
            <meshStandardMaterial
              color="#06b6d4"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
          <Html
            position={[(start.x + cursor.x) / 2, 0.4, (start.z + cursor.z) / 2]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="wall-length-label">
              {formatLength(w, unit)} × {formatLength(d, unit)}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
