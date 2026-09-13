# Estado actual

**Actualizado:** 12 de septiembre de 2026

**Estado:** primera etapa local implementada y lista para pruebas

## Repositorio y ejecución

- Repositorio público: `https://github.com/dsm-Trafic/generico-servicios`.
- Rama de implementación local: `feat/local-app-implementation`.
- Requisito: Node.js 24 LTS y las variables de `.env.example` copiadas a `.env`.
- Base persistente: `data/generico-servicios.db`, excluida de Git.
- Servidor de la sesión de entrega: `http://localhost:3001` porque el puerto
  3000 estaba ocupado.

## Capacidades disponibles

Oficina dispone de clientes editables y archivables, agenda sin borrado,
asignación de técnicos, catálogo completo de proveedores y materiales, acceso a
todos los trabajos y cinco informes filtrables con subtotales y totales. Las
citas pueden quedar pendientes, agendadas, reagendadas, realizadas o canceladas
con motivo.

Los técnicos pueden crear y actualizar clientes, consultar su agenda, crear
urgencias, iniciar y cerrar partes de visita, registrar materiales desde la
lista administrada y cargar cobros. Cada trabajo mantiene el mismo técnico y
puede tener todas las visitas necesarias. El primer inicio fija importe,
modalidad y cuotas opcionales; los pagos pueden ocurrir en cualquier visita.

El historial de cliente incluye trabajos de cualquier técnico. Las nuevas citas
avisan si existen trabajos terminados con saldo. El trabajo puede finalizar con
deuda y los adicionales se registran como trabajos independientes relacionados
mediante la descripción.

## Verificación de entrega

- Vitest: 7 archivos y 21 pruebas correctas.
- ESLint: sin errores.
- Build de Next.js: correcto, incluidas 12 rutas de aplicación.
- Navegador: inicio de sesión y navegación verificados para Oficina y Técnico.
- Flujo real verificado: alta de cliente, proveedor y material; cita asignada;
  trabajo con dos visitas; consumo de material; dos cobros parciales; cierre con
  deuda; alerta al técnico e informe de Oficina con saldo de `$ 12.000,00`.

El escenario anterior permanece en la base local como demostración. Las cuentas
fijas están documentadas en `README.md`. Para descartar todos los datos de
prueba, primero hay que detener Next.js y luego ejecutar `npm run db:reset`.

## Fuera de alcance por ahora

No están implementados CRM, existencias, stock mínimo, avisos de reposición,
facturación fiscal, contabilidad, fotos, firmas, exportación de informes,
aplicación móvil, acceso por red ni VPS. La siguiente etapa debe comenzar con la
validación de usuarios y luego diseñar despliegue, seguridad y copias.

## Disciplina de continuidad

La arquitectura, el estado y las decisiones se documentan bajo `docs/`.
`AGENTS.md` y `CLAUDE.md` siguen idénticos y `.githooks/pre-commit` bloquea
commits que los desincronicen una vez ejecutado `npm run setup-hooks`.
