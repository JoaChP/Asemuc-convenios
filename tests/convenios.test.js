import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/app.js';
process.env.APP_ORIGIN='https://asemuc-convenios.vercel.app';
const version='2026-10-13 19:24:26.123456+00';
const data={nombre:'Empresa',categoria:'Salud',beneficio:'Beneficio',estado:'vigente'};
test('listado preserva microsegundos y devuelve versión exacta para guardar',async()=>{
 const sql=async(strings)=>{const q=strings.join('?');if(q.includes('FROM sessions s'))return [{id:1}];if(q.includes('FROM convenios')){assert.match(q,/updated_at::text AS updated_at/);return [{id:'test',data,updated_at:version}]}return []};
 let result;await handler({url:'/api/app?action=list',method:'GET',headers:{cookie:'asemuc=test'}},{setHeader(){},end(s){result=JSON.parse(s)}},()=>sql);assert.equal(result.items[0].updated_at,version);
});
test('edición conserva versión exacta y rechaza solo versiones distintas',async()=>{
 for(const stale of [false,true]){let status,result;const sql=async(strings,...values)=>{const q=strings.join('?');if(q.includes('FROM sessions s'))return [{id:1}];if(q.includes('UPDATE convenios')){assert.equal(values.at(-1),stale?'2026-10-13 19:24:26.123000+00':version);return stale?[]:[{id:'test'}]}return []};
 await handler({url:'/api/app?action=save',method:'POST',headers:{cookie:'asemuc=test',origin:process.env.APP_ORIGIN},body:{...data,id:'test',updated_at:stale?'2026-10-13 19:24:26.123000+00':version}},{setHeader(){},set statusCode(s){status=s},end(s){result=JSON.parse(s)}},()=>sql);assert.equal(status,stale?409:200);if(!stale)assert.equal(result.ok,true);
 }
});
