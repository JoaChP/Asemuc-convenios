import {$,el,api,norm} from './shared.js';
const titles={nombre:'Nombre de la empresa *',categoria:'Categoría *',ubicacion:'Ubicación',direccion:'Dirección exacta',telefono:'Teléfono',whatsapp:'WhatsApp con código de país',correo:'Correo electrónico',sitio:'Sitio web',descripcion:'Descripción',beneficio:'Beneficio para asociados *',condiciones:'Requisitos y condiciones',estado:'Estado',inicio:'Fecha de inicio',fin:'Fecha de vencimiento'};
let items=[],editing=null,image,register=false,dirty=false;
for(const [key,title] of Object.entries(titles)){const label=el('label',title);let input;if(key==='estado'){input=el('select');for(const s of ['borrador','vigente','vencido','prospecto']){const o=el('option',s);o.value=s;input.append(o)}}else if(['descripcion','beneficio','condiciones','direccion'].includes(key))input=el('textarea');else{input=el('input');input.type=['inicio','fin'].includes(key)?'date':key==='correo'?'email':key==='sitio'?'url':'text'}input.name=key;input.required=['nombre','categoria','beneficio'].includes(key);input.maxLength=3000;if(['descripcion','beneficio','condiciones'].includes(key))label.className='wide';label.append(input);$('fields').append(label)}
function message(e){$('message').textContent=e?.message||e||'';if(e)window.scrollTo({top:0,behavior:'smooth'})}
function show(id){for(const x of ['auth','dashboard','editor','users','password-panel'])$(x).hidden=x!==id}
function render(){const records=$('records');records.replaceChildren();$('summary').textContent=items.length+' convenios registrados · '+items.filter(r=>r.estado==='vigente').length+' marcados vigentes';for(const r of items.filter(r=>norm(r.nombre+' '+r.categoria+' '+r.estado).includes(norm($('search').value)))){const row=el('div',undefined,'record'),text=el('div'),actions=el('div',undefined,'record-actions');text.append(el('strong',r.nombre),el('small',r.categoria+' · '+r.estado));const edit=el('button','Editar','secondary'),del=el('button','Eliminar','danger');edit.onclick=()=>open(r);del.onclick=async()=>{if(!confirm('¿Eliminar el convenio de '+r.nombre+'? Esta acción es permanente.'))return;del.disabled=true;try{await api('delete',{id:r.id,updated_at:r.updated_at});await load();message('Convenio eliminado')}catch(e){message(e)}finally{del.disabled=false}};actions.append(edit,del);row.append(text,actions);records.append(row)}if(!records.children.length)records.append(el('p','No hay convenios para mostrar.'))}
async function load(){items=(await api('list')).items;render();show('dashboard')}
function open(r){editing=r;image=undefined;dirty=false;$('convenio').reset();for(const key of Object.keys(titles))$('convenio').elements[key].value=r?.[key]||(key==='estado'?'borrador':'');$('preview').hidden=!r?.logo;if(r?.logo)$('preview').src=r.logo;$('preview').onerror=()=>{$('preview').hidden=true};$('editor-title').textContent=r?'Editar convenio':'Añadir convenio';message('');show('editor');$('convenio').elements.nombre.focus()}
$('new').onclick=()=>open(null);$('cancel').onclick=()=>{if(dirty&&!confirm('Tenés cambios sin guardar. ¿Descartarlos y volver a la lista?'))return;dirty=false;show('dashboard')};$('search').oninput=render;$('reload').onclick=()=>load().catch(message);
$('convenio').addEventListener('input',()=>{dirty=true});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
$('switch').onclick=()=>{register=!register;$('invite-label').hidden=!register;$('auth-title').textContent=register?'Crear administrador':'Bienvenido de nuevo';$('auth-submit').textContent=register?'Registrar administrador':'Iniciar sesión';$('switch').textContent=register?'Ya tengo cuenta':'Registrar administrador';$('login').elements.invite.required=register;$('login').elements.password.autocomplete=register?'new-password':'current-password';message('')};
$('login').onsubmit=async e=>{e.preventDefault();$('auth-submit').disabled=true;try{const body=Object.fromEntries(new FormData(e.target));await api(register?'register':'login',body);if(register){$('switch').click();message('Cuenta creada. Ya podés iniciar sesión.')}else{message('');await load()}}catch(e){message(e)}finally{$('auth-submit').disabled=false}};
$('logout').onclick=async()=>{try{await api('logout',{});items=[];$('records').replaceChildren();$('login').reset();show('auth')}catch(e){message(e)}};
$('image').onchange=async()=>{const file=$('image').files[0];if(!file)return;if(file.size>1048576||!['image/png','image/jpeg','image/webp'].includes(file.type)){$('image').value='';message('Elegí una imagen PNG, JPG o WebP de máximo 1 MB');return}$('save').disabled=true;try{image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer la imagen. Intentá seleccionarla nuevamente.'));reader.readAsDataURL(file)});dirty=true;$('preview').src=image;$('preview').hidden=false}catch(e){message(e)}finally{$('save').disabled=false}};
$('remove-image').onclick=()=>{dirty=true;image=null;$('image').value='';$('preview').hidden=true};
$('convenio').onsubmit=async e=>{e.preventDefault();$('save').disabled=true;try{const body=Object.fromEntries(new FormData(e.target));if(editing){body.id=editing.id;body.updated_at=editing.updated_at}if(image!==undefined)body.image=image;await api('save',body);dirty=false;await load();message(body.estado==='borrador'?'Borrador guardado. No se muestra en la página pública.':'Convenio guardado. Se publica solo si está vigente y dentro de sus fechas.')}catch(e){message(e)}finally{$('save').disabled=false}};
window.addEventListener('session-expired',()=>{dirty=false;items=[];editing=null;image=undefined;for(const form of document.forms)form.reset();$('records').replaceChildren();$('user-list').replaceChildren();if($('reset-dialog').open)$('reset-dialog').close();show('auth');message('Tu sesión venció. Iniciá sesión para continuar.')});
try{const {admin}=await api('me');if(admin)await load();else show('auth')}catch(e){show('auth');message(e)}

let resetUser=null;
const date=value=>value?new Date(value).toLocaleString('es-CR',{timeZone:'America/Costa_Rica'}):'Sin registro';
async function loadUsers(){
 const {users,currentId}=await api('users');$('user-list').replaceChildren();
 for(const user of users){const row=el('div',undefined,'record'),info=el('div');info.append(el('strong',user.name||user.email),el('small',user.email+(String(user.id)===String(currentId)?' · Tu cuenta':'')),el('small','Administrador · Registrado: '+date(user.created_at)),el('small','Último acceso: '+date(user.last_login_at)));row.append(info);
 if(String(user.id)!==String(currentId)){const reset=el('button','Restablecer contraseña','secondary');reset.onclick=()=>{resetUser=user;$('reset-password').reset();$('reset-error').textContent='';$('reset-target').textContent='Cuenta: '+user.email;$('reset-dialog').showModal()};row.append(reset)}
 $('user-list').append(row)}show('users');
}
$('users-open').onclick=()=>{message('');loadUsers().catch(message)};
$('users-back').onclick=()=>{$('create-user').reset();show('dashboard')};
$('password-open').onclick=()=>{message('');$('change-password').reset();show('password-panel')};
$('password-back').onclick=()=>{$('change-password').reset();show('dashboard')};
$('reset-cancel').onclick=()=>$('reset-dialog').close();
$('reset-dialog').addEventListener('close',()=>{$('reset-password').reset();resetUser=null});
function passwordBody(form){const body=Object.fromEntries(new FormData(form));if(body.password!==body.confirm)throw Error('Las contraseñas nuevas no coinciden');delete body.confirm;return body}
for(const action of ['create-user','change-password','reset-password']){
 $(action).onsubmit=async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('button[type="submit"]');button.disabled=true;
 try{const body=passwordBody(form);if(action==='reset-password')body.id=resetUser.id;await api(action,body);form.reset();
 if(action==='change-password'){items=[];$('records').replaceChildren();$('user-list').replaceChildren();$('login').reset();show('auth');message('Contraseña actualizada. Iniciá sesión con tu nueva contraseña.')}
 else{if(action==='reset-password')$('reset-dialog').close();await loadUsers();message(action==='create-user'?'Administrador creado. Ya puede iniciar sesión.':'Contraseña restablecida. Se cerraron las sesiones de esa cuenta.')}
 }catch(e){if(action==='reset-password')$('reset-error').textContent=e.message;else message(e)}finally{button.disabled=false}
 }
}
