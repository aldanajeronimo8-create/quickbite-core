# Fase 04 — PARCIAL: PostgreSQL

Existe una migración reproducible y `quickbite.create_order_tx`; no se declara validada porque el entorno no provee PostgreSQL/Docker/psql. La función calcula precios en DB, bloquea inventario, registra movimientos/auditoría y tiene clave única de idempotencia por usuario.

## Entorno aislado

Cuando Docker esté disponible: `docker compose -f docker-compose.core.yml up -d postgres`. Esta composición usa una base efímera de desarrollo `quickbite_core` en el puerto `54329` y carga las migraciones desde `database/migrations`; no apunta a Supabase ni a producción.
