import { describe, expect, it } from 'vitest';
import { formatUyu, toCents } from '@/lib/money';

describe('money', () => {
  it('convierte importes uruguayos a centésimos sin redondeos binarios', () => {
    expect(toCents('1.234,50')).toBe(123450);
    expect(formatUyu(123450)).toBe('$ 1.234,50');
  });

  it('rechaza importes negativos', () => {
    expect(() => toCents('-1')).toThrow('INVALID_MONEY');
  });
});
