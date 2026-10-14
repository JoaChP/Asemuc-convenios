import test from 'node:test';
import assert from 'node:assert/strict';
import { credentials, encodePassword, verifyPassword } from './passwords.js';
test('normaliza correo y exige una contraseña de longitud válida', () => {
  assert.equal(credentials(' Admin@ASEMUC.CR ', 'contraseña-segura').email, 'admin@asemuc.cr');
  for (const p of ['', 'corta', 'a'.repeat(129)])
    assert.throws(() => credentials('admin@asemuc.cr', p));
  assert.throws(() => credentials('inválido', 'contraseña-segura'));
});
test('contraseña con sal única y comprobación sin almacenar texto original', () => {
  const a = encodePassword('contraseña-segura'),
    b = encodePassword('contraseña-segura');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.digest, b.digest);
  const user = { salt: a.salt, password_hash: a.digest };
  assert.equal(verifyPassword('contraseña-segura', user), true);
  assert.equal(verifyPassword('incorrecta', user), false);
  assert.equal(verifyPassword(null, user), false);
  assert.equal(verifyPassword('a'.repeat(129), user), false);
});
