import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { dictionary, languages } from '../public/locales.js';
import { initPreferences, translate } from '../public/preferences.js';

test('todas las etiquetas estáticas del catálogo y panel tienen traducción', async () => {
  for (const page of ['admin', 'index']) {
    const dom = new JSDOM(
      await readFile(new URL('../public/' + page + '.html', import.meta.url), 'utf8'),
    );
    const walker = dom.window.document.createTreeWalker(dom.window.document, 4);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (text && !['ASEMUC', '/', '✕'].includes(text))
        assert.ok(dictionary[text], `${page}: ${text}`);
    }
    dom.window.close();
  }
});

test('todos los idiomas incluyen las mismas traducciones y parámetros', () => {
  assert.equal(Object.keys(languages).length, 8);
  for (const [source, values] of Object.entries(dictionary)) {
    for (const language of Object.keys(languages).slice(1)) {
      assert.ok(values[language]?.trim(), `${language}: ${source}`);
      assert.deepEqual(
        [...values[language].matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
        [...source.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
      );
    }
  }
  assert.equal(translate('41 convenios disponibles', 'en'), '41 agreements available');
  assert.equal(translate('Nombre de la empresa *', 'fr'), 'Nom de l’entreprise *');
  assert.equal(translate('Empresa original', 'zh'), 'Empresa original');
});

test('preferencias persisten, revierten textos y respetan datos y formularios', async () => {
  const dom = new JSDOM(
    '<html lang="es"><head><title>Administración | ASEMUC</title></head><body><header><div class="head"></div></header><button id="save">Guardar convenio</button><input value="Sin guardar"><div class="card"><h3>Convenios</h3><p class="benefit">Publicado</p></div><p id="count">41 convenios disponibles</p></body></html>',
    { url: 'https://asemuc.test' },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  let dispose;
  try {
    dispose = initPreferences();
    const select = document.getElementById('interface-language');
    select.value = 'en';
    select.dispatchEvent(new window.Event('change'));
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(document.getElementById('save').textContent, 'Save agreement');
    assert.equal(document.getElementById('count').textContent, '41 agreements available');
    assert.equal(document.querySelector('.card h3').textContent, 'Convenios');
    assert.equal(document.querySelector('.benefit').textContent, 'Publicado');
    assert.equal(document.querySelector('input').value, 'Sin guardar');
    document.getElementById('theme-toggle').click();
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(JSON.parse(window.localStorage.getItem('asemuc-preferences')).language, 'en');
    document.getElementById('save').textContent = 'Save agreement';
    await new Promise((r) => setTimeout(r, 0));
    select.value = 'ja';
    select.dispatchEvent(new window.Event('change'));
    assert.equal(document.getElementById('save').textContent, '提携を保存');
    select.value = 'es';
    select.dispatchEvent(new window.Event('change'));
    assert.equal(document.getElementById('save').textContent, 'Guardar convenio');
    assert.equal(document.getElementById('count').textContent, '41 convenios disponibles');
  } finally {
    dispose?.();
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
