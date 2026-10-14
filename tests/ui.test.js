import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { api, runBusy, updateForm } from '../public/shared.js';
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
async function boot(page, respond) {
  const html = await readFile(new URL('../public/' + page + '.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'https://asemuc-convenios.vercel.app/' + page });
  const w = dom.window;
  for (const key of ['window', 'document', 'Event', 'FormData', 'FileReader'])
    globalThis[key] = key === 'window' ? w : w[key];
  w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function (value = '') {
    this.returnValue = value;
    this.open = false;
    this.dispatchEvent(new w.Event('close'));
  };
  globalThis.fetch = async (url, options = {}) => {
    const action = new URL(url, w.location.href).searchParams.get('action'),
      body = options.body ? JSON.parse(options.body) : undefined;
    const result = await respond(action, body, String(url));
    return { ok: result.status < 400, status: result.status, json: async () => result.data };
  };
  let source = await readFile(
    new URL('../public/' + (page === 'index' ? 'public' : page) + '.js', import.meta.url),
    'utf8',
  );
  source = source.replace(
    /from\s+(['"])(\.\/[^'"]+)\1/g,
    (_, quote, path) =>
      'from ' + JSON.stringify(new URL('../public/' + path.slice(2), import.meta.url).href),
  );
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  await tick();
  return { dom, w, doc: w.document };
}
const fixture = {
  id: 'qa',
  nombre: 'QA Empresa',
  categoria: 'Salud',
  ubicacion: 'Liberia',
  beneficio: 'Beneficio de prueba',
  estado: 'vigente',
  updated_at: '2026-10-13 10:00:00.123456+00',
  logo: '',
};
test('interfaz administrativa en DOM aislado', async (t) => {
  const requests = [];
  const { dom, w, doc } = await boot('admin', (action, body) => {
    requests.push({ action, body });
    if (action === 'me')
      return { status: 200, data: { admin: { id: 1, email: 'qa@example.test' } } };
    if (action === 'list' || action === 'trash') return { status: 200, data: { items: [fixture] } };
    if (action === 'users')
      return {
        status: 200,
        data: {
          users: [
            { id: 1, email: 'qa@example.test' },
            { id: 2, email: 'otro@example.test' },
          ],
          currentId: 1,
        },
      };
    return { status: 200, data: { ok: true } };
  });
  const $ = (id) => doc.getElementById(id),
    submit = (id) =>
      $(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  try {
    await t.test('carga panel y edita conservando versión', async () => {
      assert.equal($('dashboard').hidden, false);
      $('records').querySelector('button').click();
      assert.equal($('editor').hidden, false);
      assert.equal($('convenio').elements.nombre.value, fixture.nombre);
      submit('convenio');
      await tick();
      assert.equal(requests.find((r) => r.action === 'save').body.updated_at, fixture.updated_at);
    });
    await t.test('cancelar descarte conserva cambios y confirmar descarta', async () => {
      $('records').querySelector('button').click();
      const input = $('convenio').elements.nombre;
      input.value = 'Sin guardar';
      input.dispatchEvent(new w.Event('input', { bubbles: true }));
      $('cancel').click();
      assert.equal($('confirm-dialog').open, true);
      $('confirm-no').click();
      await tick();
      assert.equal($('editor').hidden, false);
      assert.equal(input.value, 'Sin guardar');
      $('cancel').click();
      $('confirm-yes').click();
      await tick();
      assert.equal($('dashboard').hidden, false);
    });
    await t.test('barra lateral indica sección y protege la edición al navegar', async () => {
      assert.equal($('admin-sidebar').hidden, false);
      assert.equal($('convenios-open').getAttribute('aria-current'), 'page');
      $('records').querySelector('button').click();
      $('convenio').elements.nombre.dispatchEvent(new w.Event('input', { bubbles: true }));
      $('users-open').click();
      assert.equal($('confirm-dialog').open, true);
      $('confirm-no').click();
      await tick();
      assert.equal($('editor').hidden, false);
      $('convenios-open').click();
      $('confirm-yes').click();
      await tick();
      assert.equal($('dashboard').hidden, false);
      $('sidebar-menu').click();
      assert.equal($('sidebar-menu').getAttribute('aria-expanded'), 'true');
      $('sidebar-menu').click();
      assert.equal($('sidebar-menu').getAttribute('aria-expanded'), 'false');
    });
    await t.test('eliminar solo envía solicitud al confirmar', async () => {
      const del = $('records').querySelector('button.danger');
      del.click();
      $('confirm-no').click();
      await tick();
      assert.equal(
        requests.some((r) => r.action === 'delete'),
        false,
      );
      del.click();
      $('confirm-yes').click();
      await tick();
      assert.equal(requests.find((r) => r.action === 'delete').body.id, fixture.id);
    });
    await t.test('papelera permite restaurar y volver a la lista', async () => {
      $('trash-toggle').click();
      await tick();
      assert.match($('dashboard-title').textContent, /Papelera/);
      assert.equal($('new').hidden, true);
      $('records').querySelector('button').click();
      await tick();
      assert.equal(requests.find((request) => request.action === 'restore').body.id, fixture.id);
      $('convenios-open').click();
      await tick();
      assert.equal($('new').hidden, false);
      assert.equal($('trash-toggle').textContent, 'Papelera');
    });
    await t.test('acción ocupada muestra estado y bloquea envíos duplicados', async () => {
      let calls = 0,
        release;
      const button = doc.createElement('button');
      button.textContent = 'Guardar';
      const waiting = runBusy(button, 'Guardando…', async () => {
        calls++;
        await new Promise((resolve) => {
          release = resolve;
        });
      });
      assert.equal(button.disabled, true);
      assert.equal(button.textContent, 'Guardando…');
      await runBusy(button, 'Guardando…', async () => {
        calls++;
      });
      assert.equal(calls, 1);
      release();
      await waiting;
      assert.equal(button.textContent, 'Guardar');
      assert.equal(button.disabled, false);
    });
    await t.test('usuarios registrados y no ofrece restablecer la propia cuenta', async () => {
      $('users-open').click();
      await tick();
      assert.equal($('users').hidden, false);
      assert.equal($('user-list').querySelectorAll('button').length, 1);
      assert.match($('user-list').textContent, /otro@example.test/);
    });
    await t.test('campos incompletos y contraseñas distintas deshabilitan crear', async () => {
      const form = $('create-user'),
        button = form.querySelector('button[type="submit"]');
      updateForm(form);
      assert.equal(button.disabled, true);
      form.elements.email.value = 'nuevo@example.test';
      form.elements.password.value = 'clave-nueva-larga';
      form.elements.confirm.value = 'clave-distinta-larga';
      form.elements.currentPassword.value = 'clave-actual-larga';
      updateForm(form);
      assert.equal(button.disabled, true);
      form.elements.confirm.value = form.elements.password.value;
      updateForm(form);
      assert.equal(button.disabled, false);
      form.reset();
    });
    await t.test(
      'restablecimiento pide confirmación de clave, envía destinatario correcto y limpia campos',
      async () => {
        $('user-list').querySelector('button').click();
        assert.equal($('reset-dialog').open, true);
        const form = $('reset-password');
        form.elements.password.value = form.elements.confirm.value = 'clave-nueva-larga';
        form.elements.currentPassword.value = 'clave-actual-larga';
        submit('reset-password');
        await tick();
        assert.equal(requests.find((r) => r.action === 'reset-password').body.id, 2);
        assert.equal($('reset-dialog').open, false);
        assert.equal(form.elements.password.value, '');
      },
    );
    await t.test('crear cuenta con confirmación desigual no llama al backend', async () => {
      const form = $('create-user');
      form.elements.password.value = 'clave-nueva-larga';
      form.elements.confirm.value = 'distinta-clave-larga';
      submit('create-user');
      await tick();
      assert.equal(
        requests.some((r) => r.action === 'create-user'),
        false,
      );
      assert.match($('message').textContent, /no coinciden/);
    });
    await t.test('crear cuenta envía datos y limpia las contraseñas', async () => {
      const form = $('create-user');
      form.elements.email.value = 'nuevo@example.test';
      form.elements.password.value = form.elements.confirm.value = 'clave-nueva-larga';
      form.elements.currentPassword.value = 'clave-actual-larga';
      submit('create-user');
      await tick();
      const request = requests.find((r) => r.action === 'create-user');
      assert.equal(request.body.email, 'nuevo@example.test');
      assert.equal('confirm' in request.body, false);
      assert.equal(form.elements.password.value, '');
    });
    await t.test('cambio propio vuelve al login y limpia campos', async () => {
      $('password-open').click();
      const form = $('change-password');
      form.elements.password.value = form.elements.confirm.value = 'clave-nueva-larga';
      form.elements.currentPassword.value = 'clave-actual-larga';
      submit('change-password');
      await tick();
      assert.equal($('auth').hidden, false);
      assert.equal(form.elements.password.value, '');
    });
    await t.test(
      'sesión vencida real en respuesta API cierra formularios y borra datos privados',
      async () => {
        globalThis.fetch = async () => ({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Iniciá sesión para continuar' }),
        });
        await assert.rejects(() => api('users'));
        assert.equal($('auth').hidden, false);
        assert.equal($('user-list').children.length, 0);
        assert.equal($('records').children.length, 0);
      },
    );
    await t.test('errores de conexión y respuestas no JSON generan mensajes útiles', async () => {
      globalThis.fetch = async () => {
        throw Error('network');
      };
      await assert.rejects(() => api('list'), /No hay conexión/);
      globalThis.fetch = async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw Error('html');
        },
      });
      await assert.rejects(() => api('list'), /servidor no pudo responder/);
    });
  } finally {
    dom.window.close();
  }
});
test('interfaz pública en DOM aislado', async (t) => {
  const records = [
    { ...fixture, nombre: 'Óptica de prueba', descripcion: '<img src=x onerror=alert(1)>' },
    {
      ...fixture,
      id: 'otro',
      nombre: 'Veterinaria',
      categoria: 'Veterinarias',
      ubicacion: 'Carrillo',
    },
  ];
  let publicScope = false;
  const { dom, w, doc } = await boot('index', (action, body, url) => {
    publicScope = new URL(url, 'https://test').searchParams.get('scope') === 'public';
    return { status: 200, data: { items: records } };
  });
  const $ = (id) => doc.getElementById(id);
  try {
    await t.test('pide alcance público y muestra todos', () => {
      assert.equal(publicScope, true);
      assert.equal($('cards').children.length, 2);
    });
    await t.test('búsqueda sin tildes, singular y sin resultados', () => {
      $('search').value = 'optica';
      $('search').dispatchEvent(new w.Event('input'));
      assert.equal($('count').textContent, '1 convenio disponible');
      $('search').value = 'inexistente';
      $('search').dispatchEvent(new w.Event('input'));
      assert.equal($('count').textContent, '0 convenios disponibles');
      assert.match($('cards').textContent, /No encontramos/);
    });
    await t.test('combina categoría y ubicación', () => {
      $('search').value = '';
      $('category').value = 'Veterinarias';
      $('location').value = 'Carrillo';
      $('location').dispatchEvent(new w.Event('change'));
      assert.match($('cards').textContent, /Veterinaria/);
      assert.equal($('cards').querySelectorAll('article').length, 1);
    });
    await t.test('limpiar filtros recupera todos y devuelve foco a búsqueda', () => {
      $('clear-filters').click();
      assert.equal($('cards').querySelectorAll('article').length, 2);
      assert.equal($('category').value, '');
      assert.equal($('location').value, '');
      assert.equal(doc.activeElement, $('search'));
    });
    await t.test('detalle tiene nombre accesible y escapa HTML del contenido', () => {
      $('category').value = '';
      $('location').value = '';
      $('search').value = 'optica';
      $('search').dispatchEvent(new w.Event('input'));
      $('cards').querySelector('button').click();
      assert.equal($('detail').open, true);
      assert.equal($('detail').getAttribute('aria-labelledby'), 'detail-title');
      assert.equal($('detail-body').querySelector('img'), null);
      assert.match($('detail-body').textContent, /<img src=x/);
      $('close').click();
      assert.equal($('detail').open, false);
    });
  } finally {
    dom.window.close();
  }
});
