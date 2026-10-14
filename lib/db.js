import { neon } from '@neondatabase/serverless';
export function db(){if(!process.env.DATABASE_URL)throw Error('Base de datos sin configurar');return neon(process.env.DATABASE_URL);}
