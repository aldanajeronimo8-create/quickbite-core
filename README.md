# QuickBite Core

Aplicación web de QuickBite para la operación digital de la cafetería escolar.

## Arquitectura activa

El repositorio funciona como un proyecto único:

- Frontend React + TypeScript + Vite
- API HTTP de QuickBite Core
- PostgreSQL detrás de la API
- Firebase Authentication para acceso Google
- Vercel para el despliegue web y la API

Todas las operaciones activas de autenticación, menú, pedidos, preferencias, staff y administración pasan por la API de QuickBite Core.

## Roles

QuickBite tiene exactamente cuatro roles:

- estudiante
- padre de familia
- staff
- administrador

Cada rol tiene su propia experiencia y centro de funciones.

## Rutas principales

- /login
- /register-student/form
- /register-parent
- /menu
- /student/features
- /student/order-windows
- /student/reviews
- /student/account
- /student/wallet
- /student/history
- /student/rewards
- /student/favorites
- /student/link-code
- /student/notifications
- /parent/family
- /parent/food-controls
- /parent/wellbeing
- /staff
- /staff/features
- /staff/orders
- /staff/verification
- /verify-order
- /admin
- /admin/features
- /admin/orders
- /admin/payments
- /admin/wallet
- /admin/inventory
- /admin/menu
- /admin/nutrition
- /admin/reviews
- /admin/loyalty
- /admin/reports
- /admin/history
- /admin/system
- /admin/reset
- /admin/users
- /admin/academic
- /admin/recess

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Frontend: http://localhost:5173  
API local: http://localhost:3000

Configuración mínima del frontend:

```
VITE_RUNTIME_MODE=core
VITE_API_BASE_URL=http://localhost:3000
```

El servidor requiere:

```
DATABASE_URL=
AUTH_JWT_SECRET=
FIREBASE_PROJECT_ID=
ALLOWED_ORIGINS=http://localhost:5173
```

## Autenticación

El acceso con Google usa Firebase Authentication. Core valida el ID token y crea su propia sesión.

Staff y administrador utilizan las credenciales administradas por Core.

## Calidad

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

La suite CI ejecuta además el smoke E2E con Playwright.
