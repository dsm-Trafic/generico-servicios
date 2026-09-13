import { expect, it } from 'vitest';
import { clientDebtSummary } from '@/lib/debts';

it('informa sólo deuda de trabajos terminados', () => {
  expect(
    clientDebtSummary([
      { status: 'TERMINADO', totalCents: 100_000, paidCents: 30_000 },
      { status: 'EN_PROCESO', totalCents: 50_000, paidCents: 0 },
      { status: 'TERMINADO', totalCents: 25_000, paidCents: 25_000 },
    ]),
  ).toEqual({ completedDebtCents: 70_000, completedDebtCount: 1 });
});

it('ignora trabajos terminados sin importe fijado', () => {
  expect(
    clientDebtSummary([
      { status: 'TERMINADO', totalCents: null, paidCents: 0 },
    ]),
  ).toEqual({ completedDebtCents: 0, completedDebtCount: 0 });
});
