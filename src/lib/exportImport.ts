import { useShopStore } from '../store/shopStore';
import type { FloorZone, Furniture, TextNote, Wall } from '../types';

export interface PlanFile {
  app: 'shop-planner';
  version: 1;
  exportedAt: string;
  name: string;
  floorDimensions: { width: number; depth: number };
  walls: Wall[];
  floors: FloorZone[];
  furniture: Furniture[];
  notes: TextNote[];
}

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const safeName = (name: string) =>
  name.replace(/[^\wäöüÄÖÜß-]+/g, '_').slice(0, 40) || 'shop';

export function exportPlanJSON() {
  const s = useShopStore.getState();
  const plan: PlanFile = {
    app: 'shop-planner',
    version: 1,
    exportedAt: new Date().toISOString(),
    name: s.name,
    floorDimensions: s.floorDimensions,
    walls: s.walls,
    floors: s.floors,
    furniture: s.furniture,
    notes: s.notes,
  };
  download(
    new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }),
    `${safeName(s.name)}-${stamp()}.json`
  );
}

// Validierung: bewusst tolerant — fehlende Arrays werden leer,
// aber Grunddaten müssen stimmen, sonst Fehler.
export function parsePlan(text: string): PlanFile {
  const raw = JSON.parse(text);
  if (typeof raw !== 'object' || raw === null)
    throw new Error('Keine gültige Plan-Datei');
  const dims = raw.floorDimensions;
  if (
    typeof dims !== 'object' ||
    typeof dims?.width !== 'number' ||
    typeof dims?.depth !== 'number' ||
    dims.width <= 0 ||
    dims.depth <= 0
  )
    throw new Error('floorDimensions fehlen oder sind ungültig');
  return {
    app: 'shop-planner',
    version: 1,
    exportedAt: String(raw.exportedAt ?? ''),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Import',
    floorDimensions: { width: dims.width, depth: dims.depth },
    walls: Array.isArray(raw.walls) ? raw.walls : [],
    floors: Array.isArray(raw.floors) ? raw.floors : [],
    furniture: Array.isArray(raw.furniture) ? raw.furniture : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  };
}

export function importPlanFromFile(file: File): Promise<void> {
  return file.text().then((text) => {
    const plan = parsePlan(text);
    useShopStore.getState().loadPlan({
      name: plan.name,
      floorDimensions: plan.floorDimensions,
      walls: plan.walls,
      floors: plan.floors,
      furniture: plan.furniture,
      notes: plan.notes,
    });
  });
}

export function exportScreenshotPNG() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const name = safeName(useShopStore.getState().name);
  canvas.toBlob((blob) => {
    if (blob) download(blob, `${name}-${stamp()}.png`);
  }, 'image/png');
}
