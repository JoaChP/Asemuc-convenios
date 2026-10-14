import test from 'node:test';
import assert from 'node:assert/strict';
import { imagePdf, createUsersPdf, wrapText } from '../public/users-pdf.js';

test('PDF conserva offsets válidos y todas las páginas', () => {
  const bytes = imagePdf([
    { width: 10, height: 10, bytes: new Uint8Array([255, 216, 255, 217]) },
    { width: 10, height: 10, bytes: new Uint8Array([255, 216, 255, 217]) },
  ]);
  const pdf = Buffer.from(bytes).toString('latin1');
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.match(pdf, /\/Count 2/);
  const start = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.slice(start, start + 4), 'xref');
  const entries = pdf.slice(start).split('\n').slice(3, 11);
  entries.forEach((entry, i) => {
    const offset = Number(entry.slice(0, 10));
    assert.ok(pdf.slice(offset).startsWith(`${i + 1} 0 obj`));
  });
});

test('informe multipágina repite encabezado y excluye credenciales', async () => {
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
      return { width: [...value].length * 7 };
    },
  };
  const users = Array.from({ length: 24 }, (_, i) => ({
    name: 'Persona ' + i,
    email: 'persona' + i + '@ejemplo.test',
    password: 'SECRETO',
    password_hash: 'HASH_SECRETO',
  }));
  const bytes = await createUsersPdf(users, {
    now: new Date('2026-10-14T03:00:00Z'),
    createCanvas: () => ({
      getContext: () => context,
      toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==',
    }),
  });
  const count = Number(
    Buffer.from(bytes)
      .toString()
      .match(/\/Count (\d+)/)[1],
  );
  assert.ok(count > 1);
  assert.equal(text.filter((x) => x === 'ASEMUC').length, count);
  for (const user of users) assert.ok(text.includes(user.email));
  assert.equal(
    text.some((x) => String(x).includes('SECRETO')),
    false,
  );
  const lines = wrapText(context, 'unacadenalargasinseparadores', 40);
  assert.equal(lines.join(''), 'unacadenalargasinseparadores');
  assert.ok(lines.every((line) => context.measureText(line).width <= 40));
});
