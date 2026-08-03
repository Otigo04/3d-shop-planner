import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CameraView,
  EditorMode,
  FloorZone,
  Furniture,
  FurnitureType,
  LengthUnit,
  SelectableType,
  TextNote,
  Wall,
} from '../types';

// Snapshot = der Teil des States, der durch Undo/Redo wandert.
interface Snapshot {
  name: string;
  floorDimensions: { width: number; depth: number };
  walls: Wall[];
  floors: FloorZone[];
  furniture: Furniture[];
  notes: TextNote[];
}

// Zwischenablage für Strg+C/V — Objekte als tiefe Kopien
interface Clipboard {
  walls: Wall[];
  floors: FloorZone[];
  furniture: Furniture[];
  notes: TextNote[];
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
  unit: LengthUnit;
  placingType: FurnitureType | null;
  clipboard: Clipboard | null;
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
  addNote: (note: TextNote) => void;
  updateNote: (
    id: string,
    updates: Partial<TextNote>,
    mergeKey?: string
  ) => void;
  deleteNote: (id: string) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  setUnit: (unit: LengthUnit) => void;
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
  notes: structuredClone(s.notes),
});

const initialSnapshot: Snapshot = {
  name: 'Mein Shop',
  floorDimensions: { width: 10, depth: 8 },
  walls: [],
  floors: [],
  furniture: [],
  notes: [],
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
      unit: 'cm',
      placingType: null,
      clipboard: null,
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

      addNote: (note) =>
        set((s) => pushHistory(s, { notes: [...s.notes, note] })),

      updateNote: (id, updates, mergeKey) =>
        set((s) =>
          pushHistory(
            s,
            {
              notes: s.notes.map((n) =>
                n.id === id ? { ...n, ...updates } : n
              ),
            },
            mergeKey
          )
        ),

      deleteNote: (id) =>
        set((s) => ({
          ...pushHistory(s, { notes: s.notes.filter((n) => n.id !== id) }),
          ...clearIfSelected(s, id),
        })),

      copySelection: () =>
        set((s) => {
          if (s.selection.length === 0) return s;
          const ids = new Set(s.selection.map((x) => x.id));
          const clipboard: Clipboard = {
            walls: structuredClone(s.walls.filter((w) => ids.has(w.id))),
            floors: structuredClone(s.floors.filter((f) => ids.has(f.id))),
            furniture: structuredClone(
              s.furniture.filter((f) => ids.has(f.id))
            ),
            notes: structuredClone(s.notes.filter((n) => ids.has(n.id))),
          };
          return { clipboard };
        }),

      // Einfügen mit 0,5m-Versatz, frische IDs, alles EIN Undo-Schritt.
      // Eingefügte Objekte werden zur neuen Auswahl (direkt verschiebbar).
      pasteClipboard: () =>
        set((s) => {
          const c = s.clipboard;
          if (!c) return s;
          const OFF = 0.5;
          const mv = (p: { x: number; z: number }) => ({
            ...p,
            x: p.x + OFF,
            z: p.z + OFF,
          });

          const walls = c.walls.map((w) => {
            const id = crypto.randomUUID();
            return {
              ...structuredClone(w),
              id,
              start: mv(w.start),
              end: mv(w.end),
              doors: w.doors.map((d) => ({
                ...d,
                id: crypto.randomUUID(),
                wallId: id,
              })),
              windows: w.windows.map((win) => ({
                ...win,
                id: crypto.randomUUID(),
                wallId: id,
              })),
            };
          });
          const floors = c.floors.map((f) => ({
            ...structuredClone(f),
            id: crypto.randomUUID(),
            start: mv(f.start),
            end: mv(f.end),
          }));
          const furniture = c.furniture.map((f) => ({
            ...structuredClone(f),
            id: crypto.randomUUID(),
            position: { ...f.position, x: f.position.x + OFF, z: f.position.z + OFF },
          }));
          const notes = c.notes.map((n) => ({
            ...structuredClone(n),
            id: crypto.randomUUID(),
            position: { ...n.position, x: n.position.x + OFF, z: n.position.z + OFF },
          }));

          const selection = [
            ...walls.map((w) => ({ id: w.id, type: 'wall' as const })),
            ...floors.map((f) => ({ id: f.id, type: 'floor' as const })),
            ...furniture.map((f) => ({ id: f.id, type: 'furniture' as const })),
            ...notes.map((n) => ({ id: n.id, type: 'note' as const })),
          ];
          if (selection.length === 0) return s;
          const last = selection[selection.length - 1];

          return {
            ...pushHistory(s, {
              walls: [...s.walls, ...walls],
              floors: [...s.floors, ...floors],
              furniture: [...s.furniture, ...furniture],
              notes: [...s.notes, ...notes],
            }),
            selection,
            selectedId: last.id,
            selectedType: last.type,
          };
        }),

      setUnit: (unit) => set({ unit }),

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
              notes: s.notes.filter((n) => !ids.has(n.id)),
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
              notes: s.notes.map((n) =>
                ids.has(n.id)
                  ? {
                      ...n,
                      position: {
                        ...n.position,
                        x: n.position.x + dx,
                        z: n.position.z + dz,
                      },
                    }
                  : n
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
              notes: s.notes.map((n) =>
                ids.has(n.id) ? { ...n, color } : n
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
        notes: s.notes,
        cameraState: s.cameraState,
        darkMode: s.darkMode,
        showMeasurements: s.showMeasurements,
        unit: s.unit,
      }),
      onRehydrateStorage: () => (state) => {
        // History frisch aufsetzen — gespeicherter Stand = Ausgangspunkt.
        // floors kann in alten Speicherständen fehlen.
        if (state) {
          state.floors ??= [];
          state.notes ??= [];
          state.unit ??= 'cm';
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
