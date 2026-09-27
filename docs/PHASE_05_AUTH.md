# Fase 05 — PARCIAL: autenticación

La API implementa login, access token HMAC de 30 minutos y sesión de refresh revocable de 31 días. El refresh token es aleatorio, se almacena como SHA-256 y rota en cada uso. Faltan cambio de contraseña, pruebas de integración y migración del frontend existente.
