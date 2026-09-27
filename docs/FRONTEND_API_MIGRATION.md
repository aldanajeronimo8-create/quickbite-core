# Frontend API migration boundary

Tarea 13 establishes the frontend boundary without switching production behavior yet.

The current frontend still uses its existing Supabase authentication/session flow. The new API authentication in Tarea 12 uses QuickBite API sessions, so silently sending a Supabase access token to the API would be incorrect.

Migration order:
1. Implement API login/session issuance.
2. Store only the API session token in the browser.
3. Replace repository reads/writes with calls to quickbiteApi().
4. Keep PostgreSQL credentials server-side.
5. Enable offline cache and sync only after the API path is verified.

Environment:
- VITE_API_BASE_URL points to the QuickBite API.
- The variable is safe to expose because it is only an endpoint URL; DATABASE_URL must never use the VITE_ prefix.

The API client intentionally fails clearly when VITE_API_BASE_URL is missing. No existing Supabase path is disabled by this task, so the current application remains operational while the migration is staged.
