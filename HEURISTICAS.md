# Heurísticas aplicadas a ASEMUC

13 de octubre de 2026 · [Sitio público](https://asemuc-convenios.vercel.app) · [Administración](https://asemuc-convenios.vercel.app/admin)

## Código y mantenimiento

| Principio | Cambio concreto |
|---|---|
| KISS / YAGNI | Se conserva una aplicación pequeña de JavaScript y PostgreSQL. Se usan funciones y módulos concretos, sin añadir un framework ni jerarquías de clases. |
| DRY | Campos, estados y límite de imágenes se comparten entre interfaz y validación. Cookies y límites de intentos están centralizados. La vista SQL `published_convenios` es la única regla para publicar por estado, fechas y papelera. |
| Responsabilidad única | El punto de entrada HTTP delega en acceso, usuarios y convenios. Seguridad y esquema tienen módulos propios. |
| Dependencias explícitas | El backend recibe su conexión SQL; las mismas funciones se verifican con un PostgreSQL aislado, sin credenciales reales. |
| Menor conocimiento | Cada módulo trabaja con los datos y servicios que recibe, sin depender del estado interno de otros módulos. |
| Código legible | Se formatearon JavaScript, HTML, CSS y configuración. `npm run format:check` detecta desvíos del formato. |

SOLID se aplica donde corresponde a esta arquitectura funcional. No se agregan herencia, interfaces artificiales ni patrones que el sistema no necesita.

## Las 10 heurísticas de Nielsen

| Heurística | Aplicación visible |
|---|---|
| 1. Estado del sistema | Mensajes al verificar la sesión, cargar listas, leer imágenes, guardar y crear usuarios. Indicadores `aria-busy` y bloqueo de envíos duplicados. |
| 2. Lenguaje del usuario | Estados visibles «Borrador», «Publicado», «Vencido» y «En revisión». Mensajes en español y explicación de cuándo se publica un convenio. |
| 3. Control y libertad | Eliminar envía a una papelera privada; Restaurar recupera la ficha. Cancelar conserva cambios. Descartar requiere confirmación. Limpiar filtros recupera la búsqueda inicial. |
| 4. Consistencia | Estados, formularios, botones, carga y mensajes utilizan criterios compartidos. |
| 5. Prevención de errores | Acciones de formularios deshabilitadas con campos inválidos o contraseñas distintas. Validación equivalente del servidor. Confirmación antes de retirar un convenio y control de ediciones concurrentes. |
| 6. Reconocer antes que recordar | Ayuda breve dentro del panel; campos etiquetados, estados con nombres claros, botones para mostrar contraseñas y acceso visible a la papelera. |
| 7. Eficiencia | Búsqueda y filtros combinables, Alt+B para enfocar la búsqueda administrativa, Escape para cerrar diálogos y restauración del foco al cerrar detalles. |
| 8. Minimalismo | La ayuda se despliega cuando se necesita. La papelera es una vista separada del listado activo. |
| 9. Recuperación de errores | La portada ofrece Intentar de nuevo; los mensajes de red sugieren cómo recuperarse. Un fallo de carga conserva la lista anterior. La papelera permite recuperar una eliminación accidental. |
| 10. Ayuda y documentación | Instrucciones de publicación, imágenes, usuarios, recuperación y atajos en el panel; guía de contribución y plantilla de pull request en el repositorio. |

## Leyes de trabajo y robustez

- **Linus:** pruebas reproducibles, repositorio público, plantilla de pull request y guía para solicitar revisión a colaboradores. Se configuró CI para ejecutar formato y pruebas. Esto facilita la revisión; no implica que haya una revisión humana independiente ya realizada.
- **Brooks:** cambios acotados en la aplicación existente y sin añadir equipo o coordinación innecesaria.
- **Conway:** límites de módulos comprensibles para el equipo pequeño que mantiene el sitio, con responsabilidades documentadas.
- **Postel:** normalización de espacios y correos y tolerancia de formatos de contacto. La validación de credenciales, permisos, archivos y protocolos sigue siendo estricta.

## Comprobación

- **57 comprobaciones automatizadas aprobadas**, sin fallos, y formato consistente.
- **21 verificaciones HTTP en producción aprobadas**, incluidas la privacidad de papelera y la protección de restauración; el listado público devuelve 41 convenios y 0 registros de QA.
- Incluyen PostgreSQL aislado y pruebas del DOM: papelera privada, rechazo de ediciones de retirados, restauración, conflictos, campos incompletos, contraseñas distintas, prevención de envíos duplicados y limpieza de filtros.
- CI de GitHub ejecutó correctamente el cambio de implementación: [ejecución de calidad](https://github.com/JoaChP/Asemuc-convenios/actions/runs/38502874910).
- Vercel desplegó la implementación y se verificaron la ayuda y la papelera vacía con una sesión administrativa real. La restauración se verificó en PostgreSQL aislado y DOM, sin retirar convenios reales en producción.
- Se mantienen los 41 convenios originales. No se modificaron cuentas ni contraseñas reales.

La matriz de dispositivos, navegadores y auditoría de accesibilidad completa conserva los límites del informe de QA previo. Estas mejoras no constituyen una certificación universal de usabilidad o seguridad.
