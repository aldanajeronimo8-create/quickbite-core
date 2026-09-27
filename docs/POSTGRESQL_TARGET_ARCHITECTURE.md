# QuickBite — PostgreSQL Target Architecture

## Tarea 03/17 — Diseño de PostgreSQL

### 1. Objetivo

Diseñar la base de datos propia de QuickBite que reemplazará progresivamente la dependencia directa de Supabase.

La arquitectura objetivo es:

QuickBite Frontend → API propia → PostgreSQL

El frontend no se conectará directamente a PostgreSQL. La API será la autoridad para autenticación, autorización, reglas de negocio, transacciones e inventario.

### 2. Principios de diseño

- PostgreSQL como fuente de verdad del sistema.
- UUID como identificadores principales.
- Precios y valores monetarios con NUMERIC, nunca FLOAT.
- Restricciones e índices en base de datos para proteger integridad y rendimiento.
- Operaciones críticas de compra ejecutadas dentro de transacciones.
- El servidor calcula precios, totales, stock y códigos de recogida.
- Idempotency keys para evitar pedidos duplicados durante reintentos.
- Fechas almacenadas con timestamptz.
- Auditoría separada de las tablas operativas.
- Diseño preparado para sincronización offline sin mezclar estados de sincronización con el modelo operacional.

### 3. Modelo principal

#### Identidad y perfiles

- users
  - id UUID PK
  - email UNIQUE
  - password_hash
  - status
  - last_login_at
  - created_at
  - updated_at

- user_profiles
  - user_id UUID PK/FK users
  - full_name
  - student_code
  - identification_number
  - role
  - section_id
  - grade_id
  - course_id
  - theme_preference
  - created_at
  - updated_at

Los roles se controlarán desde la API y mediante restricciones de dominio/autorización.

#### Catálogo

- categories
  - id UUID PK
  - name
  - description
  - active
  - created_at
  - updated_at

- products
  - id UUID PK
  - category_id FK
  - name
  - description
  - price NUMERIC(12,2)
  - stock INTEGER
  - active
  - nutritional information
  - created_at
  - updated_at

Índices: category_id, active y combinaciones útiles para consultas del menú.

#### Estructura académica

- academic_sections
- academic_grades
- academic_courses

Las relaciones permiten asociar estudiantes y reglas operativas con su estructura académica.

### 4. Pedidos

- orders
  - id UUID PK
  - user_id FK
  - status
  - payment_status
  - subtotal NUMERIC(12,2)
  - total NUMERIC(12,2)
  - notes
  - pickup_code
  - pickup_at
  - exported_at
  - admin_hidden
  - recess_id / contexto de receso
  - idempotency_key
  - created_at
  - updated_at

- order_items
  - id UUID PK
  - order_id FK
  - product_id FK
  - product_name_snapshot
  - unit_price NUMERIC(12,2)
  - quantity INTEGER
  - line_total NUMERIC(12,2)

Los snapshots conservan el nombre y precio utilizados al momento de la compra aunque el producto cambie posteriormente.

### 5. Inventario

- inventory_movements
  - id UUID PK
  - product_id FK
  - order_id FK nullable
  - movement_type
  - quantity
  - stock_before
  - stock_after
  - reason
  - created_by
  - created_at

Tipos previstos: entry, sale, reservation, release, return y adjustment.

El stock actual vive en products, mientras que inventory_movements conserva el historial.

### 6. Pagos y saldo

- wallets
  - user_id PK/FK
  - balance NUMERIC(12,2)
  - updated_at

- wallet_transactions
  - id UUID PK
  - wallet_id FK
  - order_id FK nullable
  - type
  - amount NUMERIC(12,2)
  - balance_before
  - balance_after
  - description
  - created_at

Las operaciones financieras deben ser atómicas y nunca depender de cálculos realizados por el cliente.

### 7. Recogida, recesos y operación

- pickup_slots
- recess_schedules
- recess_schedule_targets

Orders conserva el contexto necesario para controlar el momento de recogida y el receso correspondiente.

### 8. Auditoría y notificaciones

- audit_logs
  - id UUID PK
  - actor_user_id FK nullable
  - action
  - entity_type
  - entity_id
  - metadata JSONB
  - created_at

- notifications
  - id UUID PK
  - user_id FK
  - type
  - title
  - message
  - read_at
  - created_at

### 9. Transacción crítica de compra

La API deberá ejecutar la creación de un pedido como una única transacción:

1. Validar usuario y contexto de receso.
2. Validar idempotency_key.
3. Bloquear los productos afectados con SELECT ... FOR UPDATE.
4. Validar que estén activos y tengan stock suficiente.
5. Obtener precios desde PostgreSQL.
6. Calcular subtotal y total en servidor.
7. Crear orders.
8. Crear order_items con snapshots.
9. Descontar inventario.
10. Registrar inventory_movements.
11. Procesar wallet/payment cuando corresponda.
12. Generar pickup_code en servidor.
13. Registrar auditoría.
14. COMMIT.

Si cualquier operación falla, toda la transacción debe revertirse.

### 10. Preparación para modo offline

El modelo queda preparado para sincronización futura mediante:

- UUID generados en cliente.
- created_at / updated_at con precisión temporal.
- idempotency_key para reintentos.
- API idempotente.
- resolución de conflictos definida en servidor.
- una futura capa local de datos/cache en el cliente.
- cola de operaciones pendientes de sincronización fuera de las tablas operativas principales.

La base PostgreSQL seguirá siendo la fuente de verdad cuando exista conectividad.

### 11. Elementos secundarios previstos

El diseño deja espacio para incorporar posteriormente:

- product_reviews
- student_data_consents
- family/guardian relationships
- controles alimentarios de padres
- límites nutricionales y de gasto
- loyalty
- analytics

Estos elementos no deben bloquear la implementación del núcleo de pedidos.

### 12. Orden de migración

1. Identidad y perfiles.
2. Catálogo y estructura académica.
3. Pedidos y order_items.
4. Inventario.
5. Wallets y pagos.
6. Auditoría y notificaciones.
7. Funcionalidades secundarias.
8. API propia.
9. Adaptador del frontend.
10. Sincronización offline.
11. Retiro progresivo de Supabase.

### 13. Criterio de finalización de Tarea 03

La arquitectura se considera lista cuando el esquema base, las relaciones, restricciones, índices y transacción crítica estén definidos de forma que el backend pueda implementarlos sin depender de Supabase.

Esta tarea no modifica la aplicación original QuickBite ni su base de datos de producción.
