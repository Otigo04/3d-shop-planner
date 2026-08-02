# 3d-shop-planner

Interaktiver 3D-Baukasten für Laden-Planung — maßstabsgetreu, im Browser.

## Features

- **Wände zeichnen** mit Grid-/Endpunkt-/Raumkanten-Snap, Live-Längenanzeige, Kettenzeichnen
- **Türen & Fenster** mit echter Loch-Geometrie, Position/Maße editierbar
- **Bodenflächen** frei zeichnen (z.B. Flure), Farbe & Maße anpassbar
- **Möbel-Katalog** (14 Typen: Regal, Theke, Kasse, Kartons, Palette, Kühlregal u.v.m.), Klick = einzeln, Ziehen = ganze Reihe
- **Mehrfachauswahl** (Strg+Klick), Gruppe verschieben per Drag oder Pfeiltasten
- **Meteranzeigen**: Wandlängen, Raummaße, Tür-Teilstücke, Abstands-Messlinien vom Möbel zu Wänden/Nachbarn (Gänge ausmessen)
- **Undo/Redo** über alles, Auto-Save (localStorage), JSON-Export/-Import, PNG-Screenshot
- Dark Mode, Ortho-/Perspektiv-Kamera mit Shortcuts

## Stack

Vite · React 19 · TypeScript · three.js (@react-three/fiber + drei) · Zustand

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Production-Build
```

## Shortcuts

| Taste | Funktion |
|-------|----------|
| `T` / `1` / `2` | Top- / Front- / Seitenansicht |
| `F` | Fit All |
| `R` | Kamera-Reset · Möbel drehen (bei Auswahl/Platzierung) |
| `P` | Ortho ↔ Perspektive |
| `Strg+Z` / `Strg+Y` | Undo / Redo |
| `Strg+Klick` | Mehrfachauswahl |
| `←↑↓→` (+`Shift`) | Auswahl verschieben 0,1m (0,5m) |
| `Entf` | Auswahl löschen |
| `Esc` / Rechtsklick | Abbrechen / Auswahl aufheben |
