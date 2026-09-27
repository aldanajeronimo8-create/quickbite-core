# Arquitectura Core

```text
React → QuickBite API → PostgreSQL
React offline → IndexedDB → sync (pendiente) → QuickBite API → PostgreSQL
```

`DATABASE_URL` y `AUTH_JWT_SECRET` son variables de servidor. Solo `VITE_API_BASE_URL` es pública. El frontend actual conserva integraciones Supabase durante la migración.
