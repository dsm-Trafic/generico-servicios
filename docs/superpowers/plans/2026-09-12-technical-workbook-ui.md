# Technical Workbook UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every local application screen a coherent, accessible technical-workbook interface without changing business behaviour.

**Architecture:** A small display helper gives work-order statuses one Spanish label and one visual tone. Global CSS defines the paper-and-ink tokens, responsive layout primitives, controls, tables, focus, and reduced-motion behaviour. Existing server pages adopt semantic class names and the helper while retaining their queries and Server Actions.

**Tech Stack:** Next.js App Router, React 19 server components, TypeScript, CSS, Vitest.

## Global Constraints

- Preserve existing routes, form field names, Server Actions, database queries, and role permissions.
- Use the approved palette: `#F3F0E8`, `#1D2A35`, `#16697A`, `#F4B942`, `#2F7D5A`, and `#B7473A`.
- Use local CSS font stacks; do not add a network-dependent font service or package.
- Keep `AGENTS.md` and `CLAUDE.md` identical and update `docs/current-state.md` for the implemented redesign.
- Verify keyboard focus, 320 px mobile layout, `prefers-reduced-motion`, tests, lint, and build.

---

### Task 1: Establish consistent work-order status presentation

**Files:**
- Create: `src/lib/work-order-display.ts`
- Create: `tests/unit/work-order-display.test.ts`

**Interfaces:**
- Produces: `statusDisplay(status: string): { label: string; tone: 'pending' | 'active' | 'complete' }`.
- Consumes: database values `PENDIENTE`, `EN_CURSO`, and `TERMINADO`.

- [ ] **Step 1: Write failing status tests**

```ts
import { expect, it } from 'vitest';
import { statusDisplay } from '@/lib/work-order-display';

it('renders each operational status with a readable label and tone', () => {
  expect(statusDisplay('PENDIENTE')).toEqual({ label: 'Pendiente', tone: 'pending' });
  expect(statusDisplay('EN_CURSO')).toEqual({ label: 'En curso', tone: 'active' });
  expect(statusDisplay('TERMINADO')).toEqual({ label: 'Terminado', tone: 'complete' });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx vitest run tests/unit/work-order-display.test.ts`  
Expected: FAIL because `@/lib/work-order-display` does not exist.

- [ ] **Step 3: Implement the pure display helper**

```ts
export type StatusTone = 'pending' | 'active' | 'complete';

export function statusDisplay(status: string): { label: string; tone: StatusTone } {
  if (status === 'EN_CURSO') return { label: 'En curso', tone: 'active' };
  if (status === 'TERMINADO') return { label: 'Terminado', tone: 'complete' };
  return { label: 'Pendiente', tone: 'pending' };
}
```

- [ ] **Step 4: Verify the helper**

Run: `npx vitest run tests/unit/work-order-display.test.ts`  
Expected: PASS with one test.

- [ ] **Step 5: Commit the status foundation**

```bash
git add src/lib/work-order-display.ts tests/unit/work-order-display.test.ts
git commit -m "feat: add work order status display"
```

### Task 2: Build the visual system and application frame

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `statusDisplay(status)` from Task 1.
- Produces: CSS classes `app-shell`, `app-header`, `status-strip`, `status-chip`, `button`, `button-secondary`, `panel`, `page-heading`, and `metric`.

- [ ] **Step 1: Write the CSS token and accessibility layer**

```css
:root { --paper: #f3f0e8; --ink: #1d2a35; --service: #16697a;
  --attention: #f4b942; --closed: #2f7d5a; --incident: #b7473a; }
:focus-visible { outline: 3px solid var(--attention); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto; transition: none !important; } }
```

Replace the current one-line stylesheet with responsive grid, form, table, and
button rules using these tokens. Use `Arial Narrow` before `Segoe UI` for display
headings and `Segoe UI` for text. Do not use gradients or universal card shadows.

- [ ] **Step 2: Restructure the shared shell and dashboard**

```tsx
<main className="app-shell">
  <header className="app-header">
    <Link className="brand" href="/"><span>GS</span> Genérico Servicios</Link>
    <p className="session-label">{user.name} · {roleLabel}</p>
    <nav aria-label="Principal" className="app-nav">...</nav>
  </header>
  {children}
</main>
```

Render dashboard statuses as `<section className={`status-cell status-${tone}`}>`
using `statusDisplay`, with a label, count, and meaningful “Partes” text.

- [ ] **Step 3: Verify the frame locally**

Run: `npm run dev`  
Expected: the header, navigation, status strip, focus ring, and 320 px layout
remain readable on the dashboard without console errors.

- [ ] **Step 4: Commit the visual system**

```bash
git add src/app/globals.css src/components/app-shell.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat: redesign application shell"
```

### Task 3: Apply the workbook hierarchy to workflows

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/clientes/page.tsx`
- Modify: `src/app/clientes/[id]/page.tsx`
- Modify: `src/app/partes/page.tsx`
- Modify: `src/app/partes/[id]/page.tsx`

**Interfaces:**
- Consumes: global CSS classes from Task 2 and `statusDisplay(status)` from Task 1.
- Produces: a clear page heading, labelled capture panel, scan-friendly result table, and status chip on each workflow.

- [ ] **Step 1: Apply page hierarchy without changing form contracts**

Use the following pattern on clients and parts pages while retaining each current
`name`, `action`, `required`, and `defaultValue` attribute:

```tsx
<div className="page-heading"><p className="section-kicker">Operación</p><h1>Partes de trabajo</h1></div>
<div className="workbench-grid">
  <section className="panel form-panel"><h2>Nuevo parte</h2><form className="form">...</form></section>
  <section className="panel list-panel"><h2>Listado</h2><table className="table">...</table></section>
</div>
```

On detail pages, use `statusDisplay(order.status)` for the chip and group work,
materials, payments, and budgets in panels. Make the login page a centred
`login-shell` with a concise local-access explanation.

- [ ] **Step 2: Manually verify role-specific workflows**

Run: `npm run dev`  
Expected: office can create clients and parts; a technician sees only assigned
parts; starting, ending, adding material, payment, finance, and budget controls
retain their existing outcomes and readable labels.

- [ ] **Step 3: Verify responsive and accessible behaviour**

Use browser responsive mode at 320 px and keyboard Tab navigation.  
Expected: no horizontal clipping, controls remain tappable, table information
stays available, and focused controls have a visible yellow outline.

- [ ] **Step 4: Commit workflow restyling**

```bash
git add src/app/login/page.tsx src/app/clientes src/app/partes
git commit -m "feat: restyle operational workflows"
```

### Task 4: Record and verify the redesign

**Files:**
- Modify: `docs/current-state.md`
- Modify: `docs/architecture.md`

**Interfaces:**
- Produces: documented visual-system status and the CSS/component ownership map.

- [ ] **Step 1: Update technical documentation**

Add the local visual-system implementation to `docs/current-state.md` and note
in `docs/architecture.md` that `globals.css` owns design tokens and responsive
behaviour while `work-order-display.ts` owns status presentation.

- [ ] **Step 2: Run full verification**

Run: `npm run docs:check-guides; npm test; npm run lint; npm run build`  
Expected: all commands exit `0`.

- [ ] **Step 3: Commit the documented delivery**

```bash
git add docs/current-state.md docs/architecture.md
git commit -m "docs: record workbook interface"
```

## Self-Review

- Visual direction: Tasks 2 and 3 implement the approved palette, typography, status strip, and functional layout.
- Behaviour preservation: Task 3 explicitly retains form and permission contracts.
- Accessibility and mobile: Tasks 2 and 3 require focus, reduced motion, and 320 px checks.
- Quality and project documentation: Task 4 runs the complete suite and updates both required documents.
