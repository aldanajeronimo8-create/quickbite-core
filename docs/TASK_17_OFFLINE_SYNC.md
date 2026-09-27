# Tarea 17/17 — Offline y sincronización

## Implementado

- IndexedDB como almacenamiento local, no `localStorage`.
- Cola persistente de operaciones pendientes.
- UUID único por operación.
- Idempotency key por pedido.
- Estados de sincronización: pending, syncing, failed, completed.
- Contador de intentos y último error.
- Procesamiento ordenado de la cola.
- Sincronización automática cuando vuelve la conectividad.
- Protección contra dos procesos de sincronización simultáneos.
- Los pedidos creados sin conexión quedan pendientes localmente y se envían a la API al recuperar conexión.
- El servidor sigue siendo la autoridad: la operación sincronizada pasa por `create_order_tx`, que ya es idempotente y transaccional.

## Arquitectura offline

```
React
  ↓
IndexedDB
  ↓
Cola de sincronización
  ↓  (online)
QuickBite API
  ↓
PostgreSQL
```

## Resolución de conflictos

No se implementó una estrategia de “última escritura gana” para pedidos. Para operaciones financieras/operativas, el servidor conserva la autoridad y las operaciones se identifican mediante UUID/idempotency key. Un pedido duplicado por reintento no crea una segunda venta.

## Límites actuales

Esta primera implementación offline cubre el flujo crítico de creación de pedidos. No convierte automáticamente todos los módulos secundarios en offline; wallet, loyalty, administración y otras operaciones deberán migrarse a operaciones sincronizables específicas antes de considerarse offline-first.

## Seguridad

IndexedDB puede contener datos operativos pendientes, por lo que no se almacenan contraseñas ni refresh tokens en la cola. La API continúa siendo necesaria para validar permisos, precios, stock y transacciones.

## Verificación

Se revisó estáticamente la implementación y su integración con la API existente. La validación final requiere ejecutar el frontend y un PostgreSQL real, que queda para la fase de pruebas posteriores a las 17 tareas.
