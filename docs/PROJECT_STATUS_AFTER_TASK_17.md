# QuickBite Core — Estado tras Tarea 17

Las 17 tareas de construcción/migración base están completadas.

## Qué significa
- PostgreSQL objetivo diseñado y migraciones creadas.
- API propia implementada.
- Autenticación propia con access/refresh tokens.
- Frontend conectado al núcleo de la API.
- Cola offline persistente con IndexedDB.
- Sincronización al recuperar conexión.
- Idempotencia de pedidos preservada entre desconexión, reintentos y sincronización.

## Qué NO significa
Todavía no es una certificación de producción. Falta una fase de validación independiente:
1. PostgreSQL real aislado.
2. Ejecutar todas las migraciones.
3. Typecheck/lint/tests/build.
4. Pruebas API y E2E.
5. Pruebas reales offline/online.
6. Migrar los módulos secundarios que aún usan Supabase.
7. Auditoría final de seguridad y despliegue.

## Regla arquitectónica
El navegador nunca se conecta directamente a PostgreSQL. Incluso en modo offline, el cliente solamente almacena operaciones pendientes; al sincronizar, la API y PostgreSQL vuelven a validar permisos, precios, stock y transacciones.
