# Diseño: interfaz de libro de partes de taller

**Fecha:** 12 de septiembre de 2026  
**Estado:** aprobado

## Objetivo

Reemplazar la apariencia genérica de tarjetas azules por una interfaz de trabajo
técnico que permita a oficina y técnicos identificar estados, acciones y datos
operativos con rapidez durante una jornada de servicio.

## Dirección visual

La referencia es un libro de partes de taller: ordenado, resistente y directo.
La paleta usa papel `#F3F0E8`, tinta `#1D2A35`, azul de servicio `#16697A`,
amarillo de atención `#F4B942`, verde de cierre `#2F7D5A` y rojo de incidencia
`#B7473A`. Los títulos y cifras usan Barlow Condensed; la lectura, formularios
y tablas usan Source Sans 3.

## Estructura e interacción

El encabezado compacto reúne marca, rol, navegación y salida. El panel presenta
los estados como una tira continua, donde el trabajo en curso destaca sin ocultar
los demás. Partes y clientes combinan captura clara con listados densos y
escaneables. Los estados incorporan texto y forma además de color.

No se usarán degradados ornamentales, tarjetas idénticas ni animaciones de carga.
El diseño mantendrá foco visible, contraste suficiente, controles cómodos en
móvil y respeto por `prefers-reduced-motion`.

## Validación

Se revisarán acceso, panel, clientes y partes en escritorio y móvil; se
preservarán formularios y permisos existentes. `npm test`, `npm run lint` y
`npm run build` deberán terminar correctamente.
