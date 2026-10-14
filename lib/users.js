import { credentials, encodePassword, verifyPassword } from './passwords.js';
import { allowAttempt, sessionCookie } from './security.js';
export async function handleUsers({ sql, req, res, body, admin, action, send }) {
  if (action === 'users' && req.method === 'GET') {
    const users =
      await sql`SELECT id,email,name,created_at,last_login_at FROM admins ORDER BY created_at,id`;
    return send(200, { users, currentId: admin.id });
  }
  if (['create-user', 'change-password', 'reset-password'].includes(action)) {
    if (req.method !== 'POST') return send(405, { error: 'Método no permitido' });
    const key = 'reauth:' + admin.id;
    if (!(await allowAttempt(sql, key)))
      return send(429, { error: 'Demasiados intentos. Intentá en 15 minutos' });
    const current = (await sql`SELECT salt,password_hash FROM admins WHERE id=${admin.id}`)[0];
    if (!verifyPassword(body.currentPassword, current))
      return send(403, { error: 'Tu contraseña actual es incorrecta' });
    await sql`DELETE FROM auth_limits WHERE key=${key}`;
    const { email, password } = credentials(
      action === 'create-user' ? body.email : admin.email,
      body.password,
    );
    const { salt, digest } = encodePassword(password);
    if (action === 'create-user') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length > 120) return send(400, { error: 'El nombre admite máximo 120 caracteres' });
      const users =
        await sql`INSERT INTO admins(email,name,salt,password_hash) VALUES(${email},${name},${salt},${digest}) ON CONFLICT(email) DO NOTHING RETURNING id`;
      if (!users.length) return send(409, { error: 'Este correo ya está registrado' });
      return send(201, { ok: true });
    }
    const id = action === 'change-password' ? String(admin.id) : String(body.id || '');
    if (!/^\d+$/.test(id)) return send(400, { error: 'Usuario inválido' });
    if (action === 'reset-password' && id === String(admin.id))
      return send(400, { error: 'Usá Cambiar mi contraseña para tu propia cuenta' });
    const exists = await sql`SELECT id FROM admins WHERE id=${id}`;
    if (!exists.length) return send(404, { error: 'Usuario no encontrado' });
    await sql.transaction([
      sql`UPDATE admins SET salt=${salt},password_hash=${digest} WHERE id=${id}`,
      sql`DELETE FROM sessions WHERE admin_id=${id}`,
    ]);
    if (action === 'change-password') res.setHeader('Set-Cookie', sessionCookie());
    return send(200, { ok: true, signedOut: action === 'change-password' });
  }

  return send(405, { error: 'Operación no permitida' });
}
