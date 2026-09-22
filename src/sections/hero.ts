import type { Edition } from '../lib/api';
import { escapeHtml, formatDate } from '../lib/format';
import { site } from '../config';

export const editionDate = (e: Edition | null) => (e?.date ? formatDate(e.date) : site.dateUnknown);
export const editionVenue = (e: Edition | null) => e?.venue ?? site.venueUnknown;

/**
 * Hero s pixelovou maskou podle identity JIC: mřížka má 5 čtverců na kratší
 * stranu, čtverce v barvách palety překrývají okraje fotky a text leží na
 * ploše složené z pixelů (.hero-plate), nikdy přímo na fotce.
 */
export function initHero(root: HTMLElement, edition: Edition | null) {
  const line2 = site.hero.nameLine2.replace('{year}', edition ? String(edition.year) : '').trim();
  root.innerHTML = `
    <img class="hero-image" src="${escapeHtml(site.hero.image)}" alt="${escapeHtml(site.hero.imageAlt)}"
         fetchpriority="high" decoding="async" />
    <div class="hero-pixels" aria-hidden="true">
      <i class="px px-top-right"></i>
      <i class="px px-top-right-2"></i>
    </div>
    <div class="hero-plate">
      <i class="px px-step-1" aria-hidden="true"></i>
      <i class="px px-step-2" aria-hidden="true"></i>
      <i class="px px-side" aria-hidden="true"></i>
      <div class="hero-content">
        <p class="hero-kicker">${escapeHtml(site.tagline)}</p>
        <h1>
          <span class="hero-name">${escapeHtml(site.name)}</span>
          ${line2 ? `<span class="hero-name-2">${escapeHtml(line2)}</span>` : ''}
        </h1>
        <p class="hero-date">${escapeHtml(editionDate(edition))}</p>
        <a class="btn" href="#registrace">${escapeHtml(site.hero.cta)}</a>
      </div>
    </div>`;

  // Když fotka chybí, zůstane pastelové pozadí sekce.
  root.querySelector<HTMLImageElement>('.hero-image')!.addEventListener('error', (e) => {
    (e.target as HTMLElement).remove();
  });

  snapPlateToGrid(root);
}

/** Výšku textové plochy zaokrouhlí nahoru na celý počet čtverců mřížky. */
function snapPlateToGrid(root: HTMLElement) {
  const plate = root.querySelector<HTMLElement>('.hero-plate')!;
  const content = plate.querySelector<HTMLElement>('.hero-content')!;
  const probe = plate.querySelector<HTMLElement>('.px-step-1')!;

  const snap = () => {
    const px = probe.getBoundingClientRect().width;
    if (!px) return;
    const rows = Math.max(1, Math.ceil(content.offsetHeight / px - 0.001));
    plate.style.height = `${rows * px}px`;
  };

  new ResizeObserver(snap).observe(content);
  window.addEventListener('resize', snap);
  document.fonts?.ready.then(snap);
  snap();
}

export function initAbout(root: HTMLElement, edition: Edition | null) {
  const facts = [
    { label: 'Formát', value: site.about.format },
    { label: 'Termín', value: editionDate(edition) },
    { label: 'Místo', value: editionVenue(edition) },
  ];
  root.innerHTML = `
    <div class="container about-grid">
      <div>
        <h2>${escapeHtml(site.about.heading)}</h2>
        ${site.about.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <dl class="facts">
        ${facts
          .map((f) => `<div class="fact"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`)
          .join('')}
      </dl>
    </div>`;
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
