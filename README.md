# Genérico Servicios

Primera etapa local de una aplicación para gestionar clientes, partes de trabajo, materiales, cobros, financiación y presupuestos.

## Arranque local

1. Instalar Node.js 24 LTS.
2. Ejecutar **npm install**.
3. Ejecutar **npm run setup-hooks** para activar la validación de las guías en este clon.
4. Copiar **.env.example** como **.env**.
5. Ejecutar **npm run db:init**.
6. Ejecutar **npm run dev**.
7. Abrir la dirección local que muestra Next.js.

## Cuentas de prueba

- Oficina: **admin@example.local** / **Cambiar-Admin-123**
- Técnico 1: **tecnico1@example.local** / **Cambiar-Tecnico-123**
- Técnico 2: **tecnico2@example.local** / **Cambiar-Tecnico-123**
- Técnico 3: **tecnico3@example.local** / **Cambiar-Tecnico-123**

Son credenciales locales de demostración. Para cambiarlas, editar **.env** antes de inicializar una base nueva.

## Datos

La base está en **data/generico-servicios.db** y se conserva entre reinicios. Para comenzar de cero, detener la aplicación y ejecutar deliberadamente **npm run db:reset**. Para hacer una copia, detener la aplicación y copiar el archivo de base a otra carpeta.

## Verificación

- **npm test**: reglas de importes, saldos y permisos.
- **npm run lint**: análisis estático.
- **npm run build**: compilación completa.
- **npm run docs:check-guides**: confirma que `AGENTS.md` y `CLAUDE.md` son idénticos.

## Documentación del proyecto

- `docs/architecture.md`: estructura técnica y límites de la aplicación.
- `docs/current-state.md`: alcance, estado verificable y operación local actual.
- `docs/decisions/`: decisiones técnicas duraderas, numeradas como ADR.
- `docs/plans/` y `docs/superpowers/plans/`: diseño y planes históricos.

Todo cambio funcional, técnico, operativo o de alcance debe actualizar su
documento correspondiente. Si se modifica `AGENTS.md` o `CLAUDE.md`, hay que
actualizar ambos y ejecutar **npm run docs:check-guides**; el hook `pre-commit`
bloquea los commits con guías distintas una vez activado.

La implementación local utiliza SQLite directamente porque el ejecutable de migraciones de Prisma 7 falló en este entorno Windows. El modelo funcional sigue siendo portable; PostgreSQL y el VPS se abordarán después de validar esta etapa.
