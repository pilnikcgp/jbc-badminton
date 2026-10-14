import { escapeHtml } from '../lib/format';
import { site } from '../config';

/**
 * Časté otázky jako akordeon z nativních <details>/<summary>: prohlížeč sám
 * zajistí ovládání klávesnicí (Tab, Enter/mezerník) a čtečkám oznamuje stav
 * rozbaleno/sbaleno, takže aria-expanded se ručně nepřidává.
 */
export function initFaq(root: HTMLElement) {
  const { heading, items } = site.faq;
  root.innerHTML = `
    <div class="container">
      <h2>${escapeHtml(heading)}</h2>
      <div class="faq-list">
        ${items
          .map(
            (item) => `
          <details class="faq-item">
            <summary><span class="faq-q">${escapeHtml(item.question)}</span><span class="faq-icon" aria-hidden="true"></span></summary>
            <div class="faq-a">${item.answer.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div>
          </details>`,
          )
          .join('')}
      </div>
    </div>`;
}
