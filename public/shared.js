import { translate } from './preferences.js';
export const $ = (id) => document.getElementById(id);
export function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
export async function api(action, body) {
  let r;
  try {
    r = await fetch('/api/app?action=' + action, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Error('No hay conexión. Revisá tu internet e intentá nuevamente.');
  }
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error('El servidor no pudo responder. Intentá nuevamente en unos momentos.');
  }
  if (!r.ok) {
    if (r.status === 401 && !['login', 'register'].includes(action))
      window.dispatchEvent(new Event('session-expired'));
    throw Error(data.error || 'No se pudo completar la solicitud');
  }
  return data;
}
export const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function updateForm(form) {
  const confirm = form.elements.namedItem('confirm'),
    password = form.elements.namedItem('password');
  if (confirm && password)
    confirm.setCustomValidity(
      confirm.value && confirm.value !== password.value
        ? translate('Las contraseñas nuevas no coinciden.')
        : '',
    );
  const button = form.querySelector('button[type="submit"]');
  if (button && form.getAttribute('aria-busy') !== 'true') button.disabled = !form.checkValidity();
  let feedback = form.querySelector('.form-feedback');
  if (!feedback) {
    feedback = el('p', undefined, 'muted form-feedback');
    feedback.setAttribute('role', 'status');
    form.append(feedback);
  }
  feedback.textContent =
    (confirm?.value && confirm.validity.customError ? confirm.validationMessage : '') ||
    (!form.checkValidity()
      ? 'Completá los campos obligatorios con datos válidos para continuar.'
      : '');
  feedback.hidden = !feedback.textContent;
}

export async function runBusy(button, label, task) {
  if (button.getAttribute('aria-busy') === 'true') return;
  const original = button.textContent,
    form = button.form;
  button.disabled = true;
  button.textContent = label;
  button.setAttribute('aria-busy', 'true');
  form?.setAttribute('aria-busy', 'true');
  try {
    return await task();
  } finally {
    button.textContent = original;
    button.removeAttribute('aria-busy');
    form?.removeAttribute('aria-busy');
    if (form) updateForm(form);
    else button.disabled = false;
  }
}

export function enhanceForms() {
  window.addEventListener('preferences-changed', () => {
    for (const form of document.forms) updateForm(form);
  });
  for (const form of document.forms) {
    form.addEventListener('input', () => updateForm(form));
    form.addEventListener('reset', () => queueMicrotask(() => updateForm(form)));
    updateForm(form);
  }
  for (const input of document.querySelectorAll('input[type="password"]')) {
    const label = input.labels?.[0];
    if (label)
      input.setAttribute(
        'aria-label',
        [...label.childNodes]
          .filter((node) => node.nodeType === 3)
          .map((node) => node.textContent)
          .join(' ')
          .trim(),
      );
    const toggle = el('button', 'Mostrar contraseña', 'password-toggle secondary');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.onclick = () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      toggle.textContent = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
      toggle.setAttribute('aria-pressed', String(visible));
      input.focus();
    };
    input.after(toggle);
  }
}
