import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { CameraRig } from './CameraRig';
import { Floor } from './Floor';
import { FloorZones } from './FloorZones';
import { FloorDrawer } from './FloorDrawer';
import { Walls } from './Walls';
import { WallDrawer } from './WallDrawer';
import { FurnitureLayer } from './Furniture';
import { FurniturePlacer } from './FurniturePlacer';
import { TextNotes } from './TextNotes';
import { Measurements } from './Measurements';
import { ClearanceMeasure } from './ClearanceMeasure';
import { useShopStore } from '../store/shopStore';

// Schatten nur neu berechnen, wenn sich die Szene ändert — sonst rendert
// three die komplette Shadow-Map in JEDEM Frame (auch beim reinen Umsehen).
function ShadowUpdater() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  // Dev-Konsole: Renderer/Szene für Perf-Messungen erreichbar machen
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__three = {
      gl,
      scene,
      camera,
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    // Erste Frames: Geometrien/Texturen trudeln noch ein
    const timers = [50, 250, 800].map((ms) =>
      window.setTimeout(() => (gl.shadowMap.needsUpdate = true), ms)
    );
    const unsub = useShopStore.subscribe(() => {
      gl.shadowMap.needsUpdate = true;
    });
    return () => {
      timers.forEach(clearTimeout);
      unsub();
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  return null;
}

export function SceneCanvas() {
  const darkMode = useShopStore((s) => s.darkMode);
  // Auflösung dynamisch: scharf wenn die Hardware mitkommt, sonst runter
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        // nötig für Screenshot-Export (canvas.toBlob)
        preserveDrawingBuffer: true,
      }}
      onContextMenu={(e) => e.preventDefault()} // Rechtsklick = Kamera, kein Browser-Menü
    >
      <color attach="background" args={[darkMode ? '#16181c' : '#eef1f4']} />
      <fog
        attach="fog"
        args={[darkMode ? '#16181c' : '#eef1f4', 45, 110]}
      />

      {/* Drei-Punkt-Setup: Key mit Schatten, warmes Fill, kühles Grading */}
      <ambientLight intensity={darkMode ? 0.65 : 0.85} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={darkMode ? 0.85 : 1.25}
        color={darkMode ? '#cdd6e4' : '#fff7ec'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <directionalLight
        position={[-10, 8, -12]}
        intensity={darkMode ? 0.25 : 0.35}
        color={darkMode ? '#5a6a85' : '#dbe7f5'}
      />
      <hemisphereLight
        args={
          darkMode ? ['#3a4048', '#1c1f24', 0.45] : ['#ffffff', '#cfd6dd', 0.4]
        }
      />

      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(1.5)}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />

      <ShadowUpdater />
      <CameraRig />
      <Floor />
      <FloorZones />
      <FloorDrawer />
      <Walls />
      <WallDrawer />
      <FurnitureLayer />
      <FurniturePlacer />
      <TextNotes />
      <Measurements />
      <ClearanceMeasure />
    </Canvas>
  );
}
