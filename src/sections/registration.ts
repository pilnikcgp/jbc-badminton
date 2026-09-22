import {
  fetchRegistrations,
  register,
  type Edition,
  type Gender,
  type PublicRegistration,
  type RegisterResult,
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
      </div>
    </div>`;

  const listEl = root.querySelector<HTMLElement>('.registration-list')!;
  const refreshList = async () => {
    try {
      renderList(listEl, await fetchRegistrations());
    } catch (err) {
      console.error(err);
      listEl.innerHTML = `<p class="notice notice-error">Seznam se nepodařilo načíst.</p>`;
    }
  };
  refreshList();

  const form = root.querySelector<HTMLFormElement>('form');
  if (form) bindForm(form, refreshList);
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
        <small class="muted">Kvůli losu smíšené čtyřhry.</small>
      </fieldset>
      <div class="field">
        <label for="reg-note">Poznámka <span class="muted">(nepovinné)</span></label>
        <textarea id="reg-note" name="note" rows="3" maxlength="500"></textarea>
      </div>
      <!-- Honeypot: lidé ho nevidí, boti ho vyplní. -->
      <div class="hp" aria-hidden="true">
        <label for="reg-website">Web</label>
        <input id="reg-website" name="website" type="text" tabindex="-1" autocomplete="off" />
      </div>
      <p class="form-message" role="status" hidden></p>
      <button type="submit" class="btn btn-primary">Odeslat přihlášku</button>
    </form>`;
}

function bindForm(form: HTMLFormElement, onSuccess: () => Promise<void>) {
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
    button.disabled = true;
    button.textContent = 'Odesílám…';

    let result: RegisterResult | 'error';
    try {
      result = await register({
        fullName: String(data.get('fullName') ?? ''),
        email: String(data.get('email') ?? ''),
        gender: data.get('gender') as Gender,
        note: String(data.get('note') ?? ''),
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
        await onSuccess();
        break;
      case 'duplicate_email':
        show(t.duplicate, 'error');
        form.querySelector<HTMLInputElement>('#reg-email')?.focus();
        break;
      case 'invalid':
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
  const list = (title: string, items: PublicRegistration[]) => `
    <div class="reg-column">
      <h4>${title} <span class="count">${items.length}</span></h4>
      ${
        items.length
          ? `<ol>${items.map((r) => `<li>${escapeHtml(r.full_name)}</li>`).join('')}</ol>`
          : `<p class="muted">Zatím nikdo.</p>`
      }
    </div>`;
  el.innerHTML = `
    <p class="reg-summary">${summary}</p>
    <div class="reg-columns">${list('Hráčky', women)}${list('Hráči', men)}</div>`;
}
