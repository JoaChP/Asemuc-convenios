import { createHash, timingSafeEqual } from 'node:crypto';

export const hash = (value) => createHash('sha256').update(value).digest('hex');

export function equal(a, b) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function allowAttempt(sql, key) {
  const rows =
    await sql`INSERT INTO auth_limits(key,hits,reset_at) VALUES(${key},1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_limits.reset_at<now() THEN 1 ELSE auth_limits.hits+1 END,reset_at=CASE WHEN auth_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_limits.reset_at END RETURNING hits`;
  return rows[0].hits <= 10;
}

export function sessionCookie(token = '', maxAge = 0) {
  const secure = process.env.APP_ORIGIN?.startsWith('https:') ? '; Secure' : '';
  return `asemuc=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}
