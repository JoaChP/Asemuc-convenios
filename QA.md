# Informe de QA — ASEMUC

Fecha: 13 de octubre de 2026, Costa Rica.

Sitio: https://asemuc-convenios.vercel.app

## Resultado

Se completó una revisión funcional y de regresión, con correcciones desplegadas. La ejecución final de `npm test` reporta **52 comprobaciones aprobadas y 0 fallos** (49 casos y 3 agrupaciones del ejecutor). También pasaron **18 verificaciones HTTP contra producción**. Los resultados no equivalen a una certificación exhaustiva de seguridad, accesibilidad o compatibilidad con todos los dispositivos.

El sitio terminó con **41 convenios**, sin el registro temporal de QA. No se crearon cuentas reales ni se cambiaron contraseñas reales durante esta revisión.

## Entornos y métodos

- **Producción — Vercel + Neon:** navegador integrado con la sesión administrativa existente; altas, edición, imágenes, publicación, fechas, filtros, diálogos y eliminación de un convenio de prueba. Solicitudes HTTP independientes sin cookies para verificar las protecciones del backend.
- **PostgreSQL aislado — PGlite:** motor PostgreSQL local en memoria, usando el mismo esquema y el mismo manejador del backend. Se probaron usuarios, contraseñas, sesiones, CRUD, imágenes, fechas, conflictos e importación. Las credenciales utilizadas son fixtures locales, sin acceso a producción.
- **DOM aislado — jsdom:** se ejecutó el código real de las interfaces pública y administrativa con respuestas de API controladas. Estos casos verifican lógica y estados de formularios, pero no sustituyen la representación visual de un navegador.
- **Pruebas unitarias y de contrato:** validaciones, hashing, autenticación, permisos y precisión de versiones.

## Matriz de cobertura

| Área | Comprobaciones | Resultado / evidencia |
|---|---|---|
| Directorio | Carga, búsqueda sin tildes, categoría, ubicación, filtros combinados, cero resultados y recuperación | Aprobado en producción y DOM aislado |
| Detalles | Apertura, cierre, Escape, contenido como texto y nombre accesible del diálogo | Producción: apertura/cierre/teclado. DOM: escape de HTML y etiquetas |
| Crear convenio | Campos requeridos, borrador, persistencia | Aprobado en producción |
| Editar | Apertura, conservación de datos y guardado | Aprobado en producción; conflicto concurrente probado contra PostgreSQL aislado |
| Imágenes | Exceso de 1 MB, formato incompatible, PNG válido, persistencia y vista previa, reemplazo por JPG, quitar imagen | Aprobado en producción. SVG y archivos falsos también probados en backend aislado |
| Publicación | Borrador privado, vigente publicado, inicio futuro oculto, vencimiento oculto | Aprobado; la portada se comprobó también con sesión administrativa |
| Fechas | Fin anterior al inicio, fecha imposible, límites de vigencia | Producción y PostgreSQL aislado |
| Eliminar | Cancelar conserva; confirmar elimina; versión antigua rechazada | Cancelar y eliminar el registro QA: producción. Conflicto: PostgreSQL aislado |
| Usuarios | Listado de registrados, datos sin hashes, creación y duplicados | Listado: producción. Creación/duplicados: backend PostgreSQL aislado y DOM |
| Registro/login | Invitación incorrecta, clave corta, duplicado, clave incorrecta, login válido, cookie segura | Aprobado en PostgreSQL aislado; no se registraron cuentas de prueba reales |
| Contraseñas | Confirmación desigual, reautenticación, cambio propio, restablecimiento ajeno, limpieza de campos | Aprobado en PostgreSQL aislado y DOM |
| Sesiones | Revocación tras cambio de clave, logout, token vencido, limpieza visual al recibir 401 | Aprobado en PostgreSQL aislado y DOM |
| Permisos | Sin sesión no se permite crear/editar/eliminar ni listar usuarios; otro origen rechazado | Aprobado en producción mediante HTTP y en PostgreSQL aislado |
| Errores | JSON malformado, método incorrecto, caída de conexión, respuesta no JSON | HTTP real y DOM aislado |
| Importación | Repetir migración no duplica ni revive eliminados | Aprobado en PostgreSQL aislado |
| Accesibilidad básica | Etiquetas de campos, alternativas de imágenes, nombres de diálogos, controles distinguibles, teclado | Revisión básica aprobada; no es una auditoría WCAG completa |
| Diseño adaptable | Vistas efectivas observadas de 390 px en portada, 490 px en panel y 1280 px en escritorio; sin desbordamiento observado | Revisión parcial. La emulación no reflejó de forma fiable los anchos solicitados de 320/768/1440 px |
| Seguridad HTTP | CSP, HSTS, `nosniff`, errores sin credenciales | Cabeceras presentes; 18 comprobaciones HTTP aprobadas |

## Fallos encontrados y corregidos

1. **Portada con sesión administrativa:** el API entregaba todos los registros al administrador y la portada solo filtraba el estado; podía mostrar convenios fuera de fecha. Se agregó un alcance público explícito y la selección de fechas se hace en PostgreSQL. Una prueba de integración reprodujo el fallo y pasó después de la corrección.
2. **Cambios sin guardar:** volver a la lista podía perder la edición sin advertencia. Se añadió una confirmación accesible; se verificó que cancelar conserva los valores y confirmar descarta.
3. **Sesión vencida:** se añadió manejo de respuestas 401 para regresar al login y limpiar formularios y datos privados visibles.
4. **Errores de red:** ahora se muestran mensajes comprensibles ante desconexión o una respuesta del servidor que no sea JSON.
5. **Carga de imagen:** se bloquea el guardado mientras se lee el archivo y se maneja un error de lectura.
6. **Imágenes inexistentes:** el listado indica si existe imagen y evita peticiones innecesarias que devolvían 404; usa iniciales cuando no hay logo.
7. **Archivo del logo:** el logo era JPEG con extensión PNG; se corrigieron la extensión y sus referencias.
8. **Validaciones:** se reforzaron sitios web y WhatsApp; no se aceptan URL sin host, con credenciales o protocolos ejecutables.
9. **Accesibilidad y texto:** nombres accesibles para diálogos y botones de detalle, ajuste de textos largos, singular del contador y mensajes específicos para borradores.
10. **Límite de intentos:** se limpia el contador después de autenticar correctamente, para no bloquear operaciones legítimas acumuladas.
11. **Confirmaciones:** se reemplazaron las confirmaciones nativas de eliminación/descarte por diálogos del sitio, con foco inicial en Cancelar y etiquetas accesibles.

## Limpieza

Se creó únicamente el convenio **QA · Prueba técnica temporal**. Se usó para borrador, publicación, fechas e imágenes y se eliminó con autorización expresa del usuario. La comprobación HTTP final devuelve **41 convenios y 0 registros QA**. La lista de administradores mantuvo la cuenta existente.

## Límites y comprobaciones que siguen pendientes

- Los flujos de nuevas cuentas y cambio de contraseña se probaron contra PostgreSQL aislado y DOM, no cambiando credenciales reales mediante el navegador de producción.
- No se ejecutaron pruebas en Safari, Firefox ni dispositivos físicos. No se da por aprobada la matriz completa de resoluciones: la herramienta de emulación no aplicó de forma fiable todos los anchos solicitados.
- No se hicieron pruebas de carga, penetración profesional, restauración de backups, ni una auditoría WCAG completa con lector de pantalla.
- Los enlaces externos, teléfonos, descuentos y condiciones comerciales necesitan validación de ASEMUC. Las pruebas no verifican la existencia o validez comercial de cada beneficio.
- La recuperación por correo y la desactivación/eliminación de administradores no están implementadas; no se presentan como funciones existentes.

## Archivos de evidencia

- `qa-tests.txt`: salida íntegra de las 52 comprobaciones automatizadas.
- `qa-http.json`: comprobación HTTP final, con estados esperados/reales y conteo de limpieza.
- `qa-limpieza.png`: confirmación de eliminación y retorno a los 41 convenios.
- `qa-portada.png`: vista pública durante la regresión.

Las correcciones están en la rama `main` del repositorio público https://github.com/JoaChP/Asemuc-convenios y fueron desplegadas en Vercel. Las pruebas son reproducibles con `npm ci` y `npm test` sin requerir acceso a Neon.
