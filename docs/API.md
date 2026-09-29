# QuickBite Core API

La API se ejecuta con:

```bash
DATABASE_URL=... AUTH_JWT_SECRET=... node server/index.mjs
```

Las rutas autenticadas usan `Authorization: Bearer <token>`. Las respuestas incluyen `x-request-id`.

## Salud y autenticación

| Método | Ruta | Auth |
|---|---|---|
| GET | /health | No |
| POST | /v1/auth/login | No |
| POST | /v1/auth/register | No |
| POST | /v1/auth/refresh | No |
| POST | /v1/auth/logout | Sí |
| POST | /v1/auth/firebase/exchange | Firebase ID token |
| POST | /v1/auth/firebase/onboarding | Firebase onboarding |
| POST | /v1/auth/firebase/complete | Firebase onboarding |
| POST | /v1/auth/google/onboarding | Google onboarding |
| POST | /v1/auth/google/complete | Google onboarding |
| GET | /v1/auth/google/session | Sesión Google |
| POST | /v1/auth/role | Sí |
| GET | /v1/me | Sí |

## Estudiante y padre

| Área | Rutas |
|---|---|
| Menú | GET /v1/menu |
| Pedido | GET/POST /v1/orders |
| Estado/operación | PATCH /v1/orders/:id |
| Cancelación | POST /v1/orders/cancel-request |
| Verificación | GET /v1/order/verify?code= |
| Ventanas | GET /v1/order-windows/status |
| Recreo | GET /v1/recess/status |
| Preferencias | GET/PUT /v1/preferences |
| Favoritos | GET/POST /v1/favorites y DELETE /v1/favorites/:id |
| Notificaciones | GET /v1/notifications y POST /v1/notifications/:id/read |
| Wallet | GET /v1/wallet y GET /v1/wallet/details |
| Recargas | GET/POST /v1/wallet/topups |
| Nutrición | GET /v1/nutrition |
| Calificación | GET /v1/products/rating?productId= |
| Familia | GET /v1/family/children |
| Estudiante | GET/PATCH /v1/student/account |
| Código familiar | GET/POST /v1/student/link-code |
| Reseñas | GET/POST /v1/student/reviews |
| Recompensas | GET /v1/student/rewards y POST/PATCH /v1/student/rewards/:id |
| Padre | GET /v1/parent/family |
| Controles alimentarios | GET /v1/parent/food-controls y PATCH /v1/parent/food-controls |
| Bienestar | GET /v1/parent/wellbeing |
| Límites | PATCH /v1/parent/spending-limits |

## Staff

| Método | Ruta |
|---|---|
| GET | /v1/orders |
| PATCH | /v1/orders/:id |
| POST | /v1/staff/pickup/verify |

Staff puede operar pedidos y verificar entregas, pero no administrar usuarios, catálogo o configuración global.

## Administración

| Área | Rutas |
|---|---|
| Dashboard | GET /v1/admin/dashboard |
| Usuarios | GET/POST /v1/admin/users y PATCH /v1/admin/users/:id |
| Credenciales protegidas | POST /v1/admin/users/:id/protected-credentials |
| Académico | GET/POST/PATCH /v1/admin/academic/* |
| Recreos | GET/POST/PATCH/DELETE /v1/admin/recess-schedules* |
| Menú/productos | GET/POST/PATCH/DELETE /v1/admin/products* |
| Inventario | GET /v1/admin/inventory/movements; POST /v1/admin/inventory/adjust |
| Nutrición | GET/PUT /v1/admin/nutrition |
| Pedidos | POST /v1/admin/orders/archive; DELETE /v1/admin/orders/:id |
| Pagos | POST /v1/admin/orders/:id/payment |
| Recargas | GET/POST/PATCH /v1/admin/wallet/topups* |
| Reseñas | GET/POST /v1/admin/reviews* |
| Recompensas | GET/POST/PATCH /v1/admin/loyalty* |
| Cancelaciones | GET/POST /v1/admin/cancellations* |
| Informes | GET /v1/admin/reports |
| Historial | GET /v1/admin/history |
| Sistema | GET /v1/admin/system |
| Reinicio | POST /v1/admin/reset |

Las rutas de administración comprueban el rol en el servidor.

## Base de datos

Las migraciones están en `database/migrations` y cubren:

- usuarios, perfiles e identidades
- estructura académica
- menú e inventario
- pedidos y pagos
- wallet y recargas
- familia y límites
- nutrición
- reseñas
- recompensas
- notificaciones
- auditoría
- horarios de recreo y ventanas de pedido

## Publicación

Vercel sirve el frontend y expone `/api` como entrada de la API Core. `/health` se reescribe hacia esa función para los monitores.
