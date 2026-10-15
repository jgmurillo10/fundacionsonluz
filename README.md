# Fundación Son Luz

Rebuild editorial con Next.js, TypeScript, GSAP y un editor visual Tiptap. Conserva los textos, fotografías, correo, datos bancarios y configuración de EmailJS del sitio original.

## Estado de esta entrega

Incluye la web pública y un CMS editorial: crear, leer, editar y eliminar entradas; guardar borradores; publicar y retirar; previsualizar; buscar; exportar JSON; y editar títulos, formatos, listas, enlaces, imágenes con descripción y portadas.

El backend usa un **Cloudflare Worker con bindings D1/R2**. Next.js controla el acceso del administrador, las APIs del navegador y la entrega de imágenes. D1 guarda las entradas y sus versiones; R2 permanece privado. Solo los medios referenciados por una entrada publicada se sirven a visitantes. Los archivos de borradores y las imágenes sin asociar requieren sesión editorial.

La autenticación usa una lista privada de administradores configurada por entorno: cada persona tiene correo y contraseña propios derivados con scrypt, cookie cifrada HTTP-only/SameSite Strict, caducidad de 12 horas, comprobación de origen en mutaciones y límite de intentos con el binding Rate Limiting de Cloudflare. Cambiar el correo o hash, o quitar a una persona de la lista, invalida únicamente sus sesiones; cambiar el secreto de sesión las invalida todas. Cerrar sesión elimina la cookie del navegador. Cada API comprueba autorización; no depende únicamente del layout. No hay registro público ni una vista para gestionar administradores.

Se conserva un sandbox opcional de `localStorage`, solo para desarrollo. No puede activarse en producción. El acceso permanece cerrado hasta configurar el backend y las credenciales reales.

El sitio actual en fundacionsonluz.com, el branch gh-pages y DNS no se modifican. El workflow Gatsby que publicaba automáticamente se reemplaza por comprobaciones sin despliegue. No hay historias ficticias publicadas.

## Desarrollo

Node.js >=22.13 y <25, npm 10.

```sh
npm ci
cp .env.example .env.local
```

Para el sandbox sin backend, activa `SONLUZ_LOCAL_PREVIEW=1` en .env.local y deja vacías las variables CMS. Luego:

```sh
npm run dev
```

### Desarrollo con D1/R2 locales y login real

Configura una contraseña de prueba de 16 a 128 caracteres sin escribirla en el historial:

```sh
read -rsp 'Contraseña local: ' PASSWORD; echo
SONLUZ_ADMIN_EMAIL=editor@example.test SONLUZ_ADMIN_PASSWORD="$PASSWORD" npm run cms:setup
unset PASSWORD
npm run cms:migrate:local
npm run cms:dev
```

En otra terminal ejecuta `npm run dev` y abre `/admin/login`. Mantén `SONLUZ_LOCAL_PREVIEW=0` para probar la autenticación. El script genera los secretos locales en .env.local y .dev.vars, ignorados por Git y con permisos 0600. Wrangler guarda D1/R2 en .wrangler; estos comandos no crean recursos remotos.

El correo principal previsto es `juanchomurcas@gmail.com`, incluido en .env.example; el ejemplo anterior lo sustituye por una cuenta de prueba. No hay contraseña predeterminada. Para añadir otro administrador local con credenciales independientes:

```sh
read -rp 'Correo adicional: ' ADMIN_EMAIL
read -rsp 'Contraseña adicional (16–128 caracteres): ' PASSWORD; echo
SONLUZ_ADDITIONAL_ADMIN_EMAIL="$ADMIN_EMAIL" SONLUZ_ADDITIONAL_ADMIN_PASSWORD="$PASSWORD" npm run cms:setup
unset ADMIN_EMAIL PASSWORD
```

Esto añade o actualiza una entrada de `SONLUZ_ADDITIONAL_ADMINS` sin cambiar las credenciales del administrador principal ni el secreto de sesión. Reinicia Next.js tras cambiar la configuración. Para retirar a alguien, elimina su objeto de esa lista; sus cookies dejan de autorizar solicitudes con la configuración actualizada. Todos los administradores tienen los mismos permisos de CRUD y publicación. No existe gestión de usuarios desde el editor, invitaciones, registro público ni recuperación automática de contraseñas.

Para una revisión sin login del CMS local puede usarse `SONLUZ_LOCAL_PREVIEW=1`, únicamente contra un Worker en localhost y con `NODE_ENV=development`. Nunca habilita un bypass contra un CMS remoto ni en producción.

Rutas:

- `/`, `/about`, `/donate`, `/contact`: sitio público.
- `/blog`, `/blog/[slug]`: solo entradas publicadas; borradores devuelven 404.
- `/admin`: listado, filtros, búsqueda y exportación.
- `/admin/posts/new`: nueva entrada.
- `/admin/posts/[id]`: edición.
- `/admin/login`: acceso privado de los administradores configurados.
- `/api/editor/posts`, `/api/editor/posts/[id]`, `/api/editor/media`, `/api/editor/session`: APIs del editor.
- `/media/[key]`: entrega de imágenes con comprobación de publicación o sesión.

Las imágenes se validan como JPG, PNG o WebP, se decodifican en el navegador y se ajustan a 1600 px antes de guardarse. El servidor verifica tipo, firma y tamaño máximo de 10 MiB; no admite SVG ni URLs externas. Se requiere descripción para portada e imágenes del contenido. El Worker rechaza documentos inseguros, slugs duplicados y versiones obsoletas (409). Los triggers D1 mantienen las asociaciones de imágenes en la misma escritura de la entrada.

Eliminar una entrada quita sus referencias y su acceso público, pero no borra automáticamente el objeto R2: una imagen puede estar compartida por otra entrada. No hay purga automática de archivos huérfanos en esta entrega. El sandbox tiene almacenamiento limitado; exporta antes de limpiar datos o cambiar de navegador. La exportación JSON no es un respaldo de los archivos R2 ni incluye importación automática.

## Analítica de la web pública

Integración opcional con **Cloudflare Workers Analytics Engine**, sin Umami ni scripts externos. El navegador envía eventos mínimos a `/api/analytics`; Next.js valida origen, dominio, ruta pública y privacidad, y los reenvía al Worker con su secreto privado. El Worker vuelve a validar el evento y escribe en el dataset `sonluz_public`, separado del blog D1 y de R2. Se cuentan vistas de `/`, `/about`, `/donate`, `/contact`, `/blog` y artículos, incluidas transiciones Next.js sin recarga. Los controles `data-analytics` envían nombres estables: navegación, menú, donar/contactar, copiar cuenta, correo y enlaces del blog.

Los eventos representan **clics**, no donaciones completadas, copias exitosas ni mensajes entregados. No hay visitantes únicos, atribución, sesiones ni conversiones verificadas. No se almacenan valores del formulario, textos, títulos, destinos de enlaces, parámetros, fragmentos, referrers, IP, user-agent ni identificadores de visitantes. El navegador omite cookies y elimina consultas/fragmentos del `Referer` del colector; Next.js no reenvía cabeceras del visitante. El dataset guarda solo versión, hostname, tipo, ruta y nombre del clic, con timestamp de Cloudflare y contador 1. Los proveedores de alojamiento siguen procesando metadatos de red en sus solicitudes y logs: esto no significa anonimato de transporte.

El tracker solo se monta en el layout público, nunca en `/admin`, login, APIs o previews del editor. Cada envío vuelve a comprobar ruta, dominio y privacidad. Respeta DNT, GPC y `localStorage.setItem('sonluz.analytics.disabled', '1')`; la antigua clave `umami.disabled` también se respeta para conservar opt-outs. Eliminar las claves y recargar permite reactivarlo. El colector exige JSON, un origen HTTPS permitido, una ruta de origen pública coincidente y un cuerpo de hasta 1 KiB. El Worker necesita autenticación y limita ráfagas a 600 eventos/minuto por sitio y ubicación Cloudflare. No es una cuota global ni un control de facturación. Los errores no bloquean acciones de la web; no se reintenta el envío.

Para activarlo cuando se apruebe el despliegue:

1. Mantener el binding `PUBLIC_ANALYTICS` al dataset `sonluz_public` en Wrangler. El dataset remoto se crea automáticamente al escribir el primer evento tras desplegar, no durante el desarrollo local.
2. Configurar `SONLUZ_ANALYTICS_ENABLED=1` en **ambos** servicios: Next.js (compilación y runtime) y Worker (variable Wrangler, actualmente `0`). Mantener `NEXT_PUBLIC_SITE_URL` y `SONLUZ_ANALYTICS_SITE_URL` con el mismo dominio HTTPS canónico. Solo se admiten ese hostname y su variante `www`; localhost, otros previews y desarrollo quedan excluidos.
3. Mantener `SONLUZ_CMS_URL` y `SONLUZ_WORKER_SECRET` únicamente en servidor. No hace falta un API token Cloudflare para escribir eventos desde el binding.
4. Verificar eventos reales con un dominio/dataset de pruebas dedicado antes de activar producción. La aceptación HTTP no demuestra persistencia remota: Analytics Engine escribe en segundo plano, aplica muestreo y puede descartar eventos; esta analítica es orientativa, no contabilidad.

### Consultar estadísticas

Cloudflare Web Analytics estándar **no admite eventos personalizados**. Esta solución usa Analytics Engine y no genera un dashboard Umami ni añade estadísticas al editor. El comando privado devuelve hasta 500 combinaciones de tipo/ruta/acción, ordenadas por número de eventos del periodo:

```sh
# Solo en un terminal de confianza. Nunca NEXT_PUBLIC_, ni en Git ni en el navegador.
export CLOUDFLARE_ACCOUNT_ID='<account-id>'
read -rsp 'Token Account Analytics: Read: ' CLOUDFLARE_ANALYTICS_READ_TOKEN; echo
export CLOUDFLARE_ANALYTICS_READ_TOKEN
npm run analytics:report -- 30
unset CLOUDFLARE_ANALYTICS_READ_TOKEN
```

El token requiere únicamente **Account → Account Analytics → Read**, restringido a la cuenta correspondiente. El comando consulta la API SQL oficial y pondera `SUM(_sample_interval * double1)` para considerar el muestreo; admite 1–90 días. Este permiso de lectura se configurará al desplegar, no se reutiliza un token R2/D1 con permisos distintos. También se puede integrar esa API con Grafana u otra visualización más adelante.

Cloudflare documenta 100.000 escrituras y 10.000 consultas/día en Workers Free, y retención de tres meses. Su página de precios indica que actualmente Analytics Engine no se factura y publica precios futuros; comprobar cuotas/condiciones de la cuenta al desplegar. Cada evento también consume una solicitud a Next.js y al Worker, sujetas a las cuotas de su alojamiento. No se ha activado un plan de pago, desplegado un Worker, creado un dataset remoto ni enviado eventos reales. La web GitHub Pages y el DNS siguen iguales. Los tests simulan transporte/lectura y capturan el binding de escritura; Wrangler local no prueba almacenamiento ni consultas remotas.

Documentación consultada: [inicio y binding](https://developers.cloudflare.com/analytics/analytics-engine/get-started/), [API SQL y permisos](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/), [muestreo](https://developers.cloudflare.com/analytics/analytics-engine/sampling/), [retención](https://developers.cloudflare.com/analytics/analytics-engine/limits/), [precios](https://developers.cloudflare.com/analytics/analytics-engine/pricing/), [Web Analytics sin eventos personalizados](https://developers.cloudflare.com/web-analytics/faq/) y [límites de ráfagas](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Calidad

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Los tests comprueban fidelidad de texto y fotografías, formatos seguros, publicación/borradores, direcciones únicas, conflictos de revisión, sesión/cookie, límites de cuerpo, control de origen y aislamiento de imágenes. Incluyen SQLite con las migraciones reales y R2 simulado. No envían mensajes reales por EmailJS.

La prueba HTTP usa Wrangler local y el servidor Next.js de producción: login/logout, CRUD, publicación/retirada, conflicto 409, sitemap y privacidad de medios. CI la ejecuta con dos administradores independientes y sin credenciales Cloudflare, después de compilar; comprueba contraseñas cruzadas rechazadas, acceso compartido a entradas y que cerrar la sesión de una persona no desconecta a la otra. Para repetirla, con el Worker activo, arranca `npm run start -- --port 3005` y ejecuta:

```sh
read -rsp 'Contraseña local: ' PASSWORD; echo
SONLUZ_ADMIN_PASSWORD="$PASSWORD" npm run cms:smoke
unset PASSWORD
```

Solo admite URLs localhost. Usa `SONLUZ_SITE_TEST_URL` si el sitio escucha en otro puerto. Crea y elimina una entrada temporal en D1 local; la imagen de prueba queda privada en R2 local. No sustituye una prueba visual en navegador.

La prueba adicional `npm run analytics:smoke` usa exclusivamente un sitio y Worker locales con dominio lógico `https://sonluz-test.example.test`. Antes de compilar/arrancar Next.js, exportar `SONLUZ_ANALYTICS_ENABLED=1` y `NEXT_PUBLIC_SITE_URL=https://sonluz-test.example.test`; arrancar Wrangler con `npm run cms:dev -- --port 8787 --var SONLUZ_ANALYTICS_ENABLED:1 --var SONLUZ_ANALYTICS_SITE_URL:https://sonluz-test.example.test`. Comprueba aceptación de vistas/clics, rechazo de fuentes privadas/externas, tamaño/forma del cuerpo, DNT/GPC y configuración del tracker ausente en login. No consulta Analytics Engine remoto ni acredita persistencia. CI ejecuta ambas pruebas; fuera de CI, restaurar las variables originales y recompilar después.

La auditoría de dependencias de producción (`npm audit --omit=dev`) no detecta vulnerabilidades. La auditoría completa aún informa una [vulnerabilidad de recursión en braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), transitiva del linter de desarrollo. `npm audit` sugiere bajar `eslint-config-next` a 14.2.35; no se ha aplicado esa degradación mayor en un proyecto Next.js 16 ni desactivado las comprobaciones. Tiptap se fija a una misma versión en todas sus extensiones y Vitest usa Vite 7 para mantener reproducible la instalación con npm 10.

## Estructura

- `app/(site)`: sitio público y blog.
- `app/admin`: vistas de administración protegidas por sesión.
- `app/api/editor`, `app/media`: frontera servidor del navegador.
- `components/admin`: listado y editor, cargado de forma diferida.
- `lib/content.ts`: contenido original centralizado sin alterar sus datos.
- `lib/blog.ts`: documento estructurado y validación editorial.
- `lib/local-posts.ts`: almacenamiento exclusivo del sandbox.
- `lib/server`: cliente privado del Worker y autenticación.
- `public/images`, `public/fonts`: fotografías originales y tipografía local con licencias OFL.
- `src/legacy-pages`: Gatsby preservado para referencia y pruebas de fidelidad, no compilado como rutas Next.js.
- `cloudflare/worker.ts`, `cloudflare/migrations`, `wrangler.jsonc`: API, esquema, triggers y bindings D1/R2.

## Configuración remota y despliegue diferido

Los recursos aislados `sonluz-blog` (D1) y `sonluz-media` (R2 privado, sin r2.dev ni dominio público) existen. Las tres migraciones se aplicaron a D1 mediante API, sin cargar entradas ni imágenes remotas. El historial de migraciones Wrangler no se registró mediante esa API: al usarlo en el despliegue revisa su primera aplicación; las migraciones se pueden repetir. La migración 0003 reconstruye las referencias sin modificar las entradas ni borrar imágenes.

El Worker y Next.js no están desplegados. `workers_dev: false` evita habilitar una URL pública automáticamente. El rollout requiere aprobación y elegir la URL HTTPS del Worker (o un servicio equivalente) antes de conectar el sitio. Todas sus rutas requieren un bearer secreto de servidor; no hay CORS de navegador. No hay dependencia de Supabase.

Variables exclusivamente de servidor en Next.js:

- `SONLUZ_CMS_URL`: origen HTTPS del Worker, sin credenciales, ruta ni query.
- `SONLUZ_WORKER_SECRET`: secreto compartido, aleatorio y de al menos 32 caracteres. También debe configurarse como secreto del Worker. No es el API token de Cloudflare.
- `SONLUZ_ADMIN_EMAIL`: administrador principal, `juanchomurcas@gmail.com` para Son Luz. El correo no concede acceso sin su contraseña válida.
- `SONLUZ_ADMIN_PASSWORD_HASH`: `salt:hash`, con salt de 32 caracteres hex y hash scrypt de 64 caracteres hex. El script local muestra cómo generarlo sin imprimirlo.
- `SONLUZ_ADDITIONAL_ADMINS`: array JSON opcional (por defecto `[]`) con objetos `{"email":"otra-persona@example.com","passwordHash":"salt:hash"}`. Usa un hash distinto por persona; nunca guardes contraseñas en texto plano. Las direcciones se normalizan a minúsculas. Un JSON inválido, hashes malformados o correos duplicados cierran el acceso de todos los administradores hasta corregir la configuración; no se ignoran errores silenciosamente.
- `SONLUZ_SESSION_SECRET`: secreto aleatorio independiente de al menos 32 caracteres.

En producción, configura esos valores como variables privadas del servidor; no publiques .env.local ni reutilices hashes o secretos de prueba. En el panel del proveedor introduce el JSON sin las comillas simples externas utilizadas para serializarlo en .env.local. Añadir o retirar un administrador requiere actualizar la configuración del despliegue; no requiere una migración D1. Las cookies anteriores a la versión multiadministrador requieren iniciar sesión otra vez.

El token Cloudflare se necesita solo para gestionar/provisionar recursos y desplegar, no para atender el blog. No configurar tokens de cuenta ni credenciales S3 en el navegador. Antes del rollout, rotar cualquier credencial previamente compartida en chat y generar secretos exclusivos de producción; no reutilizar los de las pruebas locales.

Pendiente para habilitarlo en Internet: acordar hosting, configurar contraseñas y secretos de producción, desplegar Worker y Next.js con aprobación, validar la vista previa y después aprobar el cambio de dominio. El correo y contraseña de cualquier administrador adicional deben configurarse explícitamente; no se crea una segunda cuenta predeterminada.

No activar pagos, cambiar DNS ni reemplazar la web existente en esta fase.

Fuentes oficiales:

- [D1: precios](https://developers.cloudflare.com/d1/platform/pricing/) y [límites](https://developers.cloudflare.com/d1/platform/limits/).
- [R2: precios](https://developers.cloudflare.com/r2/pricing/) y [credenciales](https://developers.cloudflare.com/r2/api/tokens/).
- [Tokens: creación](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) y [permisos](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Contacto y donaciones

El formulario mantiene servicio, plantilla y nombres de campos del EmailJS original. Su funcionamiento real depende de que esa configuración siga activa; no se envían pruebas sin autorización. La cuenta de ahorros Bancolombia permanece exactamente como 411-000002-42. No se ha añadido una pasarela de pagos.

Licencia MIT; tipografías bajo SIL Open Font License incluidas en public/fonts.
