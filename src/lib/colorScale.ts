// Heatmapa podle identity JIC: lineární škála od bílé (minimum) po barvu
// palety (maximum). Tmavší odstíny nepoužíváme, fialový text by na nich
// nebyl čitelný.

type RGB = [number, number, number];

const WHITE: RGB = [0xff, 0xff, 0xff];

const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

/** Vrátí funkci hodnota → CSS barva pro danou sadu hodnot. */
export function heatScale(values: number[], toHex: string): (v: number) => string {
  const to = hexToRgb(toHex);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (v) => {
    const t = max === min ? 1 : (v - min) / (max - min);
    const c = WHITE.map((w, i) => Math.round(w + (to[i] - w) * t));
    return `rgb(${c[0]} ${c[1]} ${c[2]})`;
  };
}
