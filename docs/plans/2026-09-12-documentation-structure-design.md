# Diseño: estructura y sincronización de documentación

**Fecha:** 2026-09-12  
**Estado:** aprobado

## Objetivo

Establecer una documentación estable, localizable y mantenible para la aplicación
de partes de trabajo. `AGENTS.md` y `CLAUDE.md` expresarán las mismas normas para
agentes y colaboradores y deberán permanecer idénticos.

## Estructura

Se adoptarán `docs/architecture.md`, `docs/current-state.md` y el directorio
`docs/decisions/`. Las decisiones iniciales se registrarán como ADR ligeros:
`001-database.md` y `002-authentication.md`. Los planes existentes se conservarán
en `docs/plans/` como referencia histórica.

## Sincronización

El repositorio incluirá un hook de Git `pre-commit` en una ruta versionada y un
script de instalación explícito. El hook ejecutará una comprobación que compara
byte a byte `AGENTS.md` y `CLAUDE.md`; si difieren, el commit fallará con una
instrucción clara. No se añadirán dependencias externas ni se modificará
automáticamente contenido durante un commit.

Cada clon activará el hook con un comando de npm documentado. La verificación
también estará disponible como comando independiente para integraciones futuras.

## Validación

Se comprobará que la estructura solicitada exista, que ambos archivos sean
idénticos, que el hook bloquee una divergencia controlada y que el proyecto siga
pasando lint, pruebas y build.
