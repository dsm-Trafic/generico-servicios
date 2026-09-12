# Genérico Servicios

Primera etapa local de una aplicación para gestionar clientes, partes de trabajo, materiales, cobros, financiación y presupuestos.

## Arranque local

1. Instalar Node.js 24 LTS.
2. Ejecutar **npm install**.
3. Copiar **.env.example** como **.env**.
4. Ejecutar **npm run db:init**.
5. Ejecutar **npm run dev**.
6. Abrir la dirección local que muestra Next.js.

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

La implementación local utiliza SQLite directamente porque el ejecutable de migraciones de Prisma 7 falló en este entorno Windows. El modelo funcional sigue siendo portable; PostgreSQL y el VPS se abordarán después de validar esta etapa.
