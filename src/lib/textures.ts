import * as THREE from 'three';

// Prozedurale Materialtexturen (Canvas-basiert, keine Assets nötig).
// Alle Farbmaps sind hell/neutral gehalten, damit die Möbel-Farbe
// (multiplikativ) den Ton bestimmt — die Textur liefert nur die Struktur.

const cache = new Map<string, THREE.CanvasTexture>();

function makeTexture(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat = 1
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

// Zufall mit festem Seed — Textur sieht bei jedem Laden gleich aus
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Holzmaserung: vertikale Bahnen + dunkle Aderlinien */
export function woodTexture(): THREE.CanvasTexture {
  return makeTexture('wood', 256, (ctx, size) => {
    const rnd = seededRandom(42);
    ctx.fillStyle = '#e6d5bd';
    ctx.fillRect(0, 0, size, size);

    // Breite Bahnen (Bretter-Look)
    for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(160,120,80,0.10)' : 'rgba(120,90,60,0.08)';
      ctx.fillRect(x, 0, 32, size);
    }

    // Maser-Adern: leicht gewellte vertikale Linien
    for (let i = 0; i < 34; i++) {
      const x0 = rnd() * size;
      const amp = 2 + rnd() * 4;
      const alpha = 0.06 + rnd() * 0.1;
      ctx.strokeStyle = `rgba(90,60,35,${alpha})`;
      ctx.lineWidth = 0.5 + rnd() * 1.2;
      ctx.beginPath();
      for (let y = 0; y <= size; y += 8) {
        const x = x0 + Math.sin((y / size) * Math.PI * (2 + rnd() * 2)) * amp;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Vereinzelte Astlöcher
    for (let i = 0; i < 3; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 3 + rnd() * 4;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(80,50,30,0.35)');
      g.addColorStop(1, 'rgba(80,50,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

/** Gebürstetes Metall: feine horizontale Schleifspuren */
export function metalTexture(): THREE.CanvasTexture {
  return makeTexture('metal', 256, (ctx, size) => {
    const rnd = seededRandom(7);
    ctx.fillStyle = '#dfe2e6';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      const y = rnd() * size;
      const alpha = 0.03 + rnd() * 0.07;
      ctx.strokeStyle =
        rnd() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(90,95,105,${alpha})`;
      ctx.lineWidth = 0.5 + rnd();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rnd() - 0.5) * 2);
      ctx.stroke();
    }
  });
}

/** Feines Rauschen für Kunststoff/Putz — bricht die sterile Fläche auf */
export function noiseTexture(): THREE.CanvasTexture {
  return makeTexture('noise', 128, (ctx, size) => {
    const rnd = seededRandom(99);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rnd() - 0.5) * 14;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

/**
 * Lochwand-Alphamap: weiß = sichtbar, schwarze Punkte = echte Löcher.
 * repeat ist Teil des Cache-Keys, damit gleich große Lochwände sich
 * EINE Textur teilen statt je eine Kopie zu halten.
 */
export function pegboardAlphaTexture(
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const key = `pegAlpha:${repeatX}x${repeatY}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  // Raster 8×8 Löcher pro Kachel
  const stepPx = size / 8;
  for (let ix = 0; ix < 8; ix++) {
    for (let iy = 0; iy < 8; iy++) {
      ctx.beginPath();
      ctx.arc(ix * stepPx + stepPx / 2, iy * stepPx + stepPx / 2, stepPx * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  // Alphamap braucht KEIN sRGB (lineare Daten)
  cache.set(key, tex);
  return tex;
}
