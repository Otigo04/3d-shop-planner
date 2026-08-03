import { useShopStore } from '../store/shopStore';
import { wallLength } from '../lib/wallMath';
import { formatLength, fromUnit, roundUnit, toUnit } from '../lib/units';
import type {
  Door,
  FloorZone,
  Furniture,
  TextNote,
  Wall,
  WindowOpening,
} from '../types';

// Längenfeld: Wert intern immer Meter, Anzeige/Eingabe in gewählter Einheit
function NumberField({
  label,
  value,
  min = 0.05,
  max,
  step = 0.1,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  const unit = useShopStore((s) => s.unit);
  return (
    <label className="prop-field">
      <span>{label}</span>
      <span className="prop-input-unit">
        <input
          type="number"
          value={roundUnit(toUnit(value, unit), unit)}
          min={roundUnit(toUnit(min, unit), unit)}
          max={max !== undefined ? roundUnit(toUnit(max, unit), unit) : undefined}
          step={toUnit(step, unit)}
          onChange={(e) => {
            const v = fromUnit(parseFloat(e.target.value), unit);
            if (Number.isFinite(v) && v >= min && (max === undefined || v <= max))
              onCommit(v);
          }}
        />
        <span className="unit-suffix">{unit}</span>
      </span>
    </label>
  );
}

// Einheitsloses Zahlenfeld (z.B. Rotation in Grad)
function PlainNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <span className="prop-input-unit">
        <input
          type="number"
          value={Number(value.toFixed(1))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (
              Number.isFinite(v) &&
              (min === undefined || v >= min) &&
              (max === undefined || v <= max)
            )
              onCommit(v);
          }}
        />
        {suffix && <span className="unit-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

function SliderField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onCommit(parseFloat(e.target.value))}
      />
    </label>
  );
}

/* ---------- Wand ---------- */

function WallPanel({ wall }: { wall: Wall }) {
  const updateWall = useShopStore((s) => s.updateWall);
  const deleteWall = useShopStore((s) => s.deleteWall);
  const unit = useShopStore((s) => s.unit);
  const length = wallLength(wall.start, wall.end);
  const k = (field: string) => `wall:${wall.id}:${field}`;

  const setLength = (newLen: number) => {
    if (length < 0.001) return;
    const dirX = (wall.end.x - wall.start.x) / length;
    const dirZ = (wall.end.z - wall.start.z) / length;
    updateWall(
      wall.id,
      {
        end: {
          x: wall.start.x + dirX * newLen,
          z: wall.start.z + dirZ * newLen,
        },
      },
      k('len')
    );
  };

  const patchDoor = (doorId: string, updates: Partial<Door>, merge?: string) =>
    updateWall(
      wall.id,
      {
        doors: wall.doors.map((d) =>
          d.id === doorId ? { ...d, ...updates } : d
        ),
      },
      merge
    );

  const patchWindow = (
    winId: string,
    updates: Partial<WindowOpening>,
    merge?: string
  ) =>
    updateWall(
      wall.id,
      {
        windows: wall.windows.map((w) =>
          w.id === winId ? { ...w, ...updates } : w
        ),
      },
      merge
    );

  const addDoor = () =>
    updateWall(wall.id, {
      doors: [
        ...wall.doors,
        {
          id: crypto.randomUUID(),
          wallId: wall.id,
          positionOnWall: 0.5,
          width: 0.9,
          height: 2.0,
          swingDirection: 'left',
          material: 'wood',
          color: '#8b5e3c',
        },
      ],
    });

  const addWindow = () =>
    updateWall(wall.id, {
      windows: [
        ...wall.windows,
        {
          id: crypto.randomUUID(),
          wallId: wall.id,
          positionOnWall: 0.5,
          width: 1.0,
          height: 1.2,
          sillHeight: 0.9,
          color: '#bfe3ec',
        },
      ],
    });

  return (
    <aside className="prop-panel">
      <h2>Wand</h2>
      <p className="prop-meta">
        {formatLength(length, unit)} · Höhe {formatLength(wall.height, unit)}
      </p>

      <NumberField label="Länge" value={length} onCommit={setLength} />
      <NumberField
        label="Höhe"
        value={wall.height}
        min={0.3}
        onCommit={(height) =>
          // Öffnungen mit-clampen, sonst ragen Türen/Fenster aus der Wand
          updateWall(
            wall.id,
            {
              height,
              doors: wall.doors.map((d) => ({
                ...d,
                height: Math.min(d.height, height),
              })),
              windows: wall.windows.map((w) => {
                const sill = Math.min(w.sillHeight, Math.max(height - 0.2, 0));
                return {
                  ...w,
                  sillHeight: sill,
                  height: Math.min(w.height, height - sill),
                };
              }),
            },
            k('h')
          )
        }
      />
      <NumberField
        label="Dicke"
        value={wall.thickness}
        min={0.05}
        step={0.05}
        onCommit={(thickness) => updateWall(wall.id, { thickness }, k('t'))}
      />
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={wall.color}
          onChange={(e) =>
            updateWall(wall.id, { color: e.target.value }, k('color'))
          }
        />
      </label>

      {/* Türen */}
      <h3>Türen</h3>
      {wall.doors.map((d, i) => {
        // Geclampte Lage: Rest links/rechts der Tür in der Wand
        const dw = Math.min(d.width, length);
        const c = Math.min(Math.max(d.positionOnWall * length, dw / 2), length - dw / 2);
        const left = c - dw / 2;
        const right = length - (c + dw / 2);
        return (
        <div key={d.id} className="opening-card">
          <div className="opening-head">
            <span>Tür {i + 1}</span>
            <button
              className="mini-danger"
              onClick={() =>
                updateWall(wall.id, {
                  doors: wall.doors.filter((x) => x.id !== d.id),
                })
              }
            >
              ✕
            </button>
          </div>
          <p className="opening-meta">
            {formatLength(dw, unit)} × {formatLength(Math.min(d.height, wall.height), unit)} ·
            links {formatLength(left, unit)} · rechts {formatLength(right, unit)}
          </p>
          <SliderField
            label="Position"
            value={d.positionOnWall}
            onCommit={(v) =>
              patchDoor(d.id, { positionOnWall: v }, `door:${d.id}:pos`)
            }
          />
          <NumberField
            label="Breite"
            value={d.width}
            min={0.4}
            max={length}
            onCommit={(v) => patchDoor(d.id, { width: v }, `door:${d.id}:w`)}
          />
          <NumberField
            label="Höhe"
            value={d.height}
            min={1.5}
            max={wall.height}
            onCommit={(v) => patchDoor(d.id, { height: v }, `door:${d.id}:h`)}
          />
          <label className="prop-field">
            <span>Material</span>
            <select
              value={d.material}
              onChange={(e) =>
                patchDoor(d.id, {
                  material: e.target.value as Door['material'],
                })
              }
            >
              <option value="wood">Holz</option>
              <option value="glass">Glas</option>
            </select>
          </label>
        </div>
        );
      })}
      <button className="add-btn" onClick={addDoor}>
        + Tür
      </button>

      {/* Fenster */}
      <h3>Fenster</h3>
      {wall.windows.map((w, i) => {
        const ww = Math.min(w.width, length);
        const wc = Math.min(Math.max(w.positionOnWall * length, ww / 2), length - ww / 2);
        const wLeft = wc - ww / 2;
        const wRight = length - (wc + ww / 2);
        return (
        <div key={w.id} className="opening-card">
          <div className="opening-head">
            <span>Fenster {i + 1}</span>
            <button
              className="mini-danger"
              onClick={() =>
                updateWall(wall.id, {
                  windows: wall.windows.filter((x) => x.id !== w.id),
                })
              }
            >
              ✕
            </button>
          </div>
          <p className="opening-meta">
            {formatLength(ww, unit)} × {formatLength(w.height, unit)} ·
            links {formatLength(wLeft, unit)} · rechts {formatLength(wRight, unit)}
          </p>
          <SliderField
            label="Position"
            value={w.positionOnWall}
            onCommit={(v) =>
              patchWindow(w.id, { positionOnWall: v }, `win:${w.id}:pos`)
            }
          />
          <NumberField
            label="Breite"
            value={w.width}
            min={0.3}
            max={length}
            onCommit={(v) => patchWindow(w.id, { width: v }, `win:${w.id}:w`)}
          />
          <NumberField
            label="Höhe"
            value={w.height}
            min={0.3}
            max={wall.height - w.sillHeight}
            onCommit={(v) => patchWindow(w.id, { height: v }, `win:${w.id}:h`)}
          />
          <NumberField
            label="Brüstung"
            value={w.sillHeight}
            min={0}
            max={wall.height - w.height}
            onCommit={(v) =>
              patchWindow(w.id, { sillHeight: v }, `win:${w.id}:sill`)
            }
          />
        </div>
        );
      })}
      <button className="add-btn" onClick={addWindow}>
        + Fenster
      </button>

      <button className="danger-btn" onClick={() => deleteWall(wall.id)}>
        Wand löschen (Entf)
      </button>
    </aside>
  );
}

/* ---------- Möbel ---------- */

function FurniturePanel({ f }: { f: Furniture }) {
  const updateFurniture = useShopStore((s) => s.updateFurniture);
  const deleteFurniture = useShopStore((s) => s.deleteFurniture);
  const unit = useShopStore((s) => s.unit);
  const k = (field: string) => `furn:${f.id}:${field}`;
  const deg = ((f.rotation * 180) / Math.PI) % 360;

  return (
    <aside className="prop-panel">
      <h2>{f.customLabel ?? 'Möbel'}</h2>
      <p className="prop-meta">
        {f.type} · {formatLength(f.scale.x, unit)} ×{' '}
        {formatLength(f.scale.z, unit)} × {formatLength(f.scale.y, unit)}
      </p>

      <NumberField
        label="X"
        value={f.position.x}
        min={-1000}
        onCommit={(x) =>
          updateFurniture(f.id, { position: { ...f.position, x } }, k('x'))
        }
      />
      <NumberField
        label="Z"
        value={f.position.z}
        min={-1000}
        onCommit={(z) =>
          updateFurniture(f.id, { position: { ...f.position, z } }, k('z'))
        }
      />
      <PlainNumberField
        label="Rotation"
        value={deg < 0 ? deg + 360 : deg}
        min={-360}
        max={360}
        step={15}
        suffix="°"
        onCommit={(d) =>
          updateFurniture(f.id, { rotation: (d * Math.PI) / 180 }, k('rot'))
        }
      />
      <NumberField
        label="Länge"
        value={f.scale.x}
        onCommit={(x) =>
          updateFurniture(f.id, { scale: { ...f.scale, x } }, k('sx'))
        }
      />
      <NumberField
        label="Höhe"
        value={f.scale.y}
        onCommit={(y) =>
          updateFurniture(f.id, { scale: { ...f.scale, y } }, k('sy'))
        }
      />
      <NumberField
        label="Tiefe"
        value={f.scale.z}
        onCommit={(z) =>
          updateFurniture(f.id, { scale: { ...f.scale, z } }, k('sz'))
        }
      />
      <label className="prop-field">
        <span>Material</span>
        <select
          value={f.material}
          onChange={(e) =>
            updateFurniture(f.id, {
              material: e.target.value as Furniture['material'],
            })
          }
        >
          <option value="wood">Holz</option>
          <option value="metal">Metall</option>
          <option value="glass">Glas</option>
          <option value="plastic">Kunststoff</option>
        </select>
      </label>
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={f.color}
          onChange={(e) =>
            updateFurniture(f.id, { color: e.target.value }, k('color'))
          }
        />
      </label>

      <button className="danger-btn" onClick={() => deleteFurniture(f.id)}>
        Möbel löschen (Entf)
      </button>
    </aside>
  );
}

/* ---------- Kommentar ---------- */

function NotePanel({ note }: { note: TextNote }) {
  const updateNote = useShopStore((s) => s.updateNote);
  const deleteNote = useShopStore((s) => s.deleteNote);
  const k = (field: string) => `note:${note.id}:${field}`;

  return (
    <aside className="prop-panel">
      <h2>Kommentar</h2>
      <p className="prop-meta">Handle unter dem Text zieht die Größe</p>

      <label className="prop-field prop-field-block">
        <span>Text</span>
        <textarea
          className="prop-textarea"
          value={note.text}
          rows={3}
          onChange={(e) =>
            updateNote(note.id, { text: e.target.value }, k('text'))
          }
        />
      </label>
      <NumberField
        label="Größe"
        value={note.fontSize}
        min={0.08}
        max={5}
        step={0.05}
        onCommit={(fontSize) => updateNote(note.id, { fontSize }, k('size'))}
      />
      <NumberField
        label="Höhe"
        value={note.position.y}
        min={0}
        max={10}
        onCommit={(y) =>
          updateNote(note.id, { position: { ...note.position, y } }, k('y'))
        }
      />
      <NumberField
        label="X"
        value={note.position.x}
        min={-1000}
        onCommit={(x) =>
          updateNote(note.id, { position: { ...note.position, x } }, k('x'))
        }
      />
      <NumberField
        label="Z"
        value={note.position.z}
        min={-1000}
        onCommit={(z) =>
          updateNote(note.id, { position: { ...note.position, z } }, k('z'))
        }
      />
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={note.color}
          onChange={(e) =>
            updateNote(note.id, { color: e.target.value }, k('color'))
          }
        />
      </label>

      <button className="danger-btn" onClick={() => deleteNote(note.id)}>
        Kommentar löschen (Entf)
      </button>
    </aside>
  );
}

/* ---------- Bodenfläche ---------- */

function FloorPanel({ zone }: { zone: FloorZone }) {
  const updateFloor = useShopStore((s) => s.updateFloor);
  const deleteFloor = useShopStore((s) => s.deleteFloor);
  const unit = useShopStore((s) => s.unit);
  const k = (field: string) => `floor:${zone.id}:${field}`;

  const w = zone.end.x - zone.start.x;
  const d = zone.end.z - zone.start.z;

  return (
    <aside className="prop-panel">
      <h2>Bodenfläche</h2>
      <p className="prop-meta">
        {formatLength(w, unit)} × {formatLength(d, unit)}
      </p>

      <NumberField
        label="Breite"
        value={w}
        min={0.2}
        onCommit={(nw) =>
          updateFloor(zone.id, { end: { ...zone.end, x: zone.start.x + nw } }, k('w'))
        }
      />
      <NumberField
        label="Tiefe"
        value={d}
        min={0.2}
        onCommit={(nd) =>
          updateFloor(zone.id, { end: { ...zone.end, z: zone.start.z + nd } }, k('d'))
        }
      />
      <NumberField
        label="X"
        value={zone.start.x}
        min={-1000}
        onCommit={(x) =>
          updateFloor(
            zone.id,
            { start: { ...zone.start, x }, end: { ...zone.end, x: x + w } },
            k('x')
          )
        }
      />
      <NumberField
        label="Z"
        value={zone.start.z}
        min={-1000}
        onCommit={(z) =>
          updateFloor(
            zone.id,
            { start: { ...zone.start, z }, end: { ...zone.end, z: z + d } },
            k('z')
          )
        }
      />
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={zone.color}
          onChange={(e) =>
            updateFloor(zone.id, { color: e.target.value }, k('color'))
          }
        />
      </label>

      <button className="danger-btn" onClick={() => deleteFloor(zone.id)}>
        Boden löschen (Entf)
      </button>
    </aside>
  );
}

/* ---------- Mehrfachauswahl ---------- */

function MultiPanel() {
  const selection = useShopStore((s) => s.selection);
  const setColorForSelection = useShopStore((s) => s.setColorForSelection);
  const deleteSelection = useShopStore((s) => s.deleteSelection);
  const copySelection = useShopStore((s) => s.copySelection);
  const pasteClipboard = useShopStore((s) => s.pasteClipboard);
  const hasClipboard = useShopStore((s) => s.clipboard !== null);
  const setSelected = useShopStore((s) => s.setSelected);

  const counts = selection.reduce(
    (acc, x) => {
      acc[x.type] += 1;
      return acc;
    },
    { wall: 0, furniture: 0, floor: 0, note: 0 } as Record<string, number>
  );
  const parts = [
    counts.wall > 0 ? `${counts.wall} Wand/Wände` : null,
    counts.furniture > 0 ? `${counts.furniture} Möbel` : null,
    counts.floor > 0 ? `${counts.floor} Boden/Böden` : null,
    counts.note > 0 ? `${counts.note} Kommentar(e)` : null,
  ].filter(Boolean);

  return (
    <aside className="prop-panel">
      <h2>{selection.length} Objekte</h2>
      <p className="prop-meta">{parts.join(' · ')}</p>

      <label className="prop-field">
        <span>Farbe für alle</span>
        <input
          type="color"
          defaultValue="#cccccc"
          onChange={(e) => setColorForSelection(e.target.value)}
        />
      </label>

      <button className="add-btn" onClick={copySelection}>
        Kopieren (Strg+C)
      </button>
      <button
        className="add-btn"
        style={{ marginTop: 8 }}
        disabled={!hasClipboard}
        onClick={pasteClipboard}
      >
        Einfügen (Strg+V)
      </button>

      <button className="danger-btn" onClick={deleteSelection}>
        Alle löschen (Entf)
      </button>
      <button className="add-btn" style={{ marginTop: 8 }} onClick={() => setSelected(null)}>
        Auswahl aufheben (Esc)
      </button>
    </aside>
  );
}

/* ---------- Shop (nichts ausgewählt) ---------- */

function ShopPanel() {
  const name = useShopStore((s) => s.name);
  const dims = useShopStore((s) => s.floorDimensions);
  const unit = useShopStore((s) => s.unit);
  const setName = useShopStore((s) => s.setName);
  const setFloorDimensions = useShopStore((s) => s.setFloorDimensions);

  return (
    <aside className="prop-panel">
      <h2>Shop</h2>
      <p className="prop-meta">
        Boden {formatLength(dims.width, unit)} × {formatLength(dims.depth, unit)}
      </p>
      <label className="prop-field">
        <span>Name</span>
        <input
          type="text"
          className="prop-text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <NumberField
        label="Breite"
        value={dims.width}
        min={1}
        max={100}
        step={0.5}
        onCommit={(width) =>
          setFloorDimensions({ ...dims, width }, 'floor:w')
        }
      />
      <NumberField
        label="Tiefe"
        value={dims.depth}
        min={1}
        max={100}
        step={0.5}
        onCommit={(depth) =>
          setFloorDimensions({ ...dims, depth }, 'floor:d')
        }
      />
    </aside>
  );
}

export function PropertyPanel() {
  const selectionCount = useShopStore((s) => s.selection.length);
  const selectedType = useShopStore((s) => s.selectedType);
  const mode = useShopStore((s) => s.mode);
  const wall = useShopStore((s) =>
    s.selectedType === 'wall'
      ? s.walls.find((w) => w.id === s.selectedId)
      : undefined
  );
  const furniture = useShopStore((s) =>
    s.selectedType === 'furniture'
      ? s.furniture.find((f) => f.id === s.selectedId)
      : undefined
  );
  const floor = useShopStore((s) =>
    s.selectedType === 'floor'
      ? s.floors.find((f) => f.id === s.selectedId)
      : undefined
  );
  const note = useShopStore((s) =>
    s.selectedType === 'note'
      ? s.notes.find((n) => n.id === s.selectedId)
      : undefined
  );

  if (selectionCount > 1) return <MultiPanel />;
  if (selectedType === 'wall' && wall) return <WallPanel wall={wall} />;
  if (selectedType === 'furniture' && furniture)
    return <FurniturePanel f={furniture} />;
  if (selectedType === 'floor' && floor) return <FloorPanel zone={floor} />;
  if (selectedType === 'note' && note) return <NotePanel note={note} />;
  if (mode === 'view') return <ShopPanel />;
  return null;
}
