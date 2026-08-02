import { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useShopStore } from '../store/shopStore';
import type { FloorZone } from '../types';

const ACCENT = '#06b6d4';

function ZoneMesh({ zone }: { zone: FloorZone }) {
  const selected = useShopStore((s) =>
    s.selection.some((x) => x.id === zone.id)
  );
  const mode = useShopStore((s) => s.mode);
  const [hovered, setHovered] = useState(false);

  const w = Math.abs(zone.end.x - zone.start.x);
  const d = Math.abs(zone.end.z - zone.start.z);
  const cx = (zone.start.x + zone.end.x) / 2;
  const cz = (zone.start.z + zone.end.z) / 2;
  const interactive = mode === 'view' || mode === 'edit';

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || e.delta > 5) return;
    e.stopPropagation();
    const s = useShopStore.getState();
    if (e.ctrlKey || e.metaKey) s.toggleSelected(zone.id, 'floor');
    else s.setSelected(zone.id, 'floor');
  };

  return (
    <mesh
      position={[cx, 0.012, cz]}
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
      receiveShadow
    >
      <boxGeometry args={[w, 0.02, d]} />
      <meshStandardMaterial
        color={zone.color}
        roughness={0.9}
        emissive={selected || hovered ? ACCENT : '#000000'}
        emissiveIntensity={selected ? 0.25 : hovered ? 0.1 : 0}
      />
    </mesh>
  );
}

export function FloorZones() {
  const floors = useShopStore((s) => s.floors);
  return (
    <group>
      {floors.map((zone) => (
        <ZoneMesh key={zone.id} zone={zone} />
      ))}
    </group>
  );
}
