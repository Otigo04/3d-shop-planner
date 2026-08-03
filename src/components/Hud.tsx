import { useState } from 'react';
import { useShopStore } from '../store/shopStore';
import type { LengthUnit } from '../types';

const MODE_LABELS: Record<string, string> = {
  view: 'Ansicht',
  'wall-draw': 'Wand zeichnen',
  'floor-draw': 'Boden zeichnen',
  'furniture-place': 'Möbel platzieren',
  'note-place': 'Kommentar platzieren',
  edit: 'Bearbeiten',
};

const SHORTCUTS: Array<[string, string]> = [
  ['T', 'Top'],
  ['F', 'Fit All'],
  ['1', 'Front'],
  ['2', 'Seite'],
  ['R', 'Reset / Drehen'],
  ['P', 'Ortho/Persp'],
  ['Strg+Z', 'Undo'],
  ['Strg+C/V', 'Kopieren'],
  ['Strg+Klick', 'Mehrfach'],
  ['←↑↓→', 'Bewegen'],
];

export function Hud() {
  const name = useShopStore((s) => s.name);
  const mode = useShopStore((s) => s.mode);
  const orthographic = useShopStore((s) => s.orthographic);
  const darkMode = useShopStore((s) => s.darkMode);
  const showMeasurements = useShopStore((s) => s.showMeasurements);
  const unit = useShopStore((s) => s.unit);
  const setName = useShopStore((s) => s.setName);
  const setUnit = useShopStore((s) => s.setUnit);
  const toggleDarkMode = useShopStore((s) => s.toggleDarkMode);
  const toggleMeasurements = useShopStore((s) => s.toggleMeasurements);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commitName = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) setName(trimmed);
    setEditing(false);
  };

  return (
    <>
      <header className="hud-top">
        {editing ? (
          <input
            className="hud-name-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <h1
            className="hud-name"
            title="Doppelklick zum Umbenennen"
            onDoubleClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name}
          </h1>
        )}
        <span className="hud-badge">
          {MODE_LABELS[mode] ?? mode}
          {' · '}
          {orthographic ? 'Ortho' : 'Perspektive'}
        </span>
        <select
          className="hud-unit-select"
          value={unit}
          onChange={(e) => setUnit(e.target.value as LengthUnit)}
          title="Maßeinheit für Eingaben & Anzeigen"
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
        <button
          className={`hud-icon-btn ${showMeasurements ? 'active' : ''}`}
          onClick={toggleMeasurements}
          title="Maßanzeigen ein/aus"
        >
          📏
        </button>
        <button
          className="hud-icon-btn"
          onClick={toggleDarkMode}
          title="Dark Mode ein/aus"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <footer className="hud-bottom">
        {SHORTCUTS.map(([key, label]) => (
          <span key={key} className="hud-shortcut">
            <kbd>{key}</kbd> {label}
          </span>
        ))}
      </footer>
    </>
  );
}
