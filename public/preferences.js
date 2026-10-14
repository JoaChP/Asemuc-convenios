import { dictionary, languages } from './locales.js';
const key = 'asemuc-preferences';
const templates = Object.entries(dictionary)
  .filter(([source]) => source.includes('{0}'))
  .map(([source, translations]) => ({
    translations,
    pattern: new RegExp(
      '^' +
        source
          .split(/(\{\d+\})/)
          .map((part) =>
            /^\{\d+\}$/.test(part) ? '(.+?)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .join('') +
        '$',
    ),
  }));
const reverse = new Map();
for (const [source, translations] of Object.entries(dictionary))
  if (!source.includes('{0}'))
    for (const value of Object.values(translations)) reverse.set(value, source);

export function readPreferences() {
  try {
    return JSON.parse(window.localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
export function translate(text, language = document.documentElement.lang || 'es') {
  if (language === 'es') return text;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const suffix = ' Podés volver a intentarlo sin salir de esta página.';
  if (normalized.endsWith(suffix))
    return (
      translate(normalized.slice(0, -suffix.length), language) +
      ' ' +
      translate(suffix.trim(), language)
    );
  let value = dictionary[normalized]?.[language];
  if (!value && normalized.endsWith(' *') && dictionary[normalized.slice(0, -2)])
    value = dictionary[normalized.slice(0, -2)]?.[language] + ' *';
  if (value?.startsWith('undefined')) value = null;
  if (!value)
    for (const { pattern, translations } of templates) {
      const match = normalized.match(pattern);
      if (match) {
        value = translations[language]?.replace(/\{(\d+)\}/g, (_, i) => match[Number(i) + 1]);
        break;
      }
    }
  if (!value && normalized.includes(' · ')) {
    const split = normalized.lastIndexOf(' · '),
      status = normalized.slice(split + 3);
    if (['Borrador', 'Publicado', 'Vencido', 'En revisión'].includes(status))
      value = normalized.slice(0, split + 3) + dictionary[status]?.[language];
  }
  if (value) return text.replace(text.trim(), value);
  return text;
}
export function initPreferences() {
  const root = document.documentElement;
  const saved = readPreferences();
  let language = Object.hasOwn(languages, saved.language) ? saved.language : 'es';
  let theme = ['light', 'dark'].includes(saved.theme)
    ? saved.theme
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const pageTitle = document.title;
  const canonical = (text) => text.replace(text.trim(), reverse.get(text.trim()) || text.trim());
  const controls = document.createElement('div');
  controls.className = 'preferences';
  controls.dataset.noTranslate = '';
  const languageLabel = document.createElement('label');
  const caption = document.createElement('span');
  const select = document.createElement('select');
  select.id = 'interface-language';
  for (const [code, name] of Object.entries(languages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    select.append(option);
  }
  languageLabel.append(caption, select);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'theme-toggle';
  toggle.className = 'secondary theme-toggle';
  controls.append(languageLabel, toggle);
  (
    document.querySelector('.workspace-bar') ||
    document.querySelector('header .head') ||
    document.body
  ).append(controls);
  // The admin header remains visible before authentication.
  const header = document.querySelector('.admin-page header .head');
  if (header) {
    const clone = controls.cloneNode(true);
    clone.querySelector('select').id = 'auth-language';
    clone.querySelector('button').id = 'auth-theme-toggle';
    header.append(clone);
  }
  const allControls = [...document.querySelectorAll('.preferences')];
  function refresh() {
    root.lang = language;
    document.title = translate(pageTitle, language);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    for (const box of allControls) {
      const label = box.querySelector('span'),
        s = box.querySelector('select'),
        b = box.querySelector('button');
      label.textContent = translate('Idioma', language);
      s.value = language;
      s.setAttribute('aria-label', translate('Idioma', language));
      b.textContent =
        (theme === 'dark' ? '☀ ' : '☾ ') +
        translate(theme === 'dark' ? 'Modo claro' : 'Modo oscuro', language);
      b.setAttribute(
        'aria-label',
        translate(theme === 'dark' ? 'Modo claro' : 'Modo oscuro', language),
      );
      b.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (
        node.parentElement?.closest(
          'script,style,textarea,[data-no-translate],.record strong,.card h3,.card .tag,.card-body > p,.benefit,#detail-title,#detail-body > p,#detail-body > .tag,#category option:not(:first-child),#location option:not(:first-child)',
        )
      )
        continue;
      const previous = originals.get(node);
      const source =
        previous && node.nodeValue === previous.last ? previous.source : canonical(node.nodeValue);
      const next = translate(source, language);
      originals.set(node, { source, last: next });
      if (node.nodeValue !== next) node.nodeValue = next;
    }
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]')) {
      if (el.closest('[data-no-translate]')) continue;
      const stored = attributes.get(el) || {};
      for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr),
          prev = stored[attr];
        const source = prev && current === prev.last ? prev.source : current;
        const next = translate(source, language);
        stored[attr] = { source, last: next };
        if (current !== next) el.setAttribute(attr, next);
      }
      attributes.set(el, stored);
    }
  }
  function persist() {
    try {
      window.localStorage.setItem(key, JSON.stringify({ language, theme }));
    } catch {}
    refresh();
    window.dispatchEvent(new window.Event('preferences-changed'));
  }
  for (const box of allControls) {
    box.querySelector('select').onchange = (event) => {
      language = event.target.value;
      persist();
    };
    box.querySelector('button').onclick = () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      persist();
    };
  }
  const observer = new window.MutationObserver(() => {
    observer.disconnect();
    refresh();
    observe();
  });
  function observe() {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'],
    });
  }
  refresh();
  observe();
  return () => observer.disconnect();
}
