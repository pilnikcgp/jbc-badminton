import { fetchDatePoll, voteDates, type DateAnswer, type DatePollOption, type VoteResult } from '../lib/api';
import { escapeHtml } from '../lib/format';
import { site } from '../config';

const t = site.datePoll;
const ANSWERS: DateAnswer[] = ['yes', 'maybe', 'no'];

const optionFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('cs-CZ', { timeZone: 'Europe/Prague', hour: 'numeric', minute: '2-digit' });
const deadlineFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** „pá 22. 1. od 16:00“ (všechny termíny jsou v jednom roce) */
const optionLabel = (iso: string) => {
  const d = new Date(iso);
  return `${optionFmt.format(d)} od ${timeFmt.format(d)}`;
};

/** Poslední den hlasování: uzávěrka je okamžik (půlnoc), ukazujeme den před ní. */
const lastDay = (closesAt: string) => deadlineFmt.format(new Date(Date.parse(closesAt) - 1));

/**
 * Anketa o termínu. Sekce je skrytá, dokud databáze anketu nemá nebo hlasování
 * nezačalo; během hlasování formulář a průběžné součty, po uzávěrce jen výsledky.
 * Kdo jak hlasoval, se nezobrazuje (pohled date_poll_results dává jen součty).
 */
export async function initDatePoll(root: HTMLElement) {
  root.hidden = true;
  let options: DatePollOption[] | null;
  try {
    options = await fetchDatePoll();
  } catch (err) {
    console.error('Anketu o termínu se nepodařilo načíst', err);
    return;
  }
  if (!options?.length) return;

  const { opens_at: opensAt, closes_at: closesAt } = options[0];
  const now = Date.now();
  if (!opensAt || now < Date.parse(opensAt)) return;
  const open = !closesAt || now < Date.parse(closesAt);

  root.hidden = false;
  root.innerHTML = `
    <div class="container date-poll-grid">
      <div>
        <h2>${escapeHtml(t.heading)}</h2>
        ${
          open
            ? `<p class="lead">${escapeHtml(t.intro)}${closesAt ? ` ${escapeHtml(t.deadline.replace('{date}', lastDay(closesAt)))}` : ''}</p>
               ${formHtml(options)}`
            : `<p class="notice notice-info">${escapeHtml(t.closed)}</p>`
        }
      </div>
      <div class="date-results-wrap">
        <h3>${escapeHtml(open ? t.resultsHeading : t.resultsHeadingClosed)}</h3>
        <div class="date-results"></div>
      </div>
    </div>`;

  const resultsEl = root.querySelector<HTMLElement>('.date-results')!;
  renderResults(resultsEl, options, open);

  const form = root.querySelector<HTMLFormElement>('form');
  if (form) {
    bindForm(form, options, async () => {
      try {
        const fresh = await fetchDatePoll();
        if (fresh) renderResults(resultsEl, fresh, true);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

function formHtml(options: DatePollOption[]) {
  const rows = options.map((o) => {
    const name = `d${o.option_id}`;
    const label = optionLabel(o.starts_at);
    return `
      <fieldset class="date-option">
        <legend>${escapeHtml(label)}</legend>
        <div class="segmented segmented-3">
          ${ANSWERS.map(
            (a, i) =>
              `<label class="answer-${a}"><input type="radio" name="${name}" value="${a}"${i === 0 ? ' required' : ''} /><span>${escapeHtml(t.answers[a])}</span></label>`,
          ).join('')}
        </div>
      </fieldset>`;
  });
  return `
    <form class="date-poll-form" novalidate>
      <div class="field">
        <label for="vote-email">${escapeHtml(t.emailLabel)}</label>
        <input id="vote-email" name="email" type="email" required maxlength="254" autocomplete="email" />
      </div>
      <div class="date-options">${rows.join('')}</div>
      <!-- Honeypot: lidé ho nevidí, boti ho vyplní. -->
      <div class="hp" aria-hidden="true">
        <label for="vote-website">Web</label>
        <input id="vote-website" name="website" type="text" tabindex="-1" autocomplete="off" />
      </div>
      <p class="form-message" role="status" hidden></p>
      <button type="submit" class="btn btn-primary">${escapeHtml(t.submit)}</button>
    </form>`;
}

function bindForm(form: HTMLFormElement, options: DatePollOption[], onSuccess: () => Promise<void>) {
  const message = form.querySelector<HTMLElement>('.form-message')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const show = (text: string, kind: 'ok' | 'error') => {
    message.textContent = text;
    message.className = `form-message notice notice-${kind}`;
    message.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.hidden = true;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      show(t.invalid, 'error');
      form.querySelector<HTMLElement>(':invalid')?.focus();
      return;
    }

    const data = new FormData(form);
    const votes: Record<number, DateAnswer> = {};
    for (const o of options) votes[o.option_id] = data.get(`d${o.option_id}`) as DateAnswer;

    button.disabled = true;
    button.textContent = t.sending;
    let result: VoteResult | 'error';
    try {
      result = await voteDates({
        email: String(data.get('email') ?? ''),
        votes,
        website: String(data.get('website') ?? ''),
      });
    } catch (err) {
      console.error(err);
      result = 'error';
    } finally {
      button.disabled = false;
      button.textContent = t.submit;
    }

    switch (result) {
      case 'ok':
        form.classList.remove('was-validated');
        show(t.success, 'ok');
        await onSuccess();
        break;
      case 'not_registered':
        show(t.notRegistered, 'error');
        form.querySelector<HTMLInputElement>('#vote-email')?.focus();
        break;
      case 'invalid':
        show(t.invalid, 'error');
        break;
      case 'poll_closed':
        show(t.pollClosed, 'error');
        button.disabled = true;
        break;
      default:
        show(t.error, 'error');
    }
  });
}

/** Termíny chronologicky, u každého skládaný pruh můžu + v nouzi; vedoucí termín zvlášť. */
function renderResults(el: HTMLElement, options: DatePollOption[], open: boolean) {
  const voters = options[0]?.voters ?? 0;
  if (!voters) {
    el.innerHTML = `<p class="muted">${escapeHtml(t.resultsEmpty)}</p>`;
    return;
  }
  const best = [...options].sort((a, b) => b.yes - a.yes || b.maybe - a.maybe)[0];
  const pct = (v: number) => (v / voters) * 100;

  const rows = options.map((o) => {
    const isBest = o === best;
    return `
      <li class="date-result${isBest ? ' is-best' : ''}">
        <div class="poll-meta">
          <span class="poll-label">${escapeHtml(optionLabel(o.starts_at))}</span>
          <span class="poll-value">${o.yes} ${escapeHtml(t.answers.yes.toLowerCase())} · ${o.maybe} ${escapeHtml(t.answers.maybe.toLowerCase())}</span>
        </div>
        <div class="poll-track date-track" aria-hidden="true">
          <i class="yes" style="width: ${pct(o.yes)}%"></i><i class="maybe" style="width: ${pct(o.maybe)}%"></i>
        </div>
      </li>`;
  });

  el.innerHTML = `
    <p class="poll-total">Počet hlasujících: <strong>${voters}</strong>.
      ${escapeHtml(open ? t.leader : t.leaderClosed)}: <strong>${escapeHtml(optionLabel(best.starts_at))}</strong>.</p>
    <ul class="poll-list date-results-list">${rows.join('')}</ul>
    <p class="date-legend muted"><i class="yes"></i> ${escapeHtml(t.answers.yes)} <i class="maybe"></i> ${escapeHtml(t.answers.maybe)}</p>`;
}
