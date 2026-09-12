# 001 — SQLite local con better-sqlite3

**Estado:** aceptada  
**Fecha:** 12 de septiembre de 2026

## Contexto

La primera etapa debe funcionar íntegramente en un ordenador Windows, sin
servidor ni red. Prisma 7 generó su cliente y validó el esquema, pero el
ejecutable de migraciones no pudo crear la base SQLite en este entorno.

## Decisión

Usar SQLite mediante `better-sqlite3`. `src/lib/db.ts` crea el esquema con
sentencias SQL idempotentes, activa claves foráneas y modo WAL, y guarda el
archivo bajo `data/`. Los importes se almacenan como céntimos enteros.

## Consecuencias

La aplicación obtiene una base persistente simple y verificable sin depender de
un proceso externo de migraciones. El esquema queda explícito junto al código,
pero aún no existe un historial formal de migraciones. `data/` no se versiona y
la recuperación local consiste en una copia del archivo con la aplicación
detenida.

## Revisión

Reevaluar antes del VPS o al requerir acceso concurrente de varios equipos,
copias automatizadas, migraciones versionadas o PostgreSQL.
