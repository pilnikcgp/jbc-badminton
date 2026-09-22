import { escapeHtml } from '../lib/format';
import { site } from '../config';

interface Photo {
  thumb: string;
  thumbWidth: number;
  thumbHeight: number;
  full: string;
  width: number;
  height: number;
  alt: string;
}

export async function initGallery(root: HTMLElement) {
  let photos: Photo[] = [];
  try {
    const res = await fetch('/gallery/manifest.json');
    if (res.ok) photos = await res.json();
  } catch {
    /* bez manifestu se sekce nezobrazí */
  }
  if (photos.length === 0) {
    root.hidden = true;
    return;
  }

  const altOf = (p: Photo, i: number) => p.alt || `Fotka z turnaje ${i + 1} z ${photos.length}`;

  root.innerHTML = `
    <div class="container">
      <h2>${escapeHtml(site.gallery.heading)}</h2>
      <ul class="gallery-grid">
        ${photos
          .map(
            (p, i) => `<li><button type="button" class="gallery-item" data-index="${i}" aria-label="Zvětšit: ${escapeHtml(altOf(p, i))}">
              <img src="${p.thumb}" width="${p.thumbWidth}" height="${p.thumbHeight}" alt="${escapeHtml(altOf(p, i))}" loading="lazy" decoding="async" />
            </button></li>`,
          )
          .join('')}
      </ul>
    </div>`;

  const lightbox = createLightbox(photos, altOf);
  root.querySelector('.gallery-grid')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.gallery-item');
    if (btn) lightbox.open(Number(btn.dataset.index), btn);
  });
}

function createLightbox(photos: Photo[], altOf: (p: Photo, i: number) => string) {
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Prohlížení fotek');
  dlg.innerHTML = `
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt="" />
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button type="button" class="lb-btn lb-prev" aria-label="Předchozí fotka">‹</button>
    <button type="button" class="lb-btn lb-next" aria-label="Další fotka">›</button>
    <button type="button" class="lb-btn lb-close" aria-label="Zavřít">×</button>`;
  document.body.append(dlg);

  const img = dlg.querySelector<HTMLImageElement>('.lightbox-img')!;
  const caption = dlg.querySelector<HTMLElement>('.lightbox-caption')!;
  let index = 0;
  let opener: HTMLElement | null = null;

  const preload = (i: number) => {
    const p = photos[(i + photos.length) % photos.length];
    new Image().src = p.full;
  };

  const show = (i: number) => {
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    img.src = p.full;
    img.width = p.width;
    img.height = p.height;
    img.alt = altOf(p, index);
    caption.textContent = `${p.alt ? `${p.alt} · ` : ''}${index + 1} / ${photos.length}`;
    preload(index + 1);
    preload(index - 1);
  };

  const open = (i: number, from: HTMLElement) => {
    opener = from;
    show(i);
    dlg.showModal();
    document.documentElement.classList.add('no-scroll');
  };

  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('no-scroll');
    img.removeAttribute('src');
    opener?.focus();
  });

  dlg.querySelector('.lb-prev')!.addEventListener('click', () => show(index - 1));
  dlg.querySelector('.lb-next')!.addEventListener('click', () => show(index + 1));
  dlg.querySelector('.lb-close')!.addEventListener('click', () => dlg.close());
  // Klik na tmavé pozadí mimo fotku zavře.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target === dlg.querySelector('.lightbox-figure')) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  // Swipe na mobilu.
  let startX = 0;
  let startY = 0;
  let tracking = false;
  dlg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  dlg.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    else if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) dlg.close(); // tah dolů zavře
  });
  dlg.addEventListener('pointercancel', () => (tracking = false));

  return { open };
}
