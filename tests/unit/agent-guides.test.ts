import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { guidesMatch } from '../../scripts/check-agent-guides.mjs';

function withTemporaryGuides(
  agents: string,
  claude: string,
  assertion: (directory: string) => void,
) {
  const directory = mkdtempSync(join(tmpdir(), 'generico-servicios-guides-'));

  try {
    writeFileSync(join(directory, 'AGENTS.md'), agents);
    writeFileSync(join(directory, 'CLAUDE.md'), claude);
    assertion(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('guidesMatch accepts identical files', () => {
  withTemporaryGuides('same\n', 'same\n', (directory) => {
    expect(guidesMatch(directory)).toBe(true);
  });
});

test('guidesMatch rejects different files', () => {
  withTemporaryGuides('one\n', 'two\n', (directory) => {
    expect(guidesMatch(directory)).toBe(false);
  });
});
