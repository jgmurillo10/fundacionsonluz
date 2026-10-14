# Fundación Son Luz

Rebuild editorial con Next.js, TypeScript, GSAP y un editor visual Tiptap. Conserva los textos, fotografías, correo, datos bancarios y configuración de EmailJS del sitio original.

## Estado de esta entrega

Incluye la web pública, las vistas del blog y un **sandbox editorial local**: crear y editar entradas, títulos, negritas, cursivas, listas, enlaces, imágenes con descripción, portada, borradores, vista previa, publicación local, retirada, eliminación confirmada, búsqueda y exportación JSON.

**Todavía no es un CMS de producción.** Las entradas se guardan en `localStorage` del navegador, no en una base de datos ni en Internet. La autenticación y conexión de producción se habilitarán en la siguiente fase. El sandbox se deshabilita incondicionalmente con `NODE_ENV=production`: `/admin` redirige al acceso cerrado y el blog no expone borradores.

El sitio actual en fundacionsonluz.com, el branch gh-pages y DNS no se modifican. El workflow Gatsby que publicaba automáticamente se reemplaza por comprobaciones sin despliegue. No hay historias ficticias publicadas.

## Desarrollo

Node.js 22 y npm 10.

```sh
npm install
cp .env.example .env.local
```

Activa `SONLUZ_LOCAL_PREVIEW=1` en .env.local para revisar el panel. Luego:

```sh
npm run dev
```

Rutas:

- `/`, `/about`, `/donate`, `/contact`: sitio público.
- `/blog`, `/blog/[slug]`: entradas publicadas en la vista previa de este navegador.
- `/admin`: listado, filtros, búsqueda y exportación.
- `/admin/posts/new`: nueva entrada.
- `/admin/posts/[id]`: edición.
- `/admin/login`: vista del acceso privado pendiente de configuración.

Las imágenes se validan como JPG, PNG o WebP, se decodifican en el navegador y se ajustan a 1600 px antes de guardarse. No se admiten SVG ni imágenes remotas de terceros. Se requiere descripción para portada e imágenes del contenido. La capacidad de localStorage es limitada: exporta las entradas antes de cambiar de navegador, limpiar sus datos o migrar al backend. No uses el sandbox como archivo definitivo.

## Calidad

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Los tests comprueban fidelidad de texto y fotografías, enlaces y formatos seguros, publicación/borradores, direcciones únicas, conflictos entre pestañas, errores de almacenamiento y desactivación del sandbox en producción. No envían mensajes reales por EmailJS.

La auditoría de dependencias de producción (`npm audit --omit=dev`) no detecta vulnerabilidades. La auditoría completa aún informa una [vulnerabilidad de recursión en braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), transitiva del linter de desarrollo, sin versión corregida disponible. No se han desactivado comprobaciones ni aplicado una degradación incompatible para ocultarla. Tiptap se fija a una misma versión en todas sus extensiones y Vitest usa Vite 7 para mantener reproducible la instalación con npm 10.

## Estructura

- `app/(site)`: sitio público y blog.
- `app/admin`: vistas de administración, cerradas en producción.
- `components/admin`: listado y editor, cargado de forma diferida.
- `lib/content.ts`: contenido original centralizado sin alterar sus datos.
- `lib/blog.ts`: documento estructurado y validación editorial.
- `lib/local-posts.ts`: almacenamiento exclusivo del sandbox.
- `public/images`, `public/fonts`: fotografías originales y tipografía local con licencias OFL.
- `src/legacy-pages`: Gatsby preservado para referencia y pruebas de fidelidad, no compilado como rutas Next.js.
- `cloudflare/migrations`: esquema D1 para la siguiente fase, todavía no aplicado.

## Siguiente fase: Cloudflare

Recomendación: **D1 para entradas + R2 para imágenes**. No hay dependencia de Supabase. Las opciones de alojamiento siguen abiertas; despliegue y migración del dominio están expresamente diferidos.

Para crear recursos se necesita un API token limitado a la cuenta elegida con `Account → D1 → Edit` y `Account → Workers R2 Storage → Edit`, además del Account ID. No se requieren permisos DNS, billing ni despliegue ahora. Las credenciales solo se usarán en el servidor, nunca como NEXT*PUBLIC*\* ni en el repositorio.

Antes de habilitar el CMS real:

1. Crear recursos D1/R2 independientes para Son Luz y aplicar la migración revisada.
2. Conectar autenticación y una lista explícita de administradores. Validar identidad y autorización en cada mutación, no solo layouts o URLs ocultas.
3. Sustituir el adaptador local por operaciones de servidor con validación, control de versiones y direcciones únicas.
4. Guardar imágenes rasterizadas en R2. Servir únicamente archivos autorizados sin exponer medios de borradores.
5. Leer solo entradas publicadas, añadir metadata y sitemap por entrada, y revalidar tras publicar/retirar.
6. Importar entradas locales desde una exportación revisada, comprobar el flujo real y después elegir/configurar el despliegue.

No activar pagos, cambiar DNS ni reemplazar la web existente en esta fase.

Fuentes oficiales:

- [D1: precios](https://developers.cloudflare.com/d1/platform/pricing/) y [límites](https://developers.cloudflare.com/d1/platform/limits/).
- [R2: precios](https://developers.cloudflare.com/r2/pricing/) y [credenciales](https://developers.cloudflare.com/r2/api/tokens/).
- [Tokens: creación](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) y [permisos](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Contacto y donaciones

El formulario mantiene servicio, plantilla y nombres de campos del EmailJS original. Su funcionamiento real depende de que esa configuración siga activa; no se envían pruebas sin autorización. La cuenta de ahorros Bancolombia permanece exactamente como 411-000002-42. No se ha añadido una pasarela de pagos.

Licencia MIT; tipografías bajo SIL Open Font License incluidas en public/fonts.
