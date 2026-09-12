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

## Trabajo iniciado, aún sin validar

En `feat/local-app-implementation` existen cambios sin commit que preparan la primera tarea del plan:

- Configuración de Next.js, TypeScript, ESLint, scripts npm y `.env.example`.
- Esquema inicial de Prisma/SQLite para usuarios, clientes, partes, materiales, movimientos financieros y presupuestos.
- Utilidad para manejar importes UYU en centésimos y su prueba unitaria.

Estos archivos no deben considerarse terminados todavía: no se ha podido ejecutar la migración, las pruebas, el linter ni la compilación.

## Bloqueo actual

La versión instalada de npm (`10.9.4`, junto con Node 22.21.0) falla al resolver o finalizar dependencias. El primer error fue:

```text
Cannot read properties of null (reading 'edgesOut')
```

Un segundo intento con `npm install --legacy-peer-deps` descargó paquetes, pero dejó dependencias inconsistentes; `npm ls` marcó Next.js como inválido. No se debe continuar la implementación ni confirmar estos archivos como funcionales hasta reparar Node.js y npm.

## Siguiente paso seguro

1. Instalar `node-v24.21.0-x64.msi` desde la página oficial de Node.js, con npm incluido.
2. Cerrar y volver a abrir Codex o el terminal para cargar la nueva instalación.
3. Ejecutar `node --version` y `npm --version` y confirmar que ambos responden.
4. Eliminar solo `node_modules` y `package-lock.json` del proyecto si existen, y ejecutar `npm install`.
5. Copiar `.env.example` como `.env`, generar un secreto local para `BETTER_AUTH_SECRET` y ejecutar la migración SQLite.
6. Retomar el plan desde la tarea 1 y no pasar a autenticación hasta que las pruebas de importes, el linter y la migración pasen.

## Precaución sobre el directorio temporal

Existe un directorio de trabajo temporal fuera de este proyecto creado durante el intento inicial de aislamiento: `D:\developm\codex\generico-servicios-local`. No se ha eliminado para evitar borrar una instalación incompleta sin una autorización específica. No contiene trabajo validado ni confirmado; la rama a usar es `feat/local-app-implementation` en esta carpeta del proyecto.
