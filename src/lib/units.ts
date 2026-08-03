import type { LengthUnit } from '../types';

// Interne Einheit ist immer Meter — hier nur Anzeige/Eingabe-Konvertierung.
export const UNIT_FACTOR: Record<LengthUnit, number> = {
  mm: 1000,
  cm: 100,
  m: 1,
};

export const UNIT_LABEL: Record<LengthUnit, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
};

// Anzahl Nachkommastellen pro Einheit (Eingabefelder & Labels)
export const UNIT_DECIMALS: Record<LengthUnit, number> = {
  mm: 0,
  cm: 1,
  m: 2,
};

export const toUnit = (meters: number, unit: LengthUnit): number =>
  meters * UNIT_FACTOR[unit];

export const fromUnit = (value: number, unit: LengthUnit): number =>
  value / UNIT_FACTOR[unit];

export const roundUnit = (value: number, unit: LengthUnit): number => {
  const f = 10 ** UNIT_DECIMALS[unit];
  return Math.round(value * f) / f;
};

export function formatLength(meters: number, unit: LengthUnit): string {
  const v = toUnit(meters, unit);
  const d = UNIT_DECIMALS[unit];
  // Ganze Werte ohne Nachkomma-Nullen anzeigen (z.B. "120 cm" statt "120.0 cm")
  const rounded = roundUnit(v, unit);
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(d);
  return `${text} ${UNIT_LABEL[unit]}`;
}
