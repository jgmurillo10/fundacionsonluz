# Fundación Son Luz

Rebuild editorial con Next.js, TypeScript, GSAP y un editor visual Tiptap. Conserva los textos, fotografías, correo, datos bancarios y configuración de EmailJS del sitio original.

## Estado de esta entrega

Incluye la web pública y un CMS editorial: crear, leer, editar y eliminar entradas; guardar borradores; publicar y retirar; previsualizar; buscar; exportar JSON; y editar títulos, formatos, listas, enlaces, imágenes con descripción y portadas.

El backend usa un **Cloudflare Worker con bindings D1/R2**. Next.js controla el acceso del administrador, las APIs del navegador y la entrega de imágenes. D1 guarda las entradas y sus versiones; R2 permanece privado. Solo los medios referenciados por una entrada publicada se sirven a visitantes. Los archivos de borradores y las imágenes sin asociar requieren sesión editorial.

La autenticación está implementada para un administrador configurable por entorno: contraseña derivada con scrypt, cookie cifrada HTTP-only/SameSite Strict, caducidad de 12 horas, comprobación de origen en mutaciones y límite de intentos con el binding Rate Limiting de Cloudflare. Cambiar el correo o hash de contraseña invalida las sesiones anteriores. Cerrar sesión elimina la cookie del navegador. Cada API comprueba autorización; no depende únicamente del layout.

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

Para una revisión sin login del CMS local puede usarse `SONLUZ_LOCAL_PREVIEW=1`, únicamente contra un Worker en localhost y con `NODE_ENV=development`. Nunca habilita un bypass contra un CMS remoto ni en producción.

Rutas:

- `/`, `/about`, `/donate`, `/contact`: sitio público.
- `/blog`, `/blog/[slug]`: solo entradas publicadas; borradores devuelven 404.
- `/admin`: listado, filtros, búsqueda y exportación.
- `/admin/posts/new`: nueva entrada.
- `/admin/posts/[id]`: edición.
- `/admin/login`: acceso privado del administrador configurado.
- `/api/editor/posts`, `/api/editor/posts/[id]`, `/api/editor/media`, `/api/editor/session`: APIs del editor.
- `/media/[key]`: entrega de imágenes con comprobación de publicación o sesión.

Las imágenes se validan como JPG, PNG o WebP, se decodifican en el navegador y se ajustan a 1600 px antes de guardarse. El servidor verifica tipo, firma y tamaño máximo de 10 MiB; no admite SVG ni URLs externas. Se requiere descripción para portada e imágenes del contenido. El Worker rechaza documentos inseguros, slugs duplicados y versiones obsoletas (409). Los triggers D1 mantienen las asociaciones de imágenes en la misma escritura de la entrada.

Eliminar una entrada quita sus referencias y su acceso público, pero no borra automáticamente el objeto R2: una imagen puede estar compartida por otra entrada. No hay purga automática de archivos huérfanos en esta entrega. El sandbox tiene almacenamiento limitado; exporta antes de limpiar datos o cambiar de navegador. La exportación JSON no es un respaldo de los archivos R2 ni incluye importación automática.

## Calidad

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Los tests comprueban fidelidad de texto y fotografías, formatos seguros, publicación/borradores, direcciones únicas, conflictos de revisión, sesión/cookie, límites de cuerpo, control de origen y aislamiento de imágenes. Incluyen SQLite con las migraciones reales y R2 simulado. No envían mensajes reales por EmailJS.

La prueba HTTP usa Wrangler local y el servidor Next.js de producción: login/logout, CRUD, publicación/retirada, conflicto 409, sitemap y privacidad de medios. CI la ejecuta sin credenciales Cloudflare, después de compilar. Para repetirla, con el Worker activo, arranca `npm run start -- --port 3005` y ejecuta:

```sh
read -rsp 'Contraseña local: ' PASSWORD; echo
SONLUZ_ADMIN_PASSWORD="$PASSWORD" npm run cms:smoke
unset PASSWORD
```

Solo admite URLs localhost. Usa `SONLUZ_SITE_TEST_URL` si el sitio escucha en otro puerto. Crea y elimina una entrada temporal en D1 local; la imagen de prueba queda privada en R2 local. No sustituye una prueba visual en navegador.

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
- `SONLUZ_ADMIN_EMAIL`: único correo autorizado.
- `SONLUZ_ADMIN_PASSWORD_HASH`: `salt:hash`, con salt de 32 caracteres hex y hash scrypt de 64 caracteres hex. El script local muestra cómo generarlo sin imprimirlo.
- `SONLUZ_SESSION_SECRET`: secreto aleatorio independiente de al menos 32 caracteres.

El token Cloudflare se necesita solo para gestionar/provisionar recursos y desplegar, no para atender el blog. No configurar tokens de cuenta ni credenciales S3 en el navegador. Antes del rollout, rotar cualquier credencial previamente compartida en chat y generar secretos exclusivos de producción; no reutilizar los de las pruebas locales.

Pendiente para habilitarlo en Internet: acordar hosting y acceso de administración, configurar secretos, desplegar Worker y Next.js con aprobación, validar la vista previa y después aprobar el cambio de dominio. No hay recuperación de contraseña ni usuarios múltiples en este CMS de un administrador.

No activar pagos, cambiar DNS ni reemplazar la web existente en esta fase.

Fuentes oficiales:

- [D1: precios](https://developers.cloudflare.com/d1/platform/pricing/) y [límites](https://developers.cloudflare.com/d1/platform/limits/).
- [R2: precios](https://developers.cloudflare.com/r2/pricing/) y [credenciales](https://developers.cloudflare.com/r2/api/tokens/).
- [Tokens: creación](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) y [permisos](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Contacto y donaciones

El formulario mantiene servicio, plantilla y nombres de campos del EmailJS original. Su funcionamiento real depende de que esa configuración siga activa; no se envían pruebas sin autorización. La cuenta de ahorros Bancolombia permanece exactamente como 411-000002-42. No se ha añadido una pasarela de pagos.

Licencia MIT; tipografías bajo SIL Open Font License incluidas en public/fonts.
