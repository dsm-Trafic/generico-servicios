# 003 — Separar trabajos, visitas, acuerdos y cobros

**Estado:** aceptada

**Fecha:** 12 de septiembre de 2026

## Contexto

Un servicio puede necesitar varias visitas del mismo técnico. El cliente puede
pagar en cualquier visita, financiar libremente, no fijar cuotas o terminar el
trabajo con saldo. Un único registro de parte no preservaba adecuadamente esa
historia ni permitía distinguir acuerdos de dinero recibido.

## Decisión

Representar el servicio contratado en `work_orders` y cada actuación en
`visits`. El trabajo conserva cliente, tipo, descripción, técnico asignado,
importe total, modalidad y cuotas opcionales. El total y el técnico quedan
fijos al comenzar la primera visita. Las visitas guardan fecha, inicio, fin,
descripción y resultado; pueden registrar consumos y cobros.

Guardar cada cobro real como una fila de `payments`, asociada al trabajo, la
visita y el técnico receptor. La modalidad `CONTADO`, `FINANCIADO` o
`DEUDA_ABIERTA` y las cuotas previstas son condiciones informativas: nunca se
consideran dinero cobrado. Calcular el saldo como `total_cents - SUM(payments)`.

Mantener las citas como historial en `appointments` y usar estados en lugar de
borrado. Un trabajo adicional es independiente y la relación con el anterior se
explica en su descripción.

## Consecuencias

El historial refleja quién visitó, qué material utilizó, cuánto cobró y cuándo
terminó el trabajo. Se admiten visitas y pagos flexibles sin alterar registros
anteriores, informes coherentes y finalización con deuda. A cambio, las
operaciones que abarcan trabajo, visita y cita deben ser transaccionales, y el
saldo siempre debe calcularse desde pagos reales.

## Revisión

Revisar al incorporar facturación, anulaciones o devoluciones, inventario,
varios técnicos por trabajo, edición contable o integración con el CRM.
