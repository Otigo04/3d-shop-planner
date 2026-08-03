import { useRef, useState } from 'react';
import { useShopStore } from '../store/shopStore';
import { FURNITURE_CATALOG } from '../lib/furnitureCatalog';
import {
  exportPlanJSON,
  exportScreenshotPNG,
  importPlanFromFile,
} from '../lib/exportImport';

export function Toolbar() {
  const mode = useShopStore((s) => s.mode);
  const placingType = useShopStore((s) => s.placingType);
  const setMode = useShopStore((s) => s.setMode);
  const startPlacing = useShopStore((s) => s.startPlacing);
  const stopPlacing = useShopStore((s) => s.stopPlacing);
  const setSelected = useShopStore((s) => s.setSelected);
  const undo = useShopStore((s) => s.undo);
  const redo = useShopStore((s) => s.redo);
  const canUndo = useShopStore((s) => s.historyIndex > 0);
  const canRedo = useShopStore((s) => s.historyIndex < s.history.length - 1);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importPlanFromFile(file);
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    }
  };

  const enterMode = (
    target: 'view' | 'wall-draw' | 'floor-draw' | 'note-place'
  ) => {
    setSelected(null);
    setMode(mode === target ? 'view' : target);
  };

  return (
    <nav className="toolbar">
      <button
        className={`tool-btn ${mode === 'view' || mode === 'edit' ? 'active' : ''}`}
        onClick={() => enterMode('view')}
        title="Ansicht / Auswahl"
      >
        <span className="tool-icon">🖱️</span>
        Ansicht
      </button>
      <button
        className={`tool-btn ${mode === 'wall-draw' ? 'active' : ''}`}
        onClick={() => enterMode('wall-draw')}
        title="Wand zeichnen: Klick Start, Klick Ende. Rechtsklick/Escape beendet."
      >
        <span className="tool-icon">🧱</span>
        Wand
      </button>
      <button
        className={`tool-btn ${mode === 'floor-draw' ? 'active' : ''}`}
        onClick={() => enterMode('floor-draw')}
        title="Bodenfläche zeichnen (z.B. Flur): Klick Ecke, Klick Gegen-Ecke."
      >
        <span className="tool-icon">🟫</span>
        Boden
      </button>
      <button
        className={`tool-btn ${mode === 'note-place' ? 'active' : ''}`}
        onClick={() => enterMode('note-place')}
        title="Kommentar platzieren: Klick auf Boden. Handle unter dem Text skaliert, Entf löscht."
      >
        <span className="tool-icon">💬</span>
        Text
      </button>

      <div className="toolbar-divider" />
      <span className="toolbar-label">Möbel</span>

      <div className="furn-grid">
        {FURNITURE_CATALOG.map((item) => (
          <button
            key={item.type}
            className={`tool-btn small ${
              mode === 'furniture-place' && placingType === item.type
                ? 'active'
                : ''
            }`}
            onClick={() =>
              mode === 'furniture-place' && placingType === item.type
                ? stopPlacing()
                : startPlacing(item.type)
            }
            title={`${item.label} platzieren — Klick = einzeln, Ziehen = Reihe, R dreht, Escape beendet`}
          >
            <span className="tool-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <button
        className="tool-btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Strg+Z)"
      >
        <span className="tool-icon">↩️</span>
        Undo
      </button>
      <button
        className="tool-btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Strg+Y)"
      >
        <span className="tool-icon">↪️</span>
        Redo
      </button>

      <div className="toolbar-divider" />

      <button
        className="tool-btn"
        onClick={exportPlanJSON}
        title="Plan als JSON-Datei herunterladen"
      >
        <span className="tool-icon">💾</span>
        Export
      </button>
      <button
        className="tool-btn"
        onClick={() => fileInput.current?.click()}
        title="Plan aus JSON-Datei laden (aktueller Stand bleibt per Undo erreichbar)"
      >
        <span className="tool-icon">📂</span>
        Import
      </button>
      <button
        className="tool-btn"
        onClick={exportScreenshotPNG}
        title="Screenshot der 3D-Ansicht als PNG"
      >
        <span className="tool-icon">📸</span>
        Foto
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          onImportFile(e.target.files?.[0]);
          e.target.value = ''; // gleiche Datei erneut wählbar
        }}
      />
      {importError && <p className="toolbar-error">{importError}</p>}
    </nav>
  );
}
