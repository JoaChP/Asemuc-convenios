import { readFile } from 'node:fs/promises';
import { db } from '../lib/db.js';
const sql=db();
await sql`CREATE TABLE IF NOT EXISTS admins(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,email text UNIQUE NOT NULL,salt text NOT NULL,password_hash text NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,admin_id bigint NOT NULL REFERENCES admins(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS auth_limits(key text PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS convenios(id text PRIMARY KEY,data jsonb NOT NULL,image text,updated_at timestamptz NOT NULL DEFAULT now())`;
const items=JSON.parse((await readFile(new URL('./seed.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
for(const item of items){const {id,logo,...data}=item;await sql`INSERT INTO convenios(id,data) VALUES(${id},${JSON.stringify(data)}::jsonb) ON CONFLICT(id) DO NOTHING`}
console.log('Tablas listas. Importación completada sin sobrescribir registros existentes.');
