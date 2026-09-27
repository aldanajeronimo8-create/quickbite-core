# Fase 02 — arquitectura

Objetivo: `React → QuickBite API → PostgreSQL`. Para offline: `React → IndexedDB → cola/sync → API → PostgreSQL`. La implementación inicial está en `server/index.mjs`, `database/migrations/0001_quickbite_core.sql`, `src/services/api/quickbiteApi.ts` y `src/services/offline/orderQueue.ts`. La SPA existente aún usa Supabase; la migración es parcial.
