# Cambios y revisión

Prepará cambios pequeños, con un problema y un resultado claros. Preferí la solución más simple que resuelva el comportamiento necesario. Evitá dependencias, clases y funcionalidades especulativas.

## Responsabilidades

- `api/app.js`: entrada HTTP, origen y sesión; delega cada área.
- `lib/access.js`: registro e inicio de sesión.
- `lib/users.js`: usuarios y cambios de contraseña.
- `lib/convenios.js`: convenios, imágenes y papelera.
- `lib/security.js`: límites de intentos, tokens y cookies.
- `lib/schema.js`: esquema y vista `published_convenios`, única regla de publicación por estado, fecha y eliminación.
- `public/convenio-fields.js`: definición compartida de campos, estados y límites de imágenes.
- `public/shared.js`: peticiones, formularios y estados de acciones.

Las funciones reciben sus dependencias de forma explícita. Se prueban con PostgreSQL aislado; no deben necesitar credenciales de producción. Los módulos conocen sus propias tareas y los datos que reciben; no deben acceder a detalles internos de otra área.

## Antes de proponer un cambio

1. Ejecutá `npm ci`, `npm run format:check` y `npm test`.
2. Si cambiaste formato, ejecutá `npm run format`.
3. Describí el problema, el resultado y la validación en el pull request.
4. Revisá carga, error, vacío, teclado y cancelación cuando cambies un flujo de interfaz.
5. Pedí revisión a otro colaborador cuando esté disponible. Una suite verde no reemplaza una revisión humana ni impone por sí misma una aprobación obligatoria.

El workflow de GitHub repite las verificaciones con permisos de lectura y sin secretos de Neon. Usa las acciones oficiales [checkout](https://github.com/actions/checkout) y [setup-node](https://github.com/actions/setup-node).

## Criterios de diseño

Las heurísticas orientan decisiones concretas, no justifican complejidad adicional. SOLID se aplica donde aporta: responsabilidades pequeñas, dependencias explícitas y contratos claros, sin crear jerarquías de clases innecesarias.

La ley de Linus inspira revisión y pruebas reproducibles. Brooks aconseja acotar el trabajo y evitar coordinación innecesaria. Conway orienta límites comprensibles para un equipo pequeño. Estas leyes no constituyen funcionalidades que deban agregarse a la aplicación.

El principio de Postel se aplica a entradas inocuas: por ejemplo, espacios en correos y formatos de contacto. Contraseñas, permisos, protocolos de URL y archivos inválidos conservan validación estricta. La tolerancia de formato nunca debe conceder acceso ni ocultar un error de negocio.
