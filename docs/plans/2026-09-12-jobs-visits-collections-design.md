# Diseño: trabajos, visitas, cobros y gestión operativa

**Fecha:** 12 de septiembre de 2026  
**Estado:** aprobado

## Objetivo

Separar el trabajo contratado de los partes de cada visita y ofrecer a Oficina y
técnicos un flujo local completo para citas, ejecución, materiales, cobros,
deudas e informes. Los datos actuales son de prueba y se reiniciarán al aplicar
el nuevo esquema.

## Modelo funcional

Un trabajo pertenece a un cliente y conserva el mismo técnico durante toda su
duración. Sus tipos son Trabajo general, Urgencia, Mantenimiento y Solicitud de
presupuesto. Guarda importe total fijo, modalidad de cobro, financiación
opcional, saldo calculado y estado pendiente, en proceso o terminado. Un trabajo
adicional se registra como trabajo anexo independiente y su relación se explica
en la descripción.

Cada visita genera un parte con fecha, hora de inicio, hora final, descripción,
materiales opcionales, cobros realizados y resultado del trabajo. Oficina y el
técnico asignado pueden programar nuevas visitas. La primera visita realizada
debe fijar el importe y las condiciones; los pagos pueden comenzar en cualquier
visita. La financiación puede tener un número libre de cuotas o quedar como
deuda abierta. Sólo el dinero realmente recibido reduce el saldo, y un trabajo
puede terminar con deuda.

## Roles

Oficina crea, actualiza y archiva clientes; gestiona citas; asigna técnicos;
mantiene proveedores y materiales; y consulta informes y deudas. No registra
cobros. Los técnicos permanecen como cuentas fijas, pueden crear y editar
clientes, crear urgencias propias, operar sus visitas, registrar consumos y
cobros y consultar el historial completo del cliente. Una cita muestra una
alerta cuando el cliente tiene trabajos terminados con saldo pendiente.

## Citas, materiales y proveedores

Las citas conservan historial y usan los estados pendiente de agendar, agendada,
reagendada, realizada y cancelada con motivo. Una cita puede iniciar un trabajo
o añadir una visita a uno existente; nunca se elimina.

Los materiales se eligen desde un catálogo administrado por Oficina e incluyen
nombre, modelo, proveedor y coste. El consumo guarda cantidad, técnico, visita y
coste vigente como instantánea histórica. Los materiales usados y proveedores
relacionados se archivan; sólo se borran físicamente cuando carecen de historial.
La gestión de existencias, stock mínimo y reposición se posterga.

## Informes

La primera etapa ofrece consultas filtrables en pantalla, sin exportación:
clientes y trabajos detallados; deuda y financiación por cliente y global;
trabajos por técnico y global; consumo de materiales por técnico; y listados de
materiales y proveedores. Los informes monetarios presentan subtotales por
grupo y total general.

## Interfaz, validación y pruebas

La interfaz seguirá el diseño técnico-industrial aprobado. El servidor impedirá
cobros superiores al saldo, cobros por Oficina, consumos por otro técnico,
cambio de técnico o importe tras la primera visita y uso de materiales
archivados. Se probarán permisos, saldos, financiación, citas, archivado,
historiales, informes y flujos navegados de ambos roles, además de lint y build.
