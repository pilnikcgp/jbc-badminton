import {
  fetchPollResults,
  fetchRegistrations,
  register,
  supportsSkillLevel,
  type Edition,
  type Gender,
  type PollResult,
  type PublicRegistration,
  type RegisterResult,
  type SkillLevel,
  type TournamentFormat,
} from '../lib/api';
import { escapeHtml, plural } from '../lib/format';
import { site } from '../config';

const t = site.registration;

export function initRegistration(root: HTMLElement, edition: Edition | null) {
  const open = edition?.status === 'registration_open';
  const closedText =
    !edition || edition.status === 'planned' ? t.notYetOpen : t.closed;

  root.innerHTML = `
    <div class="container registration-grid">
      <div class="registration-form-wrap">
        <h2>${escapeHtml(t.heading)}</h2>
        ${open ? `<p class="lead">${escapeHtml(t.intro)}</p>${formHtml()}` : `<p class="notice notice-info">${escapeHtml(closedText)}</p>`}
      </div>
      <div class="registration-list-wrap">
        <h3>${escapeHtml(t.listHeading)}</h3>
        <div class="registration-list"><p class="muted">Načítám…</p></div>
        <div class="poll" hidden>
          <h3>${escapeHtml(t.pollHeading)}</h3>
          <div class="poll-body"><p class="muted">Načítám…</p></div>
        </div>
      </div>
    </div>`;

  const listEl = root.querySelector<HTMLElement>('.registration-list')!;
  const pollWrap = root.querySelector<HTMLElement>('.poll')!;
  const pollEl = root.querySelector<HTMLElement>('.poll-body')!;
  const formatField = root.querySelector<HTMLFieldSetElement>('.format-field');
  const levelField = root.querySelector<HTMLFieldSetElement>('.level-field');

  // Anketa se zapne, až když ji databáze má (pohled format_poll_results).
  // Do té doby je otázka skrytá a vypnutá a registrace běží bez formátu,
  // takže web funguje před migrací i po ní.
  let pollAvailable = false;
  const setPollAvailable = (on: boolean) => {
    pollAvailable = on;
    pollWrap.hidden = !on;
    if (formatField) {
      formatField.hidden = !on;
      formatField.disabled = !on;
    }
  };

  const refreshList = async () => {
    try {
      renderList(listEl, await fetchRegistrations());
    } catch (err) {
      console.error(err);
      listEl.innerHTML = `<p class="notice notice-error">Seznam se nepodařilo načíst.</p>`;
    }
  };
  const refreshPoll = async (): Promise<boolean> => {
    try {
      const results = await fetchPollResults();
      setPollAvailable(results !== null);
      if (results) renderPoll(pollEl, results);
    } catch (err) {
      console.error(err);
      setPollAvailable(true);
      pollEl.innerHTML = `<p class="notice notice-error">Výsledek ankety se nepodařilo načíst.</p>`;
    }
    return pollAvailable;
  };
  // Seznam i anketa se načítají a po registraci obnovují spolu.
  const refreshAll = async () => {
    await Promise.all([refreshList(), refreshPoll()]);
  };
  const pollReady = refreshPoll();
  refreshList();

  // Otázka na úroveň se zapne, až když ji databáze zná (stejný princip jako
  // u ankety, jen se zjišťuje zkušebním voláním register() přes honeypot,
  // protože úroveň v žádném veřejném pohledu není).
  let levelAvailable = false;
  const refreshLevel = async (): Promise<boolean> => {
    try {
      levelAvailable = await supportsSkillLevel();
    } catch (err) {
      console.error(err);
      levelAvailable = true; // cílový stav; při výpadku sítě otázku radši ukážeme
    }
    if (levelField) {
      levelField.hidden = !levelAvailable;
      levelField.disabled = !levelAvailable;
    }
    return levelAvailable;
  };

  const form = root.querySelector<HTMLFormElement>('form');
  if (form) {
    bindForm(form, {
      onSuccess: refreshAll,
      pollReady,
      refreshPoll,
      isPollAvailable: () => pollAvailable,
      levelReady: refreshLevel(),
      refreshLevel,
      isLevelAvailable: () => levelAvailable,
    });
  }
}

function formHtml() {
  return `
    <form class="registration-form" novalidate>
      <div class="field">
        <label for="reg-name">Jméno a příjmení</label>
        <input id="reg-name" name="fullName" type="text" autocomplete="name" required minlength="2" maxlength="100" />
      </div>
      <div class="field">
        <label for="reg-email">E-mail</label>
        <input id="reg-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254"
               aria-describedby="reg-email-hint" />
        <small id="reg-email-hint" class="muted">Nezveřejňuje se, slouží jen pro organizační informace.</small>
      </div>
      <fieldset class="field">
        <legend>Hraji jako</legend>
        <div class="segmented">
          <label><input type="radio" name="gender" value="female" required /><span>Hráčka</span></label>
          <label><input type="radio" name="gender" value="male" /><span>Hráč</span></label>
        </div>
      </fieldset>
      <fieldset class="field format-field" hidden disabled>
        <legend>${escapeHtml(t.formatQuestion)}</legend>
        <div class="choices">
          ${t.formats
            .map(
              (f, i) =>
                `<label><input type="radio" name="format" value="${f.value}"${i === 0 ? ' required' : ''} /><span>${escapeHtml(f.label)}</span></label>`,
            )
            .join('')}
        </div>
      </fieldset>
      <fieldset class="field level-field" hidden disabled aria-describedby="reg-level-hint">
        <legend>${escapeHtml(t.levelQuestion)}</legend>
        <div class="choices">
          ${t.levels
            .map(
              (l, i) =>
                `<label><input type="radio" name="level" value="${l.value}"${i === 0 ? ' required' : ''} /><span><span class="choice-text"><span>${escapeHtml(l.label)}</span><small>${escapeHtml(l.hint)}</small></span></span></label>`,
            )
            .join('')}
        </div>
        <small id="reg-level-hint" class="muted">${escapeHtml(t.levelPrivacy)}</small>
      </fieldset>
      <!-- Honeypot: lidé ho nevidí, boti ho vyplní. -->
      <div class="hp" aria-hidden="true">
        <label for="reg-website">Web</label>
        <input id="reg-website" name="website" type="text" tabindex="-1" autocomplete="off" />
      </div>
      <p class="form-message" role="status" hidden></p>
      <button type="submit" class="btn btn-primary">Odeslat přihlášku</button>
    </form>`;
}

interface FormContext {
  onSuccess: () => Promise<void>;
  /** Úvodní zjištění, zda databáze má anketu. */
  pollReady: Promise<boolean>;
  refreshPoll: () => Promise<boolean>;
  isPollAvailable: () => boolean;
  /** Úvodní zjištění, zda databáze zná úroveň. */
  levelReady: Promise<boolean>;
  refreshLevel: () => Promise<boolean>;
  isLevelAvailable: () => boolean;
}

function bindForm(form: HTMLFormElement, ctx: FormContext) {
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
    // otázky na formát a úroveň musí být zapnuté/vypnuté před kontrolou
    await Promise.all([ctx.pollReady, ctx.levelReady]);
    // Formulář bez ankety si před odesláním ověří, zda ji databáze mezitím
    // nedostala (migrace při otevřené stránce). Pokud ano, nejdřív ukáže
    // otázku na formát a registraci zatím neodešle.
    if (!ctx.isPollAvailable() && (await ctx.refreshPoll())) {
      form.classList.add('was-validated');
      show(t.formatNowRequired, 'error');
      form.querySelector<HTMLInputElement>('input[name="format"]')?.focus();
      return;
    }
    // Totéž pro úroveň.
    if (!ctx.isLevelAvailable() && (await ctx.refreshLevel())) {
      form.classList.add('was-validated');
      show(t.levelNowRequired, 'error');
      form.querySelector<HTMLInputElement>('input[name="level"]')?.focus();
      return;
    }
    const withFormat = ctx.isPollAvailable();
    const withLevel = ctx.isLevelAvailable();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      show(t.invalid, 'error');
      form.querySelector<HTMLElement>(':invalid')?.focus();
      return;
    }

    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Odesílám…';

    let result: RegisterResult | 'error';
    try {
      result = await register({
        fullName: String(data.get('fullName') ?? ''),
        email: String(data.get('email') ?? ''),
        gender: data.get('gender') as Gender,
        format: withFormat ? (data.get('format') as TournamentFormat) : null,
        level: withLevel ? (data.get('level') as SkillLevel) : null,
        website: String(data.get('website') ?? ''),
      });
    } catch (err) {
      console.error(err);
      result = 'error';
    } finally {
      button.disabled = false;
      button.textContent = 'Odeslat přihlášku';
    }

    switch (result) {
      case 'ok':
        form.reset();
        form.classList.remove('was-validated');
        show(t.success, 'ok');
        await ctx.onSuccess();
        break;
      case 'duplicate_email':
        show(t.duplicate, 'error');
        form.querySelector<HTMLInputElement>('#reg-email')?.focus();
        break;
      case 'invalid':
        // Formulář bez otázky na formát, ale databáze mezitím dostala anketu
        // (migrace proběhla, zatímco byla stránka otevřená): ukážeme otázku.
        if (!withFormat && (await ctx.refreshPoll())) {
          form.classList.add('was-validated');
          show(t.formatNowRequired, 'error');
          form.querySelector<HTMLInputElement>('input[name="format"]')?.focus();
          break;
        }
        if (!withLevel && (await ctx.refreshLevel())) {
          form.classList.add('was-validated');
          show(t.levelNowRequired, 'error');
          form.querySelector<HTMLInputElement>('input[name="level"]')?.focus();
          break;
        }
        show(t.invalid, 'error');
        break;
      case 'registration_closed':
        show(t.closed, 'error');
        button.disabled = true;
        break;
      default:
        show(t.error, 'error');
    }
  });
}

function renderList(el: HTMLElement, regs: PublicRegistration[]) {
  if (regs.length === 0) {
    el.innerHTML = `<p class="muted">${escapeHtml(t.listEmpty)}</p>`;
    return;
  }
  const women = regs.filter((r) => r.gender === 'female');
  const men = regs.filter((r) => r.gender === 'male');
  const summary =
    `Přihlášeno <strong>${men.length} ${plural(men.length, 'hráč', 'hráči', 'hráčů')}</strong>` +
    ` a <strong>${women.length} ${plural(women.length, 'hráčka', 'hráčky', 'hráček')}</strong>.`;
  const group = (title: string, items: PublicRegistration[]) => `
    <div class="reg-group">
      <h4>${title} <span class="count">${items.length}</span></h4>
      ${
        items.length
          ? `<ul class="chips">${items.map((r) => `<li>${escapeHtml(r.full_name)}</li>`).join('')}</ul>`
          : `<p>Zatím nikdo.</p>`
      }
    </div>`;
  el.innerHTML = `
    <p class="reg-summary">${summary}</p>
    ${group('Hráčky', women)}${group('Hráči', men)}`;
}

/** Vodorovné pruhy pro všechny možnosti (i s nulou), počet hlasů a procento. */
function renderPoll(el: HTMLElement, results: PollResult[]) {
  const votesByFormat = new Map(results.map((r) => [r.format, r.votes]));
  const total = results.reduce((sum, r) => sum + r.votes, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const votesText = (v: number) => `${v} ${plural(v, 'hlas', 'hlasy', 'hlasů')}`;

  const rows = t.formats.map((f, i) => {
    const v = votesByFormat.get(f.value as TournamentFormat) ?? 0;
    const p = pct(v);
    return `
      <li class="poll-row poll-color-${i % 4}">
        <div class="poll-meta">
          <span class="poll-label">${escapeHtml(f.label)}</span>
          <span class="poll-value">${votesText(v)} · ${p} %</span>
        </div>
        <div class="poll-track" aria-hidden="true"><i style="width: ${p}%"></i></div>
      </li>`;
  });

  el.innerHTML = `
    <p class="poll-total">${total ? `Celkem <strong>${votesText(total)}</strong>` : escapeHtml(t.pollEmpty)}</p>
    <ul class="poll-list">${rows.join('')}</ul>`;
}
