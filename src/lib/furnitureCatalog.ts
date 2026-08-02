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

// Maße aus dem Master-Prompt (Phase 3)
export const FURNITURE_CATALOG: CatalogItem[] = [
  {
    type: 'shelf',
    label: 'Regal',
    icon: '🗄️',
    size: { x: 2, y: 1.8, z: 0.4 },
    color: '#4a5568',
    material: 'metal',
  },
  {
    type: 'pegboard',
    label: 'Lochwand',
    icon: '🧩',
    size: { x: 1, y: 2, z: 0.05 },
    color: '#f4f4f5',
    material: 'wood',
  },
  {
    type: 'counter',
    label: 'Kasse',
    icon: '💳',
    size: { x: 1.5, y: 1.1, z: 0.6 },
    color: '#6b4a2f',
    material: 'wood',
  },
  {
    type: 'desk',
    label: 'Theke',
    icon: '🍽️',
    size: { x: 2, y: 0.9, z: 0.8 },
    color: '#fafafa',
    material: 'plastic',
  },
  {
    type: 'rack',
    label: 'Stange',
    icon: '🧥',
    size: { x: 1.5, y: 2, z: 0.5 },
    color: '#a1a1aa',
    material: 'metal',
  },
  {
    type: 'table',
    label: 'Tisch',
    icon: '🛋️',
    size: { x: 1.2, y: 0.75, z: 0.7 },
    color: '#c8a476',
    material: 'wood',
  },
  {
    type: 'box',
    label: 'Karton',
    icon: '📦',
    size: { x: 0.4, y: 0.35, z: 0.4 },
    color: '#bd9268',
    material: 'wood',
  },
  {
    type: 'boxstack',
    label: 'Kartons',
    icon: '🗃️',
    size: { x: 0.5, y: 0.85, z: 0.5 },
    color: '#bd9268',
    material: 'wood',
  },
  {
    type: 'pallet',
    label: 'Palette',
    icon: '🪵',
    size: { x: 1.2, y: 0.15, z: 0.8 },
    color: '#a8825a',
    material: 'wood',
  },
  {
    type: 'bench',
    label: 'Sitzbank',
    icon: '🪑',
    size: { x: 1.2, y: 0.45, z: 0.4 },
    color: '#8b6f47',
    material: 'wood',
  },
  {
    type: 'plant',
    label: 'Pflanze',
    icon: '🪴',
    size: { x: 0.4, y: 1.2, z: 0.4 },
    color: '#8a5a44',
    material: 'plastic',
  },
  {
    type: 'mirror',
    label: 'Spiegel',
    icon: '🪞',
    size: { x: 0.6, y: 1.8, z: 0.06 },
    color: '#9aa0a6',
    material: 'metal',
  },
  {
    type: 'fridge',
    label: 'Kühlregal',
    icon: '🧊',
    size: { x: 1.2, y: 1.9, z: 0.7 },
    color: '#e8eaed',
    material: 'metal',
  },
  {
    type: 'changingroom',
    label: 'Umkleide',
    icon: '👗',
    size: { x: 1.2, y: 2.1, z: 1.2 },
    color: '#d8d4ce',
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
