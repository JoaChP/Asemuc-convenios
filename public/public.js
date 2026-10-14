import { initPreferences } from './preferences.js';
import { $, el, api, norm, runBusy } from './shared.js';

initPreferences();
let items = [];
let loading = false;
let detailId = null;

const DETAIL_FIELDS = {
  descripcion: 'Acerca de la empresa',
  beneficio: 'Beneficio para asociados',
  condiciones: 'Condiciones',
  ubicacion: 'Ubicación',
  direccion: 'Dirección',
  telefono: 'Teléfono',
  correo: 'Correo',
  inicio: 'Vigente desde',
  fin: 'Vigente hasta',
};

function openDetail(record) {
  detailId = record.id;
  const box = $('detail-body'),
    title = el('h2', record.nombre);
  title.id = 'detail-title';
  box.replaceChildren(el('span', record.categoria, 'tag'), title);
  for (const [field, label] of Object.entries(DETAIL_FIELDS)) {
    if (record[field]) box.append(el('strong', label), el('p', record[field]));
  }
  const links = [
    ['Llamar', record.telefono ? 'tel:' + record.telefono.replace(/[^\d+]/g, '') : ''],
    ['Enviar correo', record.correo ? 'mailto:' + record.correo : ''],
    ['WhatsApp', record.whatsapp ? 'https://wa.me/' + record.whatsapp.replace(/\D/g, '') : ''],
    ['Sitio web', record.sitio],
  ];
  for (const [label, url] of links) {
    if (!url || !/^(https?:|tel:|mailto:)/.test(url)) continue;
    const link = el('a', label, 'button');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    box.append(link, document.createTextNode(' '));
  }
  $('detail').showModal();
}

function createCard(record) {
  const card = el('article', undefined, 'card');
  const top = el('div', undefined, 'card-top');
  const initial = el('span', record.nombre.slice(0, 2).toUpperCase(), 'initial');
  if (record.logo) {
    const image = el('img');
    image.alt = 'Logo de ' + record.nombre;
    image.loading = 'lazy';
    image.onerror = () => image.replaceWith(initial);
    image.src = record.logo;
    top.append(image);
  } else top.append(initial);
  const body = el('div', undefined, 'card-body');
  const button = el('button', 'Ver convenio ↗');
  button.dataset.convenio = record.id;
  button.onclick = () => openDetail(record);
  button.setAttribute('aria-label', 'Ver convenio de ' + record.nombre);
  body.append(
    el('span', record.categoria, 'tag'),
    el('h3', record.nombre),
    el('p', record.beneficio, 'benefit'),
    el('p', record.ubicacion || 'Consultar ubicación'),
    button,
  );
  card.append(top, body);
  return card;
}

function render() {
  const query = norm($('search').value),
    category = $('category').value,
    location = $('location').value;
  const filtered = items.filter(
    (record) =>
      record.estado === 'vigente' &&
      (!category || record.categoria === category) &&
      (!location || record.ubicacion === location) &&
      norm(Object.values(record).join(' ')).includes(query),
  );
  $('count').textContent =
    filtered.length + (filtered.length === 1 ? ' convenio disponible' : ' convenios disponibles');
  $('cards').replaceChildren(...filtered.map(createCard));
  $('clear-filters').disabled = !query && !category && !location;
  if (!filtered.length)
    $('cards').append(
      el(
        'p',
        'No encontramos convenios con estos filtros. Usá Limpiar filtros para empezar de nuevo.',
      ),
    );
}

function updateOptions(id, field) {
  const select = $(id),
    previous = select.value;
  select.length = 1;
  const values = [...new Set(items.map((record) => record[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  for (const value of values) {
    const option = el('option', value);
    option.value = value;
    select.append(option);
  }
  select.value = values.includes(previous) ? previous : '';
}

async function load() {
  if (loading) return;
  loading = true;
  $('cards').setAttribute('aria-busy', 'true');
  $('count').textContent = 'Cargando convenios…';
  $('retry').hidden = true;
  try {
    items = (await api('list&scope=public')).items;
    updateOptions('category', 'categoria');
    updateOptions('location', 'ubicacion');
    render();
    $('message').textContent = '';
  } catch (error) {
    $('cards').replaceChildren();
    $('count').textContent = '';
    $('message').textContent =
      error.message + ' Podés volver a intentarlo sin salir de esta página.';
    $('retry').hidden = false;
  } finally {
    loading = false;
    $('cards').removeAttribute('aria-busy');
  }
}

for (const id of ['search', 'category', 'location'])
  $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
$('clear-filters').onclick = () => {
  $('search').value = '';
  $('category').value = '';
  $('location').value = '';
  render();
  $('search').focus();
};
$('retry').onclick = () => runBusy($('retry'), 'Reintentando…', load);
$('close').onclick = () => $('detail').close();
$('detail').addEventListener('close', () => {
  const button = [...$('cards').querySelectorAll('button')].find(
    (button) => button.dataset.convenio === detailId,
  );
  button?.focus();
});
window.addEventListener('focus', () => {
  if (!$('detail').open) load();
});
load();
