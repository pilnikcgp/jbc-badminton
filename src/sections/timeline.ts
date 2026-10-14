import { escapeHtml } from '../lib/format';
import { site } from '../config';

/**
 * Vodorovná časová osa (na úzkém mobilu svislá). Aktuální krok se nastavuje
 * v src/config.ts (timeline.current).
 */
export function initTimeline(root: HTMLElement) {
  const { steps, current, heading, currentBadge } = site.timeline;
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  );

  const items = steps.map((step, i) => {
    const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
    const stateText = { done: 'hotovo', current: 'probíhá', upcoming: 'připravujeme' }[state];
    return `
      <li class="tl-step is-${state}"${state === 'current' ? ' aria-current="step"' : ''}>
        <span class="tl-marker" aria-hidden="true">${state === 'done' ? '✓' : i + 1}</span>
        <span class="tl-text">
          <span class="tl-label">${escapeHtml(step.label)}</span>
          ${'note' in step && step.note ? `<span class="tl-note">${escapeHtml(step.note)}</span>` : ''}
          ${state === 'current' ? `<span class="tl-badge">${escapeHtml(currentBadge)}</span>` : ''}
          <span class="sr-only">(${stateText})</span>
        </span>
      </li>`;
  });

  root.innerHTML = `
    <div class="container">
      <h2 class="sr-only">${escapeHtml(heading)}</h2>
      <ol class="timeline">${items.join('')}</ol>
    </div>`;
}
