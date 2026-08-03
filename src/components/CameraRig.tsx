import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useShopStore } from '../store/shopStore';
import type { CameraView } from '../types';

// Easing für Kamera-Fahrten: cubic-bezier(0.25, 0.46, 0.45, 0.94) ≈ easeOutQuad
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

const TWEEN_DURATION = 0.6; // Sekunden

interface Tween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
}

function computeViewPose(
  view: CameraView,
  floor: { width: number; depth: number }
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const maxDim = Math.max(floor.width, floor.depth);
  const dist = maxDim * 1.2;
  const target = new THREE.Vector3(0, 0, 0);

  switch (view) {
    case 'top':
      // Minimaler Z-Offset, sonst degeneriert OrbitControls (up-Vektor parallel)
      return { position: new THREE.Vector3(0, dist * 1.3, 0.001), target };
    case 'front':
      return { position: new THREE.Vector3(0, maxDim * 0.35, dist), target };
    case 'side':
      return { position: new THREE.Vector3(dist, maxDim * 0.35, 0), target };
    case 'fit':
    case 'reset':
    default:
      return {
        position: new THREE.Vector3(dist * 0.75, dist * 0.75, dist * 0.75),
        target,
      };
  }
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const tweenRef = useRef<Tween | null>(null);
  const shiftDown = useRef(false);
  const camera = useThree((s) => s.camera);
  // Aktuelle Kamera für Keyboard-Handler (Effect hat leere Deps)
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const orthographic = useShopStore((s) => s.orthographic);
  const viewRequest = useShopStore((s) => s.viewRequest);
  const floorDimensions = useShopStore((s) => s.floorDimensions);
  const cameraState = useShopStore((s) => s.cameraState);

  // Keyboard-Shortcuts: T/F/1/2/R/P + Shift-Tracking für Pan
  useEffect(() => {
    const { requestView, toggleOrthographic, undo, redo } =
      useShopStore.getState();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftDown.current = true;

      // Nicht in Input-Feldern reagieren
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Undo/Redo: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      // Kopieren/Einfügen der Auswahl (Möbel, Wände, Böden, Notizen)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const s = useShopStore.getState();
        if (s.selection.length > 0) {
          e.preventDefault();
          s.copySelection();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const s = useShopStore.getState();
        if (s.clipboard) {
          e.preventDefault();
          s.pasteClipboard();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey) return;

      // Ausgewählte Objekte löschen (auch Mehrfachauswahl, ein Undo-Schritt)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useShopStore.getState().deleteSelection();
        return;
      }

      // Escape im Ansicht-Modus: Auswahl aufheben
      if (e.key === 'Escape') {
        const s = useShopStore.getState();
        if (s.mode === 'view' && s.selection.length > 0) s.setSelected(null);
        return;
      }

      // Pfeiltasten: Auswahl verschieben, kamera-relativ auf Achse gesnappt.
      // Schritt 0,1m, mit Shift 0,5m. Gehaltene Taste = ein Undo-Schritt.
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        const s = useShopStore.getState();
        if (s.selection.length === 0 || (s.mode !== 'view' && s.mode !== 'edit'))
          return;
        e.preventDefault();
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        // Blickrichtung auf XZ projizieren, auf dominante Achse snappen
        const fx = Math.abs(dir.x) >= Math.abs(dir.z) ? Math.sign(dir.x) : 0;
        const fz = fx === 0 ? Math.sign(dir.z) : 0;
        // rechts = forward × up
        const rx = -fz;
        const rz = fx;
        const step = e.shiftKey ? 0.5 : 0.1;
        let dx = 0;
        let dz = 0;
        if (e.key === 'ArrowUp') (dx = fx * step), (dz = fz * step);
        if (e.key === 'ArrowDown') (dx = -fx * step), (dz = -fz * step);
        if (e.key === 'ArrowRight') (dx = rx * step), (dz = rz * step);
        if (e.key === 'ArrowLeft') (dx = -rx * step), (dz = -rz * step);
        // Auf 2 Dezimalen runden gegen Float-Drift
        s.moveSelection(
          Math.round(dx * 100) / 100,
          Math.round(dz * 100) / 100
        );
        return;
      }

      switch (e.key.toLowerCase()) {
        case 't':
          requestView('top');
          break;
        case 'f':
          requestView('fit');
          break;
        case '1':
          requestView('front');
          break;
        case '2':
          requestView('side');
          break;
        case 'r': {
          const s = useShopStore.getState();
          // Im Platzierungsmodus dreht R die Preview (FurniturePlacer)
          if (s.mode === 'furniture-place') break;
          // Ausgewähltes Möbel: R dreht 90° weiter
          if (s.selectedType === 'furniture' && s.selectedId) {
            const f = s.furniture.find((x) => x.id === s.selectedId);
            if (f)
              s.updateFurniture(s.selectedId, {
                rotation: f.rotation + Math.PI / 2,
              });
            break;
          }
          requestView('reset');
          break;
        }
        case 'p':
          toggleOrthographic();
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftDown.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // View-Request konsumieren → Tween starten
  useEffect(() => {
    if (!viewRequest || !controlsRef.current) return;
    const pose = computeViewPose(viewRequest.view, floorDimensions);
    tweenRef.current = {
      fromPos: camera.position.clone(),
      toPos: pose.position,
      fromTarget: controlsRef.current.target.clone(),
      toTarget: pose.target,
      elapsed: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRequest]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Shift+Rechte Maus = Pan statt Rotate
    controls.mouseButtons.RIGHT = shiftDown.current
      ? THREE.MOUSE.PAN
      : THREE.MOUSE.ROTATE;

    const tween = tweenRef.current;
    if (tween) {
      tween.elapsed += delta;
      const t = Math.min(tween.elapsed / TWEEN_DURATION, 1);
      const k = easeOutQuad(t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      controls.update();
      if (t >= 1) {
        tweenRef.current = null;
        const { setCameraState } = useShopStore.getState();
        setCameraState({
          position: camera.position.toArray() as [number, number, number],
          target: controls.target.toArray() as [number, number, number],
        });
      }
    }
  });

  // Kamera-Stand beim Loslassen der Maus persistieren
  const persistCamera = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    useShopStore.getState().setCameraState({
      position: camera.position.toArray() as [number, number, number],
      target: controls.target.toArray() as [number, number, number],
    });
  };

  return (
    <>
      <PerspectiveCamera
        makeDefault={!orthographic}
        position={cameraState.position}
        fov={50}
        near={0.1}
        far={500}
      />
      <OrthographicCamera
        makeDefault={orthographic}
        position={cameraState.position}
        zoom={45}
        near={-100}
        far={500}
      />
      <OrbitControls
        ref={controlsRef}
        target={cameraState.target}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02} // nicht unter den Boden schauen
        minDistance={1}
        maxDistance={80}
        mouseButtons={{
          LEFT: undefined, // Links reserviert für Selektion/Zeichnen
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        onEnd={persistCamera}
        makeDefault
      />
    </>
  );
}
