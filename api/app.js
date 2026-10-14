import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db } from '../lib/db.js';
import { validate, imageData } from '../lib/validation.js';
import {credentials,encodePassword,verifyPassword} from '../lib/passwords.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res,sqlFactory=db){
 res.setHeader('Cache-Control','no-store');const u=new URL(req.url,'http://localhost');const action=u.searchParams.get('action')||'list';
 const send=(s,data)=>{res.statusCode=s;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 try{
 const sql=sqlFactory();
 if(req.method!=='GET'&&req.headers.origin!==process.env.APP_ORIGIN)return send(403,{error:'Origen no autorizado'});
 let body=req.body||{};if(typeof body==='string')body=JSON.parse(body);
 const token=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('asemuc='))?.slice(7);
 const sessions=token?await sql`SELECT a.id,a.email,a.name FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now()`:[];const admin=sessions[0];
 if(action==='me'&&req.method==='GET')return send(200,{admin:admin||null});
 if(action==='login'||action==='register'){
 if(req.method!=='POST')return send(405,{error:'Método no permitido'});
 const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return send(400,{error:'Ingresá un correo y contraseña de 12 a 128 caracteres'});
 const ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown';
 const key=hash(ip+email);const hits=await sql`INSERT INTO auth_limits(key,hits,reset_at) VALUES(${key},1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_limits.reset_at<now() THEN 1 ELSE auth_limits.hits+1 END,reset_at=CASE WHEN auth_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_limits.reset_at END RETURNING hits`;
 if(hits[0].hits>10)return send(429,{error:'Demasiados intentos. Intentá en 15 minutos'});
 if(action==='register'){
 if(!process.env.ADMIN_INVITE_CODE||!equal(String(body.invite||''),process.env.ADMIN_INVITE_CODE))return send(403,{error:'Código de invitación inválido'});
 const salt=randomBytes(16).toString('hex');const digest=scryptSync(password,salt,64).toString('hex');
 const rows=await sql`INSERT INTO admins(email,salt,password_hash) VALUES(${email},${salt},${digest}) ON CONFLICT(email) DO NOTHING RETURNING id`;
 if(!rows.length)return send(409,{error:'Este correo ya está registrado'});return send(201,{ok:true});
 }
 const rows=await sql`SELECT * FROM admins WHERE email=${email}`;const a=rows[0];const digest=scryptSync(password,a?.salt||'dummy-salt',64).toString('hex');
 if(!a||!equal(digest,a.password_hash))return send(401,{error:'Credenciales incorrectas'});
 await sql`UPDATE admins SET last_login_at=now() WHERE id=${a.id}`;
 const t=randomBytes(32).toString('hex');await sql`INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(${hash(t)},${a.id},now()+interval '8 hours')`;
 res.setHeader('Set-Cookie',`asemuc=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`);return send(200,{ok:true});
 }
 if(action==='list'&&req.method==='GET'){
 const rows=admin?await sql`SELECT id,data,updated_at FROM convenios ORDER BY data->>'nombre'`:await sql`SELECT id,data,updated_at FROM convenios WHERE data->>'estado'='vigente' AND (coalesce(data->>'inicio','')='' OR data->>'inicio' <= to_char(now() AT TIME ZONE 'America/Costa_Rica','YYYY-MM-DD')) AND (coalesce(data->>'fin','')='' OR data->>'fin'>=to_char(now() AT TIME ZONE 'America/Costa_Rica','YYYY-MM-DD')) ORDER BY data->>'nombre'`;
 return send(200,{items:rows.map(r=>({...r.data,id:r.id,updated_at:r.updated_at,logo:'/api/app?action=image&id='+encodeURIComponent(r.id)}))});
 }
 if(action==='image'&&req.method==='GET'){
 const rows=admin?await sql`SELECT image FROM convenios WHERE id=${u.searchParams.get('id')}`:await sql`SELECT image FROM convenios WHERE id=${u.searchParams.get('id')} AND data->>'estado'='vigente' AND (coalesce(data->>'inicio','')='' OR data->>'inicio'<=to_char(now() AT TIME ZONE 'America/Costa_Rica','YYYY-MM-DD')) AND (coalesce(data->>'fin','')='' OR data->>'fin'>=to_char(now() AT TIME ZONE 'America/Costa_Rica','YYYY-MM-DD'))`;
 const m=rows[0]?.image?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/);if(!m){res.statusCode=404;return res.end()};res.setHeader('Content-Type',m[1]);return res.end(Buffer.from(m[2],'base64'));
 }
 if(!admin)return send(401,{error:'Iniciá sesión para continuar'});
 if(action==='users'&&req.method==='GET'){
 const users=await sql`SELECT id,email,name,created_at,last_login_at FROM admins ORDER BY created_at,id`;
 return send(200,{users,currentId:admin.id});
 }
 if(['create-user','change-password','reset-password'].includes(action)){
 if(req.method!=='POST')return send(405,{error:'Método no permitido'});
 const key='reauth:'+admin.id;
 const hits=await sql`INSERT INTO auth_limits(key,hits,reset_at) VALUES(${key},1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_limits.reset_at<now() THEN 1 ELSE auth_limits.hits+1 END,reset_at=CASE WHEN auth_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_limits.reset_at END RETURNING hits`;
 if(hits[0].hits>10)return send(429,{error:'Demasiados intentos. Intentá en 15 minutos'});
 const current=(await sql`SELECT salt,password_hash FROM admins WHERE id=${admin.id}`)[0];
 if(!verifyPassword(body.currentPassword,current))return send(403,{error:'Tu contraseña actual es incorrecta'});
 const {email,password}=credentials(action==='create-user'?body.email:admin.email,body.password);
 const {salt,digest}=encodePassword(password);
 if(action==='create-user'){
 const name=typeof body.name==='string'?body.name.trim():'';if(name.length>120)return send(400,{error:'El nombre admite máximo 120 caracteres'});
 const users=await sql`INSERT INTO admins(email,name,salt,password_hash) VALUES(${email},${name},${salt},${digest}) ON CONFLICT(email) DO NOTHING RETURNING id`;
 if(!users.length)return send(409,{error:'Este correo ya está registrado'});
 return send(201,{ok:true});
 }
 const id=action==='change-password'?String(admin.id):String(body.id||'');
 if(!/^\d+$/.test(id))return send(400,{error:'Usuario inválido'});
 if(action==='reset-password'&&id===String(admin.id))return send(400,{error:'Usá Cambiar mi contraseña para tu propia cuenta'});
 const exists=await sql`SELECT id FROM admins WHERE id=${id}`;if(!exists.length)return send(404,{error:'Usuario no encontrado'});
 await sql.transaction([
 sql`UPDATE admins SET salt=${salt},password_hash=${digest} WHERE id=${id}`,
 sql`DELETE FROM sessions WHERE admin_id=${id}`
 ]);
 if(action==='change-password')res.setHeader('Set-Cookie','asemuc=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
 return send(200,{ok:true,signedOut:action==='change-password'});
 }
 if(action==='logout'&&req.method==='POST'){await sql`DELETE FROM sessions WHERE token_hash=${hash(token)}`;res.setHeader('Set-Cookie','asemuc=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true})}
 if(action==='save'&&req.method==='POST'){
 const data=validate(body);const image=body.image===undefined?undefined:imageData(body.image);const id=body.id||randomBytes(12).toString('hex');
 if(body.id){const rows=image===undefined?await sql`UPDATE convenios SET data=${JSON.stringify(data)}::jsonb,updated_at=now() WHERE id=${id} AND updated_at=${body.updated_at}::timestamptz RETURNING id`:await sql`UPDATE convenios SET data=${JSON.stringify(data)}::jsonb,image=${image},updated_at=now() WHERE id=${id} AND updated_at=${body.updated_at}::timestamptz RETURNING id`;if(!rows.length)return send(409,{error:'El convenio cambió. Recargá antes de editar'})}
 else await sql`INSERT INTO convenios(id,data,image) VALUES(${id},${JSON.stringify(data)}::jsonb,${image||null})`;
 return send(200,{ok:true,id});
 }
 if(action==='delete'&&req.method==='POST'){const rows=await sql`DELETE FROM convenios WHERE id=${body.id} AND updated_at=${body.updated_at}::timestamptz RETURNING id`;if(!rows.length)return send(409,{error:'El convenio cambió. Recargá la lista'});return send(200,{ok:true})}
 return send(405,{error:'Operación no permitida'});
 }catch(e){console.error('API:',e.code||e.name);return send(e.message==='Base de datos sin configurar'?503:400,{error:e.code?'No se pudo completar la operación':e.message})}
}
