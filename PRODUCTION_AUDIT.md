# QuickBite Core — Auditoría de producción

Fecha de revisión: 29 de septiembre de 2026.

## Arquitectura comprobada

React → QuickBite Core API → PostgreSQL  
Google → Firebase Authentication → ID token → QuickBite Core

La aplicación tiene exactamente cuatro roles: estudiante, padre, staff y administrador.

## Controles comprobados

- API centralizada para las operaciones activas.
- Sesiones Core con tokens firmados.
- Validación de Firebase en servidor.
- Autorización por rol en servidor.
- Controles de familia para recursos de estudiantes.
- Validación de ventanas de pedido.
- Validación de stock en la creación transaccional de pedidos.
- Auditoría de operaciones administrativas y de pedidos.
- Health endpoint disponible en producción.
- CI con typecheck, lint, tests, build y E2E smoke.

## Estado

La auditoría de código y configuración está en curso hasta cerrar el ciclo final de CI y verificar que el deployment de producción corresponda al commit final.

No se considera una certificación de producción completa mientras el deployment activo no coincida con el commit final auditado.
