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

## Próxima ampliación aprobada

Está aprobado reemplazar el prototipo de parte único por un modelo de trabajo con
múltiples visitas. Incluirá clientes editables y archivables; citas sin borrado;
técnico fijo por trabajo; fecha y horas de cada visita; materiales opcionales
desde catálogo; proveedores; coste histórico por consumo; cobros reales por el
técnico; financiación flexible; deuda calculada; historial completo por cliente;
alertas de deuda; y reportes filtrables con subtotales y totales.

Los tipos serán Trabajo general, Urgencia, Mantenimiento y Solicitud de
presupuesto. Oficina administrará clientes, citas, materiales y proveedores y
consultará reportes, pero no registrará cobros. Los técnicos podrán crear y
actualizar clientes, operar sus trabajos y conocer deudas previas del cliente.

Los datos actuales son exclusivamente de prueba y se reiniciarán al aplicar el
nuevo esquema. No se implementarán todavía CRM, existencias, stock mínimo,
notificaciones de reposición, exportación de reportes ni VPS.

Documentos de continuidad:

- `docs/plans/2026-09-12-jobs-visits-collections-design.md`: diseño funcional aprobado.
- `docs/superpowers/plans/2026-09-12-jobs-visits-collections.md`: plan técnico pendiente de ejecución.
- `docs/plans/2026-09-12-technical-workbook-ui-design.md`: dirección visual aprobada.
- `docs/superpowers/plans/2026-09-12-technical-workbook-ui.md`: plan visual integrado en la ampliación funcional.

## Calidad y documentación

La suite Vitest cubre importes, saldos, permisos y la igualdad de guías. Usar
`npm test`, `npm run lint` y `npm run build` antes de entregar cambios. En este
clon el hook está activado con `core.hooksPath = .githooks`; cada clon nuevo debe
ejecutar `npm run setup-hooks`. `AGENTS.md` y `CLAUDE.md` son iguales y el hook
rechaza un commit cuando dejan de serlo. La verificación completa más reciente
terminó correctamente: 7 pruebas, lint y build.
