# QuickBite

Aplicación web completa de QuickBite para el Colegio Bilingüe Maximino Poitiers.

## Arquitectura activa

El repositorio funciona como un proyecto único:

- Frontend React + TypeScript + Vite
- API HTTP de QuickBite Core
- PostgreSQL detrás de la API
- Vercel para el despliegue web y las funciones de API

El frontend activo no se conecta directamente a Supabase. Todas las operaciones activas de autenticación, menú, pedidos, preferencias, staff y administración pasan por la API de QuickBite Core.

## Rutas activas

- `/`
- `/login`
- `/privacy`
- `/terms`
- `/data-rights`
- `/google/onboarding`
- `/google/complete`
- `/menu`
- `/parent/family`
- `/staff`
- `/staff/orders`
- `/admin`
- `/admin/users`

Las pantallas antiguas que dependían de llamadas directas a Supabase fueron retiradas del enrutador mientras se completa su migración al Core API.

## Desarrollo local

    pnpm install
    pnpm dev

Frontend: `http://localhost:5173`

API local: `http://localhost:3000`

Variable mínima del frontend:

    VITE_API_BASE_URL=http://localhost:3000

## Producción

En producción, el cliente utiliza automáticamente el mismo origen de la aplicación para las llamadas de Core API. Esto permite desplegar frontend y backend como una sola aplicación en Vercel.

## Autenticación y roles

Los roles disponibles son:

- estudiante
- padre de familia
- staff
- administrador

Las cuentas protegidas se validan en el servidor y no pueden ser gestionadas por sí mismas. La edición de una cuenta protegida requiere otra cuenta protegida.

Las cuentas Staff/Admin son internas y su creación se limita al rol administrador. Las credenciales protegidas se aprovisionan mediante secretos de entorno; nunca deben almacenarse en Git.

El acceso con Google usa `openid email profile` y, tras la autenticación, solicita únicamente los datos escolares que Google no proporciona y que son necesarios para QuickBite.

## Calidad

    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build
