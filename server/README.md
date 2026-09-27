# QuickBite API

Backend boundary for QuickBite Core.

Frontend -> QuickBite API -> PostgreSQL

The browser must never receive DATABASE_URL, PostgreSQL credentials, or direct database access.

## Environment

Required: DATABASE_URL

Optional: API_HOST (default 127.0.0.1), API_PORT (default 8787), API_CORS_ORIGIN (default http://localhost:5173), DB_POOL_MAX (default 10), DATABASE_SSL=disable for local PostgreSQL only.

## Endpoints

- GET /health
- GET /v1/menu
- GET /v1/me (authenticated)
- GET /v1/orders (authenticated)
- POST /v1/orders (authenticated, atomic database transaction)

Authentication uses bearer session tokens whose SHA-256 hashes are stored in quickbite.auth_sessions.

Future payment providers such as Bre-B, Nequi and DaviPlata must be integrated behind this API. Provider credentials and webhook secrets remain server-side.

Password login, refresh tokens, provider webhooks and full payment orchestration are intentionally left for later implementation tasks.
