import { readFile } from 'node:fs/promises';
import { db } from '../lib/db.js';
import { initialize } from '../lib/schema.js';
const items = JSON.parse(
  (await readFile(new URL('./seed.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''),
);
await initialize(db(), items);
console.log('Tablas listas. Importación completada sin sobrescribir registros existentes.');
