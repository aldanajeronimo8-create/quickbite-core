# QuickBite Core API (inicial)

La API se inicia con `DATABASE_URL=... AUTH_JWT_SECRET=... pnpm api`.

| Método | Ruta | Auth | Estado |
|---|---|---|---|
| GET | `/health` | no | implementado |
| POST | `/v1/auth/login` | no | implementado |
| POST | `/v1/auth/refresh` | no | implementado |
| POST | `/v1/auth/logout` | no | implementado |
| GET | `/v1/me` | bearer | implementado |
| GET | `/v1/menu` | no | implementado |
| GET/POST | `/v1/orders` | bearer | implementado |

Todas las respuestas tienen `x-request-id`. Estas rutas no se han probado todavía con PostgreSQL aislado.
