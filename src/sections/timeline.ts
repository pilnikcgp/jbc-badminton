import { escapeHtml } from '../lib/format';
import { site } from '../config';

/**
 * Perex a pod ním vodorovná časová osa (na úzkém mobilu svislá). Aktuální
 * krok i detaily kroků se nastavují v src/config.ts (timeline).
 */
export function initTimeline(root: HTMLElement) {
  const { steps, current, heading, intro, currentBadge } = site.timeline;
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
          ${step.detail ? `<span class="tl-detail">${escapeHtml(step.detail)}</span>` : ''}
          ${state === 'current' ? currentAction(step) : ''}
          <span class="sr-only">(${stateText})</span>
        </span>
      </li>`;
  });

  function currentAction(step: (typeof steps)[number]) {
    if (step.cta) {
      return `<a class="btn btn-sm" href="${escapeHtml(step.cta.href)}">${escapeHtml(step.cta.label)}</a>`;
    }
    return `<span class="tl-badge">${escapeHtml(currentBadge)}</span>`;
  }

  root.innerHTML = `
    <div class="container">
      <h2 class="sr-only">${escapeHtml(heading)}</h2>
      <p class="lead timeline-intro">${escapeHtml(intro)}</p>
      <ol class="timeline">${items.join('')}</ol>
    </div>`;
}
