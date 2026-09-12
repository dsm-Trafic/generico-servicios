# Estado del proyecto — 12 de septiembre de 2026

## Repositorio y rama

- Repositorio público: `https://github.com/dsm-Trafic/generico-servicios`
- Rama estable: `master`
- Rama de trabajo actual: `feat/local-app-implementation`
- El commit inicial de documentación es `818614b`.

## Objetivo acordado

La primera versión se desarrollará y probará íntegramente en este ordenador, desde el navegador local. Se validarán dos perfiles reales: administración de oficina y técnicos. El despliegue a un VPS se decidirá después de que esta etapa local funcione y sea aceptada.

## Alcance funcional aprobado

- Una administradora y tres técnicos con cuentas de prueba.
- Clientes con nombre y teléfono obligatorios; correo y dirección opcionales.
- Partes de trabajo general, avería, mantenimiento y visita de presupuesto.
- Estados pendiente, en curso y terminado; hora de inicio obligatoria al cerrar.
- Materiales por nombre y cantidad, sin gestión de almacén.
- Cobros en efectivo, transferencia o Mercado Pago, aplicables al parte actual o a uno anterior del mismo cliente.
- Financiación con importe y cuotas mensuales.
- Presupuestos internos creados por administración desde una visita de presupuesto.

No forman parte de esta etapa: facturas, impuestos, contabilidad, nóminas, rutas, fotos, firmas, máquinas, digitalización de partes anteriores, almacén, red local, móviles ni VPS.

## Documentos de referencia

- `docs/plans/2026-09-12-partes-trabajo-local-design.md`: diseño funcional validado.
- `docs/superpowers/plans/2026-09-12-partes-trabajo-local.md`: plan técnico por tareas, pruebas y criterios de aceptación.

## Primera etapa implementada

La rama `feat/local-app-implementation` contiene una aplicación local funcional con:

- inicio y cierre de sesión con una cuenta de oficina y tres de técnico;
- panel diferenciado por rol y permisos aplicados en el servidor;
- alta, búsqueda e historial terminado de clientes;
- creación, asignación, inicio y cierre de partes;
- materiales, cobros, financiación y saldo pendiente;
- cobros aplicados a otro parte del mismo cliente;
- presupuestos borrador creados por oficina desde una visita;
- base SQLite persistente y reinicio manual controlado.

La base se inicializa directamente con `better-sqlite3`. El ejecutable de migraciones de Prisma 7 no pudo crear SQLite en este Windows, aunque su esquema y generador funcionaban; evitar ese ejecutable eliminó el bloqueo sin cambiar el alcance funcional.

## Verificación realizada

- Node.js `24.21.0`, npm `11.19.0` y Next.js `16.3.5`.
- `npm test`: 5 pruebas aprobadas.
- `npm run lint`: sin errores.
- `npm run build`: compilación completa sin advertencias.
- Prueba navegada: acceso de oficina y técnico, cliente, parte asignado, material, cobro, financiación, cierre, aislamiento entre técnicos y presupuesto.

## Próximo paso

El usuario debe recorrer la aplicación local con las cuentas documentadas en `README.md` y anotar ajustes de nombres, campos o flujo. Después de esa validación se priorizará la siguiente evolución; el despliegue a VPS continúa fuera de esta etapa.

## Precaución sobre el directorio temporal

Existe un directorio de trabajo temporal fuera de este proyecto creado durante el intento inicial de aislamiento: `D:\developm\codex\generico-servicios-local`. No se ha eliminado para evitar borrar una instalación incompleta sin una autorización específica. No contiene trabajo validado ni confirmado; la rama a usar es `feat/local-app-implementation` en esta carpeta del proyecto.
