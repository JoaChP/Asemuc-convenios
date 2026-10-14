# ASEMUC · Convenios

Directorio público y administración en español. Frontend estático en `public/` y backend Node en `api/app.js`, dentro de un mismo proyecto Vercel. PostgreSQL en Neon guarda convenios, imágenes, administradores y sesiones. Incluye los 41 registros del HTML recibido, sin inventar beneficios adicionales.

## Desarrollo

1. Instalá Node 22 o superior.
2. Ejecutá `npm install`.
3. Copiá `.env.example` a `.env`. Configurá `DATABASE_URL`, `APP_ORIGIN=http://localhost:3000` y un `ADMIN_INVITE_CODE` aleatorio largo.
4. Ejecutá `npm run db:setup` para crear tablas e importar los registros; no sobrescribe registros existentes.
5. Ejecutá `npm run dev` y abrí http://localhost:3000. Administración: `/admin`.
6. Registrá al administrador con el código de invitación e iniciá sesión. La contraseña requiere al menos 12 caracteres.

## GitHub → Vercel → Neon

1. Creá un repositorio GitHub nuevo, por ejemplo `asemuc-convenios`, público, como solicitó el usuario. La carpeta ya tiene Git inicializado; agregá el remoto y subí `main`:

   ```powershell
   git remote add origin https://github.com/TU_USUARIO/asemuc-convenios.git
   git push -u origin main
   ```

2. En el equipo **joachps-projects** de Vercel: **Add New → Project → Import Git Repository**. Seleccioná el repositorio nuevo. Framework: **Other**. Root Directory: raíz del repositorio. No establezcas `public` como Output Directory: el proyecto incluye funciones en `api/`. Dejá el build sin comando y habilitá Node 22 o superior.
3. En el proyecto nuevo, buscá **Storage / Marketplace → Neon**, creá una base nueva usando la opción gratuita disponible y conectala a este proyecto. No conectes la base de protección de datos. Comprobá las condiciones y límites que muestre el panel antes de confirmar.
4. En **Settings → Environment Variables**, verificá que la integración haya agregado `DATABASE_URL`. Si solo aparece otro nombre de cadena de conexión, agregá `DATABASE_URL` con la cadena PostgreSQL que te proporcione Neon. Agregá `ADMIN_INVITE_CODE` (valor aleatorio largo) y `APP_ORIGIN` (la URL exacta de producción, sin barra final, por ejemplo `https://asemuc-convenios.vercel.app`). No compartas estos secretos en el chat ni los subas a Git.
5. Para crear las tablas, colocá la cadena de conexión en tu `.env` local y ejecutá `npm run db:setup`. El despliegue también ejecuta esta inicialización automáticamente cuando DATABASE_URL está configurada; la importación inicial solo se aplica una vez.
6. Hacé **Redeploy** después de configurar las variables. Visitá `/admin`, registrá tu correo usando la invitación y probá iniciar sesión.
7. Añadí un convenio de prueba como **borrador** con imagen: no debe verse en la página pública. Cambialo a **vigente**, verificá su publicación desde una ventana privada, editá sus datos y luego eliminá el registro de prueba.
8. Para sumar administradores compartí la invitación por un medio privado. Cambiá o eliminá `ADMIN_INVITE_CODE` y volvé a desplegar cuando quieras cerrar el registro. Los usuarios existentes siguen pudiendo iniciar sesión.

Documentación: [Funciones Node de Vercel](https://vercel.com/docs/functions/runtimes/node-js), [Neon en Vercel](https://vercel.com/marketplace/neon), [Integración Neon/Vercel](https://neon.com/docs/guides/vercel-managed-integration).

## Comportamiento

- Solo se publican registros `vigente` dentro de las fechas de inicio y fin, en horario de Costa Rica.
- El panel permite añadir, editar y eliminar, con confirmación al eliminar y detección de ediciones simultáneas.
- Las imágenes PNG, JPG y WebP se guardan en PostgreSQL, hasta 1 MB cada una. Para este directorio pequeño simplifica el despliegue; si crece mucho, conviene trasladarlas a almacenamiento de objetos.
- Las sesiones duran 8 horas, usan cookies HttpOnly/SameSite y se revocan al cerrar sesión. HTTPS habilita Secure. Las contraseñas se guardan con scrypt y sal aleatoria.
- El API valida autorización y origen. Login/registro tienen límite persistente por correo e IP. El código de invitación habilita creación de administradores, por lo que debe mantenerse privado.
- No incluye recuperación automática de contraseña ni servicio de correo. El acceso inicial requiere invitación.

## Validación

`npm test` verifica estados, fechas, enlaces e imágenes. Para verificar persistencia y login se necesita una conexión Neon. Antes del despliegue real, completá la prueba manual del paso 7. Desplegado en https://asemuc-convenios.vercel.app con Neon Free asemuc-convenios-db. Verificados los 41 convenios, búsqueda y detalle. Pendiente configurar ADMIN_INVITE_CODE y verificar el flujo administrativo con una cuenta.


## Control de usuarios
Dentro del panel, Control de usuarios muestra los administradores registrados, su nombre, correo, fecha de registro y último acceso. Permite crear cuentas administrativas confirmando la contraseña del operador, sin necesitar el código de invitación. Cambiar mi contraseña exige la contraseña actual y cierra todas las sesiones de la cuenta. Restablecer contraseña permite cambiar la de otro administrador y revoca sus sesiones. No se muestran contraseñas ni sus hashes. Los administradores existentes comparten estos permisos.

