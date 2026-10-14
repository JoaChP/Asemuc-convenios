import { randomBytes } from 'node:crypto';
import { credentials, encodePassword, verifyPassword } from './passwords.js';
import { hash, equal, allowAttempt, sessionCookie } from './security.js';
export async function handleAccess({ sql, req, res, body, action, send }) {
  if (action === 'login' || action === 'register') {
    if (req.method !== 'POST') return send(405, { error: 'Método no permitido' });
    const { email, password } = credentials(body.email, body.password);
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    const key = hash(ip + email);
    if (!(await allowAttempt(sql, key)))
      return send(429, { error: 'Demasiados intentos. Intentá en 15 minutos' });
    if (action === 'register') {
      if (
        !process.env.ADMIN_INVITE_CODE ||
        !equal(String(body.invite || ''), process.env.ADMIN_INVITE_CODE)
      )
        return send(403, { error: 'Código de invitación inválido' });
      const { salt, digest } = encodePassword(password);
      const rows =
        await sql`INSERT INTO admins(email,salt,password_hash) VALUES(${email},${salt},${digest}) ON CONFLICT(email) DO NOTHING RETURNING id`;
      if (!rows.length) return send(409, { error: 'Este correo ya está registrado' });
      return send(201, { ok: true });
    }
    const rows = await sql`SELECT * FROM admins WHERE email=${email}`;
    const a = rows[0];
    if (!verifyPassword(password, a)) return send(401, { error: 'Credenciales incorrectas' });
    await sql`DELETE FROM auth_limits WHERE key=${key}`;
    await sql`UPDATE admins SET last_login_at=now() WHERE id=${a.id}`;
    const t = randomBytes(32).toString('hex');
    await sql`INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(${hash(t)},${a.id},now()+interval '8 hours')`;
    res.setHeader('Set-Cookie', sessionCookie(t, 28800));
    return send(200, { ok: true });
  }
}
