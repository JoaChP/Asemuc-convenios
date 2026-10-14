import { db } from '../lib/db.js';
import { hash, sessionCookie } from '../lib/security.js';
import { handleAccess } from '../lib/access.js';
import { handleUsers } from '../lib/users.js';
import { readConvenios, writeConvenios } from '../lib/convenios.js';

export default async function handler(req, res, sqlFactory = db) {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  const action = url.searchParams.get('action') || 'list';
  const send = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  try {
    const sql = sqlFactory();
    if (req.method !== 'GET' && req.headers.origin !== process.env.APP_ORIGIN)
      return send(403, { error: 'Origen no autorizado' });
    let body = req.body || {};
    if (typeof body === 'string') body = JSON.parse(body);
    const token = (req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('asemuc='))
      ?.slice(7);
    const sessions = token
      ? await sql`SELECT a.id,a.email,a.name FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now()`
      : [];
    const admin = sessions[0];
    if (action === 'me' && req.method === 'GET') return send(200, { admin: admin || null });
    if (['login', 'register'].includes(action))
      return await handleAccess({ sql, req, res, body, action, send });
    if (['list', 'image', 'trash'].includes(action))
      return await readConvenios({ sql, req, res, admin, action, url, send });
    if (!admin) return send(401, { error: 'Iniciá sesión para continuar' });
    if (['users', 'create-user', 'change-password', 'reset-password'].includes(action))
      return await handleUsers({ sql, req, res, body, admin, action, send });
    if (action === 'logout' && req.method === 'POST') {
      await sql`DELETE FROM sessions WHERE token_hash=${hash(token)}`;
      res.setHeader('Set-Cookie', sessionCookie());
      return send(200, { ok: true });
    }
    return await writeConvenios({ sql, req, body, action, send });
  } catch (error) {
    console.error('API:', error.code || error.name);
    return send(error.message === 'Base de datos sin configurar' ? 503 : 400, {
      error: error.code ? 'No se pudo completar la operación' : error.message,
    });
  }
}
