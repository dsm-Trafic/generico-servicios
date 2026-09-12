# Arquitectura

## Propósito y límite de la etapa

Genérico Servicios es una aplicación local para gestionar clientes, partes de
trabajo, materiales, cobros, financiación y presupuestos internos. La primera
etapa se usa desde el navegador de este ordenador por administración y tres
técnicos. No hay red local, aplicación móvil ni despliegue VPS todavía.

## Aplicación

Next.js con App Router organiza las pantallas en `src/app/`: acceso, inicio,
clientes y partes. Las mutaciones están centralizadas en `src/app/actions.ts`
como Server Actions. `src/components/app-shell.tsx` proporciona navegación y
contexto visual de sesión. La interfaz no sustituye la autorización: cada acción
que modifica un parte obtiene y valida al usuario en el servidor.

## Dominio y persistencia

`src/lib/db.ts` abre una única base SQLite dentro de `data/` usando
`better-sqlite3`, activa claves foráneas y WAL, crea el esquema si no existe y
siembra las cuentas de demostración. Las entidades principales son usuarios,
clientes, partes, materiales, movimientos financieros y presupuestos. Los
importes se guardan como céntimos enteros; `src/lib/money.ts` convierte y
presenta valores en UYU. `src/lib/rules.ts` concentra las reglas puras de saldo
y permisos para que se puedan probar sin interfaz ni base de datos.

## Identidad y roles

`src/lib/auth.ts` verifica contraseñas con scrypt y guarda una sesión firmada con
HMAC en una cookie `httpOnly`. Administración puede gestionar el conjunto de
datos; un técnico sólo crea y opera los partes asignados a su cuenta. Las rutas
protegidas redirigen a acceso y los recursos no autorizados no se revelan.

## Operación y evolución

Los scripts de npm inicializan o reinician la base y ejecutan pruebas, lint y
build. La configuración y la base son locales e ignoradas por Git. Antes de un
VPS se revisarán gestión de secretos, HTTPS, migraciones, copias de seguridad y
una base de datos de servidor.
