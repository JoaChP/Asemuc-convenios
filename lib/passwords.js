import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export function credentials(email,password){
 if(typeof email!=='string'||typeof password!=='string')throw Error('Correo o contraseña inválidos');
 email=email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Correo inválido');
 if(password.length<12||password.length>128)throw Error('La contraseña debe tener de 12 a 128 caracteres');
 return {email,password};
}
export function encodePassword(password){const salt=randomBytes(16).toString('hex');return {salt,digest:scryptSync(password,salt,64).toString('hex')}}
export function verifyPassword(password,user){if(typeof password!=='string'||password.length>128)return false;const digest=scryptSync(password,user?.salt||'dummy-salt',64);const stored=Buffer.from(user?.password_hash||'','hex');return stored.length===digest.length&&timingSafeEqual(digest,stored)}
