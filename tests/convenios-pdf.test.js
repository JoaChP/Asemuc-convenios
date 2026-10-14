import test from 'node:test';
import assert from 'node:assert/strict';
import { filterConvenios } from '../public/convenio-filter.js';
import { createConveniosPdf } from '../public/convenios-pdf.js';
import { CONVENIO_FIELDS } from '../public/convenio-fields.js';
test('exportación filtrada usa la misma selección e idiomas que el listado', () => {
  const items = [
    { nombre: 'Clínica', categoria: 'Salud', estado: 'vigente' },
    { nombre: 'Hotel', categoria: 'Turismo', estado: 'borrador' },
  ];
  assert.deepEqual(filterConvenios(items, 'clinica'), [items[0]]);
  assert.deepEqual(filterConvenios(items, 'draft', 'en'), [items[1]]);
  assert.deepEqual(filterConvenios(items, 'ausente'), []);
  assert.equal(filterConvenios(items, '').length, 2);
});
test('PDF incluye campos completos y continúa textos extensos sin perder información', async () => {
  const text = [];
  const context = {
    scale() {},
    fillRect() {},
    drawImage() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText(value) {
      text.push(value);
    },
    measureText(value) {
      return { width: [...value].length * 5 };
    },
  };
  const record = Object.fromEntries(
    Object.keys(CONVENIO_FIELDS).map((field) => [
      field,
      field === 'estado' ? 'borrador' : 'dato-' + field,
    ]),
  );
  record.condiciones = 'CONDICION '.repeat(700) + 'FINAL_DEL_TEXTO';
  record.id = 'qa-informe';
  const bytes = await createConveniosPdf([record], {
    search: 'dato',
    createCanvas: () => ({
      getContext: () => context,
      toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==',
    }),
  });
  for (const { label } of Object.values(CONVENIO_FIELDS)) assert.ok(text.includes(label), label);
  assert.ok(text.some((line) => line.includes('FINAL_DEL_TEXTO')));
  assert.ok(text.includes('qa-informe'));
  assert.ok(
    Number(
      Buffer.from(bytes)
        .toString()
        .match(/\/Count (\d+)/)[1],
    ) > 1,
  );
  assert.ok(text.includes('Filtro aplicado: dato'));
});
