# Documentation Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the requested project documentation layout and prevent commits when `AGENTS.md` and `CLAUDE.md` differ.

**Architecture:** Keep contributor guidance in two identical root Markdown files, checked by a dependency-free Node script. A versioned Git `pre-commit` hook calls that checker, and an npm setup command configures Git to use the versioned hook directory for each clone. Architecture, current operational state, and enduring technical choices are split into focused Markdown documents.

**Tech Stack:** Next.js 16, TypeScript, Node.js 24, npm, Git hooks, Vitest.

## Global Constraints

- `AGENTS.md` and `CLAUDE.md` must be byte-for-byte identical.
- Do not add runtime dependencies for the hook.
- Keep `.env` and `data/` out of version control.
- Record meaningful architecture, state, and decision changes in their matching `docs/` file.

---

### Task 1: Add the guide parity checker and versioned hook

**Files:**
- Create: `scripts/check-agent-guides.mjs`
- Create: `scripts/install-git-hooks.mjs`
- Create: `.githooks/pre-commit`
- Create: `CLAUDE.md`
- Modify: `package.json`
- Test: `tests/unit/agent-guides.test.ts`

**Interfaces:**
- Produces: `npm run docs:check-guides`, which exits `0` for matching guides and `1` otherwise.
- Produces: `npm run setup-hooks`, which runs `git config core.hooksPath .githooks`.
- Consumes: root-level `AGENTS.md` and `CLAUDE.md` as UTF-8 files.

- [x] **Step 1: Write the failing checker tests**

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { guidesMatch } from '../../scripts/check-agent-guides.mjs';

test('guidesMatch accepts identical files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'guides-'));
  writeFileSync(join(directory, 'AGENTS.md'), 'same\\n');
  writeFileSync(join(directory, 'CLAUDE.md'), 'same\\n');
  expect(guidesMatch(directory)).toBe(true);
  rmSync(directory, { recursive: true, force: true });
});

test('guidesMatch rejects different files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'guides-'));
  writeFileSync(join(directory, 'AGENTS.md'), 'one\\n');
  writeFileSync(join(directory, 'CLAUDE.md'), 'two\\n');
  expect(guidesMatch(directory)).toBe(false);
  rmSync(directory, { recursive: true, force: true });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-guides.test.ts`  
Expected: FAIL because `scripts/check-agent-guides.mjs` does not export `guidesMatch`.

- [x] **Step 3: Implement the checker, installer, hook, and scripts**

```js
// scripts/check-agent-guides.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function guidesMatch(root = repositoryRoot) {
  return readFileSync(resolve(root, 'AGENTS.md'))
    .equals(readFileSync(resolve(root, 'CLAUDE.md')));
}

if (process.argv[1] === fileURLToPath(import.meta.url) && !guidesMatch()) {
  console.error('AGENTS.md and CLAUDE.md must be identical. Copy the intended guide before committing.');
  process.exit(1);
}
```

Create `.githooks/pre-commit` with `node scripts/check-agent-guides.mjs`, and
make `scripts/install-git-hooks.mjs` call `git config core.hooksPath .githooks`
with `spawnSync`. Add `docs:check-guides` and `setup-hooks` npm scripts. Create
`CLAUDE.md` as an exact copy of the existing `AGENTS.md` before checking them.

- [x] **Step 4: Run focused verification**

Run: `npm run docs:check-guides; npm test -- --run tests/unit/agent-guides.test.ts`  
Expected: both commands exit `0`.

- [x] **Step 5: Commit the hook feature**

```bash
git add package.json scripts/check-agent-guides.mjs scripts/install-git-hooks.mjs .githooks/pre-commit tests/unit/agent-guides.test.ts
git commit -m "chore: enforce synchronized agent guides"
```

### Task 2: Create the canonical guides and structured project documentation

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/current-state.md`
- Create: `docs/decisions/001-database.md`
- Create: `docs/decisions/002-authentication.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Delete: `docs/ESTADO-DEL-PROYECTO.md`

**Interfaces:**
- Produces: a mirrored `AGENTS.md` / `CLAUDE.md` contributor guide.
- Produces: one canonical document for each architecture, current-state, and decision concern.
- Consumes: factual implementation details in `src/lib/db.ts`, `src/lib/auth.ts`, and `package.json`.

- [x] **Step 1: Write the required documentation content**

Document Next.js App Router pages, server actions, SQLite via `better-sqlite3`,
signed-cookie role sessions, scripts, tests, and the local-only deployment
boundary. Describe the database and authentication decisions with context,
choice, consequences, and review conditions. Move the Spanish status content
into `docs/current-state.md`; do not discard facts that remain applicable.

- [x] **Step 2: Mirror the contributor guide exactly**

```powershell
Copy-Item AGENTS.md CLAUDE.md -Force
npm run docs:check-guides
```

Expected: the checker exits `0`; each guide has the same bytes.

- [x] **Step 3: Document hook installation and change discipline in README**

Add this local setup step after dependency installation:

```powershell
npm run setup-hooks
```

State that each code, configuration, architecture, or operational change must
also update its applicable document: `architecture.md`, `current-state.md`, an
ADR under `docs/decisions/`, or the appropriate plan.

- [x] **Step 4: Verify the documentation layout**

Run: `npm run docs:check-guides; rg --files docs | Sort-Object`  
Expected: `architecture.md`, `current-state.md`, both numbered decisions, and
historical plans are present; `ESTADO-DEL-PROYECTO.md` is absent.

- [x] **Step 5: Commit the documentation migration**

```bash
git add AGENTS.md CLAUDE.md README.md docs
git commit -m "docs: organize project documentation"
```

### Task 3: Activate and validate the local hook

**Files:**
- Modify: `.git/config` through `npm run setup-hooks` (local, untracked Git configuration)

**Interfaces:**
- Consumes: `.githooks/pre-commit` and `scripts/check-agent-guides.mjs`.
- Produces: an active pre-commit guard for this clone.

- [x] **Step 1: Install the hook path**

Run: `npm run setup-hooks`  
Expected: command exits `0` and `git config --get core.hooksPath` prints `.githooks`.

- [x] **Step 2: Verify the hook accepts the synchronized repository**

Run: `sh .githooks/pre-commit`  
Expected: exit `0` with no error message.

- [x] **Step 3: Run the full quality suite**

Run: `npm test; npm run lint; npm run build`  
Expected: all commands exit `0`.

- [x] **Step 4: Record activation state**

Add a brief entry to `docs/current-state.md` stating that the hook is installed
in this local clone and that new clones must run `npm run setup-hooks`.

- [x] **Step 5: Commit the activation note**

```bash
git add docs/current-state.md
git commit -m "docs: record hook activation"
```

## Self-Review

- Structure: Task 2 creates every requested canonical file and preserves historic plans.
- Synchronization: Task 1 checks equality; Task 3 activates the guard locally.
- Documentation discipline: Task 2 adds the policy to both guide files and README.
- Validation: Tasks 1 and 3 include focused tests, checker execution, lint, and build.
