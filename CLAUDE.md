# Repository Guidelines

## Project Structure & Module Organization

The local work-order app uses the Next.js App Router. Routes and server actions
live in `src/app/`, reusable UI in `src/components/`, and infrastructure and
business rules in `src/lib/`. Put unit tests in `tests/unit/`, maintenance
scripts in `scripts/`, and never commit the SQLite files generated in `data/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies; then run `npm run setup-hooks` once per clone.
- `Copy-Item .env.example .env` creates local configuration.
- `npm run db:init` initializes SQLite and demo users; `npm run db:reset` recreates it.
- `npm run dev` starts the local app, and `npm test` runs Vitest.
- `npm run lint` checks code, `npm run build` validates production compilation.
- `npm run docs:check-guides` verifies this file and `CLAUDE.md` are identical.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, single quotes, `PascalCase`
components, `camelCase` functions, and kebab-case filenames such as
`client-summary.tsx`. Keep mutations in server actions, enforce roles on the
server, use prepared SQLite statements, and store money as integer cents through
`src/lib/money.ts`.

## Testing Guidelines

Name Vitest files `*.test.ts`. Add focused tests for calculations and permission
rules, preferably as pure functions in `src/lib/rules.ts`. Before handoff, run
`npm test`, `npm run lint`, and `npm run build`, then manually check the affected
office and technician flow.

## Documentation Discipline

Document every meaningful change in its matching file: system design in
`docs/architecture.md`, operational status in `docs/current-state.md`, and
enduring choices in a numbered file under `docs/decisions/`. Keep implementation
plans under `docs/plans/` or `docs/superpowers/plans/`. Update this guide and
`CLAUDE.md` together, then run `npm run docs:check-guides`; the pre-commit hook
blocks a commit if they differ.

## Commit, PR, and Local Data

Use scoped conventional commits such as `feat:`, `fix:`, `docs:`, or `chore:`.
PRs need a summary, verification commands, linked issue when available, and UI
screenshots when relevant. Keep `.env` and `data/` local; demo credentials must
be replaced before deployment.
