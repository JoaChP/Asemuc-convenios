export const fields=['nombre','categoria','ubicacion','direccion','telefono','whatsapp','correo','sitio','descripcion','beneficio','condiciones','estado','inicio','fin'];
export function validate(input){
 const out={};for(const k of fields){if(input[k]!=null&&typeof input[k]!=='string')throw Error('Campo inválido: '+k);out[k]=(input[k]||'').trim();if(out[k].length>3000)throw Error('Texto demasiado largo: '+k);}
 if(!out.nombre||!out.categoria||!out.beneficio)throw Error('Nombre, categoría y beneficio son obligatorios');
 if(!['vigente','borrador','vencido','prospecto'].includes(out.estado))throw Error('Estado inválido');
 if(out.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.correo))throw Error('Correo inválido');
 if(out.sitio){try{const url=new URL(out.sitio);if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw Error()}catch{throw Error('Ingresá un sitio válido con https:// o http://')}}
 if(out.whatsapp&&!/^\+?\d{8,15}$/.test(out.whatsapp.replace(/[\s()-]/g,'')))throw Error('WhatsApp debe contener de 8 a 15 dígitos, incluido el código de país');
 for(const k of ['inicio','fin'])if(out[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(out[k])||!Number.isFinite(Date.parse(out[k]))||new Date(out[k]).toISOString().slice(0,10)!==out[k]))throw Error('Fecha inválida');
 if(out.inicio&&out.fin&&out.inicio>out.fin)throw Error('La fecha final debe ser posterior al inicio');return out;
}
export function imageData(value){
 if(!value)return null;if(typeof value!=='string')throw Error('Imagen inválida');
 const m=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('Usá PNG, JPG o WebP');
 const b=Buffer.from(m[2],'base64');if(b.length>1048576)throw Error('La imagen debe pesar máximo 1 MB');
 const valid=m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
 if(!valid)throw Error('El contenido de la imagen no coincide con su formato');return value;
}
