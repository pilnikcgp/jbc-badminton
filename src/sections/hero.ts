import type { Edition } from '../lib/api';
import { escapeHtml } from '../lib/format';
import { site } from '../config';

/**
 * Hero s pixelovou maskou podle identity JIC: mřížka má 5 čtverců na kratší
 * stranu hero, text leží na ploše složené z pixelů (.hero-plate) vedle fotky
 * (desktop) nebo pod ní (mobil), nikdy přímo na fotce. Čtverce přes fotku jen
 * v rozích s prázdnou zdí či podlahou, aby nezakrývaly obličeje.
 */
export function initHero(root: HTMLElement, edition: Edition | null) {
  const rest = site.hero.titleRest.replace('{year}', edition ? String(edition.year) : '').trim();
  root.innerHTML = `
    <div class="hero-photo">
      <img class="hero-image" src="${escapeHtml(site.hero.image)}" alt="${escapeHtml(site.hero.imageAlt)}"
           fetchpriority="high" decoding="async" />
    </div>
    <div class="hero-mosaic" aria-hidden="true"></div>
    <i class="px px-photo-tr" aria-hidden="true"></i>
    <i class="px px-photo-tl" aria-hidden="true"></i>
    <div class="hero-plate">
      <i class="px px-step-1" aria-hidden="true"></i>
      <i class="px px-step-2" aria-hidden="true"></i>
      <div class="hero-content">
        <h1>
          <span class="hero-name">${escapeHtml(site.hero.titleKeyword)}</span>
          <span class="hero-name-2">${escapeHtml(rest)}</span>
        </h1>
      </div>
    </div>`;

  // Když fotka chybí, zůstane pastelové pozadí sekce.
  root.querySelector<HTMLImageElement>('.hero-image')!.addEventListener('error', (e) => {
    (e.target as HTMLElement).remove();
  });

  trackPageWidth(root);
  snapPlateToGrid(root);
}

/**
 * Šířka stránky bez posuvníku do --page-w, aby levý okraj textu v hero seděl
 * přesně s .container ostatních sekcí (100vw na Windows zahrnuje posuvník).
 */
function trackPageWidth(root: HTMLElement) {
  const update = () => root.style.setProperty('--page-w', `${root.clientWidth}px`);
  new ResizeObserver(update).observe(root);
  update();
}

/** Výšku textové plochy zaokrouhlí nahoru na celý počet čtverců mřížky. */
function snapPlateToGrid(root: HTMLElement) {
  const plate = root.querySelector<HTMLElement>('.hero-plate')!;
  const content = plate.querySelector<HTMLElement>('.hero-content')!;
  const probe = plate.querySelector<HTMLElement>('.px-step-1')!;

  const mosaic = root.querySelector<HTMLElement>('.hero-mosaic')!;

  const snap = () => {
    const px = probe.getBoundingClientRect().width;
    if (!px) return;
    const rows = Math.max(1, Math.ceil(content.offsetHeight / px - 0.001));
    plate.style.height = `${rows * px}px`;
    drawMosaic(mosaic, {
      px,
      rowsAbove: Math.round(root.clientHeight / px) - rows,
      plateRows: rows,
      width: plate.offsetWidth,
      textLeft: content.querySelector('h1')!.getBoundingClientRect().left - root.getBoundingClientRect().left,
    });
  };

  new ResizeObserver(snap).observe(content);
  window.addEventListener('resize', snap);
  document.fonts?.ready.then(snap);
  snap();
}

// Barvy dlaždic mozaiky. Bílá dělá „díry“ a dává rytmus.
const MOSAIC_COLORS = ['--jic-pink', '--jic-green', '--jic-coral', '--jic-blue', '--jic-yellow', '--white'];

/**
 * Pixelová mozaika v levém sloupci (jen desktop): vyplní jinak prázdnou plochu
 * nad plochou s názvem a sloupce modré plochy, které leží celé vlevo od textu
 * (na širokých obrazovkách začíná text až u okraje obsahu sekcí). Pod text ani
 * vedle něj nezasahuje. Rozložení je pevné (deterministický generátor).
 */
function drawMosaic(
  el: HTMLElement,
  o: { px: number; rowsAbove: number; plateRows: number; width: number; textLeft: number },
) {
  const { px, rowsAbove, plateRows } = o;
  const cols = Math.ceil(o.width / px - 0.001);
  // sloupce plochy s názvem, které končí aspoň 16 px před textem
  const freeCols = Math.max(0, Math.floor((o.textLeft - 16) / px));
  if (cols <= 0 || getComputedStyle(el).display === 'none') {
    el.innerHTML = '';
    return;
  }
  el.style.height = `${Math.max(0, rowsAbove) * px}px`; // žluté pozadí jen nad plochou

  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid: (string | null)[][] = [];
  const cells: string[] = [];
  const put = (r: number, c: number, color: string) =>
    cells.push(`<i style="left:${c * px}px;top:${r * px}px;width:${px}px;height:${px}px;background:var(${color})"></i>`);

  for (let r = 0; r < rowsAbove + plateRows; r++) {
    grid.push([]);
    const inPlate = r >= rowsAbove;
    for (let c = 0; c < cols; c++) {
      let color: string | null = null;
      if (inPlate && c >= freeCols) {
        color = null; // tady je text, nic nekreslíme
      } else if (r === rowsAbove - 1 && c === 0 && freeCols === 0) {
        color = '--jic-blue'; // schod z plochy s názvem
      } else if ((inPlate && (r + c) % 2 === 0) || rand() < (inPlate ? 0.5 : 0.7)) {
        // ve volných sloupcích plochy šachovnice + náhodné doplňky, ať tam
        // vždy něco je
        // sousední dlaždice nemají stejnou barvu a nesplývají s pozadím
        // (nad plochou je žluté, plocha s názvem je modrá)
        const taken = [grid[r - 1]?.[c], grid[r][c - 1], inPlate ? '--jic-blue' : '--jic-yellow'];
        const options = MOSAIC_COLORS.filter((x) => !taken.includes(x));
        color = options[Math.floor(rand() * options.length)];
      }
      grid[r].push(color);
      if (color) put(r, c, color);
    }
  }
  el.innerHTML = cells.join('');
}

export function initFooter(root: HTMLElement) {
  const f = site.footer;
  const mark = f.logo
    ? `<img src="${escapeHtml(f.logo)}" alt="${escapeHtml(f.logoAlt)}" class="footer-logo" />`
    : `<span class="footer-logo-text">${escapeHtml(f.logoAlt)}</span>`;
  root.innerHTML = `
    <div class="container footer-inner">
      <span>${escapeHtml(f.organizer)}</span>
      <a class="footer-brand" href="${escapeHtml(f.url)}" rel="noopener">${mark}<span class="sr-only"> – jic.cz</span></a>
    </div>`;
}
