# 002 — Sesión local firmada y roles de aplicación

**Estado:** aceptada para la primera etapa local  
**Fecha:** 12 de septiembre de 2026

## Contexto

La aplicación necesita distinguir una cuenta de administración y tres técnicos
en un entorno local, sin proveedor externo de identidad ni infraestructura de
sesiones.

## Decisión

Guardar contraseñas con scrypt y sal aleatoria en SQLite. Tras identificar al
usuario, emitir una cookie `httpOnly`, `sameSite=lax`, firmada con HMAC-SHA256
usando `BETTER_AUTH_SECRET`. El servidor consulta el usuario en cada solicitud y
aplica el rol `ADMIN` o `TECNICO` en las Server Actions.

## Consecuencias

No hay tokens reutilizables en el cliente ni permisos confiados a la interfaz.
La solución es adecuada para prueba local, pero usa cookies no seguras porque no
hay HTTPS y depende de un secreto local protegido por `.env`. El nombre de la
variable se conserva por compatibilidad local; no implica que Better Auth esté
instalado.

## Revisión

Antes de exponer la aplicación en Internet, activar cookies seguras y HTTPS,
gestionar secretos del servidor, definir rotación o revocación de sesiones y
evaluar un proveedor o sistema de identidad adecuado.
