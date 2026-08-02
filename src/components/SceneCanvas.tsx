import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Floor } from './Floor';
import { FloorZones } from './FloorZones';
import { FloorDrawer } from './FloorDrawer';
import { Walls } from './Walls';
import { WallDrawer } from './WallDrawer';
import { FurnitureLayer } from './Furniture';
import { FurniturePlacer } from './FurniturePlacer';
import { Measurements } from './Measurements';
import { ClearanceMeasure } from './ClearanceMeasure';
import { useShopStore } from '../store/shopStore';

export function SceneCanvas() {
  const darkMode = useShopStore((s) => s.darkMode);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        // nötig für Screenshot-Export (canvas.toBlob)
        preserveDrawingBuffer: true,
      }}
      onContextMenu={(e) => e.preventDefault()} // Rechtsklick = Kamera, kein Browser-Menü
    >
      <color attach="background" args={[darkMode ? '#17191d' : '#f8f9fa']} />

      <ambientLight intensity={darkMode ? 0.8 : 1.1} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={darkMode ? 0.7 : 1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <hemisphereLight
        args={darkMode ? ['#3a4048', '#1c1f24', 0.4] : ['#ffffff', '#d8dade', 0.35]}
      />

      <CameraRig />
      <Floor />
      <FloorZones />
      <FloorDrawer />
      <Walls />
      <WallDrawer />
      <FurnitureLayer />
      <FurniturePlacer />
      <Measurements />
      <ClearanceMeasure />
    </Canvas>
  );
}
