# Diseño: aplicación local de partes de trabajo

## Objetivo de la primera etapa

Construir y probar en un único ordenador una aplicación web local para sustituir los partes en papel de una empresa con tres técnicos y una persona de oficina. La etapa valida los flujos y permisos reales antes de plantear un despliegue en un VPS.

## Entorno local

La aplicación se ejecutará en este ordenador y se abrirá desde su navegador mediante una dirección local. No requerirá acceso desde móviles, la red de oficina ni Internet. La base de datos también residirá localmente y conservará los datos entre ejecuciones.

Se crearán cuatro cuentas de prueba: una administradora de oficina y tres técnicos. El inicio de sesión y la autorización serán reales; no se usará un selector visual de perfiles. Esto permite verificar que cada rol únicamente accede a las acciones permitidas.

## Roles y permisos

La administradora podrá crear y modificar clientes, usuarios, partes y presupuestos, asignar trabajos y corregir cualquier registro.

Cada técnico podrá crear clientes, abrir partes para urgencias, ver sus partes asignados, iniciar y terminar sus propios partes, consultar el historial terminado de cualquier cliente y registrar cobros. No podrá editar partes cerrados, presupuestos ni partes activos de otro técnico.

## Flujo de trabajo

Un parte pertenece a un cliente y representa una visita o trabajo individual. Sus tipos iniciales son trabajo general, avería, mantenimiento y visita de presupuesto. Pasa por los estados pendiente, en curso y terminado.

Cada parte guarda fecha, hora de inicio obligatoria, duración opcional, descripción, materiales por nombre y cantidad, e importe total en pesos uruguayos. Los materiales se registran como historial; no hay control de existencias ni compras.

Los clientes requieren nombre y teléfono. El correo y la dirección son opcionales. La aplicación buscará por nombre o teléfono para reducir duplicados y mostrará el historial de partes terminados de los tres técnicos.

Los cobros son movimientos independientes y siempre se imputan a un parte concreto, sea el actual o uno anterior. Cada movimiento guarda importe, medio de pago (efectivo, transferencia o Mercado Pago), el parte desde el que se cargó y el parte al que se aplica. La financiación guarda el importe financiado y la cantidad de cuotas mensuales. La suma de pagos y financiación no puede superar el importe total del parte.

La oficina puede crear un presupuesto interno desde una visita de presupuesto. Contendrá conceptos, cantidades y precios, calculará el total y permanecerá como borrador: no se envía al cliente, no se acepta y no genera facturas.

## Datos de prueba y recuperación

La instalación local incluirá cuentas y datos de ejemplo para recorrer los casos principales. Existirá un mecanismo de reinicio explícito, solo disponible localmente, que restaura esos datos para repetir las pruebas. Nunca se ejecutará automáticamente al iniciar la aplicación.

## Límites de la primera versión

Quedan fuera: facturas, impuestos, nóminas, contabilidad, rutas, fotos, firmas, fichas de máquinas, digitalización de partes antiguos, almacén y acceso desde otros dispositivos. El modelo de materiales quedará preparado como historial para que un futuro módulo de almacén pueda construirse sin perder los datos ya registrados.

## Evolución al VPS

La aplicación mantendrá una arquitectura portable: la interfaz, las reglas de permisos y el modelo de datos no dependerán de que se ejecute localmente. Al desplegarla en un VPS se sustituirán la ejecución local y la base de datos local por servicios del servidor, se configurará HTTPS, copias de seguridad y acceso remoto. No será necesario cambiar los flujos de uso.

## Criterios de aceptación

- Se puede iniciar sesión localmente con las cuatro cuentas de prueba.
- Cada rol ve y ejecuta solo las acciones que le corresponden.
- Se puede crear un cliente, crear/asignar/iniciar/cerrar un parte y consultar su historial.
- Se pueden registrar materiales, pagos y financiación sin dejar saldo negativo.
- Un técnico puede imputar un cobro a un parte anterior del mismo cliente.
- La oficina puede crear un presupuesto interno desde una visita.
- Los datos sobreviven a cerrar y volver a abrir la aplicación.
- El reinicio local restaura deliberadamente los datos de prueba.
