const MONEY_PATTERN = /^\d+(?:[,.]\d{1,2})?$/;

export function toCents(value: string): number {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!MONEY_PATTERN.test(normalized)) throw new Error('INVALID_MONEY');
  const [whole, decimals = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
}

export function formatUyu(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('INVALID_MONEY');
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100).replace(/\u00a0/g, ' ')
    .replace(/^/, '$ ');
}
