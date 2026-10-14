import { readFile } from 'node:fs/promises';
import { db } from '../lib/db.js';
const sql=db();
await sql`CREATE TABLE IF NOT EXISTS admins(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,email text UNIQUE NOT NULL,salt text NOT NULL,password_hash text NOT NULL)`;
await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`;
await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at timestamptz`;
await sql`CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,admin_id bigint NOT NULL REFERENCES admins(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS auth_limits(key text PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS convenios(id text PRIMARY KEY,data jsonb NOT NULL,image text,updated_at timestamptz NOT NULL DEFAULT now())`;
const items=JSON.parse((await readFile(new URL('./seed.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
await sql`CREATE TABLE IF NOT EXISTS migrations(key text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())`;
const seeded=await sql`SELECT key FROM migrations WHERE key='initial-convenios-v1'`;
if(!seeded.length){
 const queries=items.map(item=>{const {id,logo,...data}=item;return sql`INSERT INTO convenios(id,data) VALUES(${id},${JSON.stringify(data)}::jsonb) ON CONFLICT(id) DO NOTHING`});
 queries.push(sql`INSERT INTO migrations(key) VALUES('initial-convenios-v1') ON CONFLICT(key) DO NOTHING`);
 await sql.transaction(queries);
}
console.log('Tablas listas. Importación completada sin sobrescribir registros existentes.');
