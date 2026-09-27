# Tarea 16/17 — Migración del núcleo de datos del frontend a la API

## Objetivo
Mover el flujo operativo central del frontend hacia la API propia de QuickBite sin exponer PostgreSQL ni romper el modo de compatibilidad existente.

## Implementado
- Nuevo adaptador `src/services/quickbiteDataApi.ts`.
- Lectura de menú desde `GET /v1/menu`.
- Lectura de pedidos desde `GET /v1/orders`.
- Creación de pedidos desde `POST /v1/orders`, usando la transacción atómica PostgreSQL.
- El frontend obtiene un access token válido antes de operaciones autenticadas.
- La API devuelve pedidos propios para estudiantes y el conjunto operativo para roles administrativos/staff.
- `dataStore` usa la API propia cuando `VITE_API_BASE_URL` está configurada.
- Si la API propia no está configurada, se mantiene temporalmente el repositorio Supabase como compatibilidad.
- La carga inicial de datos ya no exige una sesión Supabase cuando la API propia está activa.

## Límites deliberados
Esta tarea no elimina todavía todas las llamadas Supabase de las interfaces administrativas, notificaciones, wallet, loyalty y configuraciones secundarias. Esas operaciones requieren endpoints equivalentes y se mantienen fuera de este cambio para evitar una migración parcial que deje acciones sin backend.

## Seguridad
El navegador nunca recibe `DATABASE_URL`. Las operaciones PostgreSQL siguen ocurriendo exclusivamente en el servidor/API.

## Verificación
Se realizó revisión estática de los archivos modificados. No fue posible ejecutar `pnpm typecheck` dentro de este entorno porque no existe acceso de red al repositorio/entorno de ejecución.
