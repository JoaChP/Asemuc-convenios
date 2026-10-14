import { ESTADOS } from './convenio-fields.js';
import { translate } from './preferences.js';
const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function filterConvenios(items, search, language = 'es') {
  const query = normalize(search);
  return items.filter((record) =>
    normalize(
      [
        record.nombre,
        record.categoria,
        ESTADOS[record.estado],
        translate(ESTADOS[record.estado] || '', language),
        record.estado,
      ].join(' '),
    ).includes(query),
  );
}
