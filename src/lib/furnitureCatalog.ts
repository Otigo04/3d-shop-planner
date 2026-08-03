import type { FurnitureMaterial, FurnitureType } from '../types';

export interface CatalogItem {
  type: FurnitureType;
  label: string;
  icon: string;
  // Standard-Maße in Metern: x = Länge, y = Höhe, z = Tiefe
  size: { x: number; y: number; z: number };
  color: string;
  material: FurnitureMaterial;
}

// Maße aus dem Master-Prompt (Phase 3).
// Jeder Typ hat seine eigene, unverwechselbare Default-Farbe —
// abgestimmte Palette (warme Hölzer, kühle Metalle, neutrale Flächen).
export const FURNITURE_CATALOG: CatalogItem[] = [
  {
    type: 'shelf',
    label: 'Regal',
    icon: '🗄️',
    size: { x: 2, y: 1.8, z: 0.4 },
    color: '#3f4a5a', // Anthrazit-Blau
    material: 'metal',
  },
  {
    type: 'pegboard',
    label: 'Lochwand',
    icon: '🧩',
    size: { x: 1, y: 2, z: 0.05 },
    color: '#ece5d8', // Birke hell
    material: 'wood',
  },
  {
    type: 'counter',
    label: 'Kasse',
    icon: '💳',
    size: { x: 1.5, y: 1.1, z: 0.6 },
    color: '#7a4a28', // Nussbaum dunkel
    material: 'wood',
  },
  {
    type: 'desk',
    label: 'Theke',
    icon: '🍽️',
    size: { x: 2, y: 0.9, z: 0.8 },
    color: '#f3efe7', // Warmweiß
    material: 'plastic',
  },
  {
    type: 'rack',
    label: 'Stange',
    icon: '🧥',
    size: { x: 1.5, y: 2, z: 0.5 },
    color: '#b9bec7', // Silber
    material: 'metal',
  },
  {
    type: 'table',
    label: 'Tisch',
    icon: '🛋️',
    size: { x: 1.2, y: 0.75, z: 0.7 },
    color: '#c99e63', // Eiche
    material: 'wood',
  },
  {
    type: 'box',
    label: 'Karton',
    icon: '📦',
    size: { x: 0.4, y: 0.35, z: 0.4 },
    color: '#c9a678', // Wellpappe hell
    material: 'wood',
  },
  {
    type: 'boxstack',
    label: 'Kartons',
    icon: '🗃️',
    size: { x: 0.5, y: 0.85, z: 0.5 },
    color: '#b28d5c', // Wellpappe dunkler
    material: 'wood',
  },
  {
    type: 'pallet',
    label: 'Palette',
    icon: '🪵',
    size: { x: 1.2, y: 0.15, z: 0.8 },
    color: '#a07a48', // Fichte roh
    material: 'wood',
  },
  {
    type: 'bench',
    label: 'Sitzbank',
    icon: '🪑',
    size: { x: 1.2, y: 0.45, z: 0.4 },
    color: '#8a6a42', // Teak
    material: 'wood',
  },
  {
    type: 'plant',
    label: 'Pflanze',
    icon: '🪴',
    size: { x: 0.4, y: 1.2, z: 0.4 },
    color: '#b56a4c', // Terrakotta
    material: 'plastic',
  },
  {
    type: 'mirror',
    label: 'Spiegel',
    icon: '🪞',
    size: { x: 0.6, y: 1.8, z: 0.06 },
    color: '#8e97a3', // Alu-Rahmen
    material: 'metal',
  },
  {
    type: 'fridge',
    label: 'Kühlregal',
    icon: '🧊',
    size: { x: 1.2, y: 1.9, z: 0.7 },
    color: '#dde6ec', // Kühlgeräte-Weiß
    material: 'metal',
  },
  {
    type: 'changingroom',
    label: 'Umkleide',
    icon: '👗',
    size: { x: 1.2, y: 2.1, z: 1.2 },
    color: '#cbc0ae', // Leinen
    material: 'wood',
  },
];

export const catalogItem = (type: FurnitureType): CatalogItem =>
  FURNITURE_CATALOG.find((c) => c.type === type) ?? {
    type: 'custom',
    label: 'Custom',
    icon: '📦',
    size: { x: 1, y: 1, z: 1 },
    color: '#94a3b8',
    material: 'plastic',
  };
