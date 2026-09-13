import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { initializeSchema } from '@/lib/schema';

it('creates every operational table', () => {
  const database = new Database(':memory:');
  initializeSchema(database);

  const names = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => (row as { name: string }).name);

  expect(names).toEqual(
    expect.arrayContaining([
      'users',
      'clients',
      'suppliers',
      'materials',
      'work_orders',
      'appointments',
      'visits',
      'material_usages',
      'payments',
      'budgets',
      'budget_lines',
    ]),
  );

  database.close();
});

it('can initialize an existing database more than once', () => {
  const database = new Database(':memory:');

  expect(() => {
    initializeSchema(database);
    initializeSchema(database);
  }).not.toThrow();

  database.close();
});
