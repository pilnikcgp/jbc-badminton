import { escapeHtml } from '../lib/format';
import { site } from '../config';

/** Šířka, pod kterou se běžné odkazy schovají do hamburger menu (shodně se styles.css). */
const MOBILE = '(max-width: 819px)';

/**
 * Horní menu připnuté při scrollování. Plynulý posun ke kotvám řeší CSS
 * (scroll-behavior, vypnutý při prefers-reduced-motion), odsazení nadpisů
 * pod menu scroll-padding-top na <html> podle skutečné výšky menu.
 */
export function initNav(root: HTMLElement) {
  const n = site.nav;
  root.innerHTML = `
    <div class="container nav-inner">
      <a class="nav-brand" href="#uvod">${escapeHtml(n.brand)}</a>
      <nav class="nav" aria-label="${escapeHtml(n.label)}">
        <ul class="nav-links" id="nav-links">
          ${n.links
            .map((l) => `<li><a class="nav-link" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`)
            .join('')}
        </ul>
        <a class="btn btn-sm nav-cta" href="${escapeHtml(n.cta.href)}">${escapeHtml(n.cta.label)}</a>
        <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-links"
                aria-label="${escapeHtml(n.menuOpen)}">
          <span aria-hidden="true"></span>
        </button>
      </nav>
    </div>`;

  const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')!;
  const setOpen = (open: boolean) => {
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? n.menuClose : n.menuOpen);
  };

  toggle.addEventListener('click', () => setOpen(!root.classList.contains('nav-open')));
  // po kliknutí na kterýkoli odkaz (i název a tlačítko) se menu zavře
  root.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia(MOBILE).addEventListener('change', () => setOpen(false));

  trackHeight(root);
  highlightCurrent(root);
}

/** Výška menu do --nav-h na <html>, z ní se počítá scroll-padding-top. */
function trackHeight(root: HTMLElement) {
  const update = () => document.documentElement.style.setProperty('--nav-h', `${root.offsetHeight}px`);
  new ResizeObserver(update).observe(root);
  update();
}

/** Zvýrazní položku sekce, ve které je návštěvník (aria-current="location"). */
function highlightCurrent(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLAnchorElement>('.nav-link, .nav-cta')]
    .map((a) => ({ a, section: document.getElementById(a.hash.slice(1)) }))
    .filter((x): x is { a: HTMLAnchorElement; section: HTMLElement } => !!x.section);

  let queued = false;
  const update = () => {
    queued = false;
    // čára těsně pod menu: sekce, přes kterou vede, je aktuální
    const line = root.offsetHeight + 24;
    const current = items.find(({ section }) => {
      const r = section.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    });
    for (const { a } of items) {
      if (a === current?.a) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  // sekce se dočítají asynchronně a mění výšku
  new ResizeObserver(queue).observe(document.body);
  update();
}
