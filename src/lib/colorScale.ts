// Tříbarevná škála stejná jako podmíněné formátování v Excelu:
// minimum → červená, medián (50. percentil) → žlutá, maximum → zelená,
// lineární interpolace v RGB.

type RGB = [number, number, number];

const LOW: RGB = [0xf8, 0x69, 0x6b];
const MID: RGB = [0xff, 0xeb, 0x84];
const HIGH: RGB = [0x63, 0xbe, 0x7b];

/** Percentil jako Excel PERCENTILE.INC. */
function percentile(sorted: number[], p: number) {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const mix = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

/** Vrátí funkci hodnota → CSS barva pro danou sadu hodnot. */
export function colorScale(values: number[]): (v: number) => string {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return () => 'transparent';
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = percentile(sorted, 0.5);
  return (v) => {
    let c: RGB;
    if (max === min) c = MID;
    else if (v <= mid) c = mid === min ? MID : mix(LOW, MID, (v - min) / (mid - min));
    else c = max === mid ? MID : mix(MID, HIGH, (v - mid) / (max - mid));
    return `rgb(${c[0]} ${c[1]} ${c[2]})`;
  };
}
