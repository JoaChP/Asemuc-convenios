import { downloadUsersPdf } from './users-pdf.js';
import { initPreferences, translate } from './preferences.js';
import { $, el, api, norm, runBusy, updateForm, enhanceForms } from './shared.js';
import { CONVENIO_FIELDS, ESTADOS, MAX_IMAGE_BYTES, IMAGE_MIME_TYPES } from './convenio-fields.js';
const titles = Object.fromEntries(
  Object.entries(CONVENIO_FIELDS).map(([key, field]) => [
    key,
    field.label + (field.required ? ' *' : ''),
  ]),
);
initPreferences();
let items = [],
  editing = null,
  image,
  register = false,
  dirty = false,
  trashMode = false;
function confirmAction(text, title) {
  return new Promise((resolve) => {
    const dialog = $('confirm-dialog');
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-yes').textContent = title;
    dialog.returnValue = 'cancel';
    $('confirm-no').onclick = () => dialog.close('cancel');
    $('confirm-yes').onclick = () => dialog.close('yes');
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
    dialog.showModal();
    $('confirm-no').focus();
  });
}
for (const [key, field] of Object.entries(CONVENIO_FIELDS)) {
  const label = el('label', titles[key]);
  let input;
  if (field.type === 'select') {
    input = el('select');
    for (const [value, name] of Object.entries(ESTADOS)) {
      const option = el('option', name);
      option.value = value;
      input.append(option);
    }
  } else if (field.type === 'textarea') input = el('textarea');
  else {
    input = el('input');
    input.type = field.type || 'text';
  }
  input.id = 'field-' + key;
  input.name = key;
  input.required = !!field.required;
  input.maxLength = 3000;
  label.htmlFor = input.id;
  if (field.wide) label.className = 'wide';
  label.append(input);
  $('fields').append(label);
}
function message(e) {
  $('message').textContent = e?.message || e || '';
  if (e) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function show(id) {
  const authenticated = id !== 'auth';
  document.body.classList.toggle('admin-authenticated', authenticated);
  $('admin-sidebar').hidden = !authenticated;
  $('admin-layout').classList.toggle('is-authenticated', authenticated);
  $('admin-help').open = id === 'admin-help';
  $('help-open').setAttribute('aria-expanded', String(id === 'admin-help'));
  const active =
    id === 'admin-help'
      ? 'help-open'
      : id === 'users'
        ? 'users-open'
        : id === 'password-panel'
          ? 'password-open'
          : trashMode && id === 'dashboard'
            ? 'trash-toggle'
            : 'convenios-open';
  for (const button of document.querySelectorAll('.admin-navigation button')) {
    if (button.id === active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('sidebar-menu').setAttribute('aria-expanded', 'false');
  $('admin-sidebar').classList.remove('menu-open');
  for (const x of ['auth', 'dashboard', 'editor', 'users', 'password-panel', 'admin-help'])
    $(x).hidden = x !== id;
}
function render() {
  const records = $('records');
  records.replaceChildren();
  $('dashboard-title').textContent = trashMode ? 'Papelera de convenios' : 'Gestión de convenios';
  $('trash-toggle').textContent = 'Papelera';
  $('new').hidden = trashMode;
  $('summary').textContent = trashMode
    ? items.length + ' convenios en la papelera. Podés restaurarlos.'
    : items.length +
      ' convenios registrados · ' +
      items.filter((r) => r.estado === 'vigente').length +
      ' marcados como publicados';
  const query = norm($('search').value);
  for (const record of items.filter((r) =>
    norm(
      r.nombre +
        ' ' +
        r.categoria +
        ' ' +
        ESTADOS[r.estado] +
        ' ' +
        translate(ESTADOS[r.estado] || '') +
        ' ' +
        r.estado,
    ).includes(query),
  )) {
    const row = el('div', undefined, 'record'),
      text = el('div'),
      actions = el('div', undefined, 'record-actions');
    text.append(
      el('strong', record.nombre),
      el('small', record.categoria + ' · ' + (ESTADOS[record.estado] || record.estado)),
    );
    if (trashMode) {
      const restore = el('button', 'Restaurar', 'secondary');
      restore.onclick = () =>
        runBusy(restore, 'Restaurando…', async () => {
          try {
            await api('restore', { id: record.id, updated_at: record.updated_at });
            await load();
            message('Convenio restaurado. La publicación respeta su estado y fechas.');
          } catch (error) {
            message(error);
          }
        });
      actions.append(restore);
    } else {
      const edit = el('button', 'Editar', 'secondary'),
        remove = el('button', 'Eliminar', 'danger');
      edit.onclick = () => open(record);
      remove.onclick = async () => {
        if (
          !(await confirmAction(
            '¿Mover el convenio de ' +
              record.nombre +
              ' a la papelera? Dejará de publicarse y podrás restaurarlo.',
            'Mover a papelera',
          ))
        )
          return;
        await runBusy(remove, 'Retirando…', async () => {
          try {
            await api('delete', { id: record.id, updated_at: record.updated_at });
            await load();
            message('Convenio movido a la papelera. Podés recuperarlo en Ver papelera.');
          } catch (error) {
            message(error);
          }
        });
      };
      actions.append(edit, remove);
    }
    row.append(text, actions);
    records.append(row);
  }
  if (!records.children.length)
    records.append(
      el(
        'p',
        query
          ? 'No encontramos convenios con esa búsqueda. Probá con otro nombre.'
          : trashMode
            ? 'La papelera está vacía.'
            : 'Todavía no hay convenios. Usá Añadir convenio para crear el primero.',
      ),
    );
}
async function load() {
  const panel = $('records');
  panel.setAttribute('aria-busy', 'true');
  panel.inert = true;
  $('summary').textContent = 'Cargando convenios…';
  try {
    items = (await api(trashMode ? 'trash' : 'list')).items;
    render();
    show('dashboard');
  } catch (error) {
    $('summary').textContent = 'No pudimos actualizar la lista. Probá con Actualizar.';
    throw error;
  } finally {
    panel.removeAttribute('aria-busy');
    panel.inert = false;
  }
}
function open(r) {
  editing = r;
  image = undefined;
  dirty = false;
  $('convenio').reset();
  for (const key of Object.keys(titles))
    $('convenio').elements[key].value = r?.[key] || (key === 'estado' ? 'borrador' : '');
  $('preview').hidden = !r?.logo;
  if (r?.logo) $('preview').src = r.logo;
  $('preview').onerror = () => {
    $('preview').hidden = true;
  };
  $('editor-title').textContent = r ? 'Editar convenio' : 'Añadir convenio';
  message('');
  show('editor');
  updateForm($('convenio'));
  $('convenio').elements.nombre.focus();
}
$('new').onclick = () => open(null);
$('cancel').onclick = async () => {
  if (
    dirty &&
    !(await confirmAction(
      'Tenés cambios sin guardar. ¿Descartarlos y volver a la lista?',
      'Descartar cambios',
    ))
  )
    return;
  dirty = false;
  show('dashboard');
};
$('search').oninput = render;
$('reload').onclick = () => load().catch(message);
$('convenio').addEventListener('input', () => {
  dirty = true;
});
$('trash-toggle').onclick = async () => {
  if (!(await leaveEditor())) return;
  const previousMode = trashMode;
  trashMode = true;
  $('search').value = '';
  try {
    await runBusy($('trash-toggle'), 'Cargando…', () => load());
  } catch (error) {
    trashMode = previousMode;
    render();
    message(error);
  } finally {
    $('trash-toggle').textContent = 'Papelera';
  }
};
window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
$('switch').onclick = () => {
  register = !register;
  $('invite-label').hidden = !register;
  $('auth-title').textContent = register ? 'Crear administrador' : 'Bienvenido de nuevo';
  $('auth-submit').textContent = register ? 'Registrar administrador' : 'Iniciar sesión';
  $('switch').textContent = register ? 'Ya tengo cuenta' : 'Registrar administrador';
  $('login').elements.invite.required = register;
  $('login').elements.password.autocomplete = register ? 'new-password' : 'current-password';
  updateForm($('login'));
  message('');
};
$('login').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await runBusy(
      $('auth-submit'),
      register ? 'Creando cuenta…' : 'Iniciando sesión…',
      async () => {
        const body = Object.fromEntries(new FormData(event.target));
        await api(register ? 'register' : 'login', body);
        $('login').reset();
        if (register) {
          $('switch').click();
          message('Cuenta creada. Ya podés iniciar sesión.');
        } else {
          trashMode = false;
          message('');
          await load();
        }
      },
    );
  } catch (error) {
    message(error);
  }
};
$('logout').onclick = async () => {
  if (!(await leaveEditor())) return;
  try {
    await api('logout', {});
    items = [];
    $('records').replaceChildren();
    $('login').reset();
    show('auth');
  } catch (e) {
    message(e);
  }
};
$('image').onchange = async () => {
  const file = $('image').files[0];
  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES || !IMAGE_MIME_TYPES.includes(file.type)) {
    $('image').value = '';
    message('Elegí una imagen PNG, JPG o WebP de máximo 1 MB');
    return;
  }
  try {
    await runBusy($('save'), 'Leyendo imagen…', async () => {
      image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(Error('No se pudo leer la imagen. Intentá seleccionarla nuevamente.'));
        reader.readAsDataURL(file);
      });
      dirty = true;
      $('preview').src = image;
      $('preview').hidden = false;
    });
  } catch (error) {
    message(error);
  }
};
$('remove-image').onclick = () => {
  dirty = true;
  image = null;
  $('image').value = '';
  $('preview').hidden = true;
};
$('convenio').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await runBusy($('save'), 'Guardando convenio…', async () => {
      const body = Object.fromEntries(new FormData(event.target));
      if (editing) {
        body.id = editing.id;
        body.updated_at = editing.updated_at;
      }
      if (image !== undefined) body.image = image;
      await api('save', body);
      dirty = false;
      await load();
      message(
        body.estado === 'borrador'
          ? 'Borrador guardado. No se muestra en la página pública.'
          : 'Convenio guardado. Se publica solo si está vigente y dentro de sus fechas.',
      );
    });
  } catch (error) {
    message(error);
  }
};
window.addEventListener('session-expired', () => {
  dirty = false;
  items = [];
  editing = null;
  image = undefined;
  for (const form of document.forms) form.reset();
  $('records').replaceChildren();
  $('user-list').replaceChildren();
  if ($('reset-dialog').open) $('reset-dialog').close();
  show('auth');
  message('Tu sesión venció. Iniciá sesión para continuar.');
});
message('Verificando tu sesión…');
try {
  const { admin } = await api('me');
  if (admin) await load();
  else show('auth');
  message('');
} catch (e) {
  show('auth');
  message(e);
}

let resetUser = null;
const date = (value) =>
  value
    ? new Date(value).toLocaleString(document.documentElement.lang || 'es-CR', {
        timeZone: 'America/Costa_Rica',
      })
    : 'Sin registro';
async function loadUsers() {
  const { users, currentId } = await api('users');
  $('user-list').replaceChildren();
  for (const user of users) {
    const row = el('div', undefined, 'record'),
      info = el('div');
    info.append(
      el('strong', user.name || user.email),
      el('small', user.email + (String(user.id) === String(currentId) ? ' · Tu cuenta' : '')),
      el('small', 'Administrador · Registrado: ' + date(user.created_at)),
      el('small', 'Último acceso: ' + date(user.last_login_at)),
    );
    row.append(info);
    if (String(user.id) !== String(currentId)) {
      const reset = el('button', 'Restablecer contraseña', 'secondary');
      reset.onclick = () => {
        resetUser = user;
        $('reset-password').reset();
        $('reset-error').textContent = '';
        $('reset-target').textContent = 'Cuenta: ' + user.email;
        $('reset-dialog').showModal();
      };
      row.append(reset);
    }
    $('user-list').append(row);
  }
  show('users');
  userView('list');
}
$('users-open').onclick = async () => {
  if (!(await leaveEditor())) return;
  message('');
  userView('create');
  show('users');
};
$('users-back').onclick = () => {
  $('create-user').reset();
  show('dashboard');
};
$('password-open').onclick = async () => {
  if (!(await leaveEditor())) return;
  message('');
  $('change-password').reset();
  show('password-panel');
};
$('password-back').onclick = () => {
  $('change-password').reset();
  show('dashboard');
};
$('reset-cancel').onclick = () => $('reset-dialog').close();
$('reset-dialog').addEventListener('close', () => {
  $('reset-password').reset();
  resetUser = null;
});
function passwordBody(form) {
  const body = Object.fromEntries(new FormData(form));
  if (body.password !== body.confirm) throw Error('Las contraseñas nuevas no coinciden');
  delete body.confirm;
  return body;
}
for (const action of ['create-user', 'change-password', 'reset-password']) {
  $(action).onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target,
      button = form.querySelector('button[type="submit"]');
    try {
      await runBusy(
        button,
        action === 'create-user' ? 'Creando administrador…' : 'Guardando contraseña…',
        async () => {
          const body = passwordBody(form);
          if (action === 'reset-password') body.id = resetUser.id;
          await api(action, body);
          form.reset();
          if (action === 'change-password') {
            items = [];
            $('records').replaceChildren();
            $('user-list').replaceChildren();
            $('login').reset();
            show('auth');
            message('Contraseña actualizada. Iniciá sesión con tu nueva contraseña.');
          } else {
            if (action === 'reset-password') $('reset-dialog').close();
            await loadUsers();
            message(
              action === 'create-user'
                ? 'Administrador creado. Ya puede iniciar sesión.'
                : 'Contraseña restablecida. Se cerraron las sesiones de esa cuenta.',
            );
          }
        },
      );
    } catch (e) {
      if (action === 'reset-password') $('reset-error').textContent = e.message;
      else message(e);
    }
  };
}
enhanceForms();
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.key.toLowerCase() === 'b' && !$('dashboard').hidden) {
    event.preventDefault();
    $('search').focus();
  }
});

async function leaveEditor() {
  if (
    dirty &&
    !(await confirmAction(
      'Tenés cambios sin guardar. ¿Descartarlos para continuar?',
      'Descartar cambios',
    ))
  )
    return false;
  dirty = false;
  return true;
}
$('convenios-open').onclick = async () => {
  if (!(await leaveEditor())) return;
  trashMode = false;
  $('search').value = '';
  message('');
  await load().catch(message);
};
$('help-open').onclick = async () => {
  if (!(await leaveEditor())) return;
  message('');
  show('admin-help');
  $('admin-help').querySelector('summary').focus();
};
$('sidebar-menu').onclick = () => {
  const expanded = $('sidebar-menu').getAttribute('aria-expanded') !== 'true';
  $('sidebar-menu').setAttribute('aria-expanded', String(expanded));
  $('admin-sidebar').classList.toggle('menu-open', expanded);
};

function userView(view) {
  $('users-create-view').hidden = view !== 'create';
  $('users-list-view').hidden = view !== 'list';
  for (const name of ['create', 'list']) {
    const button = $('users-' + name + '-tab');
    button.setAttribute('aria-pressed', String(view === name));
    button.classList.toggle('secondary', view !== name);
  }
}
$('users-create-tab').onclick = () => {
  message('');
  userView('create');
};
$('users-list-tab').onclick = () =>
  runBusy($('users-list-tab'), 'Cargando usuarios…', loadUsers).catch(message);
$('users-pdf').onclick = () =>
  runBusy($('users-pdf'), 'Generando PDF…', async () => {
    try {
      const { users } = await api('users');
      await downloadUsersPdf(users);
      message('PDF descargado.');
    } catch (error) {
      message(error);
    }
  });
