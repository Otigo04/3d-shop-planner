import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CameraView,
  EditorMode,
  FloorZone,
  Furniture,
  FurnitureType,
  SelectableType,
  Wall,
} from '../types';

// Snapshot = der Teil des States, der durch Undo/Redo wandert.
interface Snapshot {
  name: string;
  floorDimensions: { width: number; depth: number };
  walls: Wall[];
  floors: FloorZone[];
  furniture: Furniture[];
}

export interface ShopState extends Snapshot {
  // Metadaten
  id: string;
  createdAt: number;
  updatedAt: number;

  // UI-State (nicht persistiert, außer Theme/Maße)
  // Mehrfachauswahl: selectedId/-Type = zuletzt gewähltes (Primär-Objekt)
  selection: Array<{ id: string; type: SelectableType }>;
  selectedId: string | null;
  selectedType: SelectableType | null;
  mode: EditorMode;
  orthographic: boolean;
  darkMode: boolean;
  showMeasurements: boolean;
  placingType: FurnitureType | null;
  // Kamera-Kommando: Komponente konsumiert es, nonce erzwingt Re-Trigger
  viewRequest: { view: CameraView; nonce: number } | null;
  // Merge-Schlüssel der letzten Mutation: gleiche aufeinanderfolgende
  // Edits (z.B. Slider-Drag) erzeugen nur EINEN History-Eintrag
  lastMutation: string | null;

  // Kamera (für Restore bei Reload)
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
  };

  // History für Undo/Redo
  history: Snapshot[];
  historyIndex: number;

  // Aktionen
  setName: (name: string) => void;
  setFloorDimensions: (
    dims: { width: number; depth: number },
    mergeKey?: string
  ) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>, mergeKey?: string) => void;
  deleteWall: (id: string) => void;
  addFloor: (floor: FloorZone) => void;
  updateFloor: (
    id: string,
    updates: Partial<FloorZone>,
    mergeKey?: string
  ) => void;
  deleteFloor: (id: string) => void;
  addFurniture: (f: Furniture) => void;
  addFurnitureBatch: (items: Furniture[]) => void;
  updateFurniture: (
    id: string,
    updates: Partial<Furniture>,
    mergeKey?: string
  ) => void;
  deleteFurniture: (id: string) => void;
  setMode: (mode: EditorMode) => void;
  startPlacing: (type: FurnitureType) => void;
  stopPlacing: () => void;
  setSelected: (id: string | null, type?: SelectableType | null) => void;
  toggleSelected: (id: string, type: SelectableType) => void;
  deleteSelection: () => void;
  setColorForSelection: (color: string) => void;
  moveSelection: (dx: number, dz: number, mergeKey?: string) => void;
  setCameraState: (cam: ShopState['cameraState']) => void;
  toggleOrthographic: () => void;
  toggleDarkMode: () => void;
  toggleMeasurements: () => void;
  requestView: (view: CameraView) => void;
  loadPlan: (plan: Snapshot) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const takeSnapshot = (s: Snapshot): Snapshot => ({
  name: s.name,
  floorDimensions: { ...s.floorDimensions },
  walls: structuredClone(s.walls),
  floors: structuredClone(s.floors),
  furniture: structuredClone(s.furniture),
});

const initialSnapshot: Snapshot = {
  name: 'Mein Shop',
  floorDimensions: { width: 10, depth: 8 },
  walls: [],
  floors: [],
  furniture: [],
};

// Nach einer Mutation: Redo-Tail kappen, Snapshot anhängen.
// Bei gleichem mergeKey wie zuvor: obersten Eintrag ersetzen statt anhängen.
const pushHistory = (
  state: ShopState,
  next: Partial<Snapshot>,
  mergeKey?: string
) => {
  const merged: Snapshot = takeSnapshot({ ...takeSnapshot(state), ...next });
  const replaceTop =
    mergeKey !== undefined &&
    state.lastMutation === mergeKey &&
    state.historyIndex > 0;
  const kept = replaceTop
    ? state.history.slice(0, state.historyIndex)
    : state.history.slice(0, state.historyIndex + 1);
  const history = [...kept, merged];
  return {
    ...next,
    history,
    historyIndex: history.length - 1,
    lastMutation: mergeKey ?? null,
    updatedAt: Date.now(),
  };
};

// Auswahl aufräumen, wenn das selektierte Objekt gelöscht wird
const clearIfSelected = (s: ShopState, id: string) => {
  const selection = s.selection.filter((x) => x.id !== id);
  const last = selection[selection.length - 1];
  return {
    selection,
    selectedId: last?.id ?? null,
    selectedType: last?.type ?? null,
  };
};

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      ...structuredClone(initialSnapshot),
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),

      selection: [],
      selectedId: null,
      selectedType: null,
      mode: 'view',
      orthographic: false,
      darkMode: false,
      showMeasurements: false,
      placingType: null,
      viewRequest: null,
      lastMutation: null,

      cameraState: {
        position: [9, 9, 9],
        target: [0, 0, 0],
      },

      history: [structuredClone(initialSnapshot)],
      historyIndex: 0,

      setName: (name) => set((s) => pushHistory(s, { name }, 'name')),

      setFloorDimensions: (floorDimensions, mergeKey) =>
        set((s) => pushHistory(s, { floorDimensions }, mergeKey)),

      addWall: (wall) =>
        set((s) => pushHistory(s, { walls: [...s.walls, wall] })),

      updateWall: (id, updates, mergeKey) =>
        set((s) =>
          pushHistory(
            s,
            {
              walls: s.walls.map((w) =>
                w.id === id ? { ...w, ...updates } : w
              ),
            },
            mergeKey
          )
        ),

      deleteWall: (id) =>
        set((s) => ({
          ...pushHistory(s, { walls: s.walls.filter((w) => w.id !== id) }),
          ...clearIfSelected(s, id),
        })),

      addFloor: (floor) =>
        set((s) => pushHistory(s, { floors: [...s.floors, floor] })),

      updateFloor: (id, updates, mergeKey) =>
        set((s) =>
          pushHistory(
            s,
            {
              floors: s.floors.map((f) =>
                f.id === id ? { ...f, ...updates } : f
              ),
            },
            mergeKey
          )
        ),

      deleteFloor: (id) =>
        set((s) => ({
          ...pushHistory(s, { floors: s.floors.filter((f) => f.id !== id) }),
          ...clearIfSelected(s, id),
        })),

      addFurniture: (f) =>
        set((s) => pushHistory(s, { furniture: [...s.furniture, f] })),

      // Reihen-Platzierung: alle Items in EINEM Undo-Schritt
      addFurnitureBatch: (items) =>
        set((s) =>
          pushHistory(s, { furniture: [...s.furniture, ...items] })
        ),

      updateFurniture: (id, updates, mergeKey) =>
        set((s) =>
          pushHistory(
            s,
            {
              furniture: s.furniture.map((f) =>
                f.id === id ? { ...f, ...updates } : f
              ),
            },
            mergeKey
          )
        ),

      deleteFurniture: (id) =>
        set((s) => ({
          ...pushHistory(s, {
            furniture: s.furniture.filter((f) => f.id !== id),
          }),
          ...clearIfSelected(s, id),
        })),

      setMode: (mode) =>
        set((s) => ({
          mode,
          placingType: mode === 'furniture-place' ? s.placingType : null,
        })),

      startPlacing: (type) =>
        set({
          placingType: type,
          mode: 'furniture-place',
          selection: [],
          selectedId: null,
          selectedType: null,
        }),

      stopPlacing: () => set({ placingType: null, mode: 'view' }),

      setSelected: (id, type = null) =>
        set({
          selection: id && type ? [{ id, type }] : [],
          selectedId: id,
          selectedType: id ? type : null,
        }),

      toggleSelected: (id, type) =>
        set((s) => {
          const exists = s.selection.some((x) => x.id === id);
          const selection = exists
            ? s.selection.filter((x) => x.id !== id)
            : [...s.selection, { id, type }];
          const last = selection[selection.length - 1];
          return {
            selection,
            selectedId: last?.id ?? null,
            selectedType: last?.type ?? null,
          };
        }),

      deleteSelection: () =>
        set((s) => {
          if (s.selection.length === 0) return s;
          const ids = new Set(s.selection.map((x) => x.id));
          return {
            ...pushHistory(s, {
              walls: s.walls.filter((w) => !ids.has(w.id)),
              floors: s.floors.filter((f) => !ids.has(f.id)),
              furniture: s.furniture.filter((f) => !ids.has(f.id)),
            }),
            selection: [],
            selectedId: null,
            selectedType: null,
          };
        }),

      // Ganze Auswahl verschieben (Möbel, Wände, Böden) — mergeKey:
      // kontinuierliches Bewegen (Drag/gehaltene Pfeiltaste) = EIN Undo-Schritt
      moveSelection: (dx, dz, mergeKey = 'sel:move') =>
        set((s) => {
          if (s.selection.length === 0 || (dx === 0 && dz === 0)) return s;
          const ids = new Set(s.selection.map((x) => x.id));
          const mv = (p: { x: number; z: number }) => ({
            x: p.x + dx,
            z: p.z + dz,
          });
          return pushHistory(
            s,
            {
              walls: s.walls.map((w) =>
                ids.has(w.id)
                  ? { ...w, start: mv(w.start), end: mv(w.end) }
                  : w
              ),
              floors: s.floors.map((f) =>
                ids.has(f.id)
                  ? { ...f, start: mv(f.start), end: mv(f.end) }
                  : f
              ),
              furniture: s.furniture.map((f) =>
                ids.has(f.id)
                  ? {
                      ...f,
                      position: {
                        ...f.position,
                        x: f.position.x + dx,
                        z: f.position.z + dz,
                      },
                    }
                  : f
              ),
            },
            mergeKey
          );
        }),

      setColorForSelection: (color) =>
        set((s) => {
          if (s.selection.length === 0) return s;
          const ids = new Set(s.selection.map((x) => x.id));
          return pushHistory(
            s,
            {
              walls: s.walls.map((w) => (ids.has(w.id) ? { ...w, color } : w)),
              floors: s.floors.map((f) => (ids.has(f.id) ? { ...f, color } : f)),
              furniture: s.furniture.map((f) =>
                ids.has(f.id) ? { ...f, color } : f
              ),
            },
            'multi:color'
          );
        }),

      setCameraState: (cameraState) => set({ cameraState }),

      toggleOrthographic: () =>
        set((s) => ({ orthographic: !s.orthographic })),

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      toggleMeasurements: () =>
        set((s) => ({ showMeasurements: !s.showMeasurements })),

      requestView: (view) =>
        set((s) => ({
          viewRequest: { view, nonce: (s.viewRequest?.nonce ?? 0) + 1 },
        })),

      loadPlan: (plan) =>
        set((s) => ({
          // Import = ein Undo-Schritt, alter Stand bleibt in der History
          ...pushHistory(s, takeSnapshot(plan)),
          selection: [],
          selectedId: null,
          selectedType: null,
          mode: 'view',
          placingType: null,
        })),

      undo: () =>
        set((s) => {
          if (s.historyIndex <= 0) return s;
          const prev = s.history[s.historyIndex - 1];
          return {
            ...takeSnapshot(prev),
            historyIndex: s.historyIndex - 1,
            lastMutation: null,
            updatedAt: Date.now(),
          };
        }),

      redo: () =>
        set((s) => {
          if (s.historyIndex >= s.history.length - 1) return s;
          const next = s.history[s.historyIndex + 1];
          return {
            ...takeSnapshot(next),
            historyIndex: s.historyIndex + 1,
            lastMutation: null,
            updatedAt: Date.now(),
          };
        }),

      reset: () =>
        set(() => ({
          ...structuredClone(initialSnapshot),
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          selection: [],
          selectedId: null,
          selectedType: null,
          mode: 'view',
          placingType: null,
          lastMutation: null,
          history: [structuredClone(initialSnapshot)],
          historyIndex: 0,
        })),
    }),
    {
      name: 'shop-planner-state',
      partialize: (s) => ({
        id: s.id,
        name: s.name,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        floorDimensions: s.floorDimensions,
        walls: s.walls,
        floors: s.floors,
        furniture: s.furniture,
        cameraState: s.cameraState,
        darkMode: s.darkMode,
        showMeasurements: s.showMeasurements,
      }),
      onRehydrateStorage: () => (state) => {
        // History frisch aufsetzen — gespeicherter Stand = Ausgangspunkt.
        // floors kann in alten Speicherständen fehlen.
        if (state) {
          state.floors ??= [];
          state.history = [takeSnapshot(state)];
          state.historyIndex = 0;
          state.lastMutation = null;
        }
      },
    }
  )
);

// Dev-Konsole/Tests: Store-Zugriff über window
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__shopStore = useShopStore;
}
