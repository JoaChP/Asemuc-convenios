import test from 'node:test';import assert from 'node:assert/strict';import {validate,imageData} from './validation.js';
const valid={nombre:'Empresa',categoria:'Salud',beneficio:'Descuento',estado:'vigente'};
test('acepta un convenio y conserva sus datos',()=>assert.equal(validate(valid).nombre,'Empresa'));
test('rechaza estados y campos obligatorios inválidos',()=>{assert.throws(()=>validate({...valid,estado:'publico'}));assert.throws(()=>validate({...valid,beneficio:''}))});
test('rechaza enlaces ejecutables y fechas incoherentes',()=>{assert.throws(()=>validate({...valid,sitio:'javascript:alert(1)'}));assert.throws(()=>validate({...valid,inicio:'2026-02-30'}));assert.throws(()=>validate({...valid,inicio:'2026-10-20',fin:'2026-10-01'}))});
test('rechaza SVG y contenido que suplanta PNG',()=>{assert.throws(()=>imageData('data:image/svg+xml;base64,PHN2Zz4='));assert.throws(()=>imageData('data:image/png;base64,YWJj'))});
test('rechaza imágenes mayores a 1 MB',()=>assert.throws(()=>imageData('data:image/png;base64,'+Buffer.alloc(1048577).toString('base64'))));
