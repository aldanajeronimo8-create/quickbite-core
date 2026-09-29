# QuickBite Core — Auditoría 100 %

Fecha: 29 de septiembre de 2026.

## Alcance

Se revisaron la estructura versionada, frontend activo, rutas por rol, Core API, servidor, esquemas/migraciones PostgreSQL, autenticación Firebase, configuración, CI/CD, pruebas E2E, Vercel y documentación.

## Arquitectura objetivo

- React + TypeScript + Vite
- Firebase Authentication para Google
- QuickBite Core API
- PostgreSQL
- Vercel

## Resultado actual

| Área | Estado | Evidencia |
|---|---|---|
| Estructura del repositorio | 🟢 | Árbol main: 291 archivos; no existe carpeta supabase/. |
| Runtime frontend | 🟢 | appConfig fija RuntimeMode = core; rutas activas usan Core API. |
| Estudiante | 🟢 | Centro de funciones y módulos activos conectados al Core API. |
| Padre | 🟢 | Familia, controles alimentarios y bienestar usan Core API. |
| Staff | 🟢 | Centro propio, pedidos y verificación usan Core API. |
| Admin | 🟢 | Centro de funcionalidades y módulos administrativos usan Core API. |
| Autenticación Google | 🟢 | Login activo usa Firebase; Core valida el ID token. |
| Recuperación de contraseña | 🟢 | Solicitud y confirmación migradas a Firebase. |
| API/contratos | 🟢 | Cliente Core y servidor cubren las rutas activas auditadas. |
| PostgreSQL Core | 🟢 | database/migrations + inicializadores de esquema cubren datos operativos. |
| Typecheck | 🟢 | CI del commit 731e0b6e5c... pasó. |
| Lint | 🟢 | CI pasó. |
| Tests unitarios | 🟢 | CI pasó. |
| Build | 🟢 | CI pasó. |
| E2E | 🟢 | CI pasó incluyendo la suite de roles reconstruida. |
| Excel-only guard | 🟢 | CI pasó. |
| Código muerto / histórico | 🟡 | Permanecen archivos no conectados al router y documentación histórica; no afectan el runtime activo. |
| Lockfile | 🟡 | pnpm-lock.yaml conserva snapshots huérfanos de paquetes que ya no están en package.json; no rompe CI. |
| Despliegue Vercel del commit auditado | 🔴 | Workflow de producción falló con User not found (404) al autenticar VERCEL_TOKEN. |
| Producción | 🔴 | / responde 200, pero /health continúa devolviendo HTTP 500 porque el alias sirve un deployment anterior. |
| Certificación 100 % | 🔴 | No se puede declarar hasta publicar el mismo commit verde y comprobar /health = 200. |

## Hallazgo crítico corregido

El servidor inicializaba en paralelo los esquemas académico y de funcionalidades. Eso podía hacer que el segundo proceso intentara modificar tipos/tablas antes de que existiera el esquema base y producir internal_error.

Corrección aplicada en server/index.mjs:

- primero ensureCoreAcademicSchema(pool)
- después ensureCoreFeatureSchema(pool)
- un único coreSchemaReady esperado por el handler.

Commit: 731e0b6e5c517dea108960fa4956c2472b8ecd73.

## Evidencia de CI del commit auditado

El workflow CI del commit 731e0b6e5c... terminó correctamente en:

- Excel-only guard
- Typecheck
- Lint
- Tests
- Build
- E2E smoke

## Evidencia de producción

La comprobación directa del 29 de septiembre de 2026 mostró:

- / → HTTP 200
- /health → HTTP 500 con { error: internal_error }

El workflow de producción sí recibió exactamente el commit 731e0b6e5c..., pero Vercel CLI terminó con el error User not found (404).

La credencial VERCEL_TOKEN existe en Actions, pero el token no identifica actualmente un usuario válido para la operación de despliegue.

## Regla de aprobación

QuickBite Core solo se marca como 100 % certificado cuando se cumplan simultáneamente:

1. El mismo commit auditado pasa CI completo.
2. Ese mismo commit está en un deployment Vercel READY.
3. El alias quickbite-core.vercel.app apunta a ese deployment.
4. /health devuelve HTTP 200.
5. No existen errores runtime nuevos en producción durante la comprobación post-deploy.

## Próxima acción necesaria

La única barrera externa restante es corregir la credencial de despliegue de Vercel o permitir que el proyecto realice un deployment válido del commit auditado. El código no necesita degradar seguridad ni esconder el fallo de health para pasar esta certificación.