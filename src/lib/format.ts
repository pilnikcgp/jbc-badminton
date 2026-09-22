const collator = new Intl.Collator('cs', { sensitivity: 'base' });
export const compareCs = (a: string, b: string) => collator.compare(a, b);

const percentFmt = new Intl.NumberFormat('cs-CZ', { style: 'percent', maximumFractionDigits: 0 });
export const formatPercent = (v: number) => percentFmt.format(v);

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
export const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T12:00:00`));

/** Český tvar podle čísla: plural(5, 'tým', 'týmy', 'týmů') → 'týmů'. */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
