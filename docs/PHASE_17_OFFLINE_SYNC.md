# Fase 17 — PARCIAL

`orderQueue` persiste operaciones en IndexedDB y guarda solo idempotency key, items, método de pago, estados y error; no contiene credenciales. Falta motor que procese cola, backoff, exclusión mutua y pruebas de reconexión.
