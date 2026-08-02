# 3D Shop Planner – Master Prompt für Claude Code

## Projekt-Übersicht
Entwicklung einer Web-App zur **interaktiven 3D-Planung von Einzelhandelsgeschäften**. Nutzer können Räume maßstabsgetreu designen, Wände ziehen, Türen/Fenster einbauen, Inneneinrichtung platzieren und damit noch nicht eröffnete Stores planen.

**Stack:** Next.js, TypeScript, Three.js (3D), Zustand (State Management), Tailwind CSS

---

## Phase 1: Kerninfrastruktur & 3D-Setup

### Ziele
- [ ] Three.js-Szene initialisieren mit modernem Renderer
- [ ] Flexible Kamera (Orbit-Kontrollen, Zoom, Rotation)
- [ ] Grund-Grid und Maßstab (1 Unit = 1 Meter)
- [ ] State Management (Zustand) für Shop-Daten
- [ ] Responsive Canvas + UI-Layout

### Anforderungen
1. **Three.js Renderer**
   - WebGL mit Anti-Aliasing
   - Adaptive Pixel Ratio
   - Heller Hintergrund (Gradient: Weiß → helles Blaugrau)
   - Echtes Flächenlicht (Area Lights) für realistische Schatten

2. **Kamerasteuerung**
   - Orbit-Controls (rechte Maus zum Rotieren, Mitte zum Zoomen)
   - Tastatur-Shortcuts: WASD für Kamera-Translation
   - Smooth Damping für natürliche Bewegungen
   - Auto-Fit bei Neustart (Kamera passt sich Raum-Größe an)

3. **Grid & Koordinatensystem**
   - Visuelles Grid auf dem Boden (0,5m-Abstände mit Alpha-Blending)
   - Achsen-Helfer (farbige Linien: Rot=X, Grün=Y, Blau=Z)
   - Einheiten-Display in der UI (Meter-Anzeige)

4. **State Schema (Zustand)**
   ```typescript
   type ShopState = {
     name: string;
     dimensions: { width: number; depth: number; height: number }; // in Metern
     walls: Wall[];
     doors: Door[];
     windows: Window[];
     furniture: Furniture[];
     selectedId: string | null;
     mode: 'view' | 'wall-draw' | 'furniture-place';
   };
   ```

---

## Phase 2: Wände & Raumstruktur

### Ziele
- [ ] Interaktives Wand-Zeichnen (Click → Drag → Release)
- [ ] Wand-Properties editierbar (Länge, Höhe, Material, Farbe)
- [ ] Automatische Ecken-Erkennung & -Snap
- [ ] Türen & Fenster in Wände einbauen
- [ ] Wand-Löschen & Bearbeitung

### Anforderungen
1. **Wand-Editor**
   - **Mode: "wall-draw"** – Nutzer klickt Start, bewegt Maus, klickt Ende
   - Echtzeitanzeige der Wand-Länge während des Zeichnens
   - Snap-Punkte bei 0,1m-Inkrementen
   - Wand hat automatisch eingegebene Höhe (z.B. 2,5m Standard)

2. **Wand-Geometrie**
   - MeshLine oder BoxGeometry für Wand-Rendering (0,15m Dicke)
   - Material: Diffus (weiß), mit Umgebungsschatten
   - Highlight beim Hover (leichte Farbveränderung)
   - Selection-Outline (Emissive-Material)

3. **Tür/Fenster-Integration**
   - Tür-Widget in die Wand einbauen: Position auf Wand + Breite
   - Fenster ähnlich (kleinere Breite, höhere Position)
   - Automatisches Loch in der Wand-Geometrie
   - Properties: Typ (links/rechts), Material (Holz/Glas), Farbe

4. **Snapping & Constraints**
   - Wände fangen sich bei Endpunkten ein (Tolerance: 0,1m)
   - Grid-Snap optional aktivierbar
   - Längen-Input-Validierung (positive Zahlen)

---

## Phase 3: Möbel & Inneneinrichtung

### Ziele
- [ ] Möbel-Katalog (Regale, Lochwand, Kassentresen, Theken, etc.)
- [ ] Drag-&-Drop-Platzierung auf Boden
- [ ] Rotation & Größen-Anpassung
- [ ] Kollisions-Erkennung (optional: Warnung)
- [ ] Furniture-Stack (z-Ordering bei Überlapp)

### Anforderungen
1. **Möbel-Katalog (Primitive)**
   - **Regal:** 2m × 0,4m × 1,8m, grau/anthrazit, Böden sichtbar
   - **Lochwand:** 1m × 0,05m × 2m, weiß, mit Loch-Pattern (SVG-basiert oder Textur)
   - **Kassentresen:** 1,5m × 0,6m × 1,1m, braun/dunkelholz
   - **Theke:** 2m × 0,8m × 0,9m, weiß/minimalistisch
   - **Hänger-Stange:** 1,5m × 0,1m × 2m, silber
   - **Tisch/Display:** variabel, minimalistisch
   - Custom-Möbel: Nutzer kann Größe eingeben

2. **Platzierungsmodus**
   - Möbel aus Katalog wählen → Preview folgt Maus
   - Klick auf Boden zum Platzieren
   - Double-Click oder Rechtsklick zum Rotieren (90°-Schritte oder frei)
   - Property-Panel neben 3D-View für Größe/Position/Rotation

3. **Visualisierung**
   - Möbel mit PBR-Materialen (Metallic/Roughness)
   - Schatten-Casting aktiviert
   - Minimalistisches Design (saubere Kanten, wenig Schnickschnack)
   - Farb-Swatches für Material-Auswahl

4. **Interaktion**
   - Klick auf Möbel → Auswahl (Outline + Property-Panel)
   - Drag zum Verschieben (nur XZ-Ebene)
   - Maus-Rad zum Rotieren (wenn ausgewählt)
   - Delete-Taste oder Button zum Löschen

---

## Phase 4: UI & Bedienung

### Ziele
- [ ] Clean, modernes Interface (Dark- oder Light-Mode wählbar)
- [ ] Kontextuelle Property-Panels
- [ ] Tool-Leiste (Wall, Furniture, Delete, etc.)
- [ ] Keyboard-Shortcuts anzeigen
- [ ] Undo/Redo-System
- [ ] Export-Optionen (Screenshot, JSON-Plan)

### Anforderungen
1. **Layout**
   ```
   ┌─────────────────────────────────┐
   │ Header: Shop-Name, Save-Button  │
   ├─────────────────────────────────┤
   │        │                   │     │
   │ Tools  │   3D Canvas       │ Props│
   │ Panel  │                   │ Panel│
   │        │                   │     │
   ├─────────────────────────────────┤
   │ Footer: Zoom/Pan Info, Debug    │
   └─────────────────────────────────┘
   ```

2. **Tool-Panel (links)**
   - Mode-Buttons: View, Draw Wall, Place Furniture
   - Möbel-Kategorien (Regale, Theken, Deco)
   - Möbel-Thumbnail-Liste mit Scroll
   - Quick-Actions: Undo, Redo, Clear All

3. **Property-Panel (rechts)**
   - Zeigt Properties des ausgewählten Elements
   - Für Wände: Länge, Höhe, Farbe, Tür/Fenster-Button
   - Für Möbel: Position (X, Y), Rotation, Größe (L × T × H), Material
   - Für Shop: Name, Raumdimensionen, Fußboden-Material

4. **Animationen & Übergänge**
   - Smooth Fade-In beim Auswählen
   - Panel-Animationen (Slide-in von Seite)
   - Hover-Effekte auf Buttons (Scale, Color-Shift)
   - Transition auf Mode-Wechsel (0,3s ease-in-out)

5. **Kamera-Animation**
   - Button "Fit All" → Kamera fährt Zoom auf ganzen Raum
   - Button "Top View" → Isometrische/Top-Down-Ansicht
   - Button "Front View" → Frontale Ansicht
   - Smooth Camera Tween (TWEEN.js oder Three.js Animation)

---

## Phase 5: Export & Persistierung

### Ziele
- [ ] LocalStorage für Auto-Save
- [ ] JSON-Export des Plans
- [ ] Screenshot (Canvas-Export als PNG)
- [ ] Optional: Cloud-Save (Placeholder für späteren Backend)

### Anforderungen
1. **LocalStorage**
   - Auto-Save nach jeder Änderung (Debounce 1s)
   - Recovery bei Reload
   - "Save as..." mit Timestamp

2. **Export**
   - **Plan (JSON):** Vollständiges ShopState-Objekt
   - **Bild (PNG):** Canvas Render → Trigger Download
   - **Measures (PDF):** Optional – Technische Zeichnung mit Bemaßung

3. **Datei-Handling**
   - Import von gespeicherten Plänen (JSON-Upload)
   - Validierung vor Import
   - Konflikt-Handling (Überschreiben oder Merge?)

---

## Technische Details

### Performance-Optimierungen
- **Geometry Instancing:** Wenn viele Möbel gleich sind, InstancedMesh verwenden
- **LOD (Level of Detail):** Für Möbel mit niedriger Polyzahl bei Zoom-Out
- **Renderer.setPixelRatio:** Auf 1.0 setzen auf Low-End-Devices
- **Culling:** Frustum Culling automatisch durch Three.js

### Qualitäts-Anforderungen
- **Animation:** Alle Übergänge sind smooth, keine Ruckler
- **Responsive:** Mobile-Support (Touch-Gesten)
- **Accessibility:** Keyboard-Navigation vollständig
- **Clean Code:** TypeScript strict Mode, ESLint-Konform

### Dependencies
```json
{
  "three": "^r128+",
  "zustand": "latest",
  "tailwindcss": "latest",
  "framer-motion": "latest (optional für UI-Animationen)",
  "tween.js": "latest (Kamera-Animationen)"
}
```

---

## Workflow für Claude Code

### Initial Setup
```bash
npm create next-app@latest 3d-shop-planner --typescript --tailwind
cd 3d-shop-planner
npm install three zustand framer-motion @tweenjs/tween.js
npm install --save-dev @types/three @types/node
```

### Empfohlene Struktur
```
src/
├── components/
│   ├── Canvas3D.tsx          # Three.js Canvas & Scene
│   ├── ToolPanel.tsx          # Linke Werkzeugleiste
│   ├── PropertyPanel.tsx       # Rechte Properties
│   ├── Header.tsx             # Top-Navigation
│   └── Footer.tsx             # Unten: Info & Debug
├── hooks/
│   ├── useShopStore.ts        # Zustand Store
│   ├── useThreeScene.ts       # Three.js Setup & Rendering
│   └── useMousePick.ts        # Raycasting für Auswahl
├── lib/
│   ├── geometry.ts            # Geometrie-Helfer
│   ├── materials.ts           # Material-Definitionen
│   ├── furniture-catalog.ts   # Möbel-Daten
│   └── export.ts              # Export-Funktionen
├── types/
│   └── shop.ts                # TypeScript Interfaces
└── pages/
    └── index.tsx              # Main App
```

### Entwicklungs-Phases
1. **Tag 1-2:** Canvas + Kamera + Grid
2. **Tag 2-3:** Wand-Editor + State
3. **Tag 3-4:** Möbel-Katalog + Platzierung
4. **Tag 4-5:** UI + Property-Panels
5. **Tag 5+:** Polish + Export + Testing

---

## Weitere Features (Phase 2)
- Lichtsimulation (virtuelle Beleuchtung planen)
- Messlinien zwischen Objekten
- Template-Shops (vordefinierte Layouts)
- Zusammenarbeit (URL-Share für Plans)
- AR-Vorschau (auf Mobilgerät)
- DXF/CAD-Export für Architekten
- Multi-Floor-Support (Mehrgeschossige Shops)

---

## Qualitäts-Checkliste
- [ ] Keine Console-Errors in Production Build
- [ ] Smooth 60 FPS auf Mid-Range Hardware
- [ ] Keyboard-Shortcuts dokumentiert & intuitiv
- [ ] Fehlermeldungen benutzerfreundlich
- [ ] Mobile-Erlebnis getestet
- [ ] Dunkelmodus funktioniert
- [ ] Animations-Easing konsistent
- [ ] Keine Memory-Leaks bei häufigen Änderungen

---

## Design-Philosophie
**Minimalistisch, präzise, spielerisch**
- Keine unnötigen Dekoration-Elemente
- Fokus auf Funktion & Maßstab-Genauigkeit
- Subtile Animationen (lieber zu wenig als zu viel)
- Konsistente Farb-Palette: Neutralweiß, Dunkelgrau, Accent-Farbe (z.B. Türkis)
- Typo: Clean Sans-Serif (Geist/Inter/JetBrains Mono für Zahlen)

---

**Erstellt für:** Orhan (@avitas-solutions)  
**Ziel:** Shop-Planung revolutionieren – schnell, präzise, intuitiv  
**Status:** Ready für Claude Code Entwicklung
