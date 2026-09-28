# Firebase Authentication en QuickBite

## Arquitectura

Firebase se utiliza únicamente para autenticar cuentas de Google.

QuickBite Core sigue siendo la autoridad para:
- usuarios y perfiles
- roles y permisos
- sesiones de QuickBite
- pedidos, menú y datos de negocio

Flujo:

Google -> Firebase Authentication -> Firebase ID token -> QuickBite Core -> sesión Core.

Roles permitidos mediante Google:
- Estudiante
- Padre de familia

Roles bloqueados en Google:
- Personal de cafetería
- Administración

## Configuración

1. Crea o selecciona el proyecto de QuickBite en Firebase.
2. Registra una aplicación web.
3. En Authentication habilita el proveedor Google.
4. En Authentication > Settings agrega el dominio de producción de QuickBite a los dominios autorizados.
5. Copia la configuración de la aplicación web.

Variables frontend (Production y Preview según corresponda):

VITE_FIREBASE_AUTH_ENABLED=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

Variable del servidor:

FIREBASE_PROJECT_ID=...

FIREBASE_PROJECT_ID debe coincidir con VITE_FIREBASE_PROJECT_ID.

Este flujo no necesita GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ni una cuenta de servicio dentro de QuickBite. El backend verifica el ID token de Firebase con las claves públicas de Firebase.

## Primer acceso

Si el correo Google ya corresponde a un usuario Student o Parent de QuickBite, Core vincula el Firebase UID y crea una sesión.

Si es un usuario nuevo:
1. Firebase autentica Google.
2. Core entrega un ticket de onboarding de corta duración mediante cookie HttpOnly.
3. La persona elige Student o Parent.
4. Student debe completar documento, sección, grado, curso y datos/autorizaciones del representante.
5. Parent debe completar documento y consentimiento.
6. Core crea la cuenta y su sesión.

## Seguridad

Core verifica:
- firma RS256
- kid y certificado Firebase correspondiente
- audience = FIREBASE_PROJECT_ID
- issuer de Firebase
- subject
- expiración
- issued-at
- auth_time
- email verificado
- proveedor = google.com

El Firebase UID se almacena como identidad externa estable. El correo solo se usa para localizar la cuenta durante la vinculación.

Staff/Admin son rechazados por el backend aunque intenten forzar el flujo desde el navegador.

## Rollback

Para desactivar Google mediante Firebase sin romper el login tradicional:

VITE_FIREBASE_AUTH_ENABLED=false

Luego despliega nuevamente. El acceso por correo y contraseña continúa funcionando.

## Desarrollo local

El frontend usa:
VITE_API_BASE_URL=http://localhost:3000

El backend debe tener:
FIREBASE_PROJECT_ID=<project-id-de-firebase>

El frontend requiere la configuración Web de Firebase en las variables VITE_FIREBASE_*.

No pongas secretos de servidor en variables VITE_*.
