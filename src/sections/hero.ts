import type { Edition } from '../lib/api';
import { escapeHtml, formatDate } from '../lib/format';
import { site } from '../config';

export const editionDate = (e: Edition | null) => (e?.date ? formatDate(e.date) : site.dateUnknown);
export const editionVenue = (e: Edition | null) => e?.venue ?? site.venueUnknown;

export function initHero(root: HTMLElement, edition: Edition | null) {
  const title = edition?.title ?? site.name;
  root.innerHTML = `
    <img class="hero-image" src="${escapeHtml(site.hero.image)}" alt="${escapeHtml(site.hero.imageAlt)}"
         fetchpriority="high" decoding="async" />
    <div class="hero-overlay"></div>
    <div class="container hero-content">
      <p class="hero-kicker">${escapeHtml(site.tagline)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="hero-date">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm12 8H5v9h14v-9Z"/></svg>
        <span>${escapeHtml(editionDate(edition))}</span>
      </p>
      <a class="btn btn-accent btn-lg" href="#registrace">${escapeHtml(site.hero.cta)}</a>
    </div>`;

  // Když fotka chybí, zůstane barevné pozadí sekce.
  root.querySelector<HTMLImageElement>('.hero-image')!.addEventListener('error', (e) => {
    (e.target as HTMLElement).remove();
  });
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
