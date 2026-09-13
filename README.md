# Genérico Servicios

Aplicación local para administrar el ciclo completo de un servicio técnico:
clientes, citas, trabajos con varias visitas, materiales, cobros, financiación,
deudas y reportes. Oficina y los técnicos trabajan con permisos diferentes sobre
la misma base SQLite del ordenador.

## Puesta en marcha

Requiere Node.js 24 LTS. En PowerShell:

```powershell
npm install
npm run setup-hooks
Copy-Item .env.example .env
npm run db:init
npm run dev
```

Abre la dirección que muestre Next.js, normalmente `http://localhost:3000`.
Si ese puerto está ocupado elegirá otro automáticamente.

## Cuentas locales

| Nivel | Correo | Contraseña |
| --- | --- | --- |
| Oficina | `admin@example.local` | `Cambiar-Admin-123` |
| Técnico 1 | `tecnico1@example.local` | `Cambiar-Tecnico-123` |
| Técnico 2 | `tecnico2@example.local` | `Cambiar-Tecnico-123` |
| Técnico 3 | `tecnico3@example.local` | `Cambiar-Tecnico-123` |

Son credenciales de demostración. Deben reemplazarse antes de un despliegue.

## Flujo recomendado de prueba

1. Como Oficina, crea un cliente, proveedor y material.
2. Agenda una cita, asigna un técnico y crea el trabajo desde la cita.
3. Como Técnico, inicia la visita y fija el total y la modalidad de cobro.
4. Registra materiales, pagos y el resultado de cada visita.
5. Termina el trabajo, incluso si conserva saldo, y consulta el aviso de deuda.
6. Como Oficina, revisa los informes por cliente, técnico y material.

## Datos y verificación

La base persistente está en `data/generico-servicios.db` y no se versiona. Para
empezar de cero, detén la aplicación y ejecuta `npm run db:reset`. Para conservar
una copia, detén la aplicación y copia ese archivo.

```powershell
npm run docs:check-guides
npm test
npm run lint
npm run build
```

La documentación viva está en `docs/architecture.md`, `docs/current-state.md` y
`docs/decisions/`. Todo cambio debe actualizar el documento correspondiente.
`AGENTS.md` y `CLAUDE.md` deben permanecer idénticos; el hook `pre-commit` lo
comprueba después de ejecutar `npm run setup-hooks`.
