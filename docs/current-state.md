# Estado actual

**Actualizado:** 12 de septiembre de 2026

## Repositorio y ejecución

- Repositorio público: `https://github.com/dsm-Trafic/generico-servicios`.
- Rama estable: `master`; trabajo de la primera etapa: `feat/local-app-implementation`.
- Requisito local: Node.js 24 LTS. Ejecutar `npm install`, `npm run setup-hooks`,
  copiar `.env.example` a `.env`, `npm run db:init` y `npm run dev`.
- La base persistente es `data/generico-servicios.db`. `npm run db:reset` la
  elimina y crea de nuevo para una demostración limpia.

## Capacidades implementadas

La oficina y tres técnicos pueden iniciar sesión. La aplicación permite alta,
búsqueda e historial de clientes; creación, asignación, inicio y cierre de
partes; registro de materiales; cobros y financiación aplicables al parte actual
o a otro del mismo cliente; y presupuestos borrador desde visitas de presupuesto.
Los permisos se validan en el servidor y los técnicos quedan aislados de partes
no asignados.

## Alcance pendiente o excluido

Esta etapa no incluye facturas, impuestos, contabilidad, nóminas, rutas, fotos,
firmas, equipos, inventario, red local, móviles, VPS ni migración a PostgreSQL.
El siguiente paso funcional es recorrer los flujos locales con las cuentas de
demostración y recoger ajustes de campos, nombres o pasos.

## Calidad y documentación

La suite Vitest cubre importes, saldos, permisos y la igualdad de guías. Usar
`npm test`, `npm run lint` y `npm run build` antes de entregar cambios. Este clon
tiene el hook versionado disponible; ejecutar `npm run setup-hooks` activa su
ruta en la configuración Git local. `AGENTS.md` y `CLAUDE.md` son iguales y el
hook rechaza un commit cuando dejan de serlo.
