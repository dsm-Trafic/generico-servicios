# Aplicación local de partes de trabajo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación web local y persistente para que oficina y técnicos prueben la gestión de partes de trabajo con permisos reales desde este ordenador.

**Architecture:** Una única aplicación Next.js con App Router servirá las pantallas y las acciones del servidor. Prisma 7 guardará los datos en una base SQLite local; Better Auth gestionará sesiones con correo y contraseña, mientras que una tabla de perfil añadirá el rol de oficina o técnico. La capa de servicios comprobará el rol antes de cualquier mutación, por lo que la restricción no dependerá de la interfaz.

**Tech Stack:** Node.js 22 LTS, Next.js App Router, React, TypeScript estricto, Prisma 7, SQLite, Better Auth, Zod, Vitest y Playwright.

## Global Constraints

- La primera versión se ejecuta únicamente en `localhost` en este ordenador.
- Usar SQLite en un archivo local (`prisma/dev.db`); no instalar Docker, VPS ni servicios externos en esta etapa.
- Moneda: pesos uruguayos; almacenar importes como enteros de centésimos, nunca como `float`.
- Tipos de parte: `GENERAL`, `AVERIA`, `MANTENIMIENTO`, `VISITA_PRESUPUESTO`.
- Estados: `PENDIENTE`, `EN_CURSO`, `TERMINADO`.
- Medios de pago: `EFECTIVO`, `TRANSFERENCIA`, `MERCADO_PAGO`.
- Cuatro cuentas de prueba: una administradora y tres técnicos; las contraseñas de desarrollo deben vivir solo en `.env` y no en el repositorio.
- No implementar facturas, impuestos, contabilidad, nóminas, rutas, fotos, firmas, máquinas, digitalización de partes antiguos, almacén ni acceso de red.

---

## Estructura de archivos

- `prisma/schema.prisma`: modelos, relaciones y enumeraciones persistentes.
- `prisma/seed.ts`: cuentas y datos de prueba reiniciables de forma explícita.
- `src/lib/prisma.ts`: cliente Prisma reutilizable.
- `src/lib/auth.ts` y `src/lib/authorization.ts`: sesiones, perfil y comprobaciones de rol.
- `src/lib/money.ts`: conversión y formato de centésimos UYU.
- `src/features/*`: esquemas Zod, consultas y acciones de cada dominio; ninguna página consulta Prisma directamente.
- `src/app/(auth)/*` y `src/app/(app)/*`: pantallas de acceso y de los dos perfiles.
- `src/components/*`: formularios y componentes visuales reutilizables.
- `tests/unit/*` y `tests/e2e/*`: reglas de negocio y flujos navegados.
- `README.md`: preparación local, cuentas de prueba, copia y restauración de la base.

### Task 1: Crear el proyecto local y la base de datos

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitignore`, `README.md`
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`, `src/lib/money.ts`
- Test: `tests/unit/money.test.ts`

**Interfaces:**
- Produces `toCents(value: string): number`, `formatUyu(cents: number): string` y `prisma` para las tareas posteriores.

- [ ] **Step 1: Inicializar Next.js con TypeScript, App Router y ESLint, e instalar Prisma 7, SQLite, Zod, Better Auth, Vitest y Playwright.**

  Configurar `DATABASE_URL="file:./dev.db"` en `.env.example`, ignorar `.env`, `prisma/dev.db` y `generated/`, y añadir los scripts `dev`, `build`, `lint`, `test`, `test:e2e`, `db:migrate`, `db:seed` y `db:reset`.

- [ ] **Step 2: Escribir la prueba que debe fallar.**

```ts
import { describe, expect, it } from 'vitest';
import { formatUyu, toCents } from '@/lib/money';

describe('money', () => {
  it('convierte importes uruguayos a centésimos sin redondeos binarios', () => {
    expect(toCents('1.234,50')).toBe(123450);
    expect(formatUyu(123450)).toBe('$ 1.234,50');
  });
});
```

- [ ] **Step 3: Ejecutar `npm test -- money.test.ts` y comprobar que falla porque falta `@/lib/money`.**

- [ ] **Step 4: Implementar `toCents` y `formatUyu`.**

  `toCents` debe eliminar separadores de miles, aceptar coma o punto decimal, rechazar valores negativos y devolver un entero. `formatUyu` debe usar `Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 2 })` y normalizar el resultado a `$ 1.234,50`.

- [ ] **Step 5: Definir en Prisma los modelos `User`, `Session`, `Account`, `Verification`, `Client`, `WorkOrder`, `Material`, `FinancialMovement`, `Budget` y `BudgetLine`.**

  `User` tendrá `role` (`ADMIN` o `TECNICO`). `WorkOrder` incluirá `clientId`, `assignedTechnicianId`, `createdById`, `type`, `status`, `workDate`, `startedAt`, `durationMinutes`, `description`, `totalCents`, `closedAt`, `createdAt` y `updatedAt`. `FinancialMovement` tendrá `recordedOnWorkOrderId`, `appliedToWorkOrderId`, `kind` (`PAGO` o `FINANCIACION`), `amountCents`, `paymentMethod`, `installmentCount`, `createdById` y `createdAt`.

- [ ] **Step 6: Crear y aplicar la migración inicial; ejecutar la prueba y el linter.**

  Ejecutar `npm run db:migrate`, `npm test -- money.test.ts` y `npm run lint`; los tres comandos deben terminar correctamente.

- [ ] **Step 7: Commit.**

```bash
git add package.json prisma src/lib tests README.md .env.example .gitignore
git commit -m "chore: scaffold local work order app"
```

### Task 2: Autenticación, perfiles y datos de prueba

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/authorization.ts`, `src/app/api/auth/[...all]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/page.tsx`
- Modify: `prisma/seed.ts`, `README.md`
- Test: `tests/unit/authorization.test.ts`

**Interfaces:**
- Produces `requireUser(): Promise<AppUser>`, `requireAdmin(): Promise<AppUser>` y `requireTechnicianOrAdmin(): Promise<AppUser>`.
- `AppUser` es `{ id: string; name: string; email: string; role: 'ADMIN' | 'TECNICO' }`.

- [ ] **Step 1: Escribir pruebas de autorización.**

```ts
it('rechaza a un técnico al exigir administración', () => {
  expect(() => assertAdmin({ role: 'TECNICO' })).toThrow('FORBIDDEN');
});

it('acepta a la administradora', () => {
  expect(assertAdmin({ role: 'ADMIN' })).toBeUndefined();
});
```

- [ ] **Step 2: Ejecutar `npm test -- authorization.test.ts` y comprobar que falla.**

- [ ] **Step 3: Configurar Better Auth con correo y contraseña, Prisma y una clave `BETTER_AUTH_SECRET` obligatoria.**

  Añadir el manejador API, la página de inicio de sesión y un cierre de sesión visible. La creación de cuentas públicas estará desactivada: las cuentas se crean solo mediante la semilla en esta etapa.

- [ ] **Step 4: Implementar los guardas de sesión y rol.**

  `requireUser` redirige a `/login` cuando no hay sesión. `requireAdmin` y `requireTechnicianOrAdmin` obtienen el usuario de sesión, cargan su perfil y lanzan el error `FORBIDDEN` cuando el rol no corresponde.

- [ ] **Step 5: Sembrar una administradora y tres técnicos, además de dos clientes y partes representativos.**

  Leer los correos y contraseñas desde `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TECHNICIAN_1_EMAIL`, `TECHNICIAN_1_PASSWORD` y equivalentes. Documentar los valores de prueba recomendados en `.env.example`, sin secretos reales.

- [ ] **Step 6: Añadir `npm run db:reset` que borre el archivo SQLite, aplique migraciones y ejecute la semilla solo cuando el operador lo lance.**

- [ ] **Step 7: Ejecutar `npm test -- authorization.test.ts`, iniciar `npm run dev` y comprobar manualmente inicio/cierre de sesión con una cuenta de cada rol.**

- [ ] **Step 8: Commit.**

```bash
git add prisma src/lib src/app tests README.md package.json
git commit -m "feat: add local role-based sign in"
```

### Task 3: Clientes y partes de trabajo

**Files:**
- Create: `src/features/clients/schema.ts`, `src/features/clients/service.ts`
- Create: `src/features/work-orders/schema.ts`, `src/features/work-orders/service.ts`
- Create: `src/app/(app)/clientes/page.tsx`, `src/app/(app)/clientes/[clientId]/page.tsx`, `src/app/(app)/partes/page.tsx`, `src/app/(app)/partes/nuevo/page.tsx`, `src/app/(app)/partes/[workOrderId]/page.tsx`
- Create: `src/components/client-form.tsx`, `src/components/work-order-form.tsx`, `src/components/status-badge.tsx`
- Test: `tests/unit/work-orders.test.ts`

**Interfaces:**
- Produces `createClient(input, actor)`, `createWorkOrder(input, actor)`, `startWorkOrder(id, actor)` y `completeWorkOrder(id, actor)`.

- [ ] **Step 1: Escribir las pruebas de transición de estado y propiedad.**

```ts
it('solo permite al técnico asignado iniciar un parte pendiente', async () => {
  await expect(startWorkOrder('wo-1', technicianTwo)).rejects.toThrow('FORBIDDEN');
  await expect(startWorkOrder('wo-1', technicianOne)).resolves.toMatchObject({ status: 'EN_CURSO' });
});

it('no permite cerrar un parte sin hora de inicio', async () => {
  await expect(completeWorkOrder('wo-2', technicianOne)).rejects.toThrow('START_TIME_REQUIRED');
});
```

- [ ] **Step 2: Ejecutar `npm test -- work-orders.test.ts` y comprobar que falla.**

- [ ] **Step 3: Implementar validación Zod y servicios.**

  Cliente: nombre y teléfono obligatorios, correo y dirección opcionales. Parte: cliente, tipo, fecha, descripción, total no negativo y técnico asignado si lo crea oficina. Solo administración puede asignar o modificar un parte de otro usuario. `startWorkOrder` fija `startedAt`; `completeWorkOrder` exige ese campo y fija `closedAt`.

- [ ] **Step 4: Crear las pantallas y formularios.**

  La oficina verá todos los partes y podrá crear/asignar. El técnico verá los propios pendientes o en curso y tendrá un botón de «Nueva urgencia», que crea un parte `PENDIENTE` autoasignado. La ficha del cliente mostrará historial terminado de los tres técnicos y búsqueda por nombre o teléfono.

- [ ] **Step 5: Ejecutar pruebas unitarias y añadir una prueba Playwright.**

```ts
test('un técnico crea un cliente y termina una urgencia propia', async ({ page }) => {
  await loginAs(page, 'tecnico1@example.local');
  await page.getByRole('link', { name: 'Nueva urgencia' }).click();
  await page.getByLabel('Nombre del cliente').fill('Ana Pérez');
  await page.getByLabel('Teléfono').fill('099123456');
  await page.getByRole('button', { name: 'Guardar parte' }).click();
  await page.getByRole('button', { name: 'Iniciar parte' }).click();
  await page.getByRole('button', { name: 'Terminar parte' }).click();
});
```

- [ ] **Step 6: Commit.**

```bash
git add src tests prisma
git commit -m "feat: manage local clients and work orders"
```

### Task 4: Materiales, cobros y financiación

**Files:**
- Create: `src/features/materials/schema.ts`, `src/features/materials/service.ts`
- Create: `src/features/financials/schema.ts`, `src/features/financials/service.ts`
- Create: `src/components/material-list-editor.tsx`, `src/components/financial-movement-form.tsx`, `src/components/work-order-balance.tsx`
- Modify: `src/app/(app)/partes/[workOrderId]/page.tsx`
- Test: `tests/unit/financials.test.ts`

**Interfaces:**
- Produces `addMaterial(workOrderId, input, actor)`, `recordMovement(input, actor)` y `getWorkOrderBalance(workOrderId): Promise<number>`.

- [ ] **Step 1: Escribir la prueba de cálculo y límite de saldo.**

```ts
it('imputa un cobro registrado en el parte actual a uno anterior', async () => {
  const payment = await recordMovement({ recordedOnWorkOrderId: 'new', appliedToWorkOrderId: 'old', kind: 'PAGO', amountCents: 2500, paymentMethod: 'EFECTIVO' }, technicianOne);
  expect(payment.appliedToWorkOrderId).toBe('old');
  await expect(getWorkOrderBalance('old')).resolves.toBe(7500);
});

it('rechaza pagos y financiación superiores al total pendiente', async () => {
  await expect(recordMovement(overpayInput, admin)).rejects.toThrow('BALANCE_EXCEEDED');
});
```

- [ ] **Step 2: Ejecutar `npm test -- financials.test.ts` y comprobar que falla.**

- [ ] **Step 3: Implementar materiales y movimientos dentro de una transacción Prisma.**

  Cada material guarda nombre y cantidad positiva. Para cada cobro exigir método de pago; para financiación exigir `installmentCount` entero mayor que cero y dejar `paymentMethod` vacío. Antes de insertar, sumar movimientos del parte destino y rechazar cualquier importe que supere `totalCents`.

- [ ] **Step 4: Incorporar en la ficha del parte el editor de materiales, el saldo y el formulario de movimientos.**

  El selector de parte destino solo mostrará partes del mismo cliente con saldo positivo. Los técnicos pueden crear movimientos; la vista explica claramente «registrado desde» y «aplicado a».

- [ ] **Step 5: Ejecutar las pruebas y añadir un caso Playwright de cobro sobre parte histórico.**

- [ ] **Step 6: Commit.**

```bash
git add src tests prisma
git commit -m "feat: record materials payments and financing"
```

### Task 5: Presupuestos, paneles y acabado de prueba local

**Files:**
- Create: `src/features/budgets/schema.ts`, `src/features/budgets/service.ts`
- Create: `src/app/(app)/presupuestos/page.tsx`, `src/app/(app)/presupuestos/nuevo/[workOrderId]/page.tsx`
- Create: `src/components/budget-form.tsx`, `src/components/dashboard-summary.tsx`
- Modify: `src/app/(app)/page.tsx`, `README.md`
- Test: `tests/unit/budgets.test.ts`, `tests/e2e/roles.spec.ts`

**Interfaces:**
- Produces `createBudgetFromVisit(workOrderId, lines, actor)` y `calculateBudgetTotal(lines): number`.

- [ ] **Step 1: Escribir las pruebas de presupuesto.**

```ts
it('solo permite a administración crear un presupuesto desde una visita', async () => {
  await expect(createBudgetFromVisit('visit-1', [{ concept: 'Revisión', quantity: 2, unitPriceCents: 1500 }], technicianOne)).rejects.toThrow('FORBIDDEN');
  await expect(createBudgetFromVisit('visit-1', [{ concept: 'Revisión', quantity: 2, unitPriceCents: 1500 }], admin)).resolves.toMatchObject({ totalCents: 3000, status: 'BORRADOR' });
});
```

- [ ] **Step 2: Ejecutar `npm test -- budgets.test.ts` y comprobar que falla.**

- [ ] **Step 3: Implementar presupuesto borrador y sus líneas.**

  Solo se origina en un parte `VISITA_PRESUPUESTO`; cada línea exige concepto, cantidad positiva y precio unitario no negativo. El total se calcula en servidor sumando `quantity * unitPriceCents`; no hay envío, aceptación, factura ni impuestos.

- [ ] **Step 4: Crear paneles orientados a cada rol.**

  Administración verá recuentos de partes pendientes/en curso, saldos pendientes y accesos a clientes, partes y presupuestos. Técnicos verán sus partes pendientes y en curso, «Nueva urgencia» e historial de clientes.

- [ ] **Step 5: Crear `tests/e2e/roles.spec.ts` con estos dos casos.**

```ts
test('la administración puede crear un presupuesto', async ({ page }) => {
  await loginAs(page, 'admin@example.local');
  await page.goto('/partes/visit-1');
  await expect(page.getByRole('link', { name: 'Crear presupuesto' })).toBeVisible();
});

test('un técnico no puede acceder a presupuestos', async ({ page }) => {
  await loginAs(page, 'tecnico1@example.local');
  await page.goto('/presupuestos');
  await expect(page.getByText('No tienes permiso')).toBeVisible();
});
```

- [ ] **Step 6: Documentar la prueba local completa en README.**

  Incluir requisitos, creación de `.env`, migración, semilla, inicio, cuentas de ejemplo, `db:reset`, ubicación de `prisma/dev.db` y copia manual segura: detener la aplicación y copiar ese archivo a una carpeta fechada.

- [ ] **Step 7: Ejecutar `npm run lint`, `npm test`, `npm run build` y `npm run test:e2e`; corregir cualquier fallo.**

- [ ] **Step 8: Commit.**

```bash
git add src tests prisma README.md
git commit -m "feat: add budgets and local acceptance flows"
```

## Revisión final del plan

- **Cobertura:** las tareas 2–5 cubren usuarios, permisos, clientes, partes, materiales, cobros, financiación, presupuestos y los datos de prueba. La tarea 1 habilita persistencia local y manejo exacto de dinero. Las exclusiones están explícitas en las restricciones globales.
- **Compatibilidad futura:** el uso de servicios de dominio y Prisma evita acoplar las pantallas a SQLite. La migración a PostgreSQL/VPS podrá tratarse como un plan independiente después de validar esta etapa.
- **Sin pendientes ambiguos:** cada tarea nombra archivos, interfaces, comportamiento y comandos de prueba concretos.

## Handoff de ejecución

Plan completo y guardado en `docs/superpowers/plans/2026-09-12-partes-trabajo-local.md`.

1. Ejecución por subtareas: un agente nuevo por tarea y revisión entre ellas.
2. Ejecución en esta sesión: desarrollar las tareas de forma secuencial, con puntos de comprobación.
