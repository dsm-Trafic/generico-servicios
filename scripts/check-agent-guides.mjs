import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), '..');

export function guidesMatch(root = repositoryRoot) {
  const agentsPath = resolve(root, 'AGENTS.md');
  const claudePath = resolve(root, 'CLAUDE.md');

  return (
    existsSync(agentsPath) &&
    existsSync(claudePath) &&
    readFileSync(agentsPath).equals(readFileSync(claudePath))
  );
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath && !guidesMatch()) {
  console.error(
    'AGENTS.md and CLAUDE.md must be identical. Copy the intended guide before committing.',
  );
  process.exit(1);
}
