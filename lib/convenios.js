import { randomBytes } from 'node:crypto';
import { validate, imageData } from './validation.js';

function serialize(rows) {
  return rows.map((row) => ({
    ...row.data,
    id: row.id,
    updated_at: row.updated_at,
    logo: row.has_image ? '/api/app?action=image&id=' + encodeURIComponent(row.id) : '',
  }));
}

export async function readConvenios({ sql, req, res, admin, action, url, send }) {
  if (req.method !== 'GET') return send(405, { error: 'Operación no permitida' });
  if (action === 'trash') {
    if (!admin) return send(401, { error: 'Iniciá sesión para continuar' });
    const rows =
      await sql`SELECT id,data,updated_at::text AS updated_at,false AS has_image FROM convenios WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`;
    return send(200, { items: serialize(rows) });
  }
  if (action === 'list') {
    const publicOnly = !admin || url.searchParams.get('scope') === 'public';
    const rows = publicOnly
      ? await sql`SELECT id,data,updated_at::text AS updated_at,image IS NOT NULL AS has_image FROM published_convenios ORDER BY data->>'nombre'`
      : await sql`SELECT id,data,updated_at::text AS updated_at,image IS NOT NULL AS has_image FROM convenios WHERE deleted_at IS NULL ORDER BY data->>'nombre'`;
    return send(200, { items: serialize(rows) });
  }
  const id = url.searchParams.get('id');
  const rows = admin
    ? await sql`SELECT image FROM convenios WHERE id=${id} AND deleted_at IS NULL`
    : await sql`SELECT image FROM published_convenios WHERE id=${id}`;
  const image = rows[0]?.image?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/);
  if (!image) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader('Content-Type', image[1]);
  res.end(Buffer.from(image[2], 'base64'));
}

export async function writeConvenios({ sql, req, body, action, send }) {
  if (req.method !== 'POST') return send(405, { error: 'Operación no permitida' });
  if (action === 'save') {
    const data = validate(body);
    const image = body.image === undefined ? undefined : imageData(body.image);
    const id = body.id || randomBytes(12).toString('hex');
    if (body.id) {
      const rows =
        image === undefined
          ? await sql`UPDATE convenios SET data=${JSON.stringify(data)}::jsonb,updated_at=now() WHERE id=${id} AND deleted_at IS NULL AND updated_at=${body.updated_at}::timestamptz RETURNING id`
          : await sql`UPDATE convenios SET data=${JSON.stringify(data)}::jsonb,image=${image},updated_at=now() WHERE id=${id} AND deleted_at IS NULL AND updated_at=${body.updated_at}::timestamptz RETURNING id`;
      if (!rows.length)
        return send(409, {
          error: 'El convenio cambió o fue retirado. Recargá la lista antes de editar.',
        });
    } else
      await sql`INSERT INTO convenios(id,data,image) VALUES(${id},${JSON.stringify(data)}::jsonb,${image || null})`;
    return send(200, { ok: true, id });
  }
  if (action === 'delete') {
    const rows =
      await sql`UPDATE convenios SET deleted_at=now(),updated_at=now() WHERE id=${body.id} AND deleted_at IS NULL AND updated_at=${body.updated_at}::timestamptz RETURNING id`;
    if (!rows.length) return send(409, { error: 'El convenio cambió. Recargá la lista.' });
    return send(200, { ok: true });
  }
  if (action === 'restore') {
    const rows =
      await sql`UPDATE convenios SET deleted_at=NULL,updated_at=now() WHERE id=${body.id} AND deleted_at IS NOT NULL AND updated_at=${body.updated_at}::timestamptz RETURNING id`;
    if (!rows.length)
      return send(409, { error: 'El convenio cambió o ya fue restaurado. Actualizá la papelera.' });
    return send(200, { ok: true });
  }
  return send(405, { error: 'Operación no permitida' });
}
