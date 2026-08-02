// Alle Maße in Metern, Winkel in Radiant.

export interface Vector2 {
  x: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Door {
  id: string;
  wallId: string;
  positionOnWall: number; // 0-1 relativ zur Wand-Länge
  width: number; // Standard 0.9
  height: number; // Standard 2.0
  swingDirection: 'left' | 'right' | 'both';
  material: 'wood' | 'glass';
  color: string;
}

export interface WindowOpening {
  id: string;
  wallId: string;
  positionOnWall: number; // 0-1
  width: number;
  height: number;
  sillHeight: number; // Höhe der Unterkante über Boden
  color: string;
}

export interface Wall {
  id: string;
  start: Vector2;
  end: Vector2;
  height: number; // Standard 2.5
  thickness: number; // Standard 0.15
  color: string;
  doors: Door[];
  windows: WindowOpening[];
}

export type FurnitureType =
  | 'shelf'
  | 'pegboard'
  | 'counter'
  | 'desk'
  | 'rack'
  | 'table'
  | 'box'
  | 'boxstack'
  | 'pallet'
  | 'bench'
  | 'plant'
  | 'mirror'
  | 'fridge'
  | 'changingroom'
  | 'custom';

export type FurnitureMaterial = 'wood' | 'metal' | 'glass' | 'plastic';

export interface Furniture {
  id: string;
  type: FurnitureType;
  position: Vector3; // y in der Regel 0 (steht auf Boden)
  rotation: number; // Radiant um Y-Achse
  scale: { x: number; y: number; z: number }; // Länge, Höhe, Tiefe
  color: string;
  material: FurnitureMaterial;
  customLabel?: string;
}

// Selbst gezeichnete Bodenfläche (z.B. Flur), Rechteck aus zwei Ecken.
// start = Min-Ecke, end = Max-Ecke (normalisiert beim Erstellen).
export interface FloorZone {
  id: string;
  start: Vector2;
  end: Vector2;
  color: string;
}

export type EditorMode =
  | 'view'
  | 'wall-draw'
  | 'floor-draw'
  | 'furniture-place'
  | 'edit';

export type SelectableType = 'wall' | 'furniture' | 'floor';

export type CameraView = 'top' | 'front' | 'side' | 'reset' | 'fit';
