import { useEffect, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShopStore } from '../store/shopStore';
import type { TextNote } from '../types';

const ACCENT = '#06b6d4';
const DEFAULT_COLOR = '#d97706';
const MIN_SIZE = 0.08;
const MAX_SIZE = 5;

const snap = (v: number) => Math.round(v / 0.05) * 0.05;

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

function NoteInstance({ note }: { note: TextNote }) {
  const selected = useShopStore((s) =>
    s.selection.some((x) => x.id === note.id)
  );
  const mode = useShopStore((s) => s.mode);
  const darkMode = useShopStore((s) => s.darkMode);
  const [hovered, setHovered] = useState(false);
  const dragOffset = useRef<{ x: number; z: number } | null>(null);
  const resizing = useRef(false);

  const interactive = mode === 'view' || mode === 'edit';

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    const store = useShopStore.getState();
    if (e.ctrlKey || e.metaKey) {
      store.toggleSelected(note.id, 'note');
      return;
    }
    store.setSelected(note.id, 'note');
    const hit = rayToFloor(e.ray);
    if (!hit) return;
    dragOffset.current = {
      x: note.position.x - hit.x,
      z: note.position.z - hit.z,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragOffset.current) return;
    const hit = rayToFloor(e.ray);
    if (!hit) return;
    useShopStore.getState().updateNote(
      note.id,
      {
        position: {
          ...note.position,
          x: snap(hit.x + dragOffset.current.x),
          z: snap(hit.z + dragOffset.current.z),
        },
      },
      `note:${note.id}:move`
    );
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragOffset.current) {
      dragOffset.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  // Größen-Handle: horizontal ziehen skaliert den Text stufenlos
  const onHandleDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    resizing.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!resizing.current) return;
    const next = Math.min(
      Math.max(note.fontSize + e.nativeEvent.movementX * 0.006, MIN_SIZE),
      MAX_SIZE
    );
    useShopStore.getState().updateNote(
      note.id,
      { fontSize: next },
      `note:${note.id}:size`
    );
  };

  const onHandleUp = (e: ThreeEvent<PointerEvent>) => {
    if (resizing.current) {
      resizing.current = false;
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  const outline = darkMode ? '#17191d' : '#ffffff';

  return (
    <group position={[note.position.x, 0, note.position.z]}>
      {/* Pin: dünner Stab + Fußpunkt zeigen die verankerte Stelle */}
      <mesh position={[0, note.position.y / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, note.position.y, 6]} />
        <meshBasicMaterial
          color={selected || hovered ? ACCENT : note.color}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial
          color={selected || hovered ? ACCENT : note.color}
          transparent
          opacity={0.8}
        />
      </mesh>

      <Billboard position={[0, note.position.y, 0]}>
        <Text
          fontSize={note.fontSize}
          color={note.color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={note.fontSize * 0.06}
          outlineColor={outline}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(e: ThreeEvent<MouseEvent>) =>
            interactive && e.stopPropagation()
          }
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
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
          {note.text || '…'}
        </Text>

        {/* Auswahl: Skalier-Handle unterhalb des Texts */}
        {selected && (
          <mesh
            position={[0, -note.fontSize * 0.45, 0]}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'ew-resize';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <circleGeometry args={[Math.max(note.fontSize * 0.16, 0.05), 16]} />
            <meshBasicMaterial color={ACCENT} />
          </mesh>
        )}
      </Billboard>
    </group>
  );
}

/** Platzierung: Klick auf Boden erzeugt einen Kommentar */
function NotePlacer() {
  const mode = useShopStore((s) => s.mode);
  const active = mode === 'note-place';
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useShopStore.getState().setMode('view');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  useEffect(() => {
    if (!active) setCursor(null);
  }, [active]);

  if (!active) return null;

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = useShopStore.getState();
    const id = crypto.randomUUID();
    s.addNote({
      id,
      text: 'Kommentar',
      position: { x: snap(e.point.x), y: 1.2, z: snap(e.point.z) },
      fontSize: 0.35,
      color: DEFAULT_COLOR,
    });
    s.setMode('view');
    s.setSelected(id, 'note');
  };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => setCursor({ x: snap(e.point.x), z: snap(e.point.z) })}
        onPointerDown={onPointerDown}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {cursor && (
        <mesh position={[cursor.x, 0.02, cursor.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.09, 24]} />
          <meshBasicMaterial color={ACCENT} />
        </mesh>
      )}
    </group>
  );
}

export function TextNotes() {
  const notes = useShopStore((s) => s.notes);
  return (
    <group>
      {notes.map((n) => (
        <NoteInstance key={n.id} note={n} />
      ))}
      <NotePlacer />
    </group>
  );
}
