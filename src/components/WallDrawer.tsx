import { useEffect, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';
import {
  formatMeters,
  snapToEndpoints,
  snapToGrid,
  snapToRoomEdges,
  wallLength,
  wallTransform,
} from '../lib/wallMath';
import type { Vector2 } from '../types';

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.15;
const MIN_LENGTH = 0.1;

export function WallDrawer() {
  const mode = useShopStore((s) => s.mode);
  const walls = useShopStore((s) => s.walls);

  const [start, setStartState] = useState<Vector2 | null>(null);
  const [cursor, setCursor] = useState<Vector2 | null>(null);
  const [snapped, setSnapped] = useState(false);
  // Ref-Spiegel: Handler dürfen keinen Store-Call im setState-Updater machen
  const startRef = useRef<Vector2 | null>(null);
  const setStart = (v: Vector2 | null) => {
    startRef.current = v;
    setStartState(v);
  };

  const active = mode === 'wall-draw';
  const rightDown = useRef<{ x: number; y: number } | null>(null);

  // Rechtsklick (ohne Drag!) bricht ab — Rechts-Drag bleibt Kamera-Rotation
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
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [active]);

  // Escape: laufendes Segment abbrechen, sonst Modus verlassen
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (start) {
        setStart(null);
      } else {
        useShopStore.getState().setMode('view');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, start]);

  // Beim Modus-Verlassen aufräumen
  useEffect(() => {
    if (!active) {
      setStart(null);
      setCursor(null);
      setSnapped(false);
    }
  }, [active]);

  if (!active) return null;

  const resolvePoint = (e: ThreeEvent<PointerEvent | MouseEvent>): Vector2 => {
    const raw: Vector2 = { x: e.point.x, z: e.point.z };
    // Priorität: Wand-Endpunkte > Raum-Kanten > Grid
    const endpointSnap = snapToEndpoints(raw, walls);
    if (endpointSnap.snapped) {
      setSnapped(true);
      return endpointSnap.point;
    }
    const { floorDimensions } = useShopStore.getState();
    const edged = snapToRoomEdges(snapToGrid(raw), floorDimensions);
    setSnapped(edged.x !== snapToGrid(raw).x || edged.z !== snapToGrid(raw).z);
    return edged;
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
    if (wallLength(start, p) >= MIN_LENGTH) {
      const { addWall, setSelected } = useShopStore.getState();
      const id = crypto.randomUUID();
      addWall({
        id,
        start,
        end: p,
        height: WALL_HEIGHT,
        thickness: WALL_THICKNESS,
        color: '#ffffff',
        doors: [],
        windows: [],
      });
      setSelected(id, 'wall');
      // Kettenzeichnen: neues Segment beginnt am Endpunkt
      setStart(p);
    }
  };

  const previewLength = start && cursor ? wallLength(start, cursor) : 0;
  const preview =
    start && cursor && previewLength >= MIN_LENGTH
      ? wallTransform({ start, end: cursor, height: WALL_HEIGHT })
      : null;

  return (
    <group>
      {/* Unsichtbare Raycast-Ebene für Boden-Klicks */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
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

      {/* Cursor-/Snap-Marker */}
      {cursor && (
        <mesh
          position={[cursor.x, 0.02, cursor.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[snapped ? 0.13 : 0.07, 24]} />
          <meshBasicMaterial color={snapped ? '#f59e0b' : '#06b6d4'} />
        </mesh>
      )}

      {/* Wand-Preview + Live-Länge */}
      {preview && start && cursor && (
        <>
          <mesh position={preview.position} rotation={[0, preview.rotationY, 0]}>
            <boxGeometry args={[preview.length, WALL_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial
              color="#06b6d4"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
          <Html
            position={[
              (start.x + cursor.x) / 2,
              WALL_HEIGHT + 0.3,
              (start.z + cursor.z) / 2,
            ]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="wall-length-label">{formatMeters(previewLength)}</div>
          </Html>
        </>
      )}
    </group>
  );
}
