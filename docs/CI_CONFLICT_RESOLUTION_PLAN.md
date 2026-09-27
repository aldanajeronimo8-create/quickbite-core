# Plan de resolución segura de conflictos de CI

## Objetivo

Resolver el conflicto de `.github/workflows/ci.yml` sin encadenar cambios de comportamiento ni sobrescribir mejoras de la rama base.

## Secuencia reversible

1. **Restaurar el archivo compartido a la versión de la rama destino.** Esta rama restaura `ci.yml` exactamente al contenido identificado por GitHub como `base_oid` del conflicto. Así el PR deja de modificar el archivo y GitHub conserva íntegramente la versión más reciente de la rama destino.
2. **Verificar los checks que no requieren cambios de workflow.** Ejecutar instalación congelada, typecheck, lint, tests y build localmente. No cambiar scripts ni lockfile para obtener un check verde.
3. **Separar cambios futuros de CI.** Cualquier mejora posterior debe hacerse en un PR exclusivo, creado desde la rama destino ya actualizada, con cambios mínimos y sin modificar `package.json` salvo que el cambio de CI lo exija realmente.
4. **Evitar dependencia remota en PR.** Si E2E necesita credenciales o datos, usar un workflow independiente y un entorno efímero; no mezclar esa migración con los checks de calidad existentes.
5. **Validar antes de integrar.** Revisar el diff del workflow contra la rama destino, validar sintaxis y comprobar que `pnpm install --frozen-lockfile`, typecheck, lint, test y build siguen presentes.
6. **Rollback.** Si un workflow futuro falla, revertir únicamente el commit/PR dedicado al workflow; no revertir migraciones, API o frontend Core.

## Alcance de esta corrección

Esta corrección no cambia jobs, secretos, versiones de herramientas, scripts ni comportamiento de CI. Su único efecto es retirar el cambio concurrente sobre el archivo que GitHub reportó como conflictivo.
