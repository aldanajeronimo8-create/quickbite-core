# Fase 18: diagnóstico de validación y bloqueo de migración

Fecha de inspección: 2026-09-27. Rama de trabajo: `phase-18-validation-hardening`.

## Resultado

La base revisada **no es la arquitectura QuickBite Core descrita para la Fase 18**. Es una aplicación Vite que conecta directamente desde el navegador a Supabase. No contiene `server/`, `database/migrations/`, un API propio, `VITE_API_BASE_URL`, `quickbiteDataApi.ts`, IndexedDB ni una cola de sincronización. Por tanto, esta fase no puede afirmar validación de la arquitectura objetivo ni sustituirla por cambios especulativos sin recibir la rama/revisión correcta.

No se han ejecutado migraciones ni pruebas contra producción, ni se ha modificado ningún dato remoto.

## Evidencia de inventario

- El único conjunto de migraciones está en `supabase/migrations/`, no en `database/migrations/`.
- La configuración de contenedores solo inicia el frontend/nginx; no define PostgreSQL ni la API.
- `src/lib/supabase.ts` crea clientes de Supabase usando variables públicas de Vite y los módulos de UI los consumen directamente.
- El flujo CI de E2E usa una URL de Supabase y secretos de Supabase. Esto es incompatible con la validación aislada solicitada para QuickBite Core.
- No hay binario de Docker, cliente `psql`/`pg_isready`, ni CLI de Supabase disponibles en este entorno. Además, estas migraciones dependen de los esquemas gestionados `auth` y de funciones de Supabase, por lo que PostgreSQL plano no es un sustituto fiel.

## Clasificación de Supabase restante

| Clase | Archivos/área | Estado y riesgo |
| --- | --- | --- |
| B — incompatible con la arquitectura final | `src/lib/supabase.ts`, `src/store/authStore.ts`, `src/repositories/*.ts`, páginas y componentes que importan `requireSupabaseClient` | El frontend usa `@supabase/supabase-js` para autenticación, RPC, lecturas y realtime. Esto constituye acceso directo frontend → Supabase/PostgREST y debe reemplazarse por una API propia en una migración dedicada. |
| B — incompatible con la arquitectura final | `supabase/functions/`, `supabase/migrations/`, scripts `connect-supabase.mjs` y `apply-migrations.mjs` | Implementan backend y persistencia específicos de Supabase, no el esquema/API PostgreSQL propio requerido. |
| B — incompatible con la arquitectura final | `.github/workflows/backup.yml`, `health-check.yml`, `ci.yml` E2E | Operan contra secretos y URL de Supabase; no deben reutilizarse para pruebas aisladas del Core. |
| D — migración pendiente | autenticación, perfiles, menú, pedidos, wallet, pagos, notificaciones, auditoría y realtime | No hay contratos HTTP ni endpoints de la API Core para migrar estos módulos de forma segura. La prioridad es crítica para autenticación, menú, pedidos y wallet; alta para perfiles/roles/auditoría; media para realtime/notificaciones. |
| A — temporalmente necesaria solo para la aplicación presente | `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` | Son necesarias para que el estado actual funcione, pero no pertenecen a la arquitectura final y no se deben copiar al Core. |
| C — código muerto | No determinado sin ejecutar cobertura y trazas de la aplicación correcta. | No se elimina código por conjetura. |

## Hallazgos corregidos

Se corrigió un error de TypeScript real en `VisualThemeProvider`: el fallback de apariencia pública usaba `LAST_THEME_STORAGE_KEY` sin declararlo. La corrección declara una clave explícita y mantiene las preferencias autenticadas separadas por usuario.

## Validaciones realizadas

- `pnpm typecheck`: correcto después de la corrección.
- `pnpm lint`: correcto después de la corrección.
- `pnpm test`: 8 archivos y 19 pruebas correctas.
- `pnpm build`: correcto.
- Se detectaron nombres de migración Supabase con timestamps repetidos (`20260831000000` y `20260901000000`). Esa condición requiere resolución antes de intentar aplicar el conjunto con tooling de Supabase.

## Validaciones no realizadas y motivo

| Validación | Motivo concreto |
| --- | --- |
| PostgreSQL aislado y todas las migraciones | No hay PostgreSQL/Docker/CLI instalados; el conjunto encontrado depende de Supabase `auth`, no de PostgreSQL Core. |
| `quickbite.create_order_tx`, `quickbite.v_menu`, wallets y `auth_sessions` | No existen: la función encontrada es `public.create_order_tx` y no hay esquema `quickbite`, vista `v_menu` ni tabla `auth_sessions` de Core. |
| API `/health`, `/v1/auth/*`, `/v1/me`, `/v1/menu`, `/v1/orders` | No existe implementación de API propia ni directorio `server/`. |
| Login/refresh/logout Core, roles API | El cliente usa Supabase Auth directamente; no hay tokens ni endpoints Core que probar. |
| Offline/sync IndexedDB | No existe implementación de IndexedDB, cola persistente ni motor de sincronización. |
| E2E completo | Las pruebas existentes requieren credenciales remotas de Supabase. Además, Playwright no tenía Chromium instalado y `pnpm exec playwright install chromium` fue rechazado con HTTP 403 por el CDN; no se ejecutaron contra un entorno aislado. |

## Recomendación antes de producción

1. Localizar la rama o repositorio que realmente contiene las Tareas 01–17 de QuickBite Core y confirmar su `origin` antes de cambiar más código.
2. Proporcionar una composición aislada que arranque PostgreSQL y la API propia, junto con scripts de migración reproducibles.
3. Añadir pruebas de integración que creen datos desechables y cubran órdenes, idempotencia, wallet, auth, autorización y sync offline.
4. Sustituir los clientes y repositorios Supabase por contratos de la API propia de forma incremental; no exponer credenciales de base de datos ni claves de servicio a Vite.
5. Reemplazar E2E y CI dependientes de Supabase por entornos efímeros aislados antes de habilitar despliegues.
