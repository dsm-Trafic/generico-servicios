# Arquitectura

## Alcance de la etapa local

Genérico Servicios es una aplicación Next.js ejecutada íntegramente en este
ordenador. Oficina y tres técnicos acceden desde el navegador a una base SQLite
compartida. Red local, aplicación móvil, CRM, inventario y despliegue VPS quedan
fuera de esta etapa.

## Aplicación y módulos

El App Router vive en `src/app/`. Las rutas principales son `/clientes`,
`/citas`, `/partes`, `/materiales`, `/proveedores` e `/informes`; los detalles de
cita, cliente, trabajo y nueva visita usan rutas dinámicas. Las Server Actions
se separan por dominio en `src/app/actions/`: autenticación, clientes, catálogo,
citas y trabajos.

`src/components/app-shell.tsx` proporciona cabecera, navegación según rol y
contexto de sesión. `src/app/globals.css` implementa el sistema visual técnico:
papel, tinta, azul de servicio, amarillo de atención y estados accesibles. Usa
fuentes locales, foco visible, tablas desplazables y adaptación desde 320 px.

## Modelo de datos

`src/lib/schema.ts` define las tablas `users`, `clients`, `suppliers`,
`materials`, `work_orders`, `appointments`, `visits`, `material_usages`,
`payments`, `budgets` y `budget_lines`. Un trabajo pertenece a un cliente y a un
técnico fijo; agrupa varias visitas. Una cita puede originar un trabajo o
programar otra visita. Los consumos guardan el coste del material como
instantánea histórica.

SQLite se abre en `src/lib/db.ts` mediante `better-sqlite3`, con claves foráneas
y WAL. Los importes son céntimos enteros y se convierten en `src/lib/money.ts`.
Las reglas puras de permisos, condiciones y saldo viven en `src/lib/rules.ts`.

## Identidad, permisos y finanzas

`src/lib/auth.ts` verifica contraseñas scrypt y emite una cookie `httpOnly`
firmada con HMAC. Oficina administra clientes, citas, catálogos e informes, pero
no cobra. Un técnico sólo opera sus trabajos y visitas; puede crear o actualizar
clientes y registrar materiales y cobros. El total y el técnico quedan fijos al
iniciar la primera visita.

La modalidad o las cuotas planificadas describen el acuerdo, pero no reducen la
deuda. `payments` contiene únicamente dinero recibido; el saldo siempre se
deriva como total menos pagos. Un trabajo puede terminar con deuda.

## Informes y operación

`src/lib/reports.ts` compone consultas parametrizadas y totales por cliente,
técnico, deuda, consumo de materiales y catálogo. Los resultados se consultan y
filtran en pantalla. `npm run db:init` prepara la base; `npm run db:reset` la
recrea deliberadamente. Antes del VPS serán necesarios HTTPS, cookies seguras,
secretos administrados, migraciones y copias automatizadas.
