import { fetchHistory, type EditionSummary } from '../lib/api';
import { heatScale } from '../lib/colorScale';
import { compareCs, escapeHtml, formatPercent, plural } from '../lib/format';
import { site } from '../config';

interface YearResult {
  placement: number;
  teamCount: number;
  partner: string;
  success: number | null;
}

interface Row {
  id: number;
  name: string;
  participations: number;
  success: number | null;
  years: Map<number, YearResult>;
}

type SortKey = 'name' | 'participations' | 'success' | number; // number = ročník
interface SortState {
  key: SortKey;
  dir: 1 | -1;
}

const DEFAULT_DIR: Record<string, 1 | -1> = { name: 1, participations: -1, success: -1, year: 1 };

export async function initHistory(root: HTMLElement) {
  root.innerHTML = `
    <div class="container">
      <h2>${escapeHtml(site.history.heading)}</h2>
      <p class="lead">${escapeHtml(site.history.intro)}</p>
      <div class="history-body"><p class="muted">Načítám výsledky…</p></div>
    </div>`;
  const body = root.querySelector<HTMLElement>('.history-body')!;

  let data: Awaited<ReturnType<typeof fetchHistory>>;
  try {
    data = await fetchHistory();
  } catch (err) {
    console.error(err);
    body.innerHTML = `<p class="notice notice-error">Výsledky se nepodařilo načíst.</p>`;
    return;
  }

  const editions = data.editions.filter((e) => e.has_results).sort((a, b) => a.year - b.year);
  const rows = buildRows(data);
  if (rows.length === 0) {
    body.innerHTML = `<p class="muted">Zatím žádné výsledky.</p>`;
    return;
  }

  const partColor = heatScale(rows.map((r) => r.participations), '#88C9FF');
  const succColor = heatScale(
    rows.flatMap((r) => (r.success === null ? [] : [r.success])),
    '#80D888',
  );

  let sort: SortState = { key: 'name', dir: 1 };

  body.innerHTML = `
    <div class="history-scroll" tabindex="0" role="region" aria-label="Historická tabulka">
      <table class="history-table">
        <thead><tr>${headerCells(editions)}</tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="history-note muted">
      Úspěšnost v ročníku = 1 − (umístění − 1) / (počet týmů − 1), tedy 1. místo 100 %, poslední 0 %.
      Průměrná úspěšnost je průměr přes ročníky, kterých se hráč účastnil.
    </p>`;

  const table = body.querySelector<HTMLTableElement>('table')!;
  const tbody = table.tBodies[0];
  const scroller = body.querySelector<HTMLElement>('.history-scroll')!;

  const render = () => {
    const sorted = [...rows].sort(comparator(sort));
    tbody.innerHTML = sorted.map((r) => rowHtml(r, editions, partColor, succColor)).join('');
    table.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
      const key = parseKey(th.dataset.sort!);
      th.setAttribute('aria-sort', key === sort.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
  };

  table.tHead!.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
    if (!th) return;
    const key = parseKey(th.dataset.sort!);
    sort =
      key === sort.key
        ? { key, dir: sort.dir === 1 ? -1 : 1 }
        : { key, dir: DEFAULT_DIR[typeof key === 'number' ? 'year' : key] };
    popover.hide();
    render();
  });

  const popover = createPopover(scroller);
  render();
}

function buildRows(data: Awaited<ReturnType<typeof fetchHistory>>): Row[] {
  const byId = new Map<number, Row>();
  for (const s of data.stats) {
    if (s.participations === 0) continue;
    byId.set(s.player_id, {
      id: s.player_id,
      name: s.full_name,
      participations: s.participations,
      success: s.avg_success,
      years: new Map(),
    });
  }
  for (const r of data.results) {
    if (r.placement === null) continue;
    byId.get(r.player_id)?.years.set(r.year, {
      placement: r.placement,
      teamCount: r.team_count,
      partner: r.partner_name,
      success: r.success,
    });
  }
  return [...byId.values()];
}

const parseKey = (s: string): SortKey => (/^\d+$/.test(s) ? Number(s) : (s as SortKey));

function comparator({ key, dir }: SortState) {
  const byName = (a: Row, b: Row) => compareCs(a.name, b.name);
  if (key === 'name') return (a: Row, b: Row) => dir * byName(a, b);

  const value = (r: Row): number | null =>
    key === 'participations'
      ? r.participations
      : key === 'success'
        ? r.success
        : (r.years.get(key)?.placement ?? null);

  // Prázdné hodnoty vždy na konec, shoda → abecedně.
  return (a: Row, b: Row) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return dir * (va - vb) || byName(a, b);
  };
}

function headerCells(editions: EditionSummary[]) {
  const th = (key: string, label: string, cls = '') =>
    `<th scope="col" data-sort="${key}" class="${cls}"><button type="button">${label}<span class="sort-icon" aria-hidden="true"></span></button></th>`;
  return [
    th('name', 'Jméno', 'col-name'),
    th('participations', 'Účasti', 'col-num'),
    th('success', 'Úspěšnost', 'col-num'),
    ...editions.map((e) =>
      th(
        String(e.year),
        `<span class="year">${e.year}</span><span class="teams">${e.team_count} ${plural(e.team_count, 'tým', 'týmy', 'týmů')}</span>`,
        'col-year',
      ),
    ),
  ].join('');
}

function rowHtml(
  r: Row,
  editions: EditionSummary[],
  partColor: (v: number) => string,
  succColor: (v: number) => string,
) {
  const cells = editions.map((e) => {
    const y = r.years.get(e.year);
    if (!y) return `<td class="col-year empty"><span class="sr-only">neúčast</span></td>`;
    const medal = y.placement <= 3 ? ` medal medal-${y.placement}` : '';
    const detail = `${y.placement}. místo z ${y.teamCount}, pár: ${r.name} a ${y.partner}`;
    return `<td class="col-year"><button type="button" class="place${medal}"
        data-title="${escapeHtml(`${e.year}: ${y.placement}. místo z ${y.teamCount}`)}"
        data-pair="${escapeHtml(`${r.name} + ${y.partner}`)}"
        data-success="${y.success === null ? '' : formatPercent(y.success)}"
        aria-label="${escapeHtml(`${e.year}: ${detail}`)}">${y.placement}.</button></td>`;
  });
  return `<tr>
    <th scope="row" class="col-name">${escapeHtml(r.name)}</th>
    <td class="col-num heat" style="--heat:${partColor(r.participations)}">${r.participations}</td>
    <td class="col-num heat" style="${r.success === null ? '' : `--heat:${succColor(r.success)}`}">${
      r.success === null ? '–' : formatPercent(r.success)
    }</td>
    ${cells.join('')}
  </tr>`;
}

/** Bublina s detailem umístění: hover na desktopu, klepnutí na mobilu, fokus z klávesnice. */
function createPopover(scroller: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'place-popover';
  el.setAttribute('role', 'tooltip');
  el.id = 'place-popover';
  el.hidden = true;
  document.body.append(el);

  let anchor: HTMLElement | null = null;
  let pinned = false;

  const show = (btn: HTMLElement, pin: boolean) => {
    anchor?.removeAttribute('aria-describedby');
    anchor = btn;
    pinned = pin;
    const { title = '', pair = '', success = '' } = btn.dataset;
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>
      <span>Pár: ${escapeHtml(pair)}</span>
      ${success ? `<span class="muted">úspěšnost ${escapeHtml(success)}</span>` : ''}`;
    el.hidden = false;
    btn.setAttribute('aria-describedby', el.id);
    position();
  };

  const hide = () => {
    el.hidden = true;
    anchor?.removeAttribute('aria-describedby');
    anchor = null;
    pinned = false;
  };

  const position = () => {
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    const p = el.getBoundingClientRect();
    const margin = 8;
    let top = a.top - p.height - margin;
    if (top < margin) top = a.bottom + margin;
    let left = a.left + a.width / 2 - p.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  };

  const placeFrom = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.<HTMLElement>('.place') ?? null;

  scroller.addEventListener('pointerover', (e) => {
    const btn = placeFrom(e.target);
    if (e.pointerType === 'mouse' && btn && !pinned) show(btn, false);
  });
  scroller.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && !pinned && placeFrom(e.target) && !placeFrom(e.relatedTarget)) hide();
  });
  scroller.addEventListener('click', (e) => {
    const btn = placeFrom(e.target);
    if (!btn) return;
    if (anchor === btn && pinned) hide();
    else show(btn, true);
  });
  scroller.addEventListener('focusin', (e) => {
    const btn = placeFrom(e.target);
    if (btn && !pinned) show(btn, false);
  });
  scroller.addEventListener('focusout', (e) => {
    if (!pinned && !placeFrom(e.relatedTarget)) hide();
  });
  document.addEventListener('click', (e) => {
    if (anchor && !placeFrom(e.target)) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  scroller.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('scroll', position, { passive: true });
  window.addEventListener('resize', hide);

  return { hide };
}
