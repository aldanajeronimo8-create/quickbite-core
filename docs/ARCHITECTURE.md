# Arquitectura QuickBite Core

React -> QuickBite Core API -> PostgreSQL
React -> Firebase Authentication -> ID token -> QuickBite Core -> sesión Core
React offline -> IndexedDB -> QuickBite Core API -> PostgreSQL

El navegador solo utiliza variables públicas de configuración. Las credenciales del servidor permanecen en el entorno del backend.

La API Core es la autoridad para perfiles, roles, menú, pedidos, wallet, notificaciones, favoritos, reseñas, recompensas, controles familiares, auditoría y funciones administrativas. Firebase se limita a la autenticación de cuentas Google y Core valida el ID token antes de crear la sesión propia.

La interfaz tiene cuatro roles: estudiante, padre, staff y administrador. Cada rol tiene su propio centro de funciones y sus permisos son validados por el servidor.