import { Grid } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';

export function Floor() {
  const { width, depth } = useShopStore((s) => s.floorDimensions);
  const darkMode = useShopStore((s) => s.darkMode);

  return (
    <group>
      {/* Boden-Fläche, minimal unter Grid gegen Z-Fighting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.005, 0]}
        receiveShadow
        onClick={(e) => {
          // Klick ins Leere = Auswahl aufheben — aber nicht nach Kamera-Drag
          // und nicht bei Strg (Mehrfachauswahl bleibt bestehen)
          if (e.delta > 5 || e.ctrlKey || e.metaKey) return;
          const s = useShopStore.getState();
          if (s.mode === 'view' && s.selectedId) s.setSelected(null);
        }}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={darkMode ? '#2b2f36' : '#ffffff'}
          roughness={0.95}
        />
      </mesh>

      {/* Meter-Grid: feine Zellen 0.5m, Sektionen 1m */}
      <Grid
        position={[0, 0, 0]}
        args={[width, depth]}
        cellSize={0.5}
        cellColor={darkMode ? '#3a4047' : '#e0e0e0'}
        cellThickness={0.6}
        sectionSize={1}
        sectionColor={darkMode ? '#4b525b' : '#c9cdd2'}
        sectionThickness={1}
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
        followCamera={false}
      />
    </group>
  );
}
